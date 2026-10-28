import { ArrowLeft, Check, CheckCircle2, Clock3, FileText, FileVideo2, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import AngleChart from '../components/AngleChart'
import AnalysisSummary from '../components/AnalysisSummary'
import MetricCard from '../components/MetricCard'
import {
  deleteSavedAnalysis,
  getAnalysisHistory,
  getSavedAnalysis,
  renameSavedAnalysis,
} from '../services/analysisHistory'
import { generateMovementInterpretation } from '../services/deepseekApi'
import { formatDuration, formatFileSize, formatNumber } from '../utils/formatters'

const chartConfig = [
  { title: 'Knee Angle Over Time', leftKey: 'leftKnee', rightKey: 'rightKnee', leftColor: '#60a5fa', rightColor: '#f472b6' },
  { title: 'Hip Angle Over Time', leftKey: 'leftHip', rightKey: 'rightHip', leftColor: '#34d399', rightColor: '#fbbf24' },
  { title: 'Elbow Angle Over Time', leftKey: 'leftElbow', rightKey: 'rightElbow', leftColor: '#a78bfa', rightColor: '#f87171' },
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

function formatJointLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim()
}

function Results() {
  const location = useLocation()
  const preferredHistoryId = location.state?.historyId
  const [history, setHistory] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editName, setEditName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [aiReport, setAiReport] = useState(null)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const deepseekConfigured = Boolean(import.meta.env.VITE_DEEPSEEK_API_KEY)

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
  const movement = analysis?.movement || {}
  const frames = analysis?.frames || []
  const observations = analysis?.observations || []

  const angleCards = analysis
    ? [
        { label: 'Filename', value: displayedRecord.filename || video.filename || 'Unknown video', detail: 'Uploaded file' },
        { label: 'Duration', value: formatDuration(video.duration), detail: 'Video length' },
        { label: 'Resolution', value: video.width && video.height ? `${video.width}×${video.height}` : 'Unknown', detail: 'Video resolution' },
        { label: 'Frames sampled', value: String(video.analyzedFrames || 0), detail: 'Samples analyzed' },
      ]
    : []

  function beginRename(record) {
    setEditingId(record.id)
    setEditName(record.displayName || record.filename)
    setError('')
  }

  async function saveRename(record) {
    setIsSavingName(true)
    setError('')
    try {
      const displayName = await renameSavedAnalysis(record.id, editName)
      setHistory((currentHistory) => currentHistory.map((item) => (
        item.id === record.id ? { ...item, displayName } : item
      )))
      setEditingId('')
      setEditName('')
    } catch (renameError) {
      setError(renameError.message || 'Could not rename this saved analysis.')
    } finally {
      setIsSavingName(false)
    }
  }

  async function deleteAnalysis(record) {
    const name = record.displayName || record.filename
    if (!window.confirm(`Delete "${name}" and its saved video? This cannot be undone.`)) {
      return
    }

    setDeletingId(record.id)
    setError('')
    try {
      await deleteSavedAnalysis(record.id)
      const remainingHistory = history.filter((item) => item.id !== record.id)
      setHistory(remainingHistory)
      if (selectedId === record.id) {
        setSelectedId(remainingHistory[0]?.id || '')
      }
      if (editingId === record.id) {
        setEditingId('')
        setEditName('')
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete this saved analysis.')
    } finally {
      setDeletingId('')
    }
  }

  async function handleGenerateAiReport() {
    if (!analysis) {
      setError('An analysis is required before generating a DeepSeek report.')
      return
    }

    setIsGeneratingAi(true)
    setAiReport(null)
    setError('')

    try {
      const report = await generateMovementInterpretation(analysis)
      setAiReport(report)
    } catch (generateError) {
      setAiReport(null)
      setError(generateError.message || 'The DeepSeek report could not be generated.')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  function handleDownloadPdf() {
    if (!analysis) {
      return
    }

    const document = new jsPDF({ unit: 'pt', format: 'a4' })
    const fileStem = (video.filename || 'gymnastics-analysis').replace(/\.[^/.]+$/, '')

    document.setFontSize(22)
    document.text('Gymnastics Movement Analysis Report', 40, 52)
    document.setFontSize(11)
    document.text(`${video.filename || 'Uploaded video'} • ${formatDuration(video.duration)} • ${video.width || 0} × ${video.height || 0}`, 40, 78)
    document.text(`Frames analyzed: ${video.analyzedFrames || 0} • Detection coverage: ${formatNumber(summary.pose_detected_percentage || 0, 1)}%`, 40, 96)

    const jointTable = Object.entries(joints).map(([key, metric]) => [
      formatJointLabel(key),
      formatNumber(metric.min, 1),
      formatNumber(metric.max, 1),
      formatNumber(metric.average, 1),
      formatNumber(metric.range, 1),
    ])

    autoTable(document, {
      startY: 120,
      head: [['Joint', 'Min°', 'Max°', 'Avg°', 'Range°']],
      body: jointTable,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [168, 85, 247] },
    })

    const observationLines = analysis.observations || []
    const endY = document.lastAutoTable.finalY + 18
    document.text('Observations', 40, endY)
    document.setFontSize(10)
    observationLines.forEach((line, index) => {
      document.text(`${index + 1}. ${line}`, 52, endY + 18 + index * 16)
    })

    document.save(`${fileStem}-report.pdf`)
  }

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
            {history.map((record) => {
              const isEditing = editingId === record.id
              return (
                <div key={record.id} className={`history-item-row ${record.id === selectedId ? 'selected' : ''}`}>
                  <button
                    type="button"
                    className="history-item"
                    onClick={() => setSelectedId(record.id)}
                    aria-pressed={record.id === selectedId}
                  >
                    <FileVideo2 size={20} />
                    <span className="history-item-copy">
                      <strong>{record.displayName || record.filename}</strong>
                      <small>
                        <Clock3 size={13} />
                        {new Date(record.createdAt).toLocaleString()}
                      </small>
                    </span>
                    <span className="history-item-duration">
                      {formatDuration(record.analysis?.video?.duration)}
                    </span>
                  </button>
                  {isEditing ? (
                    <div className="history-actions">
                      <input
                        autoFocus
                        aria-label="Analysis name"
                        value={editName}
                        maxLength={120}
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveRename(record)
                          if (event.key === 'Escape') setEditingId('')
                        }}
                      />
                      <button
                        type="button"
                        className="history-icon-button"
                        aria-label="Save analysis name"
                        title="Save name"
                        disabled={isSavingName}
                        onClick={() => saveRename(record)}
                      >
                        <Check size={17} />
                      </button>
                      <button
                        type="button"
                        className="history-icon-button"
                        aria-label="Cancel rename"
                        title="Cancel"
                        disabled={isSavingName}
                        onClick={() => setEditingId('')}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ) : (
                    <div className="history-actions">
                      <button
                        type="button"
                        className="history-icon-button"
                        aria-label={`Rename ${record.displayName || record.filename}`}
                        title="Rename analysis"
                        onClick={() => beginRename(record)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="history-icon-button history-delete-button"
                        aria-label={`Delete ${record.displayName || record.filename}`}
                        title="Delete analysis"
                        disabled={deletingId === record.id}
                        onClick={() => deleteAnalysis(record)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
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
          <div className="report-actions">
            <button
              type="button"
              className="primary-button"
              disabled={!deepseekConfigured || isGeneratingAi}
              onClick={handleGenerateAiReport}
            >
              <Sparkles size={18} />
              {isGeneratingAi ? 'Generating AI Report...' : 'Generate AI Report'}
            </button>
            <button type="button" className="secondary-button" onClick={handleDownloadPdf}>
              <FileText size={18} />
              Download PDF Report
            </button>
          </div>

          {aiReport && !isGeneratingAi ? (
            <div className="success-message" role="status" aria-live="polite">
              <CheckCircle2 size={19} />
              <span>AI report is ready below.</span>
            </div>
          ) : null}

          {!deepseekConfigured ? (
            <div className="info-message">DeepSeek API key is not configured.</div>
          ) : null}

          <div className="stats-grid">
            {angleCards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} detail={card.detail} />
            ))}
          </div>

          <AnalysisSummary summary={summary} feedback={observations} />

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
                <p className="eyebrow">Video information</p>
                <h3>Movement overview</h3>
              </div>
            </div>

            <div className="stats-list compact-grid">
              <div className="stat-row">
                <span>Filename</span>
                <strong>{video.filename || 'Unknown'}</strong>
                <small>Uploaded file</small>
              </div>
              <div className="stat-row">
                <span>Pose detection coverage</span>
                <strong>{formatNumber(summary.pose_detected_percentage || 0, 1)}%</strong>
                <small>Tracked frames</small>
              </div>
              <div className="stat-row">
                <span>Average landmark visibility</span>
                <strong>{formatNumber((summary.average_visibility || 0) * 100, 1)}%</strong>
                <small>Detection reliability</small>
              </div>
              <div className="stat-row">
                <span>Frames analyzed</span>
                <strong>{formatNumber(video.analyzedFrames || 0, 0)}</strong>
                <small>Sampled frames</small>
              </div>
              <div className="stat-row">
                <span>Movement duration</span>
                <strong>{formatDuration(video.duration || 0)}</strong>
                <small>Video length</small>
              </div>
              <div className="stat-row">
                <span>Resolution</span>
                <strong>{video.width && video.height ? `${video.width}×${video.height}` : 'Unknown'}</strong>
                <small>Frame size</small>
              </div>
            </div>
          </section>

          <section className="panel stats-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Joint summary</p>
                <h3>Range of motion</h3>
              </div>
            </div>

            <div className="stats-list">
              {Object.entries(joints).map(([key, metric]) => (
                <div key={key} className="stat-row">
                  <span>{formatJointLabel(key)}</span>
                  <strong>{formatNumber(metric.average, 1)}° avg</strong>
                  <small>
                    {formatNumber(metric.min, 1)}° to {formatNumber(metric.max, 1)}° • {formatNumber(metric.range, 1)}° range
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
                <span>Knee difference</span>
                <strong>{formatNumber(symmetry.kneeAverageDifference, 1)}°</strong>
                <small>Average bilateral gap</small>
              </div>
              <div className="stat-row">
                <span>Hip difference</span>
                <strong>{formatNumber(symmetry.hipAverageDifference, 1)}°</strong>
                <small>Average bilateral gap</small>
              </div>
              <div className="stat-row">
                <span>Elbow difference</span>
                <strong>{formatNumber(symmetry.elbowAverageDifference, 1)}°</strong>
                <small>Average bilateral gap</small>
              </div>
            </div>
          </section>

          <section className="panel stats-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Movement metrics</p>
                <h3>Core movement indicators</h3>
              </div>
            </div>

            <div className="stats-list compact-grid">
              <div className="stat-row">
                <span>Torso lean minimum</span>
                <strong>{formatNumber(movement.torsoLeanMin || 0, 1)}°</strong>
                <small>Minimum lean</small>
              </div>
              <div className="stat-row">
                <span>Torso lean maximum</span>
                <strong>{formatNumber(movement.torsoLeanMax || 0, 1)}°</strong>
                <small>Maximum lean</small>
              </div>
              <div className="stat-row">
                <span>Torso lean range</span>
                <strong>{formatNumber(movement.torsoLeanRange || 0, 1)}°</strong>
                <small>Lean variation</small>
              </div>
              <div className="stat-row">
                <span>Tracking coverage</span>
                <strong>{formatNumber(summary.pose_detected_percentage || 0, 1)}%</strong>
                <small>Frame coverage</small>
              </div>
              <div className="stat-row">
                <span>Movement duration</span>
                <strong>{formatDuration(video.duration || 0)}</strong>
                <small>Video length</small>
              </div>
              <div className="stat-row">
                <span>Observation count</span>
                <strong>{observations.length}</strong>
                <small>Detected patterns</small>
              </div>
            </div>
          </section>

          {aiReport ? (
            <section className="panel ai-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">AI interpretation</p>
                  <h3>DeepSeek movement analysis</h3>
                </div>
              </div>

              <div className="ai-report-box">
                <p>{typeof aiReport.summary === 'string' ? aiReport.summary : JSON.stringify(aiReport.summary || aiReport, null, 2)}</p>
                {Array.isArray(aiReport.review_points) && aiReport.review_points.length ? (
                  <ul>
                    {aiReport.review_points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="panel stats-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Observations</p>
                <h3>Deterministic findings</h3>
              </div>
            </div>

            <div className="observations-box">
              <ul>
                {observations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="chart-grid">
            {chartConfig.map(({ title, leftKey, rightKey, leftColor, rightColor }) => (
              <AngleChart
                key={title}
                title={title}
                data={frames}
                leftKey={leftKey}
                rightKey={rightKey}
                leftColor={leftColor}
                rightColor={rightColor}
              />
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
