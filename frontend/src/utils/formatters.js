export function formatDuration(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0.0s'

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins > 0) {
    return `${mins}m ${secs.toFixed(1)}s`
  }

  return `${secs.toFixed(1)}s`
}

export function formatFileSize(bytes = 0) {
  if (bytes === 0) return '0 MB'

  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0.0'
  }

  return Number(value).toFixed(digits)
}
