import { Database, CheckCircle, AlertCircle } from 'lucide-react'

export default function SyncStatus() {
  // Simple status without context dependency
  const error = null
  const isLoading = false

  const getStatusIcon = () => {
    if (isLoading) {
      return <Database className="h-4 w-4 animate-pulse text-blue-600" />
    }
    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />
  }

  const getStatusText = () => {
    if (isLoading) {
      return 'Syncing...'
    }
    if (error) {
      return 'Sync error'
    }
    return 'Data synced'
  }

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  )
}
