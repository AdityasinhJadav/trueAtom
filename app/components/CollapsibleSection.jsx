import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, Circle } from 'lucide-react'
import Card from './Card'

export default function CollapsibleSection({ 
  title, 
  children, 
  isCompleted = false, 
  isRequired = false,
  defaultOpen = false 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {isRequired && (
              <span className="text-sm text-red-500">Required</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-6 pb-6 border-t border-gray-200">
          <div className="pt-6">
            {children}
          </div>
        </div>
      )}
    </Card>
  )
}
