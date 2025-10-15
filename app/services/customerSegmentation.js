import prisma from '../db.server.js'

/**
 * Customer Segmentation Service for TrueAtoms
 * Handles advanced customer targeting and segmentation
 */

export class CustomerSegmentationService {
  /**
   * Get customer segments for targeting
   */
  static async getCustomerSegments(shopDomain) {
    try {
      // Get customer data from database
      const customers = await prisma.customer.findMany({
        include: {
          orders: {
            include: {
              lineItems: true
            }
          }
        },
        take: 1000 // Limit for performance
      })

      // Calculate segments
      const segments = {
        highValue: this.calculateHighValueCustomers(customers),
        frequentBuyers: this.calculateFrequentBuyers(customers),
        newCustomers: this.calculateNewCustomers(customers),
        atRisk: this.calculateAtRiskCustomers(customers),
        geographic: this.calculateGeographicSegments(customers),
        behavioral: this.calculateBehavioralSegments(customers)
      }

      return segments

    } catch (error) {
      console.error('CustomerSegmentationService.getCustomerSegments error:', error)
      throw error
    }
  }

  /**
   * Calculate high-value customers (top 20% by revenue)
   */
  static calculateHighValueCustomers(customers) {
    const customersWithRevenue = customers.map(customer => ({
      ...customer,
      totalRevenue: customer.orders.reduce((sum, order) => 
        sum + parseFloat(order.totalPrice || 0), 0
      )
    }))

    customersWithRevenue.sort((a, b) => b.totalRevenue - a.totalRevenue)
    
    const top20Percent = Math.ceil(customersWithRevenue.length * 0.2)
    const highValueCustomers = customersWithRevenue.slice(0, top20Percent)

    return {
      name: 'High Value Customers',
      description: 'Top 20% of customers by total revenue',
      count: highValueCustomers.length,
      criteria: {
        minRevenue: highValueCustomers[highValueCustomers.length - 1]?.totalRevenue || 0
      },
      customers: highValueCustomers.map(c => c.shopifyId)
    }
  }

  /**
   * Calculate frequent buyers (customers with multiple orders)
   */
  static calculateFrequentBuyers(customers) {
    const frequentBuyers = customers.filter(customer => 
      customer.ordersCount >= 3
    )

    return {
      name: 'Frequent Buyers',
      description: 'Customers with 3 or more orders',
      count: frequentBuyers.length,
      criteria: {
        minOrders: 3
      },
      customers: frequentBuyers.map(c => c.shopifyId)
    }
  }

  /**
   * Calculate new customers (registered in last 30 days)
   */
  static calculateNewCustomers(customers) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const newCustomers = customers.filter(customer => 
      new Date(customer.createdAt) >= thirtyDaysAgo
    )

