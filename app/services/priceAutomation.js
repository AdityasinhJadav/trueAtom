import prisma from '../db.server.js'
import AnalyticsService from './analytics.js'

/**
 * Price Automation Service for TrueAtoms
 * Handles dynamic price adjustments based on test performance
 */

export class PriceAutomationService {
  /**
   * Process automation rules for a test
   */
  static async processAutomationRules(testId) {
    try {
      const test = await prisma.test.findUnique({
        where: { id: testId },
        include: {
          product: true
        }
      })

      if (!test || test.status !== 'Running') {
        return { success: false, message: 'Test not found or not running' }
      }

      // Get current analytics
      const analytics = await AnalyticsService.getTestAnalytics(testId, '7d')
      const variationPerformance = analytics.analytics.variationPerformance

      if (!variationPerformance || variationPerformance.length === 0) {
        return { success: false, message: 'No performance data available' }
      }

      // Check if automation is enabled
      const automationSettings = test.automationSettings
      if (!automationSettings || !automationSettings.enabled) {
        return { success: false, message: 'Automation not enabled for this test' }
      }

      // Process each automation rule
      const results = []
      for (const rule of automationSettings.rules || []) {
        const result = await this.processAutomationRule(test, rule, variationPerformance)
        results.push(result)
      }

      return {
        success: true,
        results,
        message: `Processed ${results.length} automation rules`
      }

    } catch (error) {
      console.error('PriceAutomationService.processAutomationRules error:', error)
      throw error
    }
  }

