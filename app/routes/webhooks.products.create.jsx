import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const action = async ({ request }) => {
  try {
    const { topic, shop, session, admin, payload } = await authenticate.webhook(request)
    
    console.log('Product created webhook received:', { topic, shop })

    // Parse the product data from webhook payload
    const product = JSON.parse(payload)
    const shopifyId = product.id.toString()

    // Check if product already exists
    const existingProduct = await prisma.product.findUnique({
      where: { shopifyId }
    })

    if (existingProduct) {
      console.log('Product already exists, skipping webhook sync')
      return new Response('OK', { status: 200 })
    }

    // Fetch full product data from Shopify API
    const productResponse = await admin.graphql(`
      query($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          status
          vendor
          productType
          tags
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                weight
                weightUnit
              }
            }
          }
          createdAt
          updatedAt
        }
      }
    `, { variables: { id: product.id } })

    const productData = await productResponse.json()
    if (productData.errors) {
      console.error('Error fetching product data:', productData.errors)
      return new Response('Error', { status: 500 })
    }

    const fullProduct = productData.data.product

    // Create product in database
    const newProduct = await prisma.product.create({
      data: {
        shopifyId,
        title: fullProduct.title,
        handle: fullProduct.handle,
        status: fullProduct.status,
        vendor: fullProduct.vendor,
        productType: fullProduct.productType,
        tags: fullProduct.tags ? JSON.stringify(fullProduct.tags) : null,
        image: fullProduct.images.edges[0]?.node?.url || null,
        lastSynced: new Date()
      }
    })

    // Create variants
    for (const edge of fullProduct.variants.edges) {
      const variant = edge.node
      const variantShopifyId = variant.id.split('/').pop()

      await prisma.productVariant.create({
        data: {
          shopifyId: variantShopifyId,
          productId: newProduct.id,
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          inventory: variant.inventoryQuantity,
          weight: variant.weight,
          weightUnit: variant.weightUnit,
          lastSynced: new Date()
        }
      })
    }

    console.log(`Product ${shopifyId} synced via webhook`)
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Product create webhook error:', error)
    return new Response('Error', { status: 500 })
  }
}

