import { unauthenticated } from '../shopify.server'
import prisma from '../db.server'

export const action = async ({ request }) => {
  // Validate request came from Shopify App Proxy
  await unauthenticated.appProxy(request)

  try {
    const body = await request.json()
    const { type, payload } = body || {}

    if (!type || !payload || !payload.testId || !payload.variation) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid payload' }), { status: 400 })
    }

    // Enhanced event data storage
    const eventData = {
      type,
      testId: String(payload.testId),
      variation: String(payload.variation),
      productId: payload.productId ? String(payload.productId) : null,
      variantId: payload.variantId ? String(payload.variantId) : null,
      qty: typeof payload.qty === 'number' ? payload.qty : null,
      revenueCents: typeof payload.revenueCents === 'number' ? payload.revenueCents : null,
      path: payload.path ? String(payload.path) : null,
      ts: payload.ts ? new Date(payload.ts) : new Date(),
      // Enhanced tracking data
      visitorId: payload.visitorId ? String(payload.visitorId) : null,
      sessionId: payload.sessionId ? String(payload.sessionId) : null,
      referrer: payload.referrer ? String(payload.referrer) : null,
      userAgent: payload.userAgent ? String(payload.userAgent) : null,
      screenResolution: payload.screenResolution ? String(payload.screenResolution) : null,
      viewportSize: payload.viewportSize ? String(payload.viewportSize) : null,
      timezone: payload.timezone ? String(payload.timezone) : null,
      language: payload.language ? String(payload.language) : null,
    }

    await prisma.event.create({
      data: eventData
    })

    // Update test statistics in real-time (optional optimization)
    try {
      await updateTestStats(payload.testId, type, payload.variation)
    } catch (statsError) {
      console.error('Failed to update test stats:', statsError)
      // Don't fail the main request if stats update fails
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (error) {
    console.error('proxy.events error', error)
    return new Response(JSON.stringify({ ok: false, error: 'Failed to store event' }), { status: 500 })
  }
}

// Helper function to update test statistics
async function updateTestStats(testId, eventType, variation) {
  // This could be used to maintain real-time counters
  // For now, we'll rely on the analytics service to calculate stats on-demand
  // In a high-traffic scenario, you might want to maintain counters here
}

export const loader = async () => new Response(JSON.stringify({ ok: true }), { status: 200 })


