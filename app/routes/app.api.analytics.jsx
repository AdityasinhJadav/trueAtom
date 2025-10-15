import { authenticate } from '../shopify.server'
import AnalyticsService from '../services/analytics.js'
import prisma from '../db.server'

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request)
    
    const url = new URL(request.url)
    const testId = url.searchParams.get('testId')
    const dateRange = url.searchParams.get('dateRange') || '7d'
    
    if (!testId) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Test ID required' 
      }), { status: 400 })
    }

    // Get comprehensive analytics for the test
    const testAnalytics = await AnalyticsService.getTestAnalytics(testId, dateRange)
    
    // Calculate statistical significance
    const controlVariation = testAnalytics.test.variations?.find(v => v.isControl)?.label
    const statisticalAnalysis = AnalyticsService.calculateStatisticalSignificance(
      testAnalytics.analytics.variationPerformance,
      controlVariation
    )

    return new Response(JSON.stringify({
      ok: true,
      analytics: testAnalytics.analytics,
      statisticalAnalysis,
      test: testAnalytics.test,
      dateRange: testAnalytics.dateRange,
      lastUpdated: testAnalytics.lastUpdated
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Analytics API error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to load analytics data' 
    }), { status: 500 })
  }
}

export const action = async ({ request }) => {
  try {
    await authenticate.admin(request)
    
    const body = await request.json()
    const { action, testId, data } = body || {}
    
    switch (action) {
      case 'export':
        // Handle CSV export
        const testAnalytics = await AnalyticsService.getTestAnalytics(testId, '30d')
        const csvData = generateCSVData(testAnalytics.analytics)
        
        return new Response(csvData, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="test-${testId}-analytics.csv"`
          }
        })
        
      default:
        return new Response(JSON.stringify({ 
          ok: false, 
          error: 'Invalid action' 
        }), { status: 400 })
    }

  } catch (error) {
    console.error('Analytics API action error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to process request' 
    }), { status: 500 })
  }
}

function generateCSVData(analytics) {
  const headers = [
    'Variant',
    'Label',
    'Price',
    'Visitors',
    'Conversions',
    'Add to Cart',
    'Conversion Rate (%)',
    'Revenue ($)',
    'Revenue per Visitor ($)',
    'Traffic Percentage (%)',
    'Is Control'
  ]
  const rows = [headers.join(',')]
  
  // Add variation performance data
  analytics.variationPerformance.forEach(variation => {
    const row = [
      variation.variation,
      variation.label,
      variation.price,
      variation.visitors,
      variation.conversions,
      variation.addToCart,
      variation.conversionRate.toFixed(2),
      variation.revenue.toFixed(2),
      variation.revenuePerVisitor.toFixed(2),
      variation.trafficPercentage.toFixed(1),
      variation.isControl ? 'Yes' : 'No'
    ]
    rows.push(row.join(','))
  })
  
  // Add summary section
  rows.push('') // Empty row
  rows.push('SUMMARY')
  rows.push(`Total Visitors,${analytics.kpis.totalVisitors}`)
  rows.push(`Total Conversions,${analytics.kpis.totalConversions}`)
  rows.push(`Total Revenue,$${analytics.kpis.totalRevenue.toFixed(2)}`)
  rows.push(`Overall Conversion Rate,${analytics.kpis.conversionRate.toFixed(2)}%`)
  rows.push(`Revenue per Visitor,$${analytics.kpis.revenuePerVisitor.toFixed(2)}`)
  
  // Add time series data if available
  if (analytics.chartData && analytics.chartData.length > 0) {
    rows.push('') // Empty row
    rows.push('TIME SERIES DATA')
    rows.push('Date,A Conversions,B Conversions,A Revenue,B Revenue')
    
    analytics.chartData.forEach(day => {
      const row = [
        day.date,
        day.A_conversions || 0,
        day.B_conversions || 0,
        (day.A_revenue || 0).toFixed(2),
        (day.B_revenue || 0).toFixed(2)
      ]
      rows.push(row.join(','))
    })
  }
  
  return rows.join('\n')
}
