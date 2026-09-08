import { useState } from 'react'
import { discountLabel, CATEGORY_ACCENT } from '../lib/catalog.js'
import { formatExpiry, daysUntil } from '../lib/format.js'

export default function CodeCard({ item, isUsed, onView, onCopy, onWorked, onDidntWork }) {
  const [copied, setCopied] = useState(false)
  const soon = daysUntil(item.expiresAt) <= 3
  const accent = CATEGORY_ACCENT[item.category] || 'pink'

  function handleCopy(e) {
    e.stopPropagation()
    onCopy(item)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <article className={`code-card accent-${accent} ${soon ? 'expiring' : ''}`} onClick={() => onView(item)}>
      {item.priority && <span className="priority-flag" title="Pinned to the top by default">★ Priority</span>}
      <div className="code-card-head">
        <span className="store-avatar">{item.store.slice(0, 2).toUpperCase()}</span>
        <div className="code-card-store">
          <strong>{item.store}</strong>
          <span className="discount-label">{discountLabel(item)}</span>
        </div>
        {item.sample ? (
          <span className="badge badge-sample" title="Starter data — verify before use">Unverified</span>
        ) : item.source === 'Live scan (Apify)' ? (
          <span className="badge badge-live" title="Found by a live scan of the store's own page just now">Live</span>
        ) : (
          <span className="badge badge-verified" title="Added or confirmed by you">Verified</span>
        )}
      </div>

      <p className="code-card-title">{item.title}</p>

      {item.code ? (
        <div className="code-chip">
          <code>{item.code}</code>
          <button className="btn-copy" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      ) : (
        <div className="code-chip no-code">No code needed — applies automatically</div>
      )}

      <div className="code-card-foot">
        <span className={`expiry ${soon ? 'expiry-soon' : ''}`}>{formatExpiry(item.expiresAt)}</span>
        {isUsed && <span className="used-tag">✓ You used this</span>}
      </div>

      <div className="code-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn-worked" onClick={() => onWorked(item)}>✅ It worked</button>
        <button className="btn-expired" onClick={() => onDidntWork(item)}>❌ Didn't work</button>
      </div>
    </article>
  )
}
