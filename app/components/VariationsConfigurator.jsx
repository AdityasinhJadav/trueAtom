import { useState, useEffect, useMemo } from 'react'
import VariationsTable from './VariationsTable'

export default function VariationsConfigurator({ 
  currencyCode = 'USD',
  selectedProducts = [], 
  variations = [], 
  onVariationsChange,
  automationPercent = 10,
  onAutomationPercentChange,
  automationAction = 'increase',
  onAutomationActionChange,
  automationTargets = [],
  onAutomationTargetsChange,
  rounding = 'round',
  onRoundingChange
}) {
  const [numVariations, setNumVariations] = useState(2)
  const [controlIndex, setControlIndex] = useState(0)
  const [variationsData, setVariationsData] = useState([])
  
  // New state for pricing model
  const [pricingModel, setPricingModel] = useState('percentage')
  const [percentageChanges, setPercentageChanges] = useState({})
  const [fixedAmountChanges, setFixedAmountChanges] = useState({})
  const [selectedVariations, setSelectedVariations] = useState([])
  const [selectedProductsForAutomation, setSelectedProductsForAutomation] = useState([])
  

  const labels = ['A', 'B', 'C', 'D', 'E']
  const variationOptions = [
    { value: 2, label: '2 variations (A,B)' },
    { value: 3, label: '3 variations (A,B,C)' },
    { value: 4, label: '4 variations (A,B,C,D)' },
    { value: 5, label: '5 variations (A,B,C,D,E)' }
  ]

  const selectionSignature = useMemo(() => {
    if (!Array.isArray(selectedProducts)) return ''
    try {
      return selectedProducts.map(p => p?.id).join('|')
    } catch {
      return String(selectedProducts?.length || 0)
    }
  }, [selectedProducts])

  useEffect(() => {
    initializeVariations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numVariations, selectionSignature])

  // Initialize percentage and fixed amount changes with default values
  useEffect(() => {
    if (variationsData.length > 0) {
      const newPercentageChanges = {}
      const newFixedAmountChanges = {}
      
      variationsData.forEach(variation => {
        if (!variation.isControl) {
          // Initialize with default values
          newPercentageChanges[variation.label] = {
            action: 'increase',
            value: 0,
            rounding: 'round',
            roundingValue: 0
          }
          
          newFixedAmountChanges[variation.label] = {
            action: 'increase',
            value: 0,
            rounding: 'round',
            roundingValue: 0
          }
        }
      })
      
      setPercentageChanges(newPercentageChanges)
      setFixedAmountChanges(newFixedAmountChanges)
    }
  }, [variationsData])

  // Initialize selected products for automation (all products by default)
  useEffect(() => {
    if (selectedProducts.length > 0) {
      // Always initialize with all products selected when products change
      setSelectedProductsForAutomation(selectedProducts.map(p => p.id))
    }
  }, [selectedProducts])

  // Initialize state from variations prop when navigating back
  useEffect(() => {
    console.log('VariationsConfigurator useEffect - variations:', variations.length, 'variationsData:', variationsData.length)
    if (variations.length > 0) {
      // Only restore state if we have variations but no local variationsData
      // This indicates we're navigating back to this step
      if (variationsData.length === 0 || variationsData.length !== variations.length) {
        console.log('Restoring state from variations prop')
        setVariationsData(variations)
        setNumVariations(variations.length)
        
        // Find control index
        const controlIdx = variations.findIndex(v => v.isControl)
        if (controlIdx !== -1) {
          setControlIndex(controlIdx)
        }
        
        // Set automation targets to all non-control variations by default
        const nonControlIndices = variations
          .map((v, index) => v.isControl ? null : index)
          .filter(index => index !== null)
        onAutomationTargetsChange(nonControlIndices)
      }
    }
  }, [variations])

  const initializeVariations = () => {
    // Don't reinitialize if variations are already set from props AND the count matches
    if (variations.length > 0 && variationsData.length > 0 && variationsData.length === numVariations) {
      return
    }
    
    const newVariations = []
    for (let i = 0; i < numVariations; i++) {
      const label = labels[i]
      const isControl = i === controlIndex
      
      if (selectedProducts.length === 1) {
        // Single product - use its original price
        newVariations.push({
          label,
          index: i,
          price: parseFloat(selectedProducts[0]?.price) || 0,
          isControl
        })
      } else if (selectedProducts.length > 1) {
        // Multiple products - use each product's original individual price
          const prices = {}
          selectedProducts.forEach(product => { 
            prices[product.id] = parseFloat(product.price) || 0 
          })
          
          // Calculate average price for the variation.price field (for display purposes)
          const averagePrice = Object.values(prices).reduce((sum, price) => sum + price, 0) / Object.values(prices).length
          
          newVariations.push({
            label,
            index: i,
            price: averagePrice,
            prices,
            isControl
          })
      } else {
        newVariations.push({ label, index: i, price: 0, prices: {}, isControl })
      }
    }
    setVariationsData(newVariations)
    onVariationsChange(newVariations)
    // default targets: all non-control variations
    const defaultTargets = newVariations
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => !v.isControl)
      .map(({ i }) => i)
    onAutomationTargetsChange(defaultTargets)
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
    if (!Array.isArray(variationsData) || variationsData.length === 0) return
    const updated = variationsData.map((variation, idx) => {
      // Skip if not selected or is control
      if (variation.isControl || !automationTargets.includes(idx)) {
        return variation
      }
      if (priceMode === 'individual' && variation.prices) {
        const updatedPrices = {}
        selectedProducts.forEach((p) => {
          const base = typeof variation.prices[p.id] === 'number' ? variation.prices[p.id] : (variation.price || 0)
          updatedPrices[p.id] = adjustPrice(base)
        })
        return { ...variation, prices: updatedPrices, price: adjustPrice(variation.price) }
      }
      return { ...variation, price: adjustPrice(variation.price) }
    })
    setVariationsData(updated)
    onVariationsChange(updated)
  }

  const handleNumVariationsChange = (value) => {
    setNumVariations(value)
    if (controlIndex >= value) setControlIndex(0)
  }

  const handleControlToggle = (index) => {
    setControlIndex(index)
    const updatedVariations = variationsData.map((variation, i) => ({
      ...variation,
      isControl: i === index
    }))
    setVariationsData(updatedVariations)
    onVariationsChange(updatedVariations)
  }

  const handlePriceChange = (index, price, productId = null) => {
    const updatedVariations = variationsData.map((variation, i) => {
      if (i === index) {
        if (productId) {
          return { ...variation, prices: { ...variation.prices, [productId]: price } }
        } else {
          return { ...variation, price }
        }
      }
      return variation
    })
    setVariationsData(updatedVariations)
    onVariationsChange(updatedVariations)
  }


  // Handler functions for apply buttons
  const handleApplyToAll = () => {
    // Select all products for automation
    setSelectedProductsForAutomation(selectedProducts.map(p => p.id))
    
      const updatedVariations = variationsData.map(variation => {
      if (variation.isControl) return variation

      let newPrice = variation.price
      let newPrices = { ...variation.prices }

      if (pricingModel === 'percentage') {
        const change = percentageChanges[variation.label]
        if (change && change.value !== undefined && change.value !== null && change.value !== '') {
          const multiplier = change.action === 'increase' ? (1 + change.value / 100) : (1 - change.value / 100)
          
          // Apply to ALL products in this variation
          if (variation.prices) {
            Object.keys(variation.prices).forEach(productId => {
              // Find the original product price
              const originalProduct = selectedProducts.find(p => p.id === productId)
              const originalPrice = originalProduct ? parseFloat(originalProduct.price) || 0 : 0
              newPrices[productId] = originalPrice * multiplier
            })
            // Update the average price
            newPrice = Object.values(newPrices).reduce((sum, price) => sum + price, 0) / Object.values(newPrices).length
          } else {
            // For single product, use original price
            const originalPrice = selectedProducts[0] ? parseFloat(selectedProducts[0].price) || 0 : 0
            newPrice = originalPrice * multiplier
          }
        }
      } else if (pricingModel === 'fixedAmount') {
        const change = fixedAmountChanges[variation.label]
        if (change && change.value !== undefined && change.value !== null && change.value !== '') {
          const adjustment = change.action === 'increase' ? change.value : -change.value
          
          // Apply to ALL products in this variation
          if (variation.prices) {
            Object.keys(variation.prices).forEach(productId => {
              // Find the original product price
              const originalProduct = selectedProducts.find(p => p.id === productId)
              const originalPrice = originalProduct ? parseFloat(originalProduct.price) || 0 : 0
              newPrices[productId] = originalPrice + adjustment
            })
            // Update the average price
            newPrice = Object.values(newPrices).reduce((sum, price) => sum + price, 0) / Object.values(newPrices).length
        } else {
            // For single product, use original price
            const originalPrice = selectedProducts[0] ? parseFloat(selectedProducts[0].price) || 0 : 0
            newPrice = originalPrice + adjustment
          }
        }
      }

      // Apply rounding
      const roundingType = pricingModel === 'percentage' 
        ? percentageChanges[variation.label]?.rounding || 'round'
        : fixedAmountChanges[variation.label]?.rounding || 'round'
      
      // Apply rounding to individual product prices
      if (variation.prices) {
        Object.keys(newPrices).forEach(productId => {
          newPrices[productId] = applyRoundingWithType(newPrices[productId], roundingType)
        })
        // Update the average price after rounding
        newPrice = Object.values(newPrices).reduce((sum, price) => sum + price, 0) / Object.values(newPrices).length
      } else {
        newPrice = applyRoundingWithType(newPrice, roundingType)
      }

      return { ...variation, price: newPrice, prices: newPrices }
    })

      setVariationsData(updatedVariations)
      onVariationsChange(updatedVariations)
  }

  const handleApplyToSelected = () => {
    if (selectedProductsForAutomation.length === 0) {
      alert('Please select at least one product to apply changes to.')
      return
    }

      const updatedVariations = variationsData.map(variation => {
      if (variation.isControl) return variation

      let newPrice = variation.price
      let newPrices = { ...variation.prices }

      if (pricingModel === 'percentage') {
        const change = percentageChanges[variation.label]
        if (change && change.value !== undefined && change.value !== null && change.value !== '') {
          const multiplier = change.action === 'increase' ? (1 + change.value / 100) : (1 - change.value / 100)
          
          // Apply only to SELECTED products in this variation
          if (variation.prices) {
            Object.keys(variation.prices).forEach(productId => {
              if (selectedProductsForAutomation.includes(productId)) {
                // Find the original product price
                const originalProduct = selectedProducts.find(p => p.id === productId)
                const originalPrice = originalProduct ? parseFloat(originalProduct.price) || 0 : 0
                newPrices[productId] = originalPrice * multiplier
              }
              // If product is not selected, keep the current price unchanged
            })
            // Update the average price
            newPrice = Object.values(newPrices).reduce((sum, price) => sum + price, 0) / Object.values(newPrices).length
          } else {
            // For single product, use original price
            const originalPrice = selectedProducts[0] ? parseFloat(selectedProducts[0].price) || 0 : 0
            newPrice = originalPrice * multiplier
          }
        }
      } else if (pricingModel === 'fixedAmount') {
        const change = fixedAmountChanges[variation.label]
        if (change && change.value !== undefined && change.value !== null && change.value !== '') {
          const adjustment = change.action === 'increase' ? change.value : -change.value
          
          // Apply only to SELECTED products in this variation
          if (variation.prices) {
            Object.keys(variation.prices).forEach(productId => {
              if (selectedProductsForAutomation.includes(productId)) {
                // Find the original product price
                const originalProduct = selectedProducts.find(p => p.id === productId)
                const originalPrice = originalProduct ? parseFloat(originalProduct.price) || 0 : 0
                newPrices[productId] = originalPrice + adjustment
              }
              // If product is not selected, keep the current price unchanged
            })
            // Update the average price
            newPrice = Object.values(newPrices).reduce((sum, price) => sum + price, 0) / Object.values(newPrices).length
          } else {
            // For single product, use original price
            const originalPrice = selectedProducts[0] ? parseFloat(selectedProducts[0].price) || 0 : 0
            newPrice = originalPrice + adjustment
          }
        }
      }

      // Apply rounding
      const roundingType = pricingModel === 'percentage' 
        ? percentageChanges[variation.label]?.rounding || 'round'
        : fixedAmountChanges[variation.label]?.rounding || 'round'
      
      // Apply rounding to individual product prices
      if (variation.prices) {
        Object.keys(newPrices).forEach(productId => {
          newPrices[productId] = applyRoundingWithType(newPrices[productId], roundingType)
        })
        // Update the average price after rounding
        newPrice = Object.values(newPrices).reduce((sum, price) => sum + price, 0) / Object.values(newPrices).length
      } else {
        newPrice = applyRoundingWithType(newPrice, roundingType)
      }

      return { ...variation, price: newPrice, prices: newPrices }
    })

      setVariationsData(updatedVariations)
      onVariationsChange(updatedVariations)
  }

  const toggleProductSelection = (productId) => {
    setSelectedProductsForAutomation(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleAllProductsSelection = () => {
    if (selectedProductsForAutomation.length === selectedProducts.length) {
      setSelectedProductsForAutomation([])
    } else {
      setSelectedProductsForAutomation(selectedProducts.map(p => p.id))
    }
  }

  const applyRoundingWithType = (value, roundingType) => {
    if (typeof value !== 'number' || isNaN(value)) return 0
    switch (roundingType) {
      case 'round_up':
        return Math.ceil(value)
      case 'round_down':
        return Math.floor(value)
      case 'round':
      default:
        return Math.round(value)
    }
  }


  

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Number of Variations</label>
        <select
          value={numVariations}
          onChange={(e) => handleNumVariationsChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
        >
          {variationOptions.map(option => (
            <option key={option.value} value={option.value} className="text-gray-900">{option.label}</option>
          ))}
        </select>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
          <p className="text-xs text-green-800">
            💡 <strong>Note:</strong> A = Original price (control), B = Test 1, C = Test 2, etc.
          </p>
          <p className="text-xs text-green-800 mt-1">
            💡 <strong>Rounding:</strong> Round Off = nearest whole number, Round Up = always higher, Round Down = always lower
          </p>
        </div>
      </div>

      {/* Pricing Model Selection */}
        <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Model</label>
        <div className="flex space-x-4 border-2 border-dashed border-blue-300 rounded-lg p-4">
          <label className="flex items-center text-gray-900">
            <input 
              type="radio" 
              name="pricingModel" 
              value="percentage" 
              checked={pricingModel === 'percentage'} 
              onChange={(e) => setPricingModel(e.target.value)} 
              className="mr-2" 
            />
            Change price by %
          </label>
            <label className="flex items-center text-gray-900">
            <input 
              type="radio" 
              name="pricingModel" 
              value="fixedAmount" 
              checked={pricingModel === 'fixedAmount'} 
              onChange={(e) => setPricingModel(e.target.value)} 
              className="mr-2" 
            />
            Change price by Fixed Amount
            </label>
            <label className="flex items-center text-gray-900">
            <input 
              type="radio" 
              name="pricingModel" 
              value="amount" 
              checked={pricingModel === 'amount'} 
              onChange={(e) => setPricingModel(e.target.value)} 
              className="mr-2" 
            />
            Change price by Amount
            </label>
          </div>
        </div>

      {/* Automation Price Filling Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Automate Price Filling</h3>
        </div>
        
        {pricingModel === 'percentage' && (
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Change Price by %</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
                <div className="px-4 py-3 text-sm font-medium text-gray-700">Setup Price</div>
                <div className="px-4 py-3 text-sm font-medium text-gray-700">Price Change</div>
                <div className="px-4 py-3 text-sm font-medium text-gray-700">Round off</div>
              </div>
              {variationsData.filter(v => !v.isControl).map((variation, index) => (
                <div key={variation.label} className="grid grid-cols-3 border-b border-gray-200 last:border-b-0">
                  <div className="px-4 py-3 text-sm text-gray-600">
                    Variation {variation.label}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <select 
                        value={percentageChanges[variation.label]?.action || 'increase'}
                        onChange={(e) => setPercentageChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            action: e.target.value
                          }
                        }))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm bg-blue-50"
                      >
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
              <input
                type="number"
                        value={percentageChanges[variation.label]?.value || ''}
                        onChange={(e) => setPercentageChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            value: parseFloat(e.target.value) || 0
                          }
                        }))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="10"
                      />
                      <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <select 
                        value={percentageChanges[variation.label]?.rounding || 'round'}
                        onChange={(e) => setPercentageChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            rounding: e.target.value
                          }
                        }))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm bg-blue-50"
                      >
                        <option value="round">Round Off</option>
                        <option value="round_up">Round Up</option>
                        <option value="round_down">Round Down</option>
                      </select>
                      <input
                        type="number"
                        value={percentageChanges[variation.label]?.roundingValue || ''}
                        onChange={(e) => setPercentageChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            roundingValue: parseFloat(e.target.value) || 0
                          }
                        }))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="5"
                        step="0.01"
                      />
            </div>
          </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Divider */}
        <div className="border-t border-gray-200"></div>

        {pricingModel === 'fixedAmount' && (
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Change Price by Fixed Amount</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
                <div className="px-4 py-3 text-sm font-medium text-gray-700">Setup Price</div>
                <div className="px-4 py-3 text-sm font-medium text-gray-700">Price Change</div>
                <div className="px-4 py-3 text-sm font-medium text-gray-700">Round off</div>
              </div>
              {variationsData.filter(v => !v.isControl).map((variation, index) => (
                <div key={variation.label} className="grid grid-cols-3 border-b border-gray-200 last:border-b-0">
                  <div className="px-4 py-3 text-sm text-gray-600">
                    Variation {variation.label}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <select 
                        value={fixedAmountChanges[variation.label]?.action || 'increase'}
                        onChange={(e) => setFixedAmountChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            action: e.target.value
                          }
                        }))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm bg-blue-50"
                      >
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                      <input
                        type="number"
                        value={fixedAmountChanges[variation.label]?.value || ''}
                        onChange={(e) => setFixedAmountChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            value: parseFloat(e.target.value) || 0
                          }
                        }))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="50"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center space-x-2">
            <select
                        value={fixedAmountChanges[variation.label]?.rounding || 'round'}
                        onChange={(e) => setFixedAmountChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            rounding: e.target.value
                          }
                        }))}
                        className="px-2 py-1 border border-gray-300 rounded text-sm bg-blue-50"
            >
              <option value="round">Round Off</option>
              <option value="round_up">Round Up</option>
              <option value="round_down">Round Down</option>
            </select>
                      <input
                        type="number"
                        value={fixedAmountChanges[variation.label]?.roundingValue || ''}
                        onChange={(e) => setFixedAmountChanges(prev => ({
                          ...prev,
                          [variation.label]: {
                            ...prev[variation.label],
                            roundingValue: parseFloat(e.target.value) || 0
                          }
                        }))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="0.99"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apply Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleApplyToAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply to all products
          </button>
          <button
            type="button"
            onClick={handleApplyToSelected}
            disabled={selectedProductsForAutomation.length === 0}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedProductsForAutomation.length === 0 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Apply to selected products ({selectedProductsForAutomation.length})
          </button>
        </div>
      </div>





      <VariationsTable
        currencyCode={currencyCode}
        selectedProducts={selectedProducts}
        variations={variationsData}
        onVariationsChange={onVariationsChange}
        stoppedVariations={[]}
        automationPercent={automationPercent}
        automationAction={automationAction}
        automationTargets={automationTargets}
        rounding={rounding}
        onApplyAutomation={handleApplyAutomation}
        selectedProductsForAutomation={selectedProductsForAutomation}
        onProductSelectionChange={setSelectedProductsForAutomation}
      />

      {variationsData.some(v => v.price <= 0) && (
        <div className="text-sm text-red-600">All variation prices must be greater than 0.</div>
      )}
    </div>
  )
}


