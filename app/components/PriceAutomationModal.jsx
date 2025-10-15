import { useState } from 'react'
import { X, Percent, Calculator, RotateCcw } from 'lucide-react'

export default function PriceAutomationModal({ 
  isOpen, 
  onClose, 
  onApply, 
  selectedProducts 
}) {
  const [percentageChange, setPercentageChange] = useState(0)
  const [roundingOption, setRoundingOption] = useState('round')
  const [previewPrices, setPreviewPrices] = useState({})

  const handlePercentageChange = (value) => {
    setPercentageChange(value)
    calculatePreviewPrices(value, roundingOption)
  }

  const handleRoundingChange = (option) => {
    setRoundingOption(option)
    calculatePreviewPrices(percentageChange, option)
  }

  const calculatePreviewPrices = (percentage, rounding) => {
    const preview = {}
    selectedProducts.forEach(product => {
      const originalPrice = product.price || 0
      const newPrice = originalPrice * (1 + percentage / 100)
      let roundedPrice
      switch (rounding) {
        case 'round_up':
          roundedPrice = Math.ceil(newPrice)
          break
        case 'round_down':
          roundedPrice = Math.floor(newPrice)
          break
        case 'round'
        :
        default:
          roundedPrice = Math.round(newPrice)
          break
      }
      preview[product.id] = {
        original: originalPrice,
        new: roundedPrice,
        change: roundedPrice - originalPrice,
        changePercent: originalPrice > 0 ? ((roundedPrice - originalPrice) / originalPrice * 100) : 0
      }
    })
    setPreviewPrices(preview)
  }

  const handleApply = () => {
    const updatedProducts = selectedProducts.map(product => ({
      ...product,
      price: previewPrices[product.id]?.new || product.price
    }))
    onApply(updatedProducts)
    onClose()
  }

  const handleReset = () => {
    setPercentageChange(0)
    setRoundingOption('round')
    setPreviewPrices({})
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Automate Price Filling</h2>
              <p className="text-sm text-gray-600">Bulk update prices for all selected products</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Percentage Change */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Price Change Percentage</label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="number"
                    value={percentageChange}
                    onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    step="0.1"
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  />
                  <Percent className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Positive values increase prices, negative values decrease prices</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handlePercentageChange(10)} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">+10%</button>
                <button onClick={() => handlePercentageChange(-10)} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">-10%</button>
                <button onClick={() => handlePercentageChange(25)} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">+25%</button>
              </div>
            </div>
          </div>

          {/* Rounding Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Rounding Option</label>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => handleRoundingChange('round_up')} className={`p-3 border rounded-lg text-sm font-medium transition-colors ${roundingOption === 'round_up' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                Round Up
                <div className="text-xs text-gray-500 mt-1">Ceiling</div>
              </button>
              <button onClick={() => handleRoundingChange('round')} className={`p-3 border rounded-lg text-sm font-medium transition-colors ${roundingOption === 'round' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                Round Off
                <div className="text-xs text-gray-500 mt-1">Nearest</div>
              </button>
              <button onClick={() => handleRoundingChange('round_down')} className={`p-3 border rounded-lg text-sm font-medium transition-colors ${roundingOption === 'round_down' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                Round Down
                <div className="text-xs text-gray-500 mt-1">Floor</div>
              </button>
            </div>
          </div>

          {/* Preview */}
          {Object.keys(previewPrices).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Price Preview</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedProducts.map(product => {
                  const preview = previewPrices[product.id]
                  if (!preview) return null
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.title}</div>
                        <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">${preview.original}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-gray-900">${preview.new}</span>
                        </div>
                        <div className={`text-xs ${preview.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {preview.change >= 0 ? '+' : ''}${preview.change} ({preview.changePercent >= 0 ? '+' : ''}{preview.changePercent.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={handleReset} className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={handleApply} disabled={percentageChange === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Apply Changes</button>
          </div>
        </div>
      </div>
    </div>
  )
}


