import { useState } from 'react'
import { Info } from 'lucide-react'

export default function VariationCard({ 
  variation, 
  isControl = false,
  onPriceChange,
  onControlToggle,
  product,
  products = [],
  priceMode = 'single',
  currencyCode = 'USD'
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const currencySymbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', JPY: '¥' }
  const symbol = currencySymbols[currencyCode] || '$'

  const handlePriceChange = (value) => {
    const numericValue = parseFloat(value)
    if (!isNaN(numericValue) && numericValue >= 0) {
      onPriceChange(numericValue)
    }
  }

  const getVariationColor = (label) => {
    const colors = {
      'A': 'bg-blue-500',
      'B': 'bg-green-500', 
      'C': 'bg-purple-500',
      'D': 'bg-orange-500',
      'E': 'bg-pink-500'
    }
    return colors[label] || 'bg-gray-500'
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getVariationColor(variation.label)}`}>
            {variation.label}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {isControl ? 'Control' : `Variation ${variation.index}`}
            </h3>
            <button
              onClick={onControlToggle}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {isControl ? 'Remove control' : 'Make control'}
            </button>
          </div>
        </div>
      </div>

      {/* Price Input */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price
          </label>
          {priceMode === 'single' ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{symbol}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={typeof variation.price === 'number' ? variation.price : (variation.price || '')}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="0.00"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {products.length >= 5 ? (
                <div className="border border-gray-200 rounded overflow-x-auto">
                  <div className="grid grid-cols-[minmax(220px,1fr)_120px_140px] gap-0 min-w-[520px] bg-gray-50 text-[11px] text-gray-600 px-2 py-1 rounded-t sticky top-0 z-10">
                    <div>Product</div>
                    <div className="text-center">SKU</div>
                    <div className="text-right pr-2">Price</div>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 min-w-[520px]">
                    {products.map((product) => (
                      <div key={product.id} className="grid grid-cols-[minmax(220px,1fr)_120px_140px] items-center px-2 py-1.5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-5 h-5 rounded object-cover flex-shrink-0"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA2TDE4IDEyTDEyIDE4TDYgMTJMMTIgNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                            }}
                          />
                          <span className="text-xs text-gray-700 truncate" title={product.title}>{product.title}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate text-center px-1" title={product.sku || ''}>{product.sku || '-'}</div>
                        <div className="relative pr-3 flex justify-end">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none">{symbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={typeof (variation.prices?.[product.id]) === 'number' 
                              ? variation.prices?.[product.id] 
                              : ((variation.prices?.[product.id]) ?? (typeof variation.price === 'number' ? variation.price : (variation.price || '')))}
                            onChange={(e) => {
                              const numericValue = parseFloat(e.target.value)
                              if (!isNaN(numericValue) && numericValue >= 0) {
                                onPriceChange(numericValue, product.id)
                              }
                            }}
                            className="w-24 sm:w-28 md:w-32 pl-5 pr-2 py-1 text-[11px] text-right border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-6 h-6 rounded object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA2TDE4IDEyTDEyIDE4TDYgMTJMMTIgNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                        }}
                      />
                      <span className="text-xs text-gray-600 flex-1">{product.title}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">{symbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={typeof (variation.prices?.[product.id]) === 'number' 
                          ? variation.prices?.[product.id] 
                          : ((variation.prices?.[product.id]) ?? (typeof variation.price === 'number' ? variation.price : (variation.price || '')))}
                        onChange={(e) => {
                          const numericValue = parseFloat(e.target.value)
                          if (!isNaN(numericValue) && numericValue >= 0) {
                            onPriceChange(numericValue, product.id)
                          }
                        }}
                        className="w-full pl-6 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Product Preview */}
        {product && (
          <div className="relative">
            <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
              <img
                src={product.image}
                alt={product.title}
                className="w-8 h-8 rounded object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiA4TDI0IDE2TDE2IDI0TDggMTZMMTYgOFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{product.title}</p>
                <p className="text-xs text-gray-500">{product.sku}</p>
              </div>
              <div className="flex items-center space-x-1">
                <Info 
                  className="h-3 w-3 text-gray-400 cursor-help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                />
                {showTooltip && (
                  <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                    Price shown to visitors assigned to this variation
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