    return {
      name: 'New Customers',
      description: 'Customers registered in the last 30 days',
      count: newCustomers.length,
      criteria: {
        registeredAfter: thirtyDaysAgo
      },
      customers: newCustomers.map(c => c.shopifyId)
    }
  }

  /**
   * Calculate at-risk customers (haven't purchased in 90+ days)
   */
  static calculateAtRiskCustomers(customers) {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const atRiskCustomers = customers.filter(customer => {
      if (customer.ordersCount === 0) return false
      
      const lastOrder = customer.orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      
      return lastOrder && new Date(lastOrder.createdAt) < ninetyDaysAgo
    })

    return {
      name: 'At-Risk Customers',
      description: 'Customers who haven\'t purchased in 90+ days',
      count: atRiskCustomers.length,
      criteria: {
        lastPurchaseBefore: ninetyDaysAgo
      },
      customers: atRiskCustomers.map(c => c.shopifyId)
    }
  }

  /**
   * Calculate geographic segments
   */
  static calculateGeographicSegments(customers) {
    const countryGroups = {}
    
    customers.forEach(customer => {
      // Extract country from customer data (you'd need to add this field)
      const country = customer.country || 'Unknown'
      if (!countryGroups[country]) {
        countryGroups[country] = []
      }
      countryGroups[country].push(customer.shopifyId)
    })

    return Object.entries(countryGroups).map(([country, customerIds]) => ({
      name: `${country} Customers`,
      description: `Customers from ${country}`,
      count: customerIds.length,
      criteria: {
        country: country
      },
      customers: customerIds
    }))
  }

  /**
   * Calculate behavioral segments
   */
  static calculateBehavioralSegments(customers) {
    const segments = []

    // Cart abandoners (customers with no orders but high engagement)
    const cartAbandoners = customers.filter(customer => 
      customer.ordersCount === 0
    )

    if (cartAbandoners.length > 0) {
      segments.push({
        name: 'Cart Abandoners',
        description: 'Customers who haven\'t completed a purchase',
        count: cartAbandoners.length,
        criteria: {
          hasNoOrders: true
        },
        customers: cartAbandoners.map(c => c.shopifyId)
      })
    }

    // Seasonal buyers (customers who buy during specific periods)
    const seasonalBuyers = customers.filter(customer => {
      const orders = customer.orders
      if (orders.length === 0) return false
      
      // Check if customer has orders in specific months (e.g., holiday season)
      const holidayMonths = [11, 12] // November, December
      return orders.some(order => {
        const orderMonth = new Date(order.createdAt).getMonth() + 1
        return holidayMonths.includes(orderMonth)
      })
    })

    if (seasonalBuyers.length > 0) {
      segments.push({
        name: 'Seasonal Buyers',
        description: 'Customers who purchase during holiday seasons',
        count: seasonalBuyers.length,
        criteria: {
          purchasesInMonths: [11, 12]
        },
        customers: seasonalBuyers.map(c => c.shopifyId)
      })
    }

    return segments
  }

  /**
   * Evaluate targeting rules for a customer
   */
  static evaluateTargetingRules(customer, targetingRules) {
    const results = {}

    for (const [ruleName, rule] of Object.entries(targetingRules)) {
      results[ruleName] = this.evaluateTargetingRule(customer, rule)
    }

    return results
  }

  /**
   * Evaluate a single targeting rule
   */
  static evaluateTargetingRule(customer, rule) {
    const { type, conditions, operator = 'AND' } = rule

    switch (type) {
      case 'customer_attributes':
        return this.evaluateCustomerAttributeRule(customer, conditions, operator)
      
      case 'purchase_history':
        return this.evaluatePurchaseHistoryRule(customer, conditions, operator)
      
      case 'geographic':
        return this.evaluateGeographicRule(customer, conditions, operator)
      
      case 'behavioral':
        return this.evaluateBehavioralRule(customer, conditions, operator)
      
      default:
        return false
    }
  }

  /**
   * Evaluate customer attribute rules
   */
  static evaluateCustomerAttributeRule(customer, conditions, operator) {
    const results = conditions.map(condition => {
      const { attribute, operator: op, value } = condition
      
      switch (attribute) {
        case 'total_spent':
          const totalSpent = customer.orders?.reduce((sum, order) => 
            sum + parseFloat(order.totalPrice || 0), 0) || 0
          return this.compareValues(totalSpent, op, value)
        
        case 'order_count':
          return this.compareValues(customer.ordersCount || 0, op, value)
        
        case 'days_since_last_order':
          const lastOrder = customer.orders?.[0]
          if (!lastOrder) return op === 'greater_than' && value > 0
          
          const daysSince = Math.floor(
            (new Date() - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24)
          )
          return this.compareValues(daysSince, op, value)
        
        case 'customer_state':
          return customer.state === value
        
        default:
          return false
      }
    })

    return operator === 'AND' 
      ? results.every(r => r)
      : results.some(r => r)
  }

  /**
   * Evaluate purchase history rules
   */
  static evaluatePurchaseHistoryRule(customer, conditions, operator) {
    const results = conditions.map(condition => {
      const { metric, operator: op, value, timeWindow } = condition
      
      const orders = customer.orders || []
      const filteredOrders = this.filterOrdersByTimeWindow(orders, timeWindow)
      
      switch (metric) {
        case 'total_revenue':
          const revenue = filteredOrders.reduce((sum, order) => 
            sum + parseFloat(order.totalPrice || 0), 0)
          return this.compareValues(revenue, op, value)
        
        case 'order_frequency':
          const frequency = filteredOrders.length / this.getTimeWindowDays(timeWindow)
          return this.compareValues(frequency, op, value)
        
        case 'average_order_value':
          const avgOrderValue = filteredOrders.length > 0 
            ? filteredOrders.reduce((sum, order) => sum + parseFloat(order.totalPrice || 0), 0) / filteredOrders.length
            : 0
          return this.compareValues(avgOrderValue, op, value)
        
        default:
          return false
      }
    })

    return operator === 'AND' 
      ? results.every(r => r)
      : results.some(r => r)
  }

  /**
   * Evaluate geographic rules
   */
  static evaluateGeographicRule(customer, conditions, operator) {
    const results = conditions.map(condition => {
      const { type, operator: op, value } = condition
      
      switch (type) {
        case 'country':
          return customer.country === value
        
        case 'region':
          return customer.region === value
        
        case 'city':
          return customer.city === value
        
        default:
          return false
      }
    })

    return operator === 'AND' 
      ? results.every(r => r)
      : results.some(r => r)
  }

  /**
   * Evaluate behavioral rules
   */
  static evaluateBehavioralRule(customer, conditions, operator) {
    const results = conditions.map(condition => {
      const { behavior, operator: op, value } = condition
      
      switch (behavior) {
        case 'cart_abandonment':
          return customer.ordersCount === 0
        
        case 'repeat_purchase':
          return customer.ordersCount >= value
        
        case 'seasonal_buyer':
          // Check if customer has orders in specific months
          const orders = customer.orders || []
          const seasonalMonths = [11, 12] // Holiday season
          return orders.some(order => {
            const orderMonth = new Date(order.createdAt).getMonth() + 1
            return seasonalMonths.includes(orderMonth)
          })
        
        default:
          return false
      }
    })

    return operator === 'AND' 
      ? results.every(r => r)
      : results.some(r => r)
  }

  /**
   * Helper methods
   */
  static compareValues(actual, operator, expected) {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      case 'greater_than_or_equal':
        return actual >= expected
      case 'less_than_or_equal':
        return actual <= expected
      case 'contains':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase())
      case 'not_contains':
        return !String(actual).toLowerCase().includes(String(expected).toLowerCase())
      default:
        return false
    }
  }

  static filterOrdersByTimeWindow(orders, timeWindow) {
    if (!timeWindow) return orders
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.getTimeWindowDays(timeWindow))
    
    return orders.filter(order => new Date(order.createdAt) >= cutoffDate)
  }

  static getTimeWindowDays(timeWindow) {
    const { value, unit } = timeWindow
    switch (unit) {
      case 'days':
        return value
      case 'weeks':
        return value * 7
      case 'months':
        return value * 30
      case 'years':
        return value * 365
      default:
        return value
    }
  }

  /**
   * Get targeting recommendations for a test
   */
  static async getTargetingRecommendations(testId) {
    try {
      const test = await prisma.test.findUnique({
        where: { id: testId }
      })

      if (!test) {
        throw new Error('Test not found')
      }

      const segments = await this.getCustomerSegments()
      
      // Generate recommendations based on test goal
      const recommendations = this.generateTargetingRecommendations(test, segments)
      
      return recommendations

    } catch (error) {
      console.error('CustomerSegmentationService.getTargetingRecommendations error:', error)
      throw error
    }
  }

  /**
   * Generate targeting recommendations
   */
  static generateTargetingRecommendations(test, segments) {
    const { selectedGoal } = test
    const recommendations = []

    switch (selectedGoal) {
      case 'revenue_per_visitor':
        recommendations.push({
          type: 'customer_segment',
          segment: segments.highValue,
          reason: 'High-value customers typically have higher revenue per visitor',
          priority: 'high'
        })
        break
      
      case 'conversion_rate':
        recommendations.push({
          type: 'customer_segment',
          segment: segments.frequentBuyers,
          reason: 'Frequent buyers are more likely to convert',
          priority: 'high'
        })
        break
      
      case 'average_order_value':
        recommendations.push({
          type: 'customer_segment',
          segment: segments.highValue,
          reason: 'High-value customers have higher average order values',
          priority: 'high'
        })
        break
    }

    // Add general recommendations
    recommendations.push({
      type: 'geographic',
      segment: segments.geographic[0], // First geographic segment
      reason: 'Geographic targeting can improve test relevance',
      priority: 'medium'
    })

    return recommendations
  }
}

export default CustomerSegmentationService
