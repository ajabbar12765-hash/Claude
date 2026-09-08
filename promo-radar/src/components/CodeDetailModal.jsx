import { discountLabel } from '../lib/catalog.js'
import { formatExpiry, formatDate } from '../lib/format.js'

export default function CodeDetailModal({ item, onClose, onCopy, onWorked, onDidntWork }) {
  if (!item) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="modal-head">
          <span className="store-avatar large">{item.store.slice(0, 2).toUpperCase()}</span>
          <div>
            <h2>{item.store}</h2>
            <p className="discount-label">{discountLabel(item)} · {item.title}</p>
          </div>
        </div>

        <div className="code-chip large">
          <code>{item.code}</code>
          <button className="btn-copy" onClick={() => onCopy(item)}>Copy code</button>
        </div>

        <p className="modal-desc">{item.description}</p>

        <div className="modal-grid">
          <div>
            <h4>Min spend</h4>
            <p>{item.minSpend ? `Rs. ${item.minSpend.toLocaleString()}` : 'None'}</p>
          </div>
          <div>
            <h4>Max discount</h4>
            <p>{item.maxDiscount ? `Rs. ${item.maxDiscount.toLocaleString()}` : '—'}</p>
          </div>
          <div>
            <h4>Category</h4>
            <p style={{ textTransform: 'capitalize' }}>{item.category}{item.category === 'travel' ? ` · ${item.country}` : ''}</p>
          </div>
          <div>
            <h4>Status</h4>
            <p>{formatExpiry(item.expiresAt)}</p>
          </div>
        </div>

        {item.howTo?.length > 0 && (
          <div className="modal-section">
            <h4>How to redeem</h4>
            <ol>{item.howTo.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </div>
        )}

        {item.terms?.length > 0 && (
          <div className="modal-section">
            <h4>Terms &amp; conditions</h4>
            <ul>{item.terms.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        )}

        <div className="modal-meta">
          <span>Added {formatDate(item.addedAt)}</span>
          <span>Source: {item.source || 'added by you'}</span>
          {item.sample && <span className="badge badge-sample">Unverified — confirm at checkout</span>}
        </div>

        <div className="modal-actions">
          <a className="btn-primary" href={item.url} target="_blank" rel="noreferrer">Go to {item.store} ↗</a>
          <button className="btn-worked" onClick={() => onWorked(item)}>✅ It worked</button>
          <button className="btn-expired" onClick={() => onDidntWork(item)}>❌ Didn't work / expired</button>
        </div>
      </div>
    </div>
  )
}
