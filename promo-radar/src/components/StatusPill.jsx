import { timeAgo } from '../lib/format.js'

export default function StatusPill({ activeCount, expiringSoonCount, lastScanAt }) {
  return (
    <div className="status-pill" title="The radar checks every code's expiry on a timer and auto-retires anything past its date">
      <span className="status-dot" />
      <span>Watching {activeCount} codes</span>
      {expiringSoonCount > 0 && <span className="status-warn">· {expiringSoonCount} expiring soon</span>}
      <span className="status-scan">· last scan {timeAgo(lastScanAt)}</span>
    </div>
  )
}
