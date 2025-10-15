import prisma from '../db.server.js'

/**
 * Analytics Service for TrueAtoms Price Testing
 * Handles real-time data collection, processing, and statistical analysis
 */

export class AnalyticsService {
  /**
   * Get comprehensive test analytics data
   */
  static async getTestAnalytics(testId, dateRange = '7d') {
    try {
      const test = await prisma.test.findUnique({
        where: { id: testId },
        include: {
          product: true
        }
      })

      if (!test) {
        throw new Error('Test not found')
      }

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      switch (dateRange) {
        case '1d':
          startDate.setDate(endDate.getDate() - 1)
          break
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        default:
          startDate.setDate(endDate.getDate() - 7)
      }

      // Get all events for this test
      const events = await prisma.event.findMany({
        where: {
          testId: testId,
          ts: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { ts: 'asc' }
      })

      // Process events into analytics data
      const analytics = this.processEventsToAnalytics(events, test)
      
      return {
        test,
        analytics,
        dateRange: {
          start: startDate,
          end: endDate
        },
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('AnalyticsService.getTestAnalytics error:', error)
      throw error
    }
  }

  /**
   * Process raw events into structured analytics data
   */
  static processEventsToAnalytics(events, test) {
    const variations = test.variations || []
    const trafficSplit = test.trafficSplit || []
    
    // Initialize variation performance data
    const variationPerformance = variations.map((variation, index) => ({
      variation: variation.label,
      label: variation.isControl ? 'Control' : `Variant ${variation.label}`,
      price: variation.price,
      prices: variation.prices || null,
      trafficPercentage: trafficSplit[index] || 0,
      visitors: 0,
      conversions: 0,
      addToCart: 0,
      conversionRate: 0,
      revenue: 0,
      revenuePerVisitor: 0,
      isControl: variation.isControl,
      events: []
    }))

    // Group events by variation
    const eventsByVariation = {}
    variations.forEach(v => {
      eventsByVariation[v.label] = []
    })

    // Process each event
    events.forEach(event => {
      const variation = eventsByVariation[event.variation]
      if (variation) {
        variation.push(event)
      }
    })

    // Calculate metrics for each variation
    variationPerformance.forEach(perf => {
      const variationEvents = eventsByVariation[perf.variation] || []
      
      // Count unique visitors (page_view events)
      const uniqueVisitors = new Set(
        variationEvents
          .filter(e => e.type === 'page_view')
          .map(e => e.path) // Using path as visitor identifier for now
      )
      perf.visitors = uniqueVisitors.size

      // Count conversions (purchase events)
      const conversions = variationEvents.filter(e => e.type === 'purchase')
      perf.conversions = conversions.length

      // Count add to cart events
      const addToCart = variationEvents.filter(e => e.type === 'add_to_cart')
      perf.addToCart = addToCart.length

      // Calculate conversion rate
      perf.conversionRate = perf.visitors > 0 ? (perf.conversions / perf.visitors) * 100 : 0

      // Calculate total revenue
      perf.revenue = conversions.reduce((sum, e) => sum + (e.revenueCents || 0), 0) / 100

      // Calculate revenue per visitor
      perf.revenuePerVisitor = perf.visitors > 0 ? perf.revenue / perf.visitors : 0

      // Store events for detailed analysis
      perf.events = variationEvents
    })

    // Calculate overall KPIs
    const totalVisitors = variationPerformance.reduce((sum, v) => sum + v.visitors, 0)
    const totalConversions = variationPerformance.reduce((sum, v) => sum + v.conversions, 0)
    const totalRevenue = variationPerformance.reduce((sum, v) => sum + v.revenue, 0)
    const revenuePerVisitor = totalVisitors > 0 ? totalRevenue / totalVisitors : 0

    // Generate time series data for charts
    const chartData = this.generateTimeSeriesData(events, variations)

    return {
      variationPerformance,
      kpis: {
        totalVisitors,
        totalConversions,
        totalRevenue,
        revenuePerVisitor,
        conversionRate: totalVisitors > 0 ? (totalConversions / totalVisitors) * 100 : 0
      },
      chartData,
      events: events.slice(-100) // Last 100 events for detailed view
    }
  }

  /**
   * Generate time series data for charts
   */
  static generateTimeSeriesData(events, variations) {
    const timeSeries = {}
    const dateMap = new Map()

    // Initialize date buckets
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      dateMap.set(dateKey, {
        date: dateKey,
        A_conversions: 0,
        B_conversions: 0,
        A_revenue: 0,
        B_revenue: 0,
        A_visitors: 0,
        B_visitors: 0
      })
    }

    // Process events into time buckets
    events.forEach(event => {
      const dateKey = event.ts.toISOString().split('T')[0]
      const dayData = dateMap.get(dateKey)
      
      if (dayData) {
        const variation = event.variation
        if (event.type === 'purchase') {
          dayData[`${variation}_conversions`]++
          dayData[`${variation}_revenue`] += (event.revenueCents || 0) / 100
        } else if (event.type === 'page_view') {
          dayData[`${variation}_visitors`]++
        }
      }
    })

    return Array.from(dateMap.values())
  }

  /**
   * Calculate statistical significance between variations using proper statistical tests
   */
  static calculateStatisticalSignificance(variationPerformance, controlVariation) {
    if (!controlVariation) {
      return {
        confidence: 0,
        pValue: 1,
        winner: null,
        lift: 0,
        recommendation: 'No control variation found',
        method: 'none'
      }
    }

    const control = variationPerformance.find(v => v.variation === controlVariation)
    if (!control) {
      return {
        confidence: 0,
        pValue: 1,
        winner: null,
        lift: 0,
        recommendation: 'Control variation not found in performance data',
        method: 'none'
      }
    }

    const testVariations = variationPerformance.filter(v => v.variation !== controlVariation)
    
    if (testVariations.length === 0) {
      return {
        confidence: 0,
        pValue: 1,
        winner: null,
        lift: 0,
        recommendation: 'No test variations found',
        method: 'none'
      }
    }

    // Calculate statistical significance for each test variation
    const results = testVariations.map(variation => {
      const controlConversions = control.conversions
      const controlVisitors = control.visitors
      const testConversions = variation.conversions
      const testVisitors = variation.visitors

      if (controlVisitors === 0 || testVisitors === 0) {
        return {
          variation: variation.variation,
          confidence: 0,
          pValue: 1,
          lift: 0,
          isSignificant: false,
          method: 'insufficient_data'
        }
      }

      // Calculate conversion rates
      const controlRate = controlConversions / controlVisitors
      const testRate = testConversions / testVisitors

      // Calculate lift
      const lift = controlRate > 0 ? ((testRate - controlRate) / controlRate) * 100 : 0

      // Use Chi-Square test for statistical significance
      const chiSquareResult = this.chiSquareTest(controlConversions, controlVisitors, testConversions, testVisitors)
      
      // Use Fisher's Exact Test for small samples
      const fisherResult = this.fishersExactTest(controlConversions, controlVisitors, testConversions, testVisitors)
      
      // Use the more appropriate test based on sample size
      const useFisher = (controlVisitors < 30 || testVisitors < 30) && 
                       (controlConversions < 5 || testConversions < 5)
      
      const result = useFisher ? fisherResult : chiSquareResult
      
      // Calculate confidence interval for the difference
      const confidenceInterval = this.calculateConfidenceInterval(
        controlRate, testRate, controlVisitors, testVisitors
      )

      return {
        variation: variation.variation,
        confidence: Math.round(result.confidence),
        pValue: Math.round(result.pValue * 1000) / 1000,
        lift: Math.round(lift * 10) / 10,
        isSignificant: result.pValue < 0.05 && Math.abs(lift) >= 5,
        method: useFisher ? 'fishers_exact' : 'chi_square',
        confidenceInterval,
        sampleSize: controlVisitors + testVisitors,
        power: this.calculateStatisticalPower(controlRate, testRate, controlVisitors, testVisitors)
      }
    })

    // Find the best performing variation
    const bestVariation = results.reduce((best, current) => {
      if (current.isSignificant && current.lift > (best.lift || 0)) {
        return current
      }
      return best
    }, results[0] || {})

    const winner = bestVariation.isSignificant ? bestVariation : null

    // Calculate overall test power
    const overallPower = results.reduce((sum, r) => sum + (r.power || 0), 0) / results.length

    return {
      confidence: winner ? winner.confidence : Math.max(...results.map(r => r.confidence)),
      pValue: winner ? winner.pValue : Math.min(...results.map(r => r.pValue)),
      winner: winner ? winner.variation : null,
      lift: winner ? winner.lift : Math.max(...results.map(r => r.lift)),
      recommendation: winner 
        ? `Winner: ${winner.variation} shows ${winner.lift}% improvement with ${winner.confidence}% confidence`
        : overallPower < 0.8 
          ? 'Insufficient statistical power. Increase sample size or test duration.'
          : 'No statistically significant winner found. Continue testing or increase sample size.',
      allResults: results,
      overallPower: Math.round(overallPower * 100),
      method: winner ? winner.method : 'none'
    }
  }

  /**
   * Chi-Square test for independence
   */
  static chiSquareTest(controlConversions, controlVisitors, testConversions, testVisitors) {
    const controlNonConversions = controlVisitors - controlConversions
    const testNonConversions = testVisitors - testConversions
    
    const totalVisitors = controlVisitors + testVisitors
    const totalConversions = controlConversions + testConversions
    const totalNonConversions = controlNonConversions + testNonConversions
    
    // Expected values
    const expectedControlConversions = (controlVisitors * totalConversions) / totalVisitors
    const expectedTestConversions = (testVisitors * totalConversions) / totalVisitors
    const expectedControlNonConversions = (controlVisitors * totalNonConversions) / totalVisitors
    const expectedTestNonConversions = (testVisitors * totalNonConversions) / totalVisitors
    
    // Chi-square statistic
    const chiSquare = 
      Math.pow(controlConversions - expectedControlConversions, 2) / expectedControlConversions +
      Math.pow(testConversions - expectedTestConversions, 2) / expectedTestConversions +
      Math.pow(controlNonConversions - expectedControlNonConversions, 2) / expectedControlNonConversions +
      Math.pow(testNonConversions - expectedTestNonConversions, 2) / expectedTestNonConversions
    
    // Degrees of freedom = 1 for 2x2 contingency table
    const pValue = this.chiSquarePValue(chiSquare, 1)
    const confidence = (1 - pValue) * 100
    
    return { pValue, confidence }
  }

  /**
   * Fisher's Exact Test for small samples
   */
  static fishersExactTest(controlConversions, controlVisitors, testConversions, testVisitors) {
    // Simplified Fisher's exact test implementation
    // In production, you'd want to use a proper statistical library
    
    const controlRate = controlConversions / controlVisitors
    const testRate = testConversions / testVisitors
    
    // Use normal approximation for small samples
    const pooledRate = (controlConversions + testConversions) / (controlVisitors + testVisitors)
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlVisitors + 1/testVisitors))
    const zScore = se > 0 ? (testRate - controlRate) / se : 0
    
