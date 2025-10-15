import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Card from './Card'

const steps = [
  { id: 1, title: 'Test Info', description: 'Basic test details' },
  { id: 2, title: 'Products', description: 'Select products to test' },
  { id: 3, title: 'Variations', description: 'Configure price variations' },
  { id: 4, title: 'Traffic', description: 'Set traffic split' },
  { id: 5, title: 'Goals', description: 'Define success metrics' },
  { id: 6, title: 'Targeting', description: 'Audience targeting' },
  { id: 7, title: 'Review', description: 'Review and launch' }
]

export default function TestCreationWizard({ 
  children, 
  currentStep, 
  onStepChange, 
  isStepValid,
  onComplete 
}) {
  const [completedSteps, setCompletedSteps] = useState(new Set())

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      onStepChange(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1)
    }
  }

  const handleStepClick = (stepId) => {
    if (stepId <= currentStep || completedSteps.has(stepId)) {
      onStepChange(stepId)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={step.id > currentStep && !completedSteps.has(step.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step.id === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : completedSteps.has(step.id)
                      ? 'bg-green-600 text-white'
                      : step.id < currentStep
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {completedSteps.has(step.id) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </button>
                <div className="mt-2 text-center">
                  <p className={`text-xs font-medium ${
                    step.id === currentStep ? 'text-blue-600' : 
                    completedSteps.has(step.id) ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  completedSteps.has(step.id) ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6 min-h-[500px]">
        {children}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="flex items-center px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </button>
        
        <div className="flex space-x-3">
          {currentStep === steps.length ? (
            <button
              onClick={onComplete}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4 mr-2" />
              Launch Test
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!isStepValid}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
