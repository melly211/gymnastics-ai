import { UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import LoadingState from '../components/LoadingState'
import { analyzeVideo } from '../services/api'
import { formatDuration, formatFileSize, formatNumber } from '../utils/formatters'

const ACCEPTED_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'video/x-msvideo',
]

function Analyze() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Initializing pose tracker...')
  const [videoMeta, setVideoMeta] = useState({ duration: 0, width: 0, height: 0 })

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function loadVideoMetadata(file) {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = URL.createObjectURL(file)

    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        const nextMetadata = {
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
        }

        URL.revokeObjectURL(video.src)
        resolve(nextMetadata)
      }
    })
  }

  function handleSelectedFile(file) {
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|m4v|webm)$/i)) {
      setError('Please select a supported video file (.mp4, .mov, .m4v, or .webm).')
      return
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('File is too large. Please upload a video under 200MB.')
      return
    }

    setError('')
    setSelectedFile(file)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(nextPreviewUrl)

    loadVideoMetadata(file).then((metadata) => setVideoMeta(metadata))
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setError('Please choose a video before analyzing.')
      return
    }

    setIsLoading(true)
    setError('')
    setProgress(0)
    setStatusText('Initializing pose tracker...')

    try {
      const result = await analyzeVideo(selectedFile, ({ progress: nextProgress, message }) => {
        setProgress(nextProgress)
        setStatusText(message || 'Analyzing video...')
      })

      navigate('/results', { state: { analysis: result } })
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while analyzing the video.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page analysis-page">
      <section className="panel upload-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Upload</p>
            <h3>Upload Your Gymnastics Video</h3>
          </div>
        </div>

        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            const file = event.dataTransfer.files?.[0]
            handleSelectedFile(file)
          }}
        >
          <UploadCloud size={36} />
          <p>Drag &amp; drop a video here</p>
          <label className="file-picker">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/x-m4v,video/webm,video/x-msvideo"
              onChange={(event) => handleSelectedFile(event.target.files?.[0])}
            />
            Browse files
          </label>
        </div>

        {selectedFile ? (
          <div className="file-meta">
            <div>
              <span className="meta-label">Selected file</span>
              <strong>{selectedFile.name}</strong>
            </div>
            <div>
              <span className="meta-label">Size</span>
              <strong>{formatFileSize(selectedFile.size)}</strong>
            </div>
            <div>
              <span className="meta-label">Duration</span>
              <strong>{formatDuration(videoMeta.duration)}</strong>
            </div>
            <div>
              <span className="meta-label">Resolution</span>
              <strong>
                {videoMeta.width && videoMeta.height
                  ? `${videoMeta.width}×${videoMeta.height}`
                  : 'Loading...'}
              </strong>
            </div>
          </div>
        ) : null}

        {previewUrl ? (
          <video className="uploaded-preview" controls src={previewUrl} />
        ) : null}

        <div className="privacy-message">
          Video processing happens locally in your browser. Your video is not uploaded to a server.
        </div>

        {error ? <div className="error-message">{error}</div> : null}

        <div className="cta-row action-row">
          <button
            type="button"
            className="primary-button"
            onClick={handleAnalyze}
            disabled={isLoading || !selectedFile}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Video'}
          </button>
        </div>

        {isLoading ? (
          <div>
            <LoadingState message={statusText} />
            <div className="progress-wrap" aria-live="polite">
              <div className="progress-bar" style={{ width: `${Math.max(5, progress)}%` }} />
            </div>
            <div className="progress-label">{formatNumber(progress, 0)}%</div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default Analyze