  /**
   * Process a single automation rule
   */
  static async processAutomationRule(test, rule, variationPerformance) {
    try {
      const { condition, action, target, parameters } = rule

      // Evaluate condition
      const conditionMet = this.evaluateCondition(condition, variationPerformance, test)
      
      if (!conditionMet) {
        return {
          ruleId: rule.id,
          executed: false,
          reason: 'Condition not met'
        }
      }

      // Execute action
      const actionResult = await this.executeAction(action, target, parameters, test, variationPerformance)

      return {
        ruleId: rule.id,
        executed: true,
        action: actionResult,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('PriceAutomationService.processAutomationRule error:', error)
      return {
        ruleId: rule.id,
        executed: false,
        error: error.message
      }
    }
  }

  /**
   * Evaluate automation condition
   */
  static evaluateCondition(condition, variationPerformance, test) {
    const { type, operator, value, metric, timeWindow } = condition

    switch (type) {
      case 'performance_threshold':
        return this.evaluatePerformanceThreshold(condition, variationPerformance)
      
      case 'statistical_significance':
        return this.evaluateStatisticalSignificance(condition, variationPerformance)
      
      case 'time_based':
        return this.evaluateTimeBasedCondition(condition, test)
      
      case 'traffic_volume':
        return this.evaluateTrafficVolume(condition, variationPerformance)
      
      default:
        return false
    }
  }

  /**
   * Evaluate performance threshold condition
   */
  static evaluatePerformanceThreshold(condition, variationPerformance) {
    const { metric, operator, value, variation } = condition
    
    const targetVariation = variationPerformance.find(v => v.variation === variation)
    if (!targetVariation) return false

    const metricValue = this.getMetricValue(targetVariation, metric)
    return this.compareValues(metricValue, operator, value)
  }

  /**
   * Evaluate statistical significance condition
   */
  static evaluateStatisticalSignificance(condition, variationPerformance) {
    const { minConfidence, minLift, variation } = condition
    
    const controlVariation = variationPerformance.find(v => v.isControl)
    const targetVariation = variationPerformance.find(v => v.variation === variation)
    
    if (!controlVariation || !targetVariation) return false

    const statisticalResult = AnalyticsService.calculateStatisticalSignificance(
      variationPerformance, 
      controlVariation.variation
    )

    const variationResult = statisticalResult.allResults?.find(r => r.variation === variation)
    if (!variationResult) return false

    return variationResult.confidence >= minConfidence && 
           Math.abs(variationResult.lift) >= minLift
  }

  /**
   * Evaluate time-based condition
   */
  static evaluateTimeBasedCondition(condition, test) {
    const { timeWindow, operator } = condition
    
    const testStartTime = new Date(test.startedAt || test.createdAt)
    const now = new Date()
    const elapsedTime = now - testStartTime
    
    const timeWindowMs = this.parseTimeWindow(timeWindow)
    
    switch (operator) {
      case 'after':
        return elapsedTime >= timeWindowMs
      case 'before':
        return elapsedTime <= timeWindowMs
      default:
        return false
    }
  }

  /**
   * Evaluate traffic volume condition
   */
  static evaluateTrafficVolume(condition, variationPerformance) {
    const { minVisitors, variation } = condition
    
    const targetVariation = variationPerformance.find(v => v.variation === variation)
    if (!targetVariation) return false

    return targetVariation.visitors >= minVisitors
  }

  /**
   * Execute automation action
   */
  static async executeAction(action, target, parameters, test, variationPerformance) {
    switch (action) {
      case 'adjust_price':
        return await this.adjustPrice(target, parameters, test, variationPerformance)
      
      case 'stop_variation':
        return await this.stopVariation(target, parameters, test)
      
      case 'rebalance_traffic':
        return await this.rebalanceTraffic(target, parameters, test, variationPerformance)
      
      case 'extend_test':
        return await this.extendTest(target, parameters, test)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * Adjust price for a variation
   */
  static async adjustPrice(target, parameters, test, variationPerformance) {
    const { variation, adjustmentType, adjustmentValue, rounding } = parameters
    
    const targetVariation = variationPerformance.find(v => v.variation === variation)
    if (!targetVariation) {
      throw new Error(`Variation ${variation} not found`)
    }

    const currentPrice = targetVariation.price
    let newPrice

    switch (adjustmentType) {
      case 'percentage':
        const percentageChange = adjustmentValue / 100
        newPrice = currentPrice * (1 + percentageChange)
        break
      
      case 'fixed_amount':
        newPrice = currentPrice + adjustmentValue
        break
      
      case 'set_to':
        newPrice = adjustmentValue
        break
      
      default:
        throw new Error(`Unknown adjustment type: ${adjustmentType}`)
    }

    // Apply rounding
    newPrice = this.applyRounding(newPrice, rounding)

    // Update the test variations
    const updatedVariations = test.variations.map(v => {
      if (v.label === variation) {
        return { ...v, price: newPrice }
      }
      return v
    })

    await prisma.test.update({
      where: { id: test.id },
      data: { variations: updatedVariations }
    })

    // Log the automation action
    await this.logAutomationAction(test.id, 'adjust_price', {
      variation,
      oldPrice: currentPrice,
      newPrice,
      adjustmentType,
      adjustmentValue
    })

    return {
      action: 'adjust_price',
      variation,
      oldPrice: currentPrice,
      newPrice,
      success: true
    }
  }

  /**
   * Stop a variation
   */
  static async stopVariation(target, parameters, test) {
    const { variation, reason } = parameters
    
    const stoppedVariations = test.stoppedVariations || []
    if (!stoppedVariations.includes(variation)) {
      stoppedVariations.push(variation)
      
      await prisma.test.update({
        where: { id: test.id },
        data: { stoppedVariations }
      })

      // Log the automation action
      await this.logAutomationAction(test.id, 'stop_variation', {
        variation,
        reason
      })
    }

    return {
      action: 'stop_variation',
      variation,
      reason,
      success: true
    }
  }

  /**
   * Rebalance traffic between variations
   */
  static async rebalanceTraffic(target, parameters, test, variationPerformance) {
    const { strategy, parameters: rebalanceParams } = parameters
    
    let newTrafficSplit

    switch (strategy) {
      case 'winner_takes_more':
        newTrafficSplit = this.calculateWinnerTakesMoreSplit(variationPerformance, rebalanceParams)
        break
      
      case 'equal_split':
        newTrafficSplit = this.calculateEqualSplit(variationPerformance)
        break
      
      case 'custom':
        newTrafficSplit = rebalanceParams.customSplit
        break
      
      default:
        throw new Error(`Unknown rebalancing strategy: ${strategy}`)
    }

    // Validate traffic split
    const total = newTrafficSplit.reduce((sum, val) => sum + val, 0)
    if (Math.abs(total - 100) > 0.1) {
      throw new Error('Traffic split must sum to 100%')
    }

    await prisma.test.update({
      where: { id: test.id },
      data: { trafficSplit: newTrafficSplit }
    })

    // Log the automation action
    await this.logAutomationAction(test.id, 'rebalance_traffic', {
      strategy,
      oldSplit: test.trafficSplit,
      newSplit: newTrafficSplit
    })

    return {
      action: 'rebalance_traffic',
      strategy,
      oldSplit: test.trafficSplit,
      newSplit: newTrafficSplit,
      success: true
    }
  }

  /**
   * Extend test duration
   */
  static async extendTest(target, parameters, test) {
    const { extensionDays, reason } = parameters
    
    const currentDuration = test.duration || 7
    const newDuration = currentDuration + extensionDays

    await prisma.test.update({
      where: { id: test.id },
      data: { 
        duration: newDuration,
        // Update completion time if test was set to complete
        completedAt: null
      }
    })

    // Log the automation action
    await this.logAutomationAction(test.id, 'extend_test', {
      extensionDays,
      oldDuration: currentDuration,
      newDuration,
      reason
    })

    return {
      action: 'extend_test',
      extensionDays,
      oldDuration: currentDuration,
      newDuration,
      success: true
    }
  }

  /**
   * Helper methods
   */
  static getMetricValue(variation, metric) {
    switch (metric) {
      case 'conversion_rate':
        return variation.conversionRate
      case 'revenue_per_visitor':
        return variation.revenuePerVisitor
      case 'total_revenue':
        return variation.revenue
      case 'visitors':
        return variation.visitors
      default:
        return 0
    }
  }

  static compareValues(actual, operator, expected) {
    switch (operator) {
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      case 'equals':
        return Math.abs(actual - expected) < 0.01
      case 'greater_than_or_equal':
        return actual >= expected
      case 'less_than_or_equal':
        return actual <= expected
      default:
        return false
    }
  }

  static parseTimeWindow(timeWindow) {
    const { value, unit } = timeWindow
    switch (unit) {
      case 'minutes':
        return value * 60 * 1000
      case 'hours':
        return value * 60 * 60 * 1000
      case 'days':
        return value * 24 * 60 * 60 * 1000
      case 'weeks':
        return value * 7 * 24 * 60 * 60 * 1000
      default:
        return value * 24 * 60 * 60 * 1000 // Default to days
    }
  }

  static applyRounding(price, rounding) {
    switch (rounding) {
      case 'round':
        return Math.round(price)
      case 'round_up':
        return Math.ceil(price)
      case 'round_down':
        return Math.floor(price)
      case 'round_to_cent':
        return Math.round(price * 100) / 100
      case 'round_to_dollar':
        return Math.round(price)
      default:
        return price
    }
  }

  static calculateWinnerTakesMoreSplit(variationPerformance, params) {
    const { winnerBonus, minTraffic } = params
    const totalVariations = variationPerformance.length
    const baseTraffic = Math.max(minTraffic, (100 - winnerBonus) / (totalVariations - 1))
    
    // Find the best performing variation
    const winner = variationPerformance.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    )
    
    return variationPerformance.map(v => 
      v.variation === winner.variation ? winnerBonus : baseTraffic
    )
  }

  static calculateEqualSplit(variationPerformance) {
    const totalVariations = variationPerformance.length
    const equalShare = 100 / totalVariations
    return new Array(totalVariations).fill(equalShare)
  }

  static async logAutomationAction(testId, action, details) {
    try {
      // Store automation log in database
      await prisma.automationLog.create({
        data: {
          testId,
          action,
          details: JSON.stringify(details),
          timestamp: new Date()
        }
      })
    } catch (error) {
      console.error('Failed to log automation action:', error)
      // Don't fail the main operation if logging fails
    }
  }
}

export default PriceAutomationService
