import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const action = async ({ request }) => {
  const { payload } = await authenticate.webhook(request)
  try {
    // Store a minimal snapshot for analytics/debugging
    await prisma.event.create({
      data: {
        type: 'customer_create',
        testId: 'n/a',
        variation: 'n/a',
        productId: String(payload?.id || ''),
        path: 'webhook:customers/create',
        ts: new Date(payload?.created_at || Date.now()),
      }
    })
    return new Response(null, { status: 200 })
  } catch (e) {
    console.error('customers.create webhook error', e)
    return new Response(null, { status: 500 })
  }
}

export const loader = async () => new Response(null, { status: 200 })


