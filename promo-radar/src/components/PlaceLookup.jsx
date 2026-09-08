import { useMemo, useState } from 'react'
import { discountLabel, sortByPriority, CATEGORY_ACCENT } from '../lib/catalog.js'
import { formatExpiry } from '../lib/format.js'

// The headline interaction: type any place — a store, a brand, a city you're
// flying to — and find out, instantly and for free, whether the radar is
// holding a promo or gift-card code for it. No signup, nothing to buy.
export default function PlaceLookup({ items, usedMap, onCopy, onWorked, onDidntWork, onAddPlace }) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const matches = items.filter((i) => {
      const hay = `${i.store} ${i.country} ${i.category} ${i.title} ${i.description || ''}`.toLowerCase()
      return hay.includes(q)
    })
    return sortByPriority(matches)
  }, [items, query])

  function submit(e) {
    e.preventDefault()
    setSearched(true)
    document.getElementById('lookup-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="lookup">
      <form className="lookup-box" onSubmit={submit}>
        <span className="lookup-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSearched(false) }}
          placeholder="Type a place — Daraz, Springs, Dubai, Istanbul…"
          aria-label="Look up a place"
        />
        <button type="submit" className="btn-stamp">Check for codes</button>
      </form>
      <p className="lookup-hint">Free to check, no account — searches every code the radar is currently watching.</p>

      {(searched || query) && (
        <div id="lookup-results" className="lookup-results">
          {results.length > 0 ? (
            <>
              <p className="lookup-count">
                {results.length} code{results.length === 1 ? '' : 's'} found for "{query}"
              </p>
              <div className="code-grid">
                {results.map((item) => (
                  <LookupCard
                    key={item.id}
                    item={item}
                    isUsed={!!usedMap[item.id]}
                    onCopy={onCopy}
                    onWorked={onWorked}
                    onDidntWork={onDidntWork}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="lookup-empty">
              <p>No codes for "{query}" yet — the radar isn't watching this place.</p>
              <button className="btn-stamp" onClick={() => onAddPlace(query)}>+ Add a code for "{query}"</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LookupCard({ item, isUsed, onCopy, onWorked, onDidntWork }) {
  const accent = CATEGORY_ACCENT[item.category] || 'pink'
  return (
    <article className={`code-card accent-${accent}`}>
      {item.priority && <span className="priority-flag" title="Pinned to the top by default">★ Priority</span>}
      <div className="code-card-head">
        <span className="store-avatar">{item.store.slice(0, 2).toUpperCase()}</span>
        <div className="code-card-store">
          <strong>{item.store}</strong>
          <span className="discount-label">{discountLabel(item)}</span>
        </div>
        <span className={`stamp ${item.sample ? 'stamp-unverified' : 'stamp-verified'}`}>
          {item.sample ? 'Unverified' : 'Verified'}
        </span>
      </div>
      <p className="code-card-title">{item.title}</p>
      <div className="code-chip">
        <code>{item.code}</code>
        <button className="btn-copy" onClick={() => onCopy(item)}>Copy</button>
      </div>
      <div className="code-card-foot">
        <span>{formatExpiry(item.expiresAt)}</span>
        {isUsed && <span className="used-tag">✓ You used this</span>}
      </div>
      <div className="code-card-actions">
        <button className="btn-worked" onClick={() => onWorked(item)}>✅ It worked</button>
        <button className="btn-expired" onClick={() => onDidntWork(item)}>❌ Didn't work</button>
      </div>
    </article>
  )
}
