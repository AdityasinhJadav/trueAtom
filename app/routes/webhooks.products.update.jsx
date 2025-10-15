import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const action = async ({ request }) => {
  try {
    const { topic, shop, session, admin, payload } = await authenticate.webhook(request)
    
    console.log('Product updated webhook received:', { topic, shop })

    const product = JSON.parse(payload)
    const shopifyId = product.id.toString()

    // Fetch updated product data from Shopify API
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
      console.error('Error fetching updated product data:', productData.errors)
      return new Response('Error', { status: 500 })
    }

    const fullProduct = productData.data.product

    // Update product in database
    const updatedProduct = await prisma.product.upsert({
      where: { shopifyId },
      update: {
        title: fullProduct.title,
        handle: fullProduct.handle,
        status: fullProduct.status,
        vendor: fullProduct.vendor,
        productType: fullProduct.productType,
        tags: fullProduct.tags ? JSON.stringify(fullProduct.tags) : null,
        image: fullProduct.images.edges[0]?.node?.url || null,
        lastSynced: new Date()
      },
      create: {
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

    // Update variants
    for (const edge of fullProduct.variants.edges) {
      const variant = edge.node
      const variantShopifyId = variant.id.split('/').pop()

      await prisma.productVariant.upsert({
        where: { shopifyId: variantShopifyId },
        update: {
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          inventory: variant.inventoryQuantity,
          weight: variant.weight,
          weightUnit: variant.weightUnit,
          lastSynced: new Date()
        },
        create: {
          shopifyId: variantShopifyId,
          productId: updatedProduct.id,
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

    console.log(`Product ${shopifyId} updated via webhook`)
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Product update webhook error:', error)
    return new Response('Error', { status: 500 })
  }
}

