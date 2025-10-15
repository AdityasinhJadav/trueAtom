import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
// Using Shopify router links via custom element <s-link>
import Card from '../components/Card'
import ClientOnly from '../components/ClientOnly'
import { Play, Pause, Eye, Filter, Search, Calendar, DollarSign, Users, TrendingUp, Edit, Trash2 } from 'lucide-react'
import { useTest } from '../contexts/TestContext'

export default function PriceTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  // Safely access TestContext once; if unavailable, fall back to no-op
  const testContext = (() => { try { return useTest() } catch { return null } })()
  const contextTests = Array.isArray(testContext?.tests) ? testContext.tests : []
  const dispatch = testContext?.dispatch || (() => {})
  const [filteredTests, setFilteredTests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => {
    setFilteredTests(tests)
  }, [tests])

  // Seed from context immediately, then load from server
  useEffect(() => {
    if (contextTests && contextTests.length) {
      setTests(contextTests)
    }
  }, [contextTests])

  // Load tests from DB (on mount, when tab visible, and when tests change elsewhere)
  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        setLoading(true)
        const resp = await fetch('/app/api/tests', { method: 'GET' })
        const data = await resp.json()
        if (!ignore && data?.ok) {
          const raw = Array.isArray(data.data) ? data.data : (Array.isArray(data.tests) ? data.tests : [])
          const normalized = raw.map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
            createdAt: t.createdAt || new Date().toISOString(),
            selectedProducts: Array.isArray(t.selectedProducts) && t.selectedProducts.length
              ? t.selectedProducts
              : (t.productId ? [{ id: t.productId, title: t.productTitle || 'Product' }] : []),
            variations: Array.isArray(t.variations) ? t.variations : [],
            trafficSplit: Array.isArray(t.trafficSplit) ? t.trafficSplit : [],
            selectedGoal: t.selectedGoal || t.goal || 'revenue_per_visitor',
            duration: t.duration || null,
            durationUnit: t.durationUnit || null,
          }))
          setTests(normalized)
          // keep context in sync so other pages see latest
          dispatch({ type: 'SET_TESTS', payload: normalized })
        }
      } catch (e) {
        console.error('Failed to load tests', e)
      } finally { if (!ignore) setLoading(false) }
    }
    load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    const onUpdated = () => load()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('tests:updated', onUpdated)
    return () => {
      ignore = true
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('tests:updated', onUpdated)
    }
  }, [])

  useEffect(() => {
    let next = tests

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      next = next.filter(test =>
        test.name?.toLowerCase().includes(term) ||
        test.selectedProducts?.some(p => p.title?.toLowerCase().includes(term))
      )
    }

    if (statusFilter !== 'all') {
      next = next.filter(test => test.status === statusFilter)
    }

    if (dateRange !== 'all') {
      const now = new Date()
      if (dateRange === 'today') {
        next = next.filter(test => new Date(test.createdAt).toDateString() === now.toDateString())
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        next = next.filter(test => new Date(test.createdAt) >= weekAgo)
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        next = next.filter(test => new Date(test.createdAt) >= monthAgo)
      }
    }

    setFilteredTests(next)
  }, [tests, searchTerm, statusFilter, dateRange])

  const getStatusColor = (status) => {
    switch (status) {
      case 'Running': return 'bg-green-100 text-green-800'
      case 'Draft': return 'bg-gray-100 text-gray-800'
      case 'Paused': return 'bg-yellow-100 text-yellow-800'
      case 'Completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString()

  const getGoalLabel = (goal) => {
    switch (goal) {
      case 'revenue_per_visitor': return 'Revenue per visitor'
      case 'conversion_rate': return 'Conversion rate'
      case 'average_order_value': return 'Average order value'
      default: return goal
    }
  }

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) return
    try {
      const resp = await fetch(`/app/api/tests?id=${encodeURIComponent(testId)}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      })
      let json = null
      try { json = await resp.json() } catch {}
      if (resp.ok && json?.ok) {
        setTests(prev => prev.filter(t => t.id !== testId))
        dispatch({ type: 'DELETE_TEST', payload: testId })
        try { window.dispatchEvent(new CustomEvent('tests:updated')) } catch {}
      } else {
        console.error('Delete failed', resp.status, json)
        alert(`Failed to delete: ${json?.error || resp.statusText}`)
      }
    } catch (e) {
      console.error('Failed to delete test', e)
      alert('Failed to delete test. Check console for details.')
    }
  }

  const navigate = useNavigate()

  return (
    <ClientOnly fallback={
      <div className="p-6">
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
        <h1 className="text-2xl font-bold text-gray-900">Price Tests</h1>
        <p className="text-gray-600 mt-1">Manage and monitor your pricing experiments</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tests, products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Status</option>
              <option value="Draft" className="text-gray-900">Draft</option>
              <option value="Running" className="text-gray-900">Running</option>
              <option value="Paused" className="text-gray-900">Paused</option>
              <option value="Completed" className="text-gray-900">Completed</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Time</option>
              <option value="today" className="text-gray-900">Today</option>
              <option value="week" className="text-gray-900">This Week</option>
              <option value="month" className="text-gray-900">This Month</option>
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </Card>
      ) : filteredTests.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <Play className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
            <p className="text-gray-600 mb-4">Create your first price test to get started</p>
            <s-link
              href="/app/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors no-underline"
            >
              <span className="text-white">Create Test</span>
            </s-link>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product(s)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variants</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Traffic Split</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTests.map((test) => (
                  <tr
                    key={test.id}
                    className={`hover:bg-gray-50 ${test.status === 'Running' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (test.status === 'Running') navigate(`/app/tests/${test.id}`)
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {test.status === 'Draft' ? (
                            <s-link href={`/app/create?edit=${test.id}`} className="text-blue-600 hover:text-blue-800 no-underline" onClick={(e)=>e.stopPropagation()}>{test.name}</s-link>
                          ) : (
                            test.name
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {test.selectedProducts?.length === 1
                          ? test.selectedProducts[0]?.title
                          : `${test.selectedProducts?.length || 0} products`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {test.variations?.map(v => v.label).join('/')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getGoalLabel(test.selectedGoal)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {test.trafficSplit?.map((p, i) => `${test.variations?.[i]?.label}: ${Math.round(p)}%`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(test.status)}`}>{test.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(test.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <s-link href={`/app/tests/${test.id}`} className="text-blue-600 hover:text-blue-900 no-underline" onClick={(e)=>e.stopPropagation()}>
                          <Eye className="h-4 w-4" />
                        </s-link>
                        {test.status === 'Running' && (
                          <button
                            onClick={async () => {
                              // prevent row click navigation
                              event?.stopPropagation?.()
                              try {
                                const resp = await fetch(`/app/api/tests?id=${encodeURIComponent(test.id)}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                  body: JSON.stringify({ status: 'Paused' })
                                })
                                const json = await resp.json()
                                if (json?.ok) {
                                  // update local state
                                  setTests(prev => prev.map(t => t.id === test.id ? { ...t, status: 'Paused' } : t))
                                  dispatch({ type: 'UPDATE_TEST', payload: { ...test, status: 'Paused' } })
                                  try { window.dispatchEvent(new CustomEvent('tests:updated')) } catch {}
                                } else {
                                  alert(`Failed to pause: ${json?.error || resp.statusText}`)
                                }
                              } catch (e) {
                                console.error('Pause failed', e)
                                alert('Failed to pause test. Check console for details.')
                              }
                            }}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteTest(test.id) }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </div>
    </ClientOnly>
  )
}
