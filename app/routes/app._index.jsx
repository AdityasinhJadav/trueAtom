import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import Card from "../components/Card";
import SyncStatus from "../components/SyncStatus";
import { TestTube, TrendingUp, DollarSign, Users } from "lucide-react";
import { useTest } from "../contexts/TestContext";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Check if we need to sync data
  try {
    const lastSync = await prisma.product.findFirst({
      orderBy: { lastSynced: 'desc' },
      select: { lastSynced: true }
    })

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const shouldSync = !lastSync || lastSync.lastSynced < oneHourAgo

    if (shouldSync) {
      // Sync products directly
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
      if (!data.errors && data.data) {
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

        // Auto-sync completed successfully
      } else {
        // GraphQL errors occurred
      }
    }
  } catch (error) {
    // Auto-sync failed
  }

  // Load data from database for the dashboard
  try {
    const [products, customers, tests] = await Promise.all([
      prisma.product.findMany({
        take: 100,
        include: { variants: true }
      }),
      prisma.customer.findMany({
        take: 100
      }),
      prisma.test.findMany({
        take: 100
      })
    ]);

    return {
      products: products.map(p => ({
        id: p.shopifyId,
        title: p.title,
        status: p.status,
        vendor: p.vendor,
        variants: p.variants.map(v => ({
          id: v.shopifyId,
          title: v.title,
          price: v.price,
          sku: v.sku
        }))
      })),
      customers: customers.map(c => ({
        id: c.shopifyId,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName
      })),
      tests: tests.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt
      }))
    };
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return {
      products: [],
      customers: [],
      tests: []
    };
  }
};

export default function Index({ loaderData }) {
  // Get data from loader instead of context
  const tests = loaderData?.tests || []
  const products = loaderData?.products || []
  const customers = loaderData?.customers || []
  
  // Calculate real stats from actual tests
  const totalTests = tests.length;
  const activeTests = tests.filter(test => test.status === 'Running').length;
  const completedTests = tests.filter(test => test.status === 'Completed').length;
  const draftTests = tests.filter(test => test.status === 'Draft').length;
  
  // Calculate store stats
  const totalProducts = products.length;
  const totalCustomers = customers.length;

  return (
    <div className="p-6 space-y-6">
      {/* Create A/B Test primary CTA (top, black button) */}
      <div>
        <s-link href="/app/create" className="inline-block px-4 py-2 rounded-lg bg-black no-underline hover:bg-gray-900 transition-colors">
          <span className="text-white font-medium">Create new A/B test</span>
        </s-link>
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your price testing performance</p>
        </div>
        <SyncStatus />
      </div>

      

      {/* Store Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Store Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalProducts}</p>
              <p className="text-sm text-gray-500 mt-1">In database</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50">
              <TestTube className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCustomers}</p>
              <p className="text-sm text-gray-500 mt-1">Total customers</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Test Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalTests}</p>
              <p className="text-sm text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <TestTube className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeTests}</p>
              <p className="text-sm text-gray-500 mt-1">Currently running</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{completedTests}</p>
              <p className="text-sm text-gray-500 mt-1">Finished tests</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Draft Tests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{draftTests}</p>
              <p className="text-sm text-gray-500 mt-1">Ready to launch</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {tests.length === 0 ? (
            <div className="text-center py-8">
              <TestTube className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No tests yet</p>
              <p className="text-sm text-gray-400">Create your first test to see activity here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tests.slice(0, 3).map((test) => (
                <div key={test.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    test.status === 'Running' ? 'bg-green-500' : 
                    test.status === 'Completed' ? 'bg-blue-500' : 
                    test.status === 'Draft' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{test.name}</p>
                    <p className="text-xs text-gray-500">
                      {test.status} • {new Date(test.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
