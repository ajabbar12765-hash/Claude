import { useEffect, useState } from 'react'
import { getGmailStatus, disconnectGmail } from '../lib/api.js'

const DOT = {
  malicious: '#dc2626',
  suspicious: '#d97706',
  safe: '#16a34a',
  unknown: '#6b7280',
}

export default function GmailPanel() {
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      setStatus(await getGmailStatus())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // The dashboard is a viewer, not the scan trigger -- actual scanning
    // happens server-side the instant Gmail pushes a new-message event. This
    // just refreshes what's already been recorded while you have it open.
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [])

  async function handleDisconnect() {
    if (!confirm('Disconnect Gmail? Auto-scanning will stop until you reconnect.')) return
    await disconnectGmail()
    load()
  }

  if (error) return <p className="scan-error">{error}</p>
  if (!status) return <p className="empty">Loading Gmail status…</p>

  if (!status.connected) {
    return (
      <div className="gmail-panel">
        <p>Not connected. New emails won't be auto-scanned until you connect Gmail.</p>
        <a className="button" href="/api/gmail/oauth-start">
          Connect Gmail
        </a>
      </div>
    )
  }

  return (
    <div className="gmail-panel">
      <div className="gmail-header">
        <p>
          Connected since {new Date(status.connectedAt).toLocaleDateString()}. Every new email is scanned
          automatically within seconds of arriving.
        </p>
        <button className="button-secondary" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>
      {status.warning && <p className="scan-error">{status.warning}</p>}
      {status.scans?.length ? (
        <ul className="email-list">
          {status.scans.map((s) => (
            <li key={s.messageId}>
              <span className="dot" style={{ background: DOT[s.verdict] || DOT.unknown }} />
              <div>
                <div className="email-subject">{s.subject}</div>
                <div className="email-from">{s.from}</div>
                {s.links?.length > 0 && (
                  <div className="email-meta">
                    {s.links.length} link{s.links.length > 1 ? 's' : ''} checked
                  </div>
                )}
                {s.attachments?.length > 0 && (
                  <div className="email-meta">
                    {s.attachments.length} attachment{s.attachments.length > 1 ? 's' : ''} checked
                  </div>
                )}
              </div>
              <span className="history-time">{new Date(s.scannedAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">No new emails scanned yet.</p>
      )}
    </div>
  )
}
