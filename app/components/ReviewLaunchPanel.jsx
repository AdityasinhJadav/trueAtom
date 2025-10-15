import { useState } from 'react'
import { CheckCircle, AlertCircle, ExternalLink, Copy, Code } from 'lucide-react'

export default function ReviewLaunchPanel({ 
  testData,
  onSaveDraft,
  onLaunchTest 
}) {
  const [isLaunching, setIsLaunching] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [launchedTest, setLaunchedTest] = useState(null)

  const validationErrors = []
  if (!testData.name || !testData.name.trim()) validationErrors.push('Test name is required')
  if (!testData.selectedProducts || testData.selectedProducts.length === 0) {
    validationErrors.push('At least 1 product must be selected')
  }
  if (!testData.variations || testData.variations.length === 0) {
    validationErrors.push('Number of variations must be chosen')
  }
  if (testData.variations) {
    const hasInvalidPrice = testData.variations.some(v => !v.price || v.price <= 0)
    if (hasInvalidPrice) validationErrors.push('Each variation must have a valid price')
  }
  if (testData.trafficSplit) {
    const total = testData.trafficSplit.reduce((sum, p) => sum + p, 0)
    if (Math.abs(total - 100) > 0.1) validationErrors.push('Traffic splits must sum to 100%')
  }

  const canLaunch = validationErrors.length === 0

  const handleLaunch = async () => {
    setIsLaunching(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const newTest = {
        id: `test_${Date.now()}`,
        name: testData.name,
        hypothesis: testData.hypothesis || '',
        status: 'Running',
        createdAt: new Date().toISOString(),
        ...testData,
      }
      setLaunchedTest(newTest)
      setShowSuccess(true)
      onLaunchTest(newTest)
    } catch (error) {
      console.error('Launch failed:', error)
    } finally {
      setIsLaunching(false)
    }
  }

  const handleSaveDraft = () => {
    const draftTest = {
      id: `draft_${Date.now()}`,
      name: testData.name || 'Untitled Test',
      hypothesis: testData.hypothesis || '',
      status: 'Draft',
      createdAt: new Date().toISOString(),
      ...testData,
    }
    onSaveDraft(draftTest)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  if (showSuccess && launchedTest) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">Test Launched Successfully!</h3>
              <p className="text-sm text-green-700">Your price test is now running</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Test ID:</span>
              <span className="text-sm font-mono text-green-900">{launchedTest.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Status:</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Running</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-200">
            <a href="/analytics" className="inline-flex items-center space-x-2 text-sm text-green-700 hover:text-green-800">
              <ExternalLink className="h-4 w-4" />
              <span>View Analytics</span>
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Implementation</h3>
            <button onClick={() => setShowCode(!showCode)} className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700">
              <Code className="h-4 w-4" />
              <span>{showCode ? 'Hide' : 'Show'} Code</span>
            </button>
          </div>
          {showCode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">JavaScript (Frontend)</h4>
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-green-400 text-xs rounded-lg overflow-x-auto">{`// Add to your product page
const testId = '${launchedTest.id}';
const variation = localStorage.getItem(\`price_test_\${testId}\`);

if (variation) {
  // User already assigned to variation
  const price = getVariationPrice(variation);
  updatePriceDisplay(price);
} else {
  // Assign user to variation based on traffic split
  const assignedVariation = assignVariation(testId);
  localStorage.setItem(\`price_test_\${testId}\`, assignedVariation);
  const price = getVariationPrice(assignedVariation);
  updatePriceDisplay(price);
}

function assignVariation(testId) {
  // Your traffic split logic here
  const random = Math.random() * 100;
  if (random < 50) return 'A'; // Control
  return 'B'; // Variation
}`}</pre>
                  <button onClick={() => copyToClipboard(`const testId = '${launchedTest.id}';`)} className="absolute top-2 right-2 p-1 bg-gray-700 text-gray-300 hover:text-white rounded">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Shopify Liquid</h4>
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-blue-400 text-xs rounded-lg overflow-x-auto">{`<!-- Add to product.liquid -->
{% assign test_id = '${launchedTest.id}' %}
{% assign user_variation = request.cookies['price_test_' | append: test_id] %}

{% if user_variation %}
  {% assign test_price = product.price %}
  {% if user_variation == 'B' %}
    {% assign test_price = product.price | times: 1.1 %}
  {% endif %}
{% else %}
  {% assign random = 'now' | date: '%N' | modulo: 100 %}
  {% if random < 50 %}
    {% assign test_price = product.price %}
    {% assign user_variation = 'A' %}
  {% else %}
    {% assign test_price = product.price | times: 1.1 %}
    {% assign user_variation = 'B' %}
  {% endif %}
{% endif %}

<span class="price">{{ test_price | money }}</span>`}</pre>
                  <button onClick={() => copyToClipboard(`{% assign test_id = '${launchedTest.id}' %}`)} className="absolute top-2 right-2 p-1 bg-gray-700 text-gray-300 hover:text-white rounded">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Server-side (Cookie)</h4>
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-yellow-400 text-xs rounded-lg overflow-x-auto">{`// Node.js/Express example
app.get('/product/:id', (req, res) => {
  const testId = '${launchedTest.id}';
  const cookieName = \`price_test_\${testId}\`;
  let variation = req.cookies[cookieName];
  
  if (!variation) {
    // Assign variation based on traffic split
    variation = Math.random() < 0.5 ? 'A' : 'B';
    res.cookie(cookieName, variation, { maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
  }
  
  const price = variation === 'A' ? product.price : product.price * 1.1;
  res.render('product', { price, variation });
});`}</pre>
                  <button onClick={() => copyToClipboard(`const testId = '${launchedTest.id}';`)} className="absolute top-2 right-2 p-1 bg-gray-700 text-gray-300 hover:text-white rounded">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Test Summary</h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Test Type:</span>
            <span className="font-medium">{testData.selectedProducts?.length === 1 ? 'Single Product' : 'Grouped Products'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Products:</span>
            <span className="font-medium">{testData.selectedProducts?.length || 0} selected</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Variations:</span>
              <span className="font-medium">{testData.variations?.length || 0} configured</span>
            </div>
            {testData.variations?.map((variation, index) => (
              <div key={index} className="ml-4 flex justify-between text-xs">
                <span className="text-gray-500">{variation.label} ({variation.isControl ? 'Control' : `Variation ${variation.index}`}):</span>
                <span>${(variation.price / 100).toFixed(2)} ({Math.round(testData.trafficSplit?.[index] || 0)}%)</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Goal:</span>
            <span className="font-medium">{testData.selectedGoal === 'revenue_per_visitor' ? 'Revenue per visitor' : testData.selectedGoal === 'conversion_rate' ? 'Conversion rate' : 'Average order value'}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Targeting:</span>
            </div>
            <div className="ml-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Device:</span>
                <span>{testData.targeting?.deviceType === 'all' ? 'All devices' : testData.targeting?.deviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Visitors:</span>
                <span>{testData.targeting?.visitorType === 'all' ? 'All visitors' : testData.targeting?.visitorType}</span>
              </div>
              {(testData.targeting?.trafficSources || []).length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sources:</span>
                  <span>{(testData.targeting?.trafficSources || []).join(', ')}</span>
                </div>
              )}
              {(testData.targeting?.countries || []).length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Countries:</span>
                  <span>{(testData.targeting?.countries || []).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="text-sm font-medium text-red-900">Please fix the following issues:</h4>
          </div>
          <ul className="space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <button onClick={handleSaveDraft} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Save Draft</button>
        <button onClick={handleLaunch} disabled={!canLaunch || isLaunching} className={`w-full px-4 py-2 rounded-lg transition-colors ${canLaunch && !isLaunching ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>{isLaunching ? 'Launching...' : 'Launch Test'}</button>
      </div>
    </div>
  )
}


