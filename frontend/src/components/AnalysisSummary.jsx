import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'

function AnalysisSummary({ summary, feedback }) {
  const stats = [
    {
      label: 'Pose detection',
      value: `${Number(summary?.pose_detected_percentage ?? 0).toFixed(1)}%`,
      icon: CheckCircle2,
    },
    {
      label: 'Avg visibility',
      value: Number(summary?.average_visibility ?? 0).toFixed(2),
      icon: Sparkles,
    },
    {
      label: 'Movement range',
      value: summary?.movement_range ?? 'moderate',
      icon: AlertTriangle,
    },
  ]

  return (
    <section className="panel summary-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Performance overview</p>
          <h3>Analysis summary</h3>
        </div>
      </div>

      <div className="summary-grid">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="summary-item">
            <Icon size={16} />
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="feedback-box">
        <h4>Feedback</h4>
        <ul>
          {(feedback || []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default AnalysisSummary
