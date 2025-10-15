import { useState, useEffect } from 'react'
import { Pause, CheckCircle } from 'lucide-react'

export default function VariationsTable({ 
  currencyCode = 'USD',
  selectedProducts = [], 
  variations = [], 
  onVariationsChange,
  stoppedVariations = [],
  automationPercent = 0,
  automationAction = 'increase',
  automationTargets = [],
  rounding = 'round',
  onApplyAutomation,
  selectedProductsForAutomation = [],
  onProductSelectionChange
}) {
  const [variationsData, setVariationsData] = useState([])

  // Initialize variations data
  useEffect(() => {
    if (variations.length > 0) {
      setVariationsData(variations)
    } else {
      // Initialize with default variations if none provided
      const defaultVariations = selectedProducts.length > 0 ? [
        { 
          label: 'A', 
          index: 0, 
          price: selectedProducts.length === 1 ? selectedProducts[0]?.price || 0 : 
                 selectedProducts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / selectedProducts.length,
          prices: selectedProducts.reduce((acc, product) => {
            acc[product.id] = parseFloat(product.price) || 0
            return acc
          }, {}),
          isControl: true 
        },
        { 
          label: 'B', 
          index: 1, 
          price: selectedProducts.length === 1 ? selectedProducts[0]?.price || 0 : 
                 selectedProducts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / selectedProducts.length,
          prices: selectedProducts.reduce((acc, product) => {
            acc[product.id] = parseFloat(product.price) || 0
            return acc
          }, {}),
          isControl: false 
        },
        { 
          label: 'C', 
          index: 2, 
          price: selectedProducts.length === 1 ? selectedProducts[0]?.price || 0 : 
                 selectedProducts.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / selectedProducts.length,
          prices: selectedProducts.reduce((acc, product) => {
            acc[product.id] = parseFloat(product.price) || 0
            return acc
          }, {}),
          isControl: false 
        }
      ] : []
      setVariationsData(defaultVariations)
      onVariationsChange(defaultVariations)
    }
  }, [variations, selectedProducts])

  const currencySymbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', JPY: '¥' }
  const symbol = currencySymbols[currencyCode] || '$'

  const formatPrice = (price) => {
    if (price === undefined || price === null) return `${symbol}0.00`
    const n = typeof price === 'number' ? price : parseFloat(price)
    if (isNaN(n)) return `${symbol}0.00`
    return `${symbol}${n.toFixed(2)}`
  }

  const handlePriceChange = (variationIndex, productId, newPrice) => {
    const updatedVariations = variationsData.map((variation, index) => {
      if (index === variationIndex) {
        if (selectedProducts.length === 1) {
          // Single product mode
          return { ...variation, price: parseFloat(newPrice) || 0 }
        } else {
          // Multiple products mode
          const updatedPrices = { ...variation.prices, [productId]: parseFloat(newPrice) || 0 }
          return { ...variation, prices: updatedPrices }
        }
      }
      return variation
    })
    setVariationsData(updatedVariations)
    onVariationsChange(updatedVariations)
  }

  const isVariationStopped = (variationLabel) => {
    return stoppedVariations.includes(variationLabel)
  }

  const applyRounding = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 0
    switch (rounding) {
      case 'round_up':
        return Math.ceil(value)
      case 'round_down':
        return Math.floor(value)
      case 'round':
      default:
        return Math.round(value)
    }
  }

  const adjustPrice = (basePrice) => {
    const percent = automationPercent || 0
    const multiplier = automationAction === 'decrease' ? (1 - percent / 100) : (1 + percent / 100)
    const newPrice = (basePrice || 0) * multiplier
    return applyRounding(newPrice)
  }

  const handleApplyAutomation = () => {
    if (!onApplyAutomation) return
    
    const updatedVariations = variationsData.map((variation, index) => {
      // Skip if not selected for automation or is control
      if (variation.isControl || !automationTargets.includes(index)) {
        return variation
      }

      if (selectedProducts.length === 1) {
        // Single product mode
        const basePrice = variation.price || 0
        return { ...variation, price: adjustPrice(basePrice) }
      } else {
        // Multiple products mode
        const updatedPrices = {}
        selectedProducts.forEach((product) => {
          const basePrice = variation.prices?.[product.id] || 0
          updatedPrices[product.id] = adjustPrice(basePrice)
        })
        return { ...variation, prices: updatedPrices }
      }
    })
    
    setVariationsData(updatedVariations)
    onVariationsChange(updatedVariations)
  }

  const getVariationPrice = (variation, productId) => {
    if (selectedProducts.length === 1) {
      return variation.price || 0
    } else {
      // For multiple products, always use individual prices from variation.prices
      if (variation.prices && variation.prices[productId] !== undefined) {
        return variation.prices[productId] || 0
      } else {
        // If no individual price found, use the product's original price
        const product = selectedProducts.find(p => p.id === productId)
        return product ? parseFloat(product.price) || 0 : 0
      }
    }
  }

  const getVariationColor = (label) => {
    switch (label) {
      case 'A': return 'bg-blue-500'
      case 'B': return 'bg-green-500'
      case 'C': return 'bg-purple-500'
      case 'D': return 'bg-orange-500'
      case 'E': return 'bg-pink-500'
      default: return 'bg-gray-500'
    }
  }

  if (selectedProducts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Please select products in the previous step first.</p>
      </div>
    )
  }

  // Calculate responsive column widths based on number of variations
  const getColumnWidths = () => {
    const numVariations = variationsData.length
    
    if (numVariations >= 3) {
      // For 3+ variations, use fixed pixel widths with horizontal scroll
      return {
        productName: 200, // Fixed 200px
        metric: 80,       // Fixed 80px
        variation: 140    // Fixed 140px per variation
      }
    } else {
      // For 2 variations, use percentage-based responsive layout
      const productNameWidth = 35 // 35% for product name
      const metricWidth = 10 // 10% for metric
      const reservedWidth = productNameWidth + metricWidth // 45% reserved
      
      // Remaining width for variations
      const availableForVariations = 100 - reservedWidth // 55% for variations
      const variationWidth = availableForVariations / numVariations // Equal distribution
      
      return {
        productName: productNameWidth,
        metric: metricWidth,
        variation: variationWidth
      }
    }
  }

  const columnWidths = getColumnWidths()

  return (
    <div className="space-y-6">
      {/* Scroll indicator for 3+ variations */}
      {variationsData.length >= 3 && (
        <div className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>Scroll horizontally to see all {variationsData.length} variations with optimal spacing</span>
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${variationsData.length >= 3 ? 'overflow-x-auto' : ''}`}>
        {/* Header Row */}
        <div className={`flex bg-gray-50 border-b border-gray-200 ${variationsData.length >= 3 ? 'min-w-max' : ''}`}>
          <div 
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 flex-shrink-0 flex items-center justify-center"
            style={{ width: variationsData.length >= 3 ? '50px' : '5%' }}
          >
            <input
              type="checkbox"
              checked={selectedProductsForAutomation.length === selectedProducts.length && selectedProducts.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  // Select all products
                  onProductSelectionChange?.(selectedProducts.map(p => p.id))
                } else {
                  // Unselect all products
                  onProductSelectionChange?.([])
                }
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div 
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 flex-shrink-0"
            style={{ width: variationsData.length >= 3 ? `${columnWidths.productName}px` : `${columnWidths.productName}%` }}
          >
            Name of Products
          </div>
          <div 
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 flex-shrink-0"
            style={{ width: variationsData.length >= 3 ? `${columnWidths.metric}px` : `${columnWidths.metric}%` }}
          >
            Metric
          </div>
          {variationsData.map((variation, index) => (
            <div 
              key={variation.label} 
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 flex-shrink-0 last:border-r-0"
              style={{ width: variationsData.length >= 3 ? `${columnWidths.variation}px` : `${columnWidths.variation}%` }}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white ${getVariationColor(variation.label)}`}>
                  {variation.label}
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {variation.isControl ? 'Original' : `Test ${index}`}
                </span>
                {automationTargets.includes(index) && !variation.isControl && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-medium">Auto</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Data Rows */}
        {selectedProducts.map((product, productIndex) => (
          <div key={product.id} className={`flex border-b border-gray-200 last:border-b-0 hover:bg-gray-50 ${variationsData.length >= 3 ? 'min-w-max' : ''}`}>
            {/* Checkbox Column */}
            <div 
              className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0 flex items-center justify-center"
              style={{ width: variationsData.length >= 3 ? '50px' : '5%' }}
            >
              <input
                type="checkbox"
                checked={selectedProductsForAutomation.includes(product.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onProductSelectionChange?.([...selectedProductsForAutomation, product.id])
                  } else {
                    onProductSelectionChange?.(selectedProductsForAutomation.filter(id => id !== product.id))
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            {/* Product Name Column */}
            <div 
              className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0"
              style={{ width: variationsData.length >= 3 ? `${columnWidths.productName}px` : `${columnWidths.productName}%` }}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEwyMCAyOEwxMiAyMEwyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'}
                  alt={product.title}
                  className="w-10 h-10 rounded object-cover border border-gray-200"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEwyMCAyOEwxMiAyMEwyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                  <p className="text-xs text-gray-500">{product.sku || 'No SKU'}</p>
                </div>
              </div>
            </div>

            {/* Metric Column */}
            <div 
              className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 flex-shrink-0 flex items-center"
              style={{ width: variationsData.length >= 3 ? `${columnWidths.metric}px` : `${columnWidths.metric}%` }}
            >
              Price
            </div>

            {/* Variation Price Columns */}
            {variationsData.map((variation, variationIndex) => (
              <div 
                key={variation.label} 
                className={`px-4 py-3 text-sm text-gray-600 border-r border-gray-200 flex-shrink-0 last:border-r-0 ${isVariationStopped(variation.label) ? 'bg-red-50 opacity-60' : ''}`}
                style={{ width: variationsData.length >= 3 ? `${columnWidths.variation}px` : `${columnWidths.variation}%` }}
              >
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    value={getVariationPrice(variation, product.id)}
                    onChange={(e) => handlePriceChange(variationIndex, product.id, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={isVariationStopped(variation.label)}
                  />
                  {isVariationStopped(variation.label) && (
                    <span className="text-xs text-red-600 font-medium ml-2">STOPPED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Validation Messages */}
      {variationsData.some(v => 
        selectedProducts.some(p => getVariationPrice(v, p.id) <= 0)
      ) && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          ⚠️ All variation prices must be greater than 0.
        </div>
      )}
    </div>
  )
}
