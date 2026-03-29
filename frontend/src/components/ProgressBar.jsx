export default function ProgressBar({ status, message }) {
  const colors = {
    pending: 'bg-yellow-400',
    running: 'bg-blue-500 animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  }
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{message || status}</span>
        <span>{status === 'done' ? '100%' : status === 'running' ? 'Processing...' : ''}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colors[status] || 'bg-gray-400'}`}
          style={{ width: status === 'done' ? '100%' : status === 'running' ? '60%' : '0%' }}
        />
      </div>
    </div>
  )
}
