import { discountLabel } from '../lib/catalog.js'

const REASON_LABEL = {
  'worked-once': 'You marked this used',
  'expired': "You reported this didn't work",
  'auto-expired': 'Auto-retired by the radar (past its expiry date)',
}

export default function ArchiveDrawer({ open, onClose, items, onRestore }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal drawer" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2>Archive</h2>
        <p className="modal-desc">Codes removed from your active list — used, reported, or auto-retired once expired.</p>

        {items.length === 0 && <p className="empty-state">Nothing archived yet.</p>}

        <ul className="archive-list">
          {items.map(({ item, reason, at }) => (
            <li key={item.id}>
              <div>
                <strong>{item.store}</strong> <code>{item.code}</code>
                <span className="discount-label"> · {discountLabel(item)}</span>
                <p className="archive-reason">{REASON_LABEL[reason] || reason} · {new Date(at).toLocaleDateString()}</p>
              </div>
              <button className="btn-ghost" onClick={() => onRestore(item.id)}>Restore</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
