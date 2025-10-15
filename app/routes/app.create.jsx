import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { authenticate } from '../shopify.server'
import prisma from '../db.server'
import Card from '../components/Card'
import ProductPicker from '../components/ProductPicker'
import VariationsConfigurator from '../components/VariationsConfigurator'
import TrafficSplit from '../components/TrafficSplit'
import ExperimentGoalSelector from '../components/ExperimentGoalSelector'
import AudienceTargeting from '../components/AudienceTargeting'
import ReviewLaunchPanel from '../components/ReviewLaunchPanel'
import ClientOnly from '../components/ClientOnly'
import TestCreationWizard from '../components/TestCreationWizard'
import { useTest } from '../contexts/TestContext'

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Load products from database
  try {
    // fetch shop currency
    let currencyCode = 'USD'
    try {
      const resp = await admin.graphql(`#graphql
        query { shop { currencyCode } }
      `)
      const data = await resp.json()
      currencyCode = data?.data?.shop?.currencyCode || 'USD'
    } catch {}

    const products = await prisma.product.findMany({
      take: 100,
      include: { variants: true }
    });

    // Fetch collections (first 50) with product IDs for Collection selection
    let collections = []
    try {
      const cresp = await admin.graphql(`#graphql
        query Collections($first: Int!) {
          collections(first: $first) {
            edges { node { id title products(first: 100) { edges { node { id } } } } }
          }
        }
      `, { variables: { first: 50 } })
      const cjson = await cresp.json()
      if (!cjson.errors && cjson.data?.collections?.edges) {
        collections = cjson.data.collections.edges.map(e => ({
          id: e.node.id.split('/').pop(),
          title: e.node.title,
          productIds: e.node.products.edges.map(pe => pe.node.id.split('/').pop())
        }))
      }
    } catch {}

    return {
      currencyCode,
      products: products.map(p => ({
        id: p.shopifyId,
        title: p.title,
        handle: p.handle,
        status: p.status,
        vendor: p.vendor,
        productType: p.productType,
        tags: p.tags ? JSON.parse(p.tags) : [],
        image: p.image,
        price: p.price,
        variants: p.variants.map(v => ({
          id: v.shopifyId,
          title: v.title,
          price: v.price,
          sku: v.sku,
          inventory: v.inventory
        }))
      })),
      collections
    };
  } catch (error) {
    console.error('Error loading products for create page:', error);
    return {
      products: []
    };
  }
};

