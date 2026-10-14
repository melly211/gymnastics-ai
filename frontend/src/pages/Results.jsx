import { ArrowLeft, Clock3, FileVideo2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

import AngleChart from '../components/AngleChart'
import AnalysisSummary from '../components/AnalysisSummary'
import MetricCard from '../components/MetricCard'
import { getAnalysisHistory, getSavedAnalysis } from '../services/analysisHistory'
import { formatDuration, formatFileSize, formatNumber } from '../utils/formatters'

const chartConfig = [
  { key: 'leftKnee', title: 'Left Knee', color: '#60a5fa' },
  { key: 'rightKnee', title: 'Right Knee', color: '#f472b6' },
  { key: 'leftHip', title: 'Left Hip', color: '#34d399' },
  { key: 'rightHip', title: 'Right Hip', color: '#fbbf24' },
  { key: 'leftElbow', title: 'Left Elbow', color: '#a78bfa' },
  { key: 'rightElbow', title: 'Right Elbow', color: '#f87171' },
]

function SavedVideo({ file }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const videoElement = videoRef.current
    const videoUrl = URL.createObjectURL(file)
    videoElement.src = videoUrl

    return () => {
      URL.revokeObjectURL(videoUrl)
      videoElement.removeAttribute('src')
      videoElement.load()
    }
  }, [file])

  return <video ref={videoRef} className="saved-video" controls />
}

function Results() {
  const location = useLocation()
  const preferredHistoryId = location.state?.historyId
  const [history, setHistory] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true

    async function loadHistory() {
      try {
        const savedHistory = await getAnalysisHistory()
        if (!isCurrent) return
        setHistory(savedHistory)
        setSelectedId(
          savedHistory.some((record) => record.id === preferredHistoryId)
            ? preferredHistoryId
            : savedHistory[0]?.id || '',
        )
        setError('')
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || 'Could not load saved analyses.')
      } finally {
        if (isCurrent) setIsHistoryLoading(false)
      }
    }

    loadHistory()
    return () => {
      isCurrent = false
    }
  }, [preferredHistoryId])

  useEffect(() => {
    if (!selectedId) {
      return undefined
    }

    let isCurrent = true

    async function loadAnalysis() {
      try {
        const record = await getSavedAnalysis(selectedId)
        if (isCurrent) {
          setSelectedRecord(record)
          setError('')
        }
      } catch (loadError) {
        if (isCurrent) setError(loadError.message || 'Could not load this saved analysis.')
      }
    }

    loadAnalysis()
    return () => {
      isCurrent = false
    }
  }, [selectedId])

  const displayedRecord = selectedRecord?.id === selectedId ? selectedRecord : null
  const isAnalysisLoading = Boolean(selectedId && !displayedRecord)
  const analysis = displayedRecord?.analysis
  const video = analysis?.video || {}
  const summary = analysis?.summary || {}
  const joints = analysis?.joints || {}
  const symmetry = analysis?.symmetry || {}
  const frames = analysis?.frames || []

  const angleCards = analysis
    ? [
        { label: 'Filename', value: displayedRecord.filename || video.filename || 'Unknown video', detail: 'Uploaded file' },
        { label: 'Duration', value: formatDuration(video.duration), detail: 'Video length' },
        { label: 'Resolution', value: video.width && video.height ? `${video.width}×${video.height}` : 'Unknown', detail: 'Video resolution' },
        { label: 'Frames sampled', value: String(video.analyzedFrames || 0), detail: 'Samples analyzed' },
      ]
    : []

  return (
    <div className="page results-page">
      <section className="results-header">
        <div>
          <p className="eyebrow">Your browser history</p>
          <h2>Saved analyses</h2>
        </div>

        <Link to="/analyze" className="secondary-button">
          Analyze a new video
        </Link>
      </section>

      <section className="panel history-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Stored on this browser</p>
            <h3>Analysis history</h3>
          </div>
        </div>

        {isHistoryLoading ? (
          <p className="history-message" role="status">Loading saved analyses...</p>
        ) : history.length ? (
          <div className="history-list">
            {history.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`history-item ${record.id === selectedId ? 'selected' : ''}`}
                onClick={() => setSelectedId(record.id)}
                aria-pressed={record.id === selectedId}
              >
                <FileVideo2 size={20} />
                <span className="history-item-copy">
                  <strong>{record.filename}</strong>
                  <small>
                    <Clock3 size={13} />
                    {new Date(record.createdAt).toLocaleString()}
                  </small>
                </span>
                <span className="history-item-duration">
                  {formatDuration(record.analysis?.video?.duration)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="history-empty">
            <p>No saved analyses in this browser yet.</p>
            <Link to="/analyze" className="primary-button inline-button">
              <ArrowLeft size={18} />
              Analyze a video
            </Link>
          </div>
        )}
      </section>

      {error ? <div className="error-message" role="alert">{error}</div> : null}

      {isAnalysisLoading ? (
        <section className="panel history-panel" role="status">
          <p>Loading selected analysis...</p>
        </section>
      ) : null}

      {analysis ? (
        <>
          <div className="stats-grid">
            {angleCards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} detail={card.detail} />
            ))}
          </div>

          <AnalysisSummary
            summary={summary}
            feedback={analysis.observations || []}
          />

          {displayedRecord.videoFile ? (
            <section className="panel saved-video-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Saved video</p>
                  <h3>{displayedRecord.filename}</h3>
                </div>
                <span>{formatFileSize(displayedRecord.fileSize)}</span>
              </div>
              <SavedVideo file={displayedRecord.videoFile} />
            </section>
          ) : null}

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
        </>
      ) : null}
    </div>
  )
}

export default Results
