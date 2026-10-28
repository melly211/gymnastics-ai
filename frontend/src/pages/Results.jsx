import { ArrowLeft, Check, CheckCircle2, Clock3, FileText, FileVideo2, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'

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

function reportText(value) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

function reportTextList(value) {
  return Array.isArray(value) ? value.map(reportText).filter(Boolean) : []
}

function reportFeedbackList(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' || (item && typeof item === 'object'))
}

function addPdfParagraph(document, text, y, options = {}) {
  const { fontSize = 10, indent = 40, lineHeight = 14 } = options
  const lines = document.splitTextToSize(String(text || ''), 515 - (indent - 40))
  const requiredHeight = lines.length * lineHeight

  if (y + requiredHeight > 790) {
    document.addPage()
    y = 48
  }

  document.setFont('helvetica', 'normal')
  document.setTextColor(83, 61, 77)
  document.setFontSize(fontSize)
  document.text(lines, indent, y)
  return y + requiredHeight + 5
}

function addPdfSection(document, title, items, y) {
  if (!items.length) return y

  if (y > 760) {
    document.addPage()
    y = 48
  }

  document.setFont('helvetica', 'bold')
  document.setTextColor(123, 47, 83)
  document.setFontSize(12)
  document.text(title, 40, y)
  document.setDrawColor(238, 210, 226)
  document.line(40, y + 6, 555, y + 6)
  y += 24

  for (const item of items) {
    y = addPdfParagraph(document, `- ${item}`, y, { indent: 48 })
  }

  return y + 8
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

    document.setFillColor(74, 29, 45)
    document.roundedRect(32, 28, 531, 94, 12, 12, 'F')
    document.setTextColor(255, 255, 255)
    document.setFont('helvetica', 'bold')
    document.setFontSize(19)
    document.text('Movement coaching report', 50, 60)
    document.setFont('helvetica', 'normal')
    document.setFontSize(10)
    document.text(video.filename || 'Uploaded video', 50, 82)
    document.setTextColor(246, 202, 223)
    document.text(
      `${formatDuration(video.duration)}   |   ${video.width || 0} x ${video.height || 0}`,
      50,
      102,
    )
    let y = 148

    y = addPdfSection(document, 'REPORT SUMMARY', aiReport?.summary ? [reportText(aiReport.summary)] : [], y)
    y = addPdfSection(document, 'What went well', reportTextList(aiReport?.what_went_well), y)

    const coachingItems = reportFeedbackList(aiReport?.coaching_feedback).map((item) => {
      if (typeof item === 'string') return item
      return [
        reportText(item.focus),
        reportText(item.what_measurements_suggest),
        item.try_this ? `Try this: ${reportText(item.try_this)}` : '',
      ].filter(Boolean).join(' — ')
    })
    y = addPdfSection(document, 'Coaching feedback', coachingItems, y)
    y = addPdfSection(document, 'Practice focus', reportTextList(aiReport?.practice_focus), y)
    y = addPdfSection(document, 'Tracking note', aiReport?.tracking_note ? [reportText(aiReport.tracking_note)] : [], y)
    y = addPdfSection(document, 'Measured observations', analysis.observations || [], y)

    if (!aiReport) {
      addPdfParagraph(
        document,
        'Generate an AI report in the results dashboard for personalized, action-oriented coaching feedback.',
        y + 4,
      )
    }

    addPdfParagraph(
      document,
      'Educational movement feedback only. Review practice ideas with a qualified gymnastics coach; this report is not a medical assessment.',
      y + 8,
      { fontSize: 9 },
    )

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
              <div className="ai-report-heading">
                <div className="ai-report-mark" aria-hidden="true">
                  <Sparkles size={21} />
                </div>
                <div className="ai-report-heading-copy">
                  <p className="eyebrow">Personalized movement feedback</p>
                  <h3>Your coaching report</h3>
                  <p className="ai-report-subtitle">
                    Thoughtful, practical feedback based on the movement measured in this video.
                  </p>
                </div>
                <span className="ai-report-badge">AI interpretation</span>
              </div>

              <div className="ai-report-box">
                {reportText(aiReport.summary) ? (
                  <section className="ai-report-section ai-report-summary">
                    <span className="ai-section-kicker">The overview</span>
                    <p>{reportText(aiReport.summary)}</p>
                  </section>
                ) : null}

                {reportTextList(aiReport.what_went_well).length ? (
                  <section className="ai-report-section ai-report-strengths">
                    <h4>What went well</h4>
                    <ul>{reportTextList(aiReport.what_went_well).map((point, index) => <li key={`${point}-${index}`}>{point}</li>)}</ul>
                  </section>
                ) : null}

                {reportFeedbackList(aiReport.coaching_feedback).length ? (
                  <section className="ai-report-section ai-report-coaching">
                    <h4>Coaching feedback</h4>
                    <p className="ai-section-description">A few areas to explore in your next practice.</p>
                    <div className="coaching-feedback-list">
                      {reportFeedbackList(aiReport.coaching_feedback).map((item, index) => (
                        <article key={`${item.focus || 'feedback'}-${index}`} className="coaching-feedback-item">
                          {typeof item === 'string' ? (
                            <p>{item}</p>
                          ) : (
                            <>
                              <div className="coaching-focus-heading">
                                <span className="coaching-focus-number">{String(index + 1).padStart(2, '0')}</span>
                                <h5>{reportText(item.focus) || 'Movement focus'}</h5>
                              </div>
                              {reportText(item.what_measurements_suggest) ? <p className="coaching-context">{reportText(item.what_measurements_suggest)}</p> : null}
                              {reportText(item.try_this) ? (
                                <div className="coaching-cue">
                                  <span>TRY THIS</span>
                                  <p>{reportText(item.try_this)}</p>
                                </div>
                              ) : null}
                            </>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                {reportTextList(aiReport.practice_focus).length ? (
                  <section className="ai-report-section ai-report-practice">
                    <h4>Practice focus</h4>
                    <div className="practice-focus-list">
                      {reportTextList(aiReport.practice_focus).map((item, index) => (
                        <div className="practice-focus-item" key={`${item}-${index}`}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <p>{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {reportText(aiReport.tracking_note) ? (
                  <section className="ai-report-section tracking-note">
                    <h4>Tracking note</h4>
                    <p>{reportText(aiReport.tracking_note)}</p>
                  </section>
                ) : null}

                {!reportText(aiReport.summary) && !reportTextList(aiReport.what_went_well).length && !reportFeedbackList(aiReport.coaching_feedback).length && !reportTextList(aiReport.practice_focus).length ? (
                  <p>{reportText(aiReport.raw) || reportTextList(aiReport.review_points).join(' ') || 'The report did not include any narrative feedback.'}</p>
                ) : null}
              </div>
              <div className="ai-report-footer">
                <span>Generated from this video's measured movement data.</span>
                <span>Use as a practice aid, not a medical assessment.</span>
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
