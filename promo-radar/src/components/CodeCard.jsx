import { useState } from 'react'
import { discountLabel } from '../lib/catalog.js'
import { formatExpiry, daysUntil } from '../lib/format.js'

export default function CodeCard({ item, isUsed, onView, onCopy, onWorked, onDidntWork }) {
  const [copied, setCopied] = useState(false)
  const soon = daysUntil(item.expiresAt) <= 3

  function handleCopy(e) {
    e.stopPropagation()
    onCopy(item)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <article className={`code-card ${soon ? 'expiring' : ''}`} onClick={() => onView(item)}>
      <div className="code-card-head">
        <span className="store-avatar">{item.store.slice(0, 2).toUpperCase()}</span>
        <div className="code-card-store">
          <strong>{item.store}</strong>
          <span className="discount-label">{discountLabel(item)}</span>
        </div>
        {item.sample ? (
          <span className="badge badge-sample" title="Starter data — verify before use">Unverified</span>
        ) : (
          <span className="badge badge-verified" title="Added or confirmed by you">Verified</span>
        )}
      </div>

      <p className="code-card-title">{item.title}</p>

      <div className="code-chip">
        <code>{item.code}</code>
        <button className="btn-copy" onClick={handleCopy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>

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
