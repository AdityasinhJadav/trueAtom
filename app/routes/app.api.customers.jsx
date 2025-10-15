import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 250)
    const search = url.searchParams.get('search') || ''

    const { admin } = await authenticate.admin(request)

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    } : {}

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { lastSynced: 'desc' },
      take: limit
    })

    const transformedCustomers = customers.map(customer => ({
      id: customer.shopifyId,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      state: customer.state,
      totalSpent: customer.totalSpent,
      ordersCount: customer.ordersCount,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    }))

    return new Response(JSON.stringify({
      ok: true,
      data: transformedCustomers,
      count: transformedCustomers.length
    }), { status: 200 })

  } catch (err) {
    console.error('Customers API error:', err)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(err?.message || err) 
    }), { status: 500 })
  }
}

