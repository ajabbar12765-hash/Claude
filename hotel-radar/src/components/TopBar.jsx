import { useEffect, useState } from 'react'
import { timeAgo } from '../lib/format.js'

export default function TopBar({
  unread,
  scanning,
  lastScan,
  scanCount,
  matchCount,
  theme,
  onToggleTheme,
  onOpenAlerts,
  onOpenSettings,
  onScanNow,
  onToggleFilters,
}) {
  // Re-render once a second so "12s ago" stays honest.
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="logo" aria-hidden="true">
          <span className="logo__sweep" />
        </span>
        <div className="topbar__title">
          <h1>Hotel Radar</h1>
          <p>Always-on deal watch</p>
        </div>
      </div>

      <button className="btn btn--ghost topbar__filters" onClick={onToggleFilters}>
        <span aria-hidden="true">☰</span> Filters
      </button>

      <div className="topbar__status" title={`${scanCount} scans this session`}>
        <span className={`pulse ${scanning ? 'pulse--active' : ''}`} aria-hidden="true" />
        <span className="topbar__statusText">
          {scanning ? (
            'Scanning…'
          ) : lastScan ? (
            <>
              <strong>{matchCount}</strong> in budget · checked {timeAgo(lastScan)}
            </>
          ) : (
            'Starting up…'
          )}
        </span>
      </div>

      <div className="topbar__actions">
        <button className="btn btn--ghost" onClick={onScanNow} disabled={scanning} title="Scan now">
          <span aria-hidden="true">⟳</span>
          <span className="btn__label">Scan</span>
        </button>

        <button
          className="btn btn--ghost btn--icon"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          aria-label="Toggle colour theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        <button
          className="btn btn--ghost btn--icon"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          ⚙
        </button>

        <button className="btn btn--bell" onClick={onOpenAlerts} title="Deal messages">
          <span aria-hidden="true">🔔</span>
          <span className="btn__label">Messages</span>
          {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </div>
    </header>
  )
}
