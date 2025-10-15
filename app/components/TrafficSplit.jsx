import { useState, useEffect } from 'react'
import { Range } from 'react-range'
import { motion } from 'framer-motion'

export default function TrafficSplit({ 
  variations = [], 
  onTrafficChange 
}) {
  const [values, setValues] = useState([])
  const [percentages, setPercentages] = useState([])

  const getVariationColor = (index) => {
    const colors = [ 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500' ]
    return colors[index] || 'bg-gray-500'
  }

  const getVariationTextColor = (index) => {
    const colors = [ 'text-blue-600', 'text-green-600', 'text-purple-600', 'text-orange-600', 'text-pink-600' ]
    return colors[index] || 'text-gray-600'
  }

  useEffect(() => {
    if (variations.length > 0) {
      const equalPercent = 100 / variations.length
      const newValues = []
      const newPercentages = []
      for (let i = 0; i < variations.length - 1; i++) newValues.push((i + 1) * equalPercent)
      for (let i = 0; i < variations.length; i++) {
        if (i === 0) newPercentages.push(newValues[0] || equalPercent)
        else if (i === variations.length - 1) newPercentages.push(100 - (newValues[i - 1] || equalPercent))
        else newPercentages.push(newValues[i] - newValues[i - 1])
      }
      setValues(newValues)
      setPercentages(newPercentages)
      onTrafficChange && onTrafficChange(newPercentages)
    } else {
      setValues([])
      setPercentages([])
      onTrafficChange && onTrafficChange([])
    }
  }, [variations.length])

  const handleSliderChange = (newValues) => {
    if (!newValues || newValues.length === 0) return
    setValues(newValues)
    const newPercentages = []
    for (let i = 0; i < variations.length; i++) {
      if (i === 0) newPercentages.push(newValues[0] || 0)
      else if (i === variations.length - 1) newPercentages.push(100 - (newValues[i - 1] || 0))
      else newPercentages.push(newValues[i] - newValues[i - 1])
    }
    setPercentages(newPercentages)
    onTrafficChange && onTrafficChange(newPercentages)
  }

  const handlePercentageChange = (index, value) => {
    const numericValue = parseFloat(value) || 0
    if (numericValue < 0 || numericValue > 100) return
    const next = [...percentages]
    next[index] = numericValue
    const remainingTotal = 100 - numericValue
    const remainingIndices = []
    let remainingSum = 0
    for (let i = 0; i < next.length; i++) {
      if (i !== index) { remainingIndices.push(i); remainingSum += next[i] }
    }
    if (remainingIndices.length > 0 && remainingSum > 0) {
      remainingIndices.forEach(i => { next[i] = (next[i] / remainingSum) * remainingTotal })
    } else if (remainingIndices.length > 0) {
      const equalShare = remainingTotal / remainingIndices.length
      remainingIndices.forEach(i => { next[i] = equalShare })
    }
    setPercentages(next)
    const newValues = []
    let cumulative = 0
    for (let i = 0; i < next.length - 1; i++) { cumulative += next[i]; newValues.push(cumulative) }
    setValues(newValues)
    onTrafficChange && onTrafficChange(next)
  }

  const renderTrack = ({ props, children }) => {
    const { key, ...restProps } = props
    const segments = []
    let cumulative = 0
    for (let i = 0; i < variations.length; i++) {
      const width = percentages[i] || 0
      segments.push(
        <div key={i} className={`absolute h-full ${getVariationColor(i)}`} style={{ left: `${cumulative}%`, width: `${width}%` }} />
      )
      cumulative += width
    }
    return (
      <div key={key} {...restProps} className="relative w-full h-3 bg-gray-200 rounded-full" style={{ ...restProps.style }}>
        {segments}
        {children}
      </div>
    )
  }

  const renderThumb = ({ props }) => {
    const { key, ...restProps } = props
    return (
      <div key={key} {...restProps} className="w-6 h-6 bg-white rounded-full shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" style={{ ...restProps.style }} />
    )
  }

  if (variations.length < 2 || values.length === 0 || percentages.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Traffic Split</h3>
          <p className="text-sm text-gray-600">Configure variations first to set traffic split</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Traffic Split</h3>
        <p className="text-sm text-gray-600">Distribute traffic across variations</p>
      </div>
      <div className="space-y-4">
        <div className="relative">
          {values.length > 0 && (
            <Range step={0.1} min={0} max={100} values={values} onChange={handleSliderChange} renderTrack={renderTrack} renderThumb={renderThumb} />
          )}
        </div>
        <div className="flex justify-between">
          {variations.map((variation, index) => (
            <div key={index} className="flex flex-col items-center space-y-1">
              <div className={`px-2 py-1 rounded text-xs font-medium text-white ${getVariationColor(index)}`}>
                {Math.round(percentages[index] || 0)}%
              </div>
              <div className="text-xs text-gray-500">{variation.label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {variations.map((variation, index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {variation.label} ({variation.isControl ? 'Control' : `Variation ${variation.index}`})
              </label>
              <div className="relative">
                <input type="number" min="0" max="100" step="0.1" value={Math.round((percentages[index] || 0) * 10) / 10} onChange={(e) => handlePercentageChange(index, e.target.value)} className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white ${getVariationTextColor(index)}`} />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total:</span>
          <span className={`font-medium ${Math.abs((percentages.reduce((sum, p) => sum + p, 0)) - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.round((percentages.reduce((sum, p) => sum + p, 0)) * 10) / 10}%
          </span>
        </div>
        {Math.abs((percentages.reduce((sum, p) => sum + p, 0)) - 100) > 0.1 && (
          <div className="text-sm text-red-600">Total must equal 100%. Adjust percentages to continue.</div>
        )}
      </div>
    </motion.div>
  )
}


