import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import Card from '../components/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Pause, Play, Archive, Settings, ArrowLeft, TrendingUp, Users, DollarSign, Target, CheckCircle, AlertCircle, ChevronDown, X } from 'lucide-react'
import { useTest } from '../contexts/TestContext'

export default function TestDetail() {
  const { testId } = useParams()
  const { tests, dispatch } = useTest()
  const [test, setTest] = useState(null)
  const [testData, setTestData] = useState(null)
  const [winnerAnalysis, setWinnerAnalysis] = useState(null)
  const [showProductModal, setShowProductModal] = useState(false)
  const [activeProductIndex, setActiveProductIndex] = useState(0)

  const getActiveProductId = () => test?.selectedProducts?.[activeProductIndex]?.id
  const getVariantPriceForActiveProduct = (variant) => {
    const pid = getActiveProductId()
    if (pid && variant?.prices && typeof variant.prices === 'object' && pid in variant.prices) {
      return variant.prices[pid]
    }
    return variant.price
  }
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (showProductModal) setShowProductModal(false)
        if (showWinnerModal) setShowWinnerModal(false)
        if (showSuccessMessage) setShowSuccessMessage(false)
      }
    }
    if (showProductModal || showWinnerModal || showSuccessMessage) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [showProductModal, showWinnerModal, showSuccessMessage])

  useEffect(() => {
    const foundTest = tests.find((t) => t.id === testId)
    if (foundTest) setTest(foundTest)

    // Load real analytics data
    loadTestAnalytics()
  }, [testId, tests])

  const loadTestAnalytics = async () => {
    try {
      const resp = await fetch(`/app/api/analytics?testId=${testId}&dateRange=30d`)
      const data = await resp.json()
      if (data?.ok) {
        setTestData({
          chartData: data.analytics.chartData || [],
          events: data.analytics.events || [],
          variationPerformance: data.analytics.variationPerformance || [],
          kpis: data.analytics.kpis || {
            totalVisitors: 0,
            totalConversions: 0,
            totalRevenue: 0,
            revenuePerVisitor: 0,
          },
        })
      }
    } catch (error) {
      console.error('Failed to load test analytics:', error)
      // Fallback to empty data
      setTestData({
        chartData: [],
        events: [],
        variationPerformance: [],
        kpis: {
          totalVisitors: 0,
          totalConversions: 0,
          totalRevenue: 0,
          revenuePerVisitor: 0,
        },
      })
    }
  }

  const handleStopTest = () => {
    if (test && test.status === 'Running') {
      const updatedTest = { ...test, status: 'Stopped' }
      dispatch({ type: 'UPDATE_TEST', payload: updatedTest })
      setTest(updatedTest)
    }
  }
  const handleStopVariation = (variation) => {
    if (test) dispatch({ type: 'STOP_VARIATION', payload: { testId: test.id, variation } })
  }
  const isVariationStopped = (variation) => test?.stoppedVariations?.includes(variation) || false

  if (!test) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Test not found</h2>
          <Link to="/app/additional" className="text-blue-600 hover:text-blue-700">Back to tests</Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Running': return 'bg-green-100 text-green-800'
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Paused': return 'bg-yellow-100 text-yellow-800'
      case 'Stopped': return 'bg-red-100 text-red-800'
      case 'Completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  const getGoalLabel = (goal) => {
    switch (goal) {
      case 'revenue_per_visitor': return 'Revenue per visitor'
      case 'conversion_rate': return 'Conversion rate'
      case 'average_order_value': return 'Average order value'
      default: return goal
    }
  }

  const handleSelectWinner = () => {
    if (!testData?.variationPerformance) return
    const variations = testData.variationPerformance
    const controlVariant = variations.find((v) => v.isControl)
    if (!controlVariant) {
      setWinnerAnalysis({ winner: null, reason: 'No control variant found. Please ensure one variation is marked as control.', confidenceLevel: 0, totalVisitors: 0, testDuration: 0, bestConversionRate: 0, controlConversionRate: 0, revenueImpact: 0, variations: [] })
      return
    }
    const analysis = calculateStatisticalSignificance(variations, controlVariant)
    setWinnerAnalysis(analysis)
    setSelectedWinner(analysis.winner)
    setShowWinnerModal(true)
  }

  const handleConfirmWinner = () => {
    if (selectedWinner) {
      const updatedAnalysis = { ...winnerAnalysis, winner: selectedWinner, reason: `Manually selected: ${selectedWinner.variation} chosen as winner`, confidenceLevel: 100 }
      setWinnerAnalysis(updatedAnalysis)
      setShowWinnerModal(false)
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 5000)
    }
  }

  const calculateStatisticalSignificance = (variations, control) => {
    const totalVisitors = variations.reduce((sum, v) => sum + v.visitors, 0)
    const testDuration = Math.floor((Date.now() - new Date(test.createdAt)) / (1000 * 60 * 60 * 24))
    const goal = test?.selectedGoal || 'revenue_per_visitor'

    const getGoalMetric = (v) => {
      switch (goal) {
        case 'conversion_rate':
          return v.conversionRate || 0
        case 'average_order_value': {
          const orders = v.conversions || 0
          return orders > 0 ? (v.revenue || 0) / orders : 0
        }
        case 'add_to_cart_rate': {
          const visitors = v.visitors || 0
          return visitors > 0 ? (v.addToCart || 0) / visitors : 0
        }
        case 'revenue_per_visitor':
        default: {
          const visitors = v.visitors || 0
          return visitors > 0 ? (v.revenue || 0) / visitors : 0
        }
      }
    }

    const controlMetric = getGoalMetric(control)

    const analyzedVariations = variations.map((variant) => {
      const variantMetric = getGoalMetric(variant)
      const denom = controlMetric === 0 ? 1 : controlMetric
      const improvement = ((variantMetric - controlMetric) / denom) * 100
      const sampleSize = variant.visitors
      const confidence = Math.min(95, Math.max(60, Math.sqrt(sampleSize) * 0.5 + Math.abs(improvement) * 0.3 + (testDuration > 7 ? 10 : 0)))
      let status = 'Not Significant'
      const isStoppedTest = test.status === 'Stopped'
      const minConfidence = isStoppedTest ? 70 : 85
      const minImprovement = isStoppedTest ? 1 : 3
      const minSampleSize = isStoppedTest ? 15 : 30
      if (confidence >= minConfidence && improvement > minImprovement && sampleSize >= minSampleSize) status = 'Winner'
      else if (confidence >= (isStoppedTest ? 60 : 75) && improvement > (isStoppedTest ? 0.5 : 1) && sampleSize >= (isStoppedTest ? 10 : 20)) status = 'Significant'
      return { ...variant, improvement, confidence: Math.round(confidence), status, isWinner: status === 'Winner' }
    })
    const winner = analyzedVariations.find((v) => v.isWinner)
    const recommendedWinner = winner || analyzedVariations.reduce((best, current) => (current.conversionRate > best.conversionRate ? current : best))
    const bestMetric = Math.max(...analyzedVariations.map((v) => getGoalMetric(v)))
    const revenueImpact = recommendedWinner ? (recommendedWinner.revenue - control.revenue) * (totalVisitors / 1000) : 0
    return { winner: recommendedWinner, confidenceLevel: recommendedWinner ? recommendedWinner.confidence : Math.max(...analyzedVariations.map((v) => v.confidence)), totalVisitors, testDuration, bestConversionRate: bestMetric, controlConversionRate: control.conversionRate, revenueImpact, variations: analyzedVariations, reason: winner ? `Winner: ${winner.variation} shows ${(winner.improvement || 0).toFixed(1)}% improvement with ${winner.confidence}% confidence` : `Best Performer: ${recommendedWinner.variation} shows ${(recommendedWinner.improvement || 0).toFixed(1)}% improvement with ${recommendedWinner.confidence}% confidence (not statistically significant)` }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/app/additional" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(test.status)}`}>{test.status}</span>
          {test.status === 'Running' && (
            <button onClick={handleStopTest} className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
              <Pause className="h-4 w-4" />
              <span>Stop Test</span>
            </button>
          )}
          <button className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Test Type</h3>
            <p className="text-lg font-semibold text-gray-900">{test.selectedProducts.length === 1 ? 'Single Product' : 'Grouped Products'}</p>
            <p className="text-xs text-gray-600 mt-1">
              {test.selectedProducts.length === 1 ? (test.selectedProducts[0]?.title || '1 product') : `${test.selectedProducts.length} products`}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Goal</h3>
            <p className="text-lg font-semibold text-gray-900">{getGoalLabel(test.selectedGoal)}</p>
            <p className="text-xs text-gray-600 mt-1">
              {test.selectedGoal === 'revenue_per_visitor' && 'Revenue / Visitors'}
              {test.selectedGoal === 'conversion_rate' && 'Conversions / Visitors'}
              {test.selectedGoal === 'average_order_value' && 'Revenue / Orders'}
              {test.selectedGoal === 'add_to_cart_rate' && 'Adds to cart / Visitors'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Audience</h3>
            <div className="text-sm text-gray-900">
              {(test.targeting?.deviceType || 'all')} • {(test.targeting?.visitorType || 'all')}
            </div>
            {(Array.isArray(test.targeting?.trafficSources) && test.targeting.trafficSources.length > 0) && (
              <p className="text-xs text-gray-600 mt-1">Sources: {test.targeting.trafficSources.join(', ')}</p>
            )}
            {(Array.isArray(test.targeting?.countries) && test.targeting.countries.length > 0) && (
              <p className="text-xs text-gray-600">Countries: {test.targeting.countries.join(', ')}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Start Date</h3>
            <p className="text-lg font-semibold text-gray-900">{new Date(test.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Duration</h3>
            <p className="text-lg font-semibold text-gray-900">{(test.duration && test.durationUnit) ? `${test.duration} ${test.durationUnit}` : (test.duration ? `${test.duration} days` : 'Not set')}</p>
          </div>
        </div>
      </Card>

      {showWinnerModal && winnerAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select Test Winner</h3>
                <p className="text-xs text-gray-600 mt-1">Choose the winning variation for your test</p>
              </div>
              <button onClick={() => setShowWinnerModal(false)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-blue-800">System Recommendation</h4>
                </div>
                <div className="text-xs text-blue-700">
                  <p className="mb-2">
                    <strong>Recommended Winner:</strong> {winnerAnalysis.winner?.variation}
                    {winnerAnalysis.winner?.isControl ? ' (Control)' : ` (Test ${testData?.variationPerformance.findIndex((v) => v.variation === winnerAnalysis.winner?.variation)})`}
                  </p>
                  <p className="mb-2"><strong>Confidence Level:</strong> {winnerAnalysis.confidenceLevel}%</p>
                  <p className="mb-2"><strong>Improvement:</strong> {(winnerAnalysis.winner?.improvement || 0).toFixed(1)}%</p>
                  <p className="text-[11px] text-blue-600">{winnerAnalysis.reason}</p>
                </div>
              </div>
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Choose Your Winner</h4>
                <div className="space-y-2">
                  {testData?.variationPerformance.map((variant, index) => (
                    <div key={variant.variation} className="relative">
                      <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedWinner?.variation === variant.variation ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="winner" value={variant.variation} checked={selectedWinner?.variation === variant.variation} onChange={() => setSelectedWinner(variant)} className="sr-only" />
                        <div className="flex items-center space-x-4 w-full">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white ${variant.variation === 'A' ? 'bg-blue-500' : variant.variation === 'B' ? 'bg-green-500' : variant.variation === 'C' ? 'bg-purple-500' : variant.variation === 'D' ? 'bg-orange-500' : variant.variation === 'E' ? 'bg-pink-500' : variant.variation === 'F' ? 'bg-indigo-500' : 'bg-gray-500'}`}>{variant.variation}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-semibold text-gray-900 text-sm">{variant.isControl ? 'Control' : `Test ${index}`} ({variant.variation})</h5>
                                <p className="text-xs text-gray-600">Conversion Rate: {(variant.conversionRate || 0).toFixed(2)}% | Visitors: {(variant.visitors || 0).toLocaleString()} | Revenue: ${(variant.revenue || 0).toLocaleString()}</p>
                              </div>
                              {selectedWinner?.variation === variant.variation && (
                                <div className="flex items-center space-x-1 text-blue-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-xs font-medium">Selected</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="text-xs text-gray-600">{selectedWinner ? `Selected: ${selectedWinner.variation}` : 'No variation selected'}</div>
              <div className="flex items-center space-x-2">
                <button onClick={() => setShowWinnerModal(false)} className="px-3 py-1.5 text-xs text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors">Cancel</button>
                <button onClick={handleConfirmWinner} disabled={!selectedWinner} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {test.status === 'Completed' && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-6 w-6 text-green-600" /></div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">Test Completed!</h3>
              <p className="text-sm text-green-700">Final results are now available. The test ran for the full duration.</p>
            </div>
          </div>
        </Card>
      )}

      {test.status === 'Stopped' && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg"><Pause className="h-6 w-6 text-red-600" /></div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Test Stopped</h3>
              <p className="text-sm text-red-700">This test was manually stopped. You can still analyze the results.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-6 w-6 text-blue-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Visitors</p>
              <p className="text-2xl font-bold text-gray-900">{testData?.variationPerformance.reduce((sum, v) => sum + v.visitors, 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg"><Target className="h-6 w-6 text-green-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Conversions</p>
              <p className="text-2xl font-bold text-gray-900">{testData?.variationPerformance.reduce((sum, v) => sum + v.conversions, 0)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="h-6 w-6 text-purple-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${testData?.variationPerformance.reduce((sum, v) => sum + v.revenue, 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg"><TrendingUp className="h-6 w-6 text-orange-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Revenue per Visitor</p>
              <p className="text-2xl font-bold text-gray-900">${testData?.variationPerformance.length > 0 ? (testData.variationPerformance.reduce((sum, v) => sum + v.revenue, 0) / testData.variationPerformance.reduce((sum, v) => sum + v.visitors, 0)).toFixed(2) : '0.00'}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Test Performance Report</h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
            <button onClick={handleSelectWinner} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Target className="h-4 w-4" />
              <span>Select the Winner</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full border border-gray-200 rounded-lg">
            <div className="flex bg-gray-100 border-b border-gray-200">
              <div className="w-80 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 flex-shrink-0">Name of products</div>
              <div className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 flex-shrink-0">Metric</div>
              {testData?.variationPerformance.map((variant, index) => (
                <div key={variant.variation} className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${variant.variation === 'A' ? 'bg-blue-500' : variant.variation === 'B' ? 'bg-green-500' : variant.variation === 'C' ? 'bg-purple-500' : variant.variation === 'D' ? 'bg-orange-500' : variant.variation === 'E' ? 'bg-pink-500' : variant.variation === 'F' ? 'bg-indigo-500' : 'bg-gray-500'}`}>{variant.variation}</div>
                      <span className="text-xs">{variant.isControl ? 'Original' : `Test ${index}`}</span>
                    </div>
                    {test.status === 'Running' && !isVariationStopped(variant.variation) && (
                      <button onClick={() => handleStopVariation(variant.variation)} className="p-1 hover:bg-red-100 rounded transition-colors group" title={`Stop ${variant.variation} variation`}>
                        <Pause className="h-3 w-3 text-red-500 group-hover:text-red-700" />
                      </button>
                    )}
                    {isVariationStopped(variant.variation) && (
                      <div className="p-1"><div className="h-3 w-3 bg-red-500 rounded-full" title="Stopped"></div></div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex border-b border-gray-200">
              <div className="w-80 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0 relative">
                <div className="flex items-center gap-2">
                  {test.selectedProducts.length > 0 && (
                    <div className="relative w-full">
                      <select
                        aria-label="Select product"
                        value={activeProductIndex}
                        onChange={(e) => setActiveProductIndex(parseInt(e.target.value))}
                        className="appearance-none pl-3 pr-8 py-2 text-xs rounded-md bg-white text-gray-900 w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        title={test.selectedProducts[activeProductIndex]?.title || ''}
                      >
                        {test.selectedProducts.map((p, idx) => (
                          <option key={p.id} value={idx} className="text-gray-900" title={p.title}>{p.title}</option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-32 px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 flex-shrink-0">Price</div>
              {testData?.variationPerformance.map((variant) => (
                <div key={variant.variation} className={`w-40 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0 ${winnerAnalysis?.winner?.variation === variant.variation ? 'bg-green-50' : ''} ${isVariationStopped(variant.variation) ? 'bg-red-50 opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span>Rs. {getVariantPriceForActiveProduct(variant)}</span>
                    {isVariationStopped(variant.variation) && <span className="text-xs text-red-600 font-medium">STOPPED</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex border-b border-gray-200">
              <div className="w-80 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0"></div>
              <div className="w-32 px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 flex-shrink-0">Goal</div>
              {testData?.variationPerformance.map((variant) => (
                <div key={variant.variation} className={`w-40 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0 ${winnerAnalysis?.winner?.variation === variant.variation ? 'bg-green-50' : ''} ${isVariationStopped(variant.variation) ? 'bg-red-50 opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span>{(variant.conversionRate || 0).toFixed(2)}%</span>
                    {isVariationStopped(variant.variation) && <span className="text-xs text-red-600 font-medium">STOPPED</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex">
              <div className="w-80 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0"></div>
              <div className="w-32 px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 flex-shrink-0">Traffic</div>
              {testData?.variationPerformance.map((variant) => (
                <div key={variant.variation} className={`w-40 px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0 ${winnerAnalysis?.winner?.variation === variant.variation ? 'bg-green-50' : ''} ${isVariationStopped(variant.variation) ? 'bg-red-50 opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span>{(variant.visitors || 0).toLocaleString()}</span>
                    {isVariationStopped(variant.variation) && <span className="text-xs text-red-600 font-medium">STOPPED</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showSuccessMessage && selectedWinner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-6 w-6 text-green-600" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Winner Selected!</h3>
                    <p className="text-sm text-gray-600">Test winner has been confirmed</p>
                  </div>
                </div>
                <button onClick={() => setShowSuccessMessage(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 ${selectedWinner.variation === 'A' ? 'bg-blue-500' : selectedWinner.variation === 'B' ? 'bg-green-500' : selectedWinner.variation === 'C' ? 'bg-purple-500' : selectedWinner.variation === 'D' ? 'bg-orange-500' : selectedWinner.variation === 'E' ? 'bg-pink-500' : selectedWinner.variation === 'F' ? 'bg-indigo-500' : 'bg-gray-500'}`}>{selectedWinner.variation}</div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Variation {selectedWinner.variation} is the Winner!</h4>
                  <p className="text-gray-600 mb-4">{selectedWinner.isControl ? 'Control' : `Test ${testData?.variationPerformance.findIndex((v) => v.variation === selectedWinner.variation)}`} has been selected as the winning variation for this test.</p>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><div className="text-sm text-gray-500">Conversion Rate</div><div className="text-lg font-semibold text-gray-900">{(selectedWinner.conversionRate || 0).toFixed(2)}%</div></div>
                      <div><div className="text-sm text-gray-500">Visitors</div><div className="text-lg font-semibold text-gray-900">{(selectedWinner.visitors || 0).toLocaleString()}</div></div>
                      <div><div className="text-sm text-gray-500">Revenue</div><div className="text-lg font-semibold text-gray-900">${(selectedWinner.revenue || 0).toLocaleString()}</div></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button onClick={() => setShowSuccessMessage(false)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Continue</button>
              </div>
            </div>
          </div>
        )}

        {test?.stoppedVariations?.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2"><AlertCircle className="h-5 w-5 text-yellow-600" /><h4 className="text-sm font-semibold text-yellow-800">Stopped Variations</h4></div>
            <div className="text-sm text-yellow-700">The following variations have been manually stopped: {test.stoppedVariations.join(', ')}</div>
          </div>
        )}
      </Card>

      {null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversions by Variant</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={testData?.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="A_conversions" fill="#3B82F6" name="Variant A" />
              <Bar dataKey="B_conversions" fill="#22C55E" name="Variant B" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue per Variant</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={testData?.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="A" stroke="#3B82F6" strokeWidth={2} name="Variant A" />
              <Line type="monotone" dataKey="B" stroke="#22C55E" strokeWidth={2} name="Variant B" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Raw Events</h3>
          <div className="flex items-center space-x-2"><span className="text-sm text-gray-500">Last 24 hours</span><button className="text-sm text-blue-600 hover:text-blue-700">Export</button></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testData?.events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${event.variant === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{event.variant}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.event}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.visitor_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {null}
    </div>
  )
}


