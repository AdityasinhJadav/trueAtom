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
        { title: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { productType: { contains: search, mode: 'insensitive' } }
      ]
    } : {}

    const products = await prisma.product.findMany({
      where,
      include: {
        variants: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { lastSynced: 'desc' },
      take: limit
    })

    // Transform to match frontend expectations
    const transformedProducts = products.map(product => ({
      id: product.shopifyId,
      title: product.title,
      handle: product.handle,
      status: product.status,
      vendor: product.vendor,
      productType: product.productType,
      image: product.image,
      variants: product.variants.map(variant => ({
        id: variant.shopifyId,
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
        inventory: variant.inventory
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }))

    return new Response(JSON.stringify({
      ok: true,
      data: transformedProducts,
      count: transformedProducts.length
    }), { status: 200 })

  } catch (err) {
    console.error('Products API error:', err)
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(err?.message || err) 
    }), { status: 500 })
  }
}

