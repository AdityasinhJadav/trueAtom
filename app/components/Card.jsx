import { motion } from 'framer-motion'

export default function Card({ children, className = '', hover = false, ...props }) {
  const baseClasses = 'bg-white rounded-lg shadow-sm border border-gray-200'
  const hoverClasses = hover ? 'hover:shadow-md transition-shadow duration-200' : ''
  
  return (
    <motion.div
      className={`${baseClasses} ${hoverClasses} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}


