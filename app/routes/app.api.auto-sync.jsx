import { authenticate } from '../shopify.server'
import prisma from '../db.server'

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request)
    
    // Check if we've already synced data recently (within last hour)
    const lastSync = await prisma.product.findFirst({
      orderBy: { lastSynced: 'desc' },
      select: { lastSynced: true }
    })

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const shouldSync = !lastSync || lastSync.lastSynced < oneHourAgo

    if (!shouldSync) {
      return new Response(JSON.stringify({
        ok: true,
        message: 'Data already synced recently',
        lastSync: lastSync?.lastSynced
      }), { status: 200 })
    }

    // Simple product sync
    const resp = await admin.graphql(`
      query($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              vendor
              productType
              tags
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                  }
                }
              }
            }
          }
        }
      }
    `, { variables: { first: 50 } });

    const data = await resp.json();
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const products = data.data.products.edges.map(edge => edge.node);
    let syncedCount = 0;

    for (const product of products) {
      const shopifyId = product.id.split('/').pop();
      
      const productData = {
        shopifyId,
        title: product.title,
        handle: product.handle,
        status: product.status,
        vendor: product.vendor,
        productType: product.productType,
        tags: product.tags ? JSON.stringify(product.tags) : null,
        image: product.images.edges[0]?.node?.url || null,
        price: product.priceRange?.minVariantPrice?.amount || null,
        lastSynced: new Date()
      };

      const upsertedProduct = await prisma.product.upsert({
        where: { shopifyId },
        update: productData,
        create: productData
      });

      // Sync variants
      if (product.variants && product.variants.edges.length > 0) {
        for (const variantEdge of product.variants.edges) {
          const variant = variantEdge.node;
          const variantShopifyId = variant.id.split('/').pop();
          
          const variantData = {
            shopifyId: variantShopifyId,
            productId: upsertedProduct.id,
            title: variant.title,
            price: variant.price,
            sku: variant.sku,
            lastSynced: new Date()
          };

          await prisma.productVariant.upsert({
            where: { shopifyId: variantShopifyId },
            update: variantData,
            create: variantData
          });
        }
      }

      syncedCount++;
    }

    return new Response(JSON.stringify({
      ok: true,
      message: `Auto-sync completed: ${syncedCount} products synced`,
      syncedCount,
      timestamp: new Date().toISOString()
    }), { status: 200 })

  } catch (error) {
    console.error('Auto-sync error:', error)
    return new Response(JSON.stringify({
      ok: false,
      error: `Auto-sync failed: ${error.message}`
    }), { status: 500 })
  }
}
