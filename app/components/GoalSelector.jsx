import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, DollarSign, ShoppingCart, Eye } from 'lucide-react'

const goalTypes = [
  {
    id: 'conversion',
    name: 'Conversion Rate',
    description: 'Optimize for maximum conversions',
    icon: Target,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'revenue',
    name: 'Revenue',
    description: 'Maximize total revenue',
    icon: DollarSign,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'orders',
    name: 'Order Volume',
    description: 'Increase number of orders',
    icon: ShoppingCart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'traffic',
    name: 'Traffic',
    description: 'Drive more visitors',
    icon: Eye,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
]

export default function GoalSelector({ selectedGoal, onSelect, className = '' }) {
  const [selected, setSelected] = useState(selectedGoal || 'conversion')
  useEffect(() => {
    setSelected(selectedGoal || 'conversion')
  }, [selectedGoal])

  const handleSelect = (goalId) => {
    setSelected(goalId)
    onSelect(goalId)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900">Select Primary Goal</h3>
      <div className="grid grid-cols-2 gap-3">
        {goalTypes.map((goal) => {
          const isSelected = selected === goal.id
          return (
            <motion.button
              key={goal.id}
              onClick={() => handleSelect(goal.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${goal.bgColor}`}>
                  <goal.icon className={`h-5 w-5 ${goal.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-sm font-medium text-gray-900">{goal.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{goal.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {isSelected && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}


