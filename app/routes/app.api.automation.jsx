import { authenticate } from '../shopify.server'
import PriceAutomationService from '../services/priceAutomation'
import prisma from '../db.server'

export const loader = async ({ request }) => {
  try {
    await authenticate.admin(request)
    
    const url = new URL(request.url)
    const testId = url.searchParams.get('testId')
    
    if (!testId) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Test ID required' 
      }), { status: 400 })
    }

    // Get automation logs for the test
    const logs = await prisma.automationLog.findMany({
      where: { testId },
      orderBy: { timestamp: 'desc' },
      take: 50
    })

    return new Response(JSON.stringify({
      ok: true,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        details: JSON.parse(log.details || '{}'),
        timestamp: log.timestamp
      }))
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Automation API error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to load automation data' 
    }), { status: 500 })
  }
}

export const action = async ({ request }) => {
  try {
    await authenticate.admin(request)
    
    const body = await request.json()
    const { action, testId, data } = body || {}
    
    switch (action) {
      case 'process_rules':
        const result = await PriceAutomationService.processAutomationRules(testId)
        return new Response(JSON.stringify({
          ok: true,
          result
        }), { status: 200 })
        
      case 'create_rule':
        return await createAutomationRule(testId, data)
        
      case 'update_rule':
        return await updateAutomationRule(testId, data)
        
      case 'delete_rule':
        return await deleteAutomationRule(testId, data.ruleId)
        
      case 'enable_automation':
        return await enableAutomation(testId, data.enabled)
        
      default:
        return new Response(JSON.stringify({ 
          ok: false, 
          error: 'Invalid action' 
        }), { status: 400 })
    }

  } catch (error) {
    console.error('Automation API action error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to process automation request' 
    }), { status: 500 })
  }
}

async function createAutomationRule(testId, ruleData) {
  try {
    const test = await prisma.test.findUnique({
      where: { id: testId }
    })

    if (!test) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Test not found' 
      }), { status: 404 })
    }

    const automationSettings = test.automationSettings || { enabled: false, rules: [] }
    const newRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...ruleData,
      createdAt: new Date().toISOString()
    }

    automationSettings.rules = [...automationSettings.rules, newRule]

    await prisma.test.update({
      where: { id: testId },
      data: { automationSettings }
    })

    return new Response(JSON.stringify({
      ok: true,
      rule: newRule
    }), { status: 200 })

  } catch (error) {
    console.error('Create automation rule error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to create automation rule' 
    }), { status: 500 })
  }
}

async function updateAutomationRule(testId, ruleData) {
  try {
    const test = await prisma.test.findUnique({
      where: { id: testId }
    })

    if (!test) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Test not found' 
      }), { status: 404 })
    }

    const automationSettings = test.automationSettings || { enabled: false, rules: [] }
    const ruleIndex = automationSettings.rules.findIndex(rule => rule.id === ruleData.id)

    if (ruleIndex === -1) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Rule not found' 
      }), { status: 404 })
    }

    automationSettings.rules[ruleIndex] = {
      ...automationSettings.rules[ruleIndex],
      ...ruleData,
      updatedAt: new Date().toISOString()
    }

    await prisma.test.update({
      where: { id: testId },
      data: { automationSettings }
    })

    return new Response(JSON.stringify({
      ok: true,
      rule: automationSettings.rules[ruleIndex]
    }), { status: 200 })

  } catch (error) {
    console.error('Update automation rule error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to update automation rule' 
    }), { status: 500 })
  }
}

async function deleteAutomationRule(testId, ruleId) {
  try {
    const test = await prisma.test.findUnique({
      where: { id: testId }
    })

    if (!test) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Test not found' 
      }), { status: 404 })
    }

    const automationSettings = test.automationSettings || { enabled: false, rules: [] }
    automationSettings.rules = automationSettings.rules.filter(rule => rule.id !== ruleId)

    await prisma.test.update({
      where: { id: testId },
      data: { automationSettings }
    })

    return new Response(JSON.stringify({
      ok: true,
      message: 'Rule deleted successfully'
    }), { status: 200 })

  } catch (error) {
    console.error('Delete automation rule error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to delete automation rule' 
    }), { status: 500 })
  }
}

async function enableAutomation(testId, enabled) {
  try {
    const test = await prisma.test.findUnique({
      where: { id: testId }
    })

    if (!test) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Test not found' 
      }), { status: 404 })
    }

    const automationSettings = test.automationSettings || { enabled: false, rules: [] }
    automationSettings.enabled = enabled

    await prisma.test.update({
      where: { id: testId },
      data: { automationSettings }
    })

    return new Response(JSON.stringify({
      ok: true,
      enabled,
      message: `Automation ${enabled ? 'enabled' : 'disabled'} successfully`
    }), { status: 200 })

  } catch (error) {
    console.error('Enable automation error:', error)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'Failed to update automation settings' 
    }), { status: 500 })
  }
}
