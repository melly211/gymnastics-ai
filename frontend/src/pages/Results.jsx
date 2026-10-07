import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import AngleChart from '../components/AngleChart'
import AnalysisSummary from '../components/AnalysisSummary'
import MetricCard from '../components/MetricCard'
import { formatDuration, formatFileSize, formatNumber } from '../utils/formatters'

const chartConfig = [
  { key: 'leftKnee', title: 'Left Knee', color: '#60a5fa' },
  { key: 'rightKnee', title: 'Right Knee', color: '#f472b6' },
  { key: 'leftHip', title: 'Left Hip', color: '#34d399' },
  { key: 'rightHip', title: 'Right Hip', color: '#fbbf24' },
  { key: 'leftElbow', title: 'Left Elbow', color: '#a78bfa' },
  { key: 'rightElbow', title: 'Right Elbow', color: '#f87171' },
]

function Results() {
  const location = useLocation()
  const analysis = location.state?.analysis

  if (!analysis) {
    return (
      <div className="page empty-state-page">
        <div className="panel empty-state">
          <p className="eyebrow">No results yet</p>
          <h3>Upload and analyze a video to view movement insights.</h3>
          <Link to="/analyze" className="primary-button inline-button">
            <ArrowLeft size={18} />
            Go to analysis
          </Link>
        </div>
      </div>
    )
  }

  const video = analysis.video || {}
  const summary = analysis.summary || {}
  const joints = analysis.joints || {}
  const symmetry = analysis.symmetry || {}
  const frames = analysis.frames || []

  const angleCards = [
    { label: 'Filename', value: video.filename || 'Unknown video', detail: 'Uploaded file' },
    { label: 'Duration', value: formatDuration(video.duration), detail: 'Video length' },
    { label: 'Resolution', value: video.width && video.height ? `${video.width}×${video.height}` : 'Unknown', detail: 'Video resolution' },
    { label: 'Frames sampled', value: String(video.analyzedFrames || 0), detail: 'Samples analyzed' },
  ]

  return (
    <div className="page results-page">
      <section className="results-header">
        <div>
          <p className="eyebrow">Results</p>
          <h2>Movement Analysis Dashboard</h2>
        </div>

        <Link to="/analyze" className="secondary-button">
          Analyze another video
        </Link>
      </section>

      <div className="stats-grid">
        {angleCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} detail={card.detail} />
        ))}
      </div>

      <AnalysisSummary
        summary={summary}
        feedback={analysis.observations || []}
      />

      <section className="panel stats-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Joint metrics</p>
            <h3>Angle statistics</h3>
          </div>
        </div>

        <div className="stats-list">
          {Object.entries(joints).map(([key, metric]) => (
            <div key={key} className="stat-row">
              <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim()}</span>
              <strong>{formatNumber(metric.average, 1)}° avg</strong>
              <small>
                {formatNumber(metric.min, 1)}° to {formatNumber(metric.max, 1)}°
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel stats-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Symmetry</p>
            <h3>Average asymmetry</h3>
          </div>
        </div>

        <div className="stats-list">
          <div className="stat-row">
            <span>Knee asymmetry</span>
            <strong>{formatNumber(symmetry.kneeAverageDifference, 1)}°</strong>
            <small>Average bilateral gap</small>
          </div>
          <div className="stat-row">
            <span>Hip asymmetry</span>
            <strong>{formatNumber(symmetry.hipAverageDifference, 1)}°</strong>
            <small>Average bilateral gap</small>
          </div>
          <div className="stat-row">
            <span>Elbow asymmetry</span>
            <strong>{formatNumber(symmetry.elbowAverageDifference, 1)}°</strong>
            <small>Average bilateral gap</small>
          </div>
        </div>
      </section>

      <div className="chart-grid">
        {chartConfig.map(({ key, title, color }) => (
          <AngleChart key={key} title={title} data={frames} angleKey={key} color={color} />
        ))}
      </div>

      <div className="disclaimer-box">
        This tool provides motion measurements for educational purposes. It does not replace professional gymnastics coaching or medical evaluation.
      </div>
    </div>
  )
}

export default Results
