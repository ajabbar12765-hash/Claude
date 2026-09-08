import StatusPill from './StatusPill.jsx'

export default function TopBar({ mode, setMode, radarStatus, onAddCode, onOpenArchive, archiveCount }) {
  return (
    <header className="topbar">
      <div className="brand">
        <img src="./icon.svg" alt="" width="30" height="30" />
        <div>
          <h1>Promo Radar</h1>
          <p>Pakistan promo codes &amp; gift card deals</p>
        </div>
      </div>

      <div className="mode-switch" role="tablist" aria-label="Mode">
        <button role="tab" aria-selected={mode === 'deals'} className={mode === 'deals' ? 'active' : ''} onClick={() => setMode('deals')}>
          Local deals
        </button>
        <button role="tab" aria-selected={mode === 'travel'} className={mode === 'travel' ? 'active' : ''} onClick={() => setMode('travel')}>
          ✈️ Travel mode
        </button>
      </div>

      <div className="topbar-actions">
        <StatusPill {...radarStatus} />
        <button className="btn-ghost" onClick={onOpenArchive}>
          Archive {archiveCount > 0 && <span className="badge">{archiveCount}</span>}
        </button>
        <button className="btn-primary" onClick={onAddCode}>+ Add a code</button>
      </div>
    </header>
  )
}