    const pValue = Math.max(0, Math.min(1, 2 * (1 - this.normalCDF(Math.abs(zScore)))))
    const confidence = (1 - pValue) * 100
    
    return { pValue, confidence }
  }

  /**
   * Calculate confidence interval for the difference in proportions
   */
  static calculateConfidenceInterval(controlRate, testRate, controlVisitors, testVisitors) {
    const difference = testRate - controlRate
    const se = Math.sqrt(
      (controlRate * (1 - controlRate)) / controlVisitors +
      (testRate * (1 - testRate)) / testVisitors
    )
    
    const z95 = 1.96 // 95% confidence interval
    const margin = z95 * se
    
    return {
      lower: difference - margin,
      upper: difference + margin,
      difference: difference
    }
  }

  /**
   * Calculate statistical power
   */
  static calculateStatisticalPower(controlRate, testRate, controlVisitors, testVisitors) {
    // Simplified power calculation
    const effectSize = Math.abs(testRate - controlRate)
    const pooledRate = (controlRate + testRate) / 2
    const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlVisitors + 1/testVisitors))
    
    // Power approximation
    const zAlpha = 1.96 // 95% confidence
    const zBeta = (effectSize / se) - zAlpha
    
    return Math.max(0, Math.min(1, this.normalCDF(zBeta)))
  }

  /**
   * Chi-square p-value calculation
   */
  static chiSquarePValue(chiSquare, degreesOfFreedom) {
    // Simplified chi-square p-value calculation
    // In production, use a proper statistical library
    if (degreesOfFreedom === 1) {
      return 2 * (1 - this.normalCDF(Math.sqrt(chiSquare)))
    }
    // For other degrees of freedom, you'd need a more complex implementation
    return 1 - this.normalCDF(Math.sqrt(chiSquare))
  }

  /**
   * Normal CDF approximation for statistical calculations
   */
  static normalCDF(x) {
    // Approximation of the normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)))
  }

  /**
   * Error function approximation
   */
  static erf(x) {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911

    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
  }

  /**
   * Get dashboard analytics for all tests
   */
  static async getDashboardAnalytics() {
    try {
      const tests = await prisma.test.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
      })

      const totalTests = tests.length
      const activeTests = tests.filter(t => t.status === 'Running').length
      const completedTests = tests.filter(t => t.status === 'Completed').length
      const draftTests = tests.filter(t => t.status === 'Draft').length

      // Get recent activity
      const recentEvents = await prisma.event.findMany({
        orderBy: { ts: 'desc' },
        take: 10,
        include: {
          // Note: We'd need to add a relation to Test in the schema for this
        }
      })

      return {
        totalTests,
        activeTests,
        completedTests,
        draftTests,
        recentActivity: recentEvents
      }
    } catch (error) {
      console.error('AnalyticsService.getDashboardAnalytics error:', error)
      throw error
    }
  }
}

export default AnalyticsService
