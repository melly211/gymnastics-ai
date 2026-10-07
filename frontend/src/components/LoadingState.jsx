import { Activity } from 'lucide-react'

function LoadingState({ message = 'Analyzing your movement...' }) {
  return (
    <div className="loading-state">
      <div className="spinner-wrap">
        <Activity className="spinner-icon" size={26} />
      </div>
      <p>{message}</p>
    </div>
  )
}

export default LoadingState
