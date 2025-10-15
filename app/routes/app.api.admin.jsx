import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const resource = url.searchParams.get('resource') // customers | orders | products
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)

    const { admin } = await authenticate.admin(request)

    if (resource === 'customers') {
      const resp = await admin.graphql(`#graphql
        query($first:Int!){ customers(first:$first){ edges{ node{ id email firstName lastName state createdAt } } } }
      `, { variables: { first: limit } })
      const data = await resp.json()
      if (!data || data.errors) {
        return new Response(JSON.stringify({ ok:false, errors: data?.errors || 'Unexpected customers response' }), { status: 500 })
      }
      return new Response(JSON.stringify({ ok:true, data: data.data.customers.edges.map(e=>e.node) }), { status: 200 })
    }

    if (resource === 'orders') {
      const resp = await admin.graphql(`#graphql
        query($first:Int!){ orders(first:$first){ edges{ node{ id name createdAt totalPriceSet{ shopMoney{ amount currencyCode } } customer{ id email } } } } }
      `, { variables: { first: limit } })
      const data = await resp.json()
      if (!data || data.errors) {
        return new Response(JSON.stringify({ ok:false, errors: data?.errors || 'Unexpected orders response' }), { status: 500 })
      }
      return new Response(JSON.stringify({ ok:true, data: data.data.orders.edges.map(e=>e.node) }), { status: 200 })
    }

    if (resource === 'products') {
      const resp = await admin.graphql(`#graphql
        query($first:Int!){ products(first:$first){ edges{ node{ id title status createdAt variants(first:25){ edges{ node{ id title price } } } } } } }
      `, { variables: { first: limit } })
      const data = await resp.json()
      if (!data || data.errors) {
        return new Response(JSON.stringify({ ok:false, errors: data?.errors || 'Unexpected products response' }), { status: 500 })
      }
      return new Response(JSON.stringify({ ok:true, data: data.data.products.edges.map(e=>e.node) }), { status: 200 })
    }

    return new Response(JSON.stringify({ ok:false, error: 'invalid resource' }), { status: 400 })
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error: String(err && err.message || err) }), { status: 500 })
  }
}


