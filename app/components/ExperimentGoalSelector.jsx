import { useState } from 'react'
import { Info, Check } from 'lucide-react'

export default function ExperimentGoalSelector({ 
  selectedGoal, 
  onGoalChange 
}) {
  const [showModal, setShowModal] = useState(false)

  const goals = [
    {
      id: 'revenue_per_visitor',
      title: 'Revenue per visitor',
      description: 'Maximizes long-term revenue by balancing conversion and AOV',
      recommended: true,
      explanation: "This metric multiplies conversion rate by average order value, giving you the most comprehensive view of your pricing strategy's impact on overall revenue.",
    },
    {
      id: 'conversion_rate',
      title: 'Conversion rate',
      description: 'Focus purely on increasing purchases',
      recommended: false,
      explanation: 'Measures the percentage of visitors who make a purchase. Higher conversion rates mean more people are buying at your tested price points.',
    },
    {
      id: 'average_order_value',
      title: 'Average order value',
      description: 'Focus on increasing basket size',
      recommended: false,
      explanation: 'Measures the average amount spent per order. Higher AOV means customers are spending more money per transaction.',
    },
    {
      id: 'add_to_cart_rate',
      title: 'Add to cart rate',
      description: 'Track the percentage of visitors who add an item to cart',
      recommended: false,
      explanation: 'Measures the share of visitors that add any product to cart. Useful when purchases are low-volume or you want a higher-signal, earlier funnel metric for pricing impact.',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold text-gray-900">What do you want to measure?</h3>
        <button onClick={() => setShowModal(true)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <Info className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedGoal === goal.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onGoalChange(goal.id)}
          >
            <div className="flex items-start space-x-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedGoal === goal.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}
              >
                {selectedGoal === goal.id && <Check className="h-3 w-3 text-white" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900">{goal.title}</h4>
                  {goal.recommended && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Recommended</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{goal.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">How Winners Are Calculated</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="border-b border-gray-200 pb-3 last:border-b-0">
                    <h4 className="font-medium text-gray-900 mb-1">{goal.title}</h4>
                    <p className="text-sm text-gray-600">{goal.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


