import { Range } from 'react-range'
import { motion } from 'framer-motion'

export default function MultiSlider({ 
  values, 
  onChange, 
  min = 0, 
  max = 100, 
  step = 1,
  className = '' 
}) {
  const handleChange = (newValues) => {
    onChange(newValues)
  }

  return (
    <div className={`w-full ${className}`}>
      <Range
        step={step}
        min={min}
        max={max}
        values={values}
        onChange={handleChange}
        renderTrack={({ props, children }) => (
          <div
            {...props}
            className="w-full h-2 bg-gray-200 rounded-full relative"
            style={{
              ...props.style,
            }}
          >
            {children}
          </div>
        )}
        renderThumb={({ props, index }) => (
          <motion.div
            {...props}
            className="w-6 h-6 bg-blue-600 rounded-full shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{
              ...props.style,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
              {values[index]}%
            </div>
          </motion.div>
        )}
      />
      
      {/* Value Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  )
}


