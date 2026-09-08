import { timeAgo } from '../lib/format.js'

const LIVE_LABEL = {
  scanning: { text: 'Checking for a live scan…', title: 'Asking /api/codes whether a live Apify scan is configured' },
  live: { text: 'Live scan active', title: 'A real scan of official store pages ran via Apify — see the README' },
  off: { text: 'Starter data only', title: 'No APIFY_TOKEN configured — showing the curated starter catalogue. See README to turn on live scanning.' },
}

export default function StatusPill({ activeCount, expiringSoonCount, lastScanAt, liveStatus }) {
  const live = LIVE_LABEL[liveStatus]
  return (
    <div className="status-pill" title="The radar checks every code's expiry on a timer and auto-retires anything past its date">
      <span className="status-dot" />
      <span>Watching {activeCount} codes</span>
      {expiringSoonCount > 0 && <span className="status-warn">· {expiringSoonCount} expiring soon</span>}
      <span className="status-scan">· last scan {timeAgo(lastScanAt)}</span>
      {live && (
        <span className={liveStatus === 'live' ? 'status-live' : 'status-dim'} title={live.title}>
          · {live.text}
        </span>
      )}
    </div>
  )
}