export default function CreateTest({ loaderData }) {
  const { dispatch } = useTest()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)
  
  // Form state
  const [testName, setTestName] = useState('')
  const [description, setDescription] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [duration, setDuration] = useState(7)
  const [durationUnit, setDurationUnit] = useState('days')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [variations, setVariations] = useState([])
  const [trafficSplit, setTrafficSplit] = useState([])
  const [selectedGoal, setSelectedGoal] = useState('revenue_per_visitor')
  const [targeting, setTargeting] = useState({ deviceType: 'all', visitorType: 'all', trafficSources: [], countries: [], frequencyCap: null, utmFilter: '' })
  
  // Automation settings for variations
  const [automationPercent, setAutomationPercent] = useState(10)
  const [automationAction, setAutomationAction] = useState('increase')
  const [automationTargets, setAutomationTargets] = useState([])
  const [rounding, setRounding] = useState('round')

  // Get products and currency from loader data
  const products = loaderData?.products || []
  const collections = loaderData?.collections || []
  const currencyCode = loaderData?.currencyCode || 'USD'

  const handleSaveDraft = async (draftTest) => {
    try {
      const payload = {
        ...draftTest,
        status: 'Draft',
        productId: draftTest.productId || draftTest.selectedProducts?.[0]?.id || selectedProducts?.[0]?.id
      }
      console.log('Saving draft payload', payload)
      const resp = await fetch('/app/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await resp.json()
      console.log('Save draft response', resp.status, json)
      if (json?.ok && json.data) {
        const saved = json.data
        // Mirror server record into context so Price Tests updates immediately
        dispatch({
          type: 'ADD_TEST',
          payload: {
            id: saved.id,
            name: saved.name || draftTest.name,
            status: 'Draft',
            createdAt: saved.createdAt || new Date().toISOString(),
            selectedProducts: draftTest.selectedProducts,
            variations: draftTest.variations,
            trafficSplit: draftTest.trafficSplit,
            selectedGoal: draftTest.selectedGoal,
          }
        })
      } else {
        alert(`Failed to save draft: ${json?.error || resp.statusText}`)
      }
      // Notify other tabs/pages and force list refresh on landing
      try { window.dispatchEvent(new CustomEvent('tests:updated')) } catch {}
      navigate('/app/additional?refresh=1')
    } catch (e) {
      console.error('Save draft failed', e)
      alert('Save draft failed. Check console for details.')
    }
  }

  const handleLaunchTest = async (launchedTest) => {
    try {
      const payload = {
        ...launchedTest,
        status: 'Running',
        productId: launchedTest.productId || launchedTest.selectedProducts?.[0]?.id || selectedProducts?.[0]?.id
      }
      console.log('Launching test payload', payload)
      const resp = await fetch('/app/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await resp.json()
      console.log('Launch test response', resp.status, json)
      if (json?.ok && json.data) {
        const saved = json.data
        dispatch({
          type: 'ADD_TEST',
          payload: {
            id: saved.id,
            name: saved.name || launchedTest.name,
            status: 'Running',
            createdAt: saved.createdAt || new Date().toISOString(),
            selectedProducts: launchedTest.selectedProducts,
            variations: launchedTest.variations,
            trafficSplit: launchedTest.trafficSplit,
            selectedGoal: launchedTest.selectedGoal,
          }
        })
      } else {
        alert(`Failed to launch test: ${json?.error || resp.statusText}`)
      }
      try { window.dispatchEvent(new CustomEvent('tests:updated')) } catch {}
      navigate('/app/additional?refresh=1')
    } catch (e) {
      console.error('Launch test failed', e)
      alert('Launch test failed. Check console for details.')
    }
  }

  // Step validation logic
  const isStepValid = (step) => {
    switch(step) {
      case 1: // Test Information
        return testName.trim().length > 0 && duration > 0
      case 2: // Product Selection
        return selectedProducts.length > 0
      case 3: // Variations Configuration
        return variations.length > 0 && variations.every(v => v.price > 0)
      case 4: // Traffic Split
        return trafficSplit.length > 0 && trafficSplit.reduce((sum, val) => sum + val, 0) === 100
      case 5: // Goals
        return selectedGoal && selectedGoal.length > 0
      case 6: // Targeting
        return true // Targeting is optional
      case 7: // Review
        return testName && selectedProducts.length > 0 && variations.length > 0 && trafficSplit.length > 0
      default:
        return false
    }
  }

  const handleStepChange = (step) => {
    setCurrentStep(step)
  }

  const handleComplete = () => {
    handleLaunchTest(testData)
  }

  const testData = {
    name: testName,
    description,
    hypothesis,
    duration,
    durationUnit,
    selectedProducts,
    variations,
    trafficSplit,
    selectedGoal,
    targeting,
    stoppedVariations: []
  }

  // Step content components
  const renderStepContent = () => {
    switch(currentStep) {
      case 1: // Test Information
  return (
          <div className="space-y-6">
      <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Information</h2>
              <p className="text-gray-600 mb-6">Let's start with the basic details of your price test.</p>
      </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="testName" className="block text-sm font-medium text-gray-700 mb-2">Test Name *</label>
            <input
              type="text"
              id="testName"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Enter a descriptive name for your test"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>
              
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief description of what this test aims to achieve"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">Optional: Brief overview of the test purpose and expected outcomes</p>
          </div>
              
          <div>
            <label htmlFor="hypothesis" className="block text-sm font-medium text-gray-700 mb-2">Hypothesis</label>
            <textarea
              id="hypothesis"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Describe your hypothesis for this test. What do you expect to happen and why?"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white resize-none"
            />
            <p className="text-sm text-gray-500 mt-1">Optional: Explain your reasoning and expected outcomes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">Test Duration *</label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                min="1"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
              />
            </div>
            <div>
              <label htmlFor="durationUnit" className="block text-sm font-medium text-gray-700 mb-2">Duration Unit *</label>
              <select
                id="durationUnit"
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
              
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The test will automatically complete and show final results after {duration} {durationUnit}. You can also manually stop the test anytime from the test details page.
            </p>
          </div>
        </div>
          </div>
        )

      case 2: // Product Selection
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Selection</h2>
              <p className="text-gray-600 mb-6">Choose which products you want to test different prices for.</p>
            </div>
            
        <ProductPicker 
          selectedProducts={selectedProducts} 
          onProductsChange={setSelectedProducts}
          products={products}
          collections={collections}
          currencyCode={currencyCode}
        />

      {selectedProducts.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Great!</strong> You've selected {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} for testing.
                </p>
              </div>
            )}
          </div>
        )

      case 3: // Variations Configuration
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Price Variations</h2>
              <p className="text-gray-600 mb-6">Set up different price points to test against each other.</p>
            </div>
            
            {selectedProducts.length > 0 ? (
              <VariationsConfigurator 
                currencyCode={currencyCode} 
                selectedProducts={selectedProducts} 
                variations={variations} 
                onVariationsChange={setVariations}
                automationPercent={automationPercent}
                onAutomationPercentChange={setAutomationPercent}
                automationAction={automationAction}
                onAutomationActionChange={setAutomationAction}
                automationTargets={automationTargets}
                onAutomationTargetsChange={setAutomationTargets}
                rounding={rounding}
                onRoundingChange={setRounding}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Please select products in the previous step first.</p>
              </div>
            )}
          </div>
        )

      case 4: // Traffic Split
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Traffic Distribution</h2>
              <p className="text-gray-600 mb-6">Decide how much traffic each variation should receive.</p>
            </div>
            
            {variations.length > 0 ? (
          <TrafficSplit variations={variations} onTrafficChange={setTrafficSplit} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Please configure variations in the previous step first.</p>
              </div>
            )}
          </div>
        )

      case 5: // Goals
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Success Metrics</h2>
              <p className="text-gray-600 mb-6">Define what success looks like for your test.</p>
            </div>
            
        <ExperimentGoalSelector selectedGoal={selectedGoal} onGoalChange={setSelectedGoal} />
          </div>
        )

      case 6: // Targeting
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Audience Targeting</h2>
              <p className="text-gray-600 mb-6">Optionally target specific audiences for your test.</p>
        </div>

        <AudienceTargeting targeting={targeting} onTargetingChange={setTargeting} />
          </div>
        )

      case 7: // Review
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Review & Launch</h2>
              <p className="text-gray-600 mb-6">Review your test configuration and launch when ready.</p>
            </div>
            
            {selectedProducts.length > 0 && variations.length > 0 ? (
          <ReviewLaunchPanel testData={testData} onSaveDraft={handleSaveDraft} onLaunchTest={handleLaunchTest} />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Please complete all previous steps first.</p>
              </div>
            )}
          </div>
        )

      default:
        return <div>Invalid step</div>
    }
  }

  // Edit mode: prefill from server only (no localStorage)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const editId = params.get('edit')
    if (!editId) return
    let cancelled = false
    async function load() {
      try {
        const resp = await fetch(`/app/api/tests?id=${encodeURIComponent(editId)}`)
        const data = await resp.json()
        if (!data?.ok) return
        const t = data.test
        if (cancelled) return
        if (t?.name) setTestName(t.name)
        if (t?.selectedGoal) setSelectedGoal(t.selectedGoal)
        if (Array.isArray(t?.variations)) setVariations(t.variations)
        if (Array.isArray(t?.trafficSplit)) setTrafficSplit(t.trafficSplit)
        if (Array.isArray(t?.selectedProducts)) setSelectedProducts(t.selectedProducts)
        if (t?.description) setDescription(t.description)
        if (t?.hypothesis) setHypothesis(t.hypothesis)
        if (t?.duration) setDuration(t.duration)
        if (t?.durationUnit) setDurationUnit(t.durationUnit)
        if (t?.targeting) setTargeting(t.targeting)
      } catch {}
    }
    load()
    return () => { cancelled = true }
  }, [location.search])

  return (
    <ClientOnly fallback={
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Test</h1>
          <p className="text-gray-600 mt-1">Set up a new pricing experiment to optimize your revenue</p>
          <div className="mt-2">
            <span className="text-xs text-gray-600 mr-2">Primary Goal:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {selectedGoal === 'revenue_per_visitor' ? 'Revenue per visitor' : selectedGoal === 'conversion_rate' ? 'Conversion rate' : selectedGoal === 'average_order_value' ? 'Average order value' : selectedGoal === 'add_to_cart_rate' ? 'Add to cart rate' : selectedGoal}
            </span>
          </div>
        </div>

        <TestCreationWizard
          currentStep={currentStep}
          onStepChange={handleStepChange}
          isStepValid={isStepValid(currentStep)}
          onComplete={handleComplete}
        >
          {renderStepContent()}
        </TestCreationWizard>
      </div>
    </ClientOnly>
  )
}


