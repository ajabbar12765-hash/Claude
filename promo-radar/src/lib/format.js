export function daysUntil(dateStr) {
  const ms = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

export function formatExpiry(dateStr) {
  const d = daysUntil(dateStr)
  if (d < 0) return 'Expired'
  if (d === 0) return 'Expires today'
  if (d === 1) return 'Expires tomorrow'
  return `Expires in ${d} days`
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(iso) {
  if (!iso) return 'never'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}
