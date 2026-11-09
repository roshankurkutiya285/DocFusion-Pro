/**
 * Formats byte size into human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Formats timestamp to human readable date and time
 */
export function formatDate(timestamp: number | Date): string {
  const d = new Date(timestamp)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats zoom decimal into percentage string
 */
export function formatZoom(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}
