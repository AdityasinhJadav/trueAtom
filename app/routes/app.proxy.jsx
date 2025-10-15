import { unauthenticated } from '../shopify.server'
import prisma from '../db.server'

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const productId = url.searchParams.get('product_id')
    const variantId = url.searchParams.get('variant_id')
    const testPrice = url.searchParams.get('test_price')
    const isPreview = url.searchParams.get('preview') === 'true'
    
    if (!productId) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Product ID required' 
      }), { status: 400 })
    }

    // Handle preview mode - return the test price directly
    if (isPreview && testPrice) {
      return new Response(JSON.stringify({ 
        ok: true, 
        hasTest: true,
        isPreview: true,
        variation: variantId || 'A',
        price: parseFloat(testPrice),
        isControl: variantId === 'A' || variantId === 'control'
      }), { status: 200 })
    }

    // For non-preview requests, validate Shopify App Proxy
    await unauthenticated.appProxy(request)

    // Find active tests for this product
    const activeTests = await prisma.test.findMany({
      where: {
        status: 'Running',
        OR: [
          { productId: productId },
          { productId: variantId }
        ]
      },
      include: {
        variations: true
      }
    })

    if (activeTests.length === 0) {
      // No active tests - return original price
      return new Response(JSON.stringify({ 
        ok: true, 
        hasTest: false,
        originalPrice: null 
      }), { status: 200 })
    }

    // Get the most recent test (or you can implement priority logic)
    const initialTest = activeTests[0]
    
    // Enforce audience targeting before assignment
    const headers = request.headers
    const userAgent = headers.get('user-agent') || ''
    const referrer = headers.get('referer') || headers.get('referrer') || ''
    let country = headers.get('cf-ipcountry') || headers.get('x-country') || ''

    function matchesDevice(deviceType) {
      if (!deviceType || deviceType === 'all') return true
      const ua = userAgent.toLowerCase()
      const isMobile = /mobile|iphone|android/.test(ua)
      const isTablet = /ipad|tablet/.test(ua)
      const isDesktop = !isMobile && !isTablet
      if (deviceType === 'mobile') return isMobile
      if (deviceType === 'tablet') return isTablet
      if (deviceType === 'desktop') return isDesktop
      return true
    }

    function matchesTrafficSource(sources) {
      if (!Array.isArray(sources) || sources.length === 0) return true
      const url = (referrer || '').toLowerCase()
      const utm = new URL(request.url).search.toLowerCase()
      const any = sources.some((s) => {
        if (s === 'organic') return url.includes('google') || url.includes('bing') || url.includes('yahoo')
        if (s === 'paid_search') return utm.includes('utm_medium=cpc') || url.includes('gclid=')
        if (s === 'social') return /(facebook|instagram|twitter|t.co|linkedin|pinterest|tiktok)/.test(url)
        if (s === 'email') return utm.includes('utm_medium=email')
        if (s === 'referral') return url && !/(google|bing|facebook|instagram|twitter|linkedin)/.test(url)
        return true
      })
      return any
    }

    function matchesCountry(allowed) {
      if (!Array.isArray(allowed) || allowed.length === 0) return true
      return allowed.some((c) => c && country && country.toLowerCase().startsWith(c[0].toLowerCase()))
    }

    // GeoIP fallback if country header missing
    if (!country) {
      try {
        const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
        const ctl = new AbortController()
        const to = setTimeout(() => ctl.abort(), 800)
        const geoResp = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: ctl.signal })
        clearTimeout(to)
        try {
          const geo = await geoResp.json()
          if (geo && typeof geo.country === 'string' && geo.country.length) {
            country = geo.country
          }
        } catch {}
      } catch {}
    }

    const eligibleTests = activeTests.filter((t) => {
      const targeting = t.targeting || {}
      return matchesDevice(targeting.deviceType) &&
             matchesTrafficSource(targeting.trafficSources) &&
             matchesCountry(targeting.countries)
    })

    const testsToUse = eligibleTests.length > 0 ? eligibleTests : []
    if (testsToUse.length === 0) {
      return new Response(JSON.stringify({ ok: true, hasTest: false, originalPrice: null }), { status: 200 })
    }

    // Generate consistent assignment based on visitor
    const visitorId = getVisitorId(request)
    const test = testsToUse[0]
    const assignment = assignVisitorToVariant(visitorId, test.variations, test.trafficSplit)
    
    if (!assignment) {
      // Fallback to control
      const controlVariation = test.variations.find(v => v.isControl)
      return new Response(JSON.stringify({ 
        ok: true, 
        hasTest: true,
        testId: test.id,
        variation: controlVariation?.label || 'A',
        price: controlVariation?.price || null,
        isControl: true
      }), { status: 200 })
    }

    // Return the assigned variation and set durable visitor cookie
    const body = JSON.stringify({ 
      ok: true, 
      hasTest: true,
      testId: test.id,
      variation: assignment.label,
      price: assignment.price,
      isControl: assignment.isControl
    })
    const outHeaders = new Headers({ 'Content-Type': 'application/json' })
    const existingVisitor = getVisitorId(request)
    if (existingVisitor) {
      outHeaders.set('Set-Cookie', `pt_vid=${existingVisitor}; Path=/; Max-Age=${60 * 60 * 24 * 365}; Secure; SameSite=Lax`)
    }
    return new Response(body, { status: 200, headers: outHeaders })

  } catch (error) {
    console.error('App proxy error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Internal server error' 
    }), { status: 500 })
  }
}

// Generate consistent visitor ID (you can improve this)
function getVisitorId(request) {
  // Try to get from cookies first
  const cookies = request.headers.get('cookie') || ''
  const visitorMatch = cookies.match(/visitor_id=([^;]+)/)
  if (visitorMatch) {
    return visitorMatch[1]
  }
  
  // Fallback to IP + User Agent hash
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const hash = simpleHash(ip + userAgent)
  return `visitor_${hash}`
}

// Assign visitor to variant based on traffic split
function assignVisitorToVariant(visitorId, variations, trafficSplit) {
  if (!variations || variations.length === 0 || !trafficSplit || trafficSplit.length === 0) {
    return null
  }

  // Create consistent hash from visitor ID
  const hash = simpleHash(visitorId)
  const random = (hash % 10000) / 10000 // 0-1 range
  
  let cumulative = 0
  for (let i = 0; i < variations.length; i++) {
    const percentage = trafficSplit[i] || 0
    cumulative += percentage / 100
    
    if (random <= cumulative) {
      return variations[i]
    }
  }
  
  // Fallback to last variation
  return variations[variations.length - 1]
}

// Simple hash function
function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

