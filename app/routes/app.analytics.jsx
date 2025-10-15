import { useState, useEffect } from 'react'
import ClientOnly from '../components/ClientOnly'
import Card from '../components/Card'
import Chart from '../components/Chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Download, Filter, Calendar, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function Analytics() {
  const [dateRange, setDateRange] = useState('7d')
  const [selectedTest, setSelectedTest] = useState('all')
  const [showConfidenceModal, setShowConfidenceModal] = useState(false)
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [statisticalAnalysis, setStatisticalAnalysis] = useState(null)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        setLoading(true)
        const resp = await fetch('/app/api/tests', { method: 'GET' })
        const data = await resp.json()
        if (!ignore && data?.ok && data.data) {
          setTests(data.data)
          
          // Load analytics for the first test if available
          if (data.data.length > 0 && selectedTest === 'all') {
            const firstTest = data.data[0]
            await loadTestAnalytics(firstTest.id)
          } else if (selectedTest !== 'all') {
            await loadTestAnalytics(selectedTest)
          }
        }
      } catch (error) {
        console.error('Failed to load tests:', error)
      } finally { 
        if (!ignore) setLoading(false) 
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const loadTestAnalytics = async (testId) => {
    try {
      const resp = await fetch(`/app/api/analytics?testId=${testId}&dateRange=${dateRange}`)
      const data = await resp.json()
      if (data?.ok) {
        setAnalyticsData(data.analytics)
        setStatisticalAnalysis(data.statisticalAnalysis)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  useEffect(() => {
    if (selectedTest !== 'all') {
      loadTestAnalytics(selectedTest)
    }
  }, [selectedTest, dateRange])

  // Use real analytics data
  const hasData = analyticsData && analyticsData.variationPerformance && analyticsData.variationPerformance.length > 0
  
  // Generate chart data from real analytics
  const conversionData = hasData ? analyticsData.variationPerformance.map(v => ({
    variant: `${v.variation} ${v.isControl ? '(Control)' : '(Variation)'}`,
    value: v.conversionRate
  })) : []

  const revenueData = hasData ? analyticsData.variationPerformance.map(v => ({
    variant: `${v.variation} ${v.isControl ? '(Control)' : '(Variation)'}`,
    value: v.revenue
  })) : []

  const revenuePerVisitorData = hasData ? analyticsData.chartData || [] : []

  const pieData = hasData ? analyticsData.variationPerformance.map((v, index) => ({
    name: `Variant ${v.variation}`,
    value: v.visitors,
    color: index === 0 ? '#3B82F6' : index === 1 ? '#22C55E' : index === 2 ? '#8B5CF6' : '#F59E0B'
  })) : []

  const getConfidenceColor = (confidence) => {
    if (confidence >= 95) return 'text-green-600'
    if (confidence >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 95) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (confidence >= 90) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const exportCSV = async () => {
    try {
      if (!selectedTest || selectedTest === 'all') {
        alert('Please select a specific test to export')
        return
      }

      const response = await fetch('/app/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          testId: selectedTest,
          dateRange: dateRange
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `test-${selectedTest}-analytics-${dateRange}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        alert('Failed to export data. Please try again.')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

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
      <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Analyze your price test performance and statistical significance</p>
      </div>

      {loading ? (
        <div className="p-6 space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          <div className="h-48 bg-gray-100 rounded animate-pulse"></div>
        </div>
      ) : !hasData ? (
        <div className="text-center py-12">
          <TrendingUp className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Yet</h3>
          <p className="text-gray-500 mb-6">Create and run price tests to see analytics and insights here.</p>
          <a href="/app/create" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Your First Test
          </a>
        </div>
      ) : (
        <>
        <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
              <option value="7d" className="text-gray-900">Last 7 days</option>
              <option value="30d" className="text-gray-900">Last 30 days</option>
              <option value="90d" className="text-gray-900">Last 90 days</option>
              <option value="custom" className="text-gray-900">Custom range</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white">
              <option value="all" className="text-gray-900">All Tests</option>
              {tests.map((test) => (
                <option key={test.id} value={test.id} className="text-gray-900">{test.name}</option>
              ))}
            </select>
          </div>
          <button onClick={exportCSV} className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Statistical Analysis</h3>
          <button onClick={() => setShowConfidenceModal(true)} className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700">
            <Info className="h-4 w-4" />
            <span>Learn more</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              {getConfidenceIcon(statisticalAnalysis?.confidence || 0)}
              <span className={`text-2xl font-bold ${getConfidenceColor(statisticalAnalysis?.confidence || 0)}`}>{statisticalAnalysis?.confidence || 0}%</span>
            </div>
            <p className="text-sm text-gray-600">Confidence Level</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-2">{statisticalAnalysis?.pValue || 0}</div>
            <p className="text-sm text-gray-600">P-Value</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">+{statisticalAnalysis?.lift || 0}%</div>
            <p className="text-sm text-gray-600">Lift (Variant {statisticalAnalysis?.winner || 'N/A'})</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900"><strong>Recommendation:</strong> {statisticalAnalysis?.recommendation || 'Insufficient data for analysis. Run tests to see results.'}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart
          className="p-0"
          title="Conversion Rate by Variant"
          type="bar"
          data={conversionData.map(({ variant, value }) => ({ name: variant, value }))}
        />
        <Chart
          className="p-0"
          title="Revenue by Variant"
          type="bar"
          data={revenueData.map(({ variant, value }) => ({ name: variant, value }))}
        />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue per Visitor Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={revenuePerVisitorData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`$${value}`, 'Revenue per Visitor']} />
            <Line type="monotone" dataKey="A" stroke="#3B82F6" strokeWidth={2} name="Variant A" />
            <Line type="monotone" dataKey="B" stroke="#22C55E" strokeWidth={2} name="Variant B" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Distribution</h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {showConfidenceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowConfidenceModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Statistical Significance Explained</h3>
                <button onClick={() => setShowConfidenceModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Confidence Level</h4>
                  <p>The percentage indicating how confident we are that the observed difference between variants is real and not due to random chance. Higher confidence (95%+) means the results are more reliable.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">P-Value</h4>
                  <p>The probability of observing the current results if there was no real difference between variants. Lower p-values (&lt; 0.05) indicate statistical significance.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Lift</h4>
                  <p>The percentage improvement of the winning variant compared to the control. Positive lift means the variation performed better than the original.</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-yellow-800"><strong>Note:</strong> Statistical significance doesn't guarantee business impact. Consider sample size, test duration, and business context when making decisions.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowConfidenceModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Got it</button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
      </div>
    </ClientOnly>
  )
}


