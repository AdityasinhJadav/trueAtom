import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const action = async ({ request }) => {
  const { payload } = await authenticate.webhook(request)

  try {
    const order = payload
    const createdAt = order.created_at ? new Date(order.created_at) : new Date()

    for (const li of order.line_items || []) {
      const props = li.properties || []
      const testId = props.find(p => p.name === 'pt_testId')?.value
      const variation = props.find(p => p.name === 'pt_variation')?.value

      if (testId && variation) {
        await prisma.event.create({
          data: {
            type: 'purchase',
            testId: String(testId),
            variation: String(variation),
            productId: li.product_id ? String(li.product_id) : null,
            variantId: li.variant_id ? String(li.variant_id) : null,
            qty: typeof li.quantity === 'number' ? li.quantity : 1,
            revenueCents: Math.round(Number(li.price || 0) * 100),
            ts: createdAt,
          }
        })
      }
    }

    return new Response(null, { status: 200 })
  } catch (e) {
    console.error('orders.create handler error', e)
    return new Response(null, { status: 500 })
  }
}

export const loader = async () => new Response(null, { status: 200 })


