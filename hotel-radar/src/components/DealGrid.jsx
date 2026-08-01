import { useMemo, useState } from 'react'
import DealCard from './DealCard.jsx'

const PAGE = 12

export default function DealGrid({
  deals,
  resolved,
  trip,
  money,
  saved,
  scanning,
  scanCount,
  providerError,
  onToggleSave,
  onChange,
  onOpenSettings,
}) {
  const [tab, setTab] = useState('budget') // budget | all | saved
  const [limit, setLimit] = useState(PAGE)

  const inBudget = useMemo(() => deals.filter((d) => d.withinBudget), [deals])
  const savedDeals = useMemo(() => deals.filter((d) => saved.includes(d.hotelId)), [deals, saved])

  const list = tab === 'budget' ? inBudget : tab === 'saved' ? savedDeals : deals
  const visible = list.slice(0, limit)

  const tabs = [
    { id: 'budget', label: 'In budget', count: inBudget.length },
    { id: 'all', label: 'All matches', count: deals.length },
    { id: 'saved', label: 'Saved', count: savedDeals.length },
  ]

  return (
    <section className="results">
      {providerError && (
        <div className="banner banner--warn">
          <span aria-hidden="true">⚠</span>
          <p>{providerError}</p>
          <button className="btn btn--link" onClick={onOpenSettings}>
            Open settings
          </button>
        </div>
      )}

      <div className="results__head">
        <div className="segmented">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'is-active' : ''}
              onClick={() => {
                setTab(t.id)
                setLimit(PAGE)
              }}
            >
              {t.label}
              <span className="segmented__count">{t.count}</span>
            </button>
          ))}
        </div>

        {scanCount > 0 && (
          <p className="results__meta">
            {scanning ? 'Refreshing prices…' : `Scan #${scanCount} complete`}
          </p>
        )}
      </div>

      {scanCount === 0 ? (
        <div className="skeletonGrid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Empty tab={tab} resolved={resolved} money={money} onChange={onChange} />
      ) : (
        <>
          <div className="grid">
            {visible.map((deal, i) => (
              <DealCard
                key={deal.key}
                deal={deal}
                trip={trip}
                money={money}
                rank={tab === 'budget' ? i : -1}
                saved={saved.includes(deal.hotelId)}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>

          {list.length > visible.length && (
            <button className="btn btn--ghost btn--wide" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, list.length - visible.length)} more
            </button>
          )}
        </>
      )}
    </section>
  )
}

// A place the catalogue does not cover would otherwise be a dead end. The
// query still describes a real destination, so hand it to Booking.com rather
// than leaving the user with nothing.
function OffCatalogue({ query }) {
  const url =
    'https://www.booking.com/searchresults.html?ss=' + encodeURIComponent(query)
  return (
    <div className="offCatalogue">
      <p>
        <strong>&ldquo;{query}&rdquo;</strong> is not in the catalogue yet, so there is
        nothing here to watch for you.
      </p>
      <a className="btn btn--primary" href={url} target="_blank" rel="noopener noreferrer">
        Search Booking.com for it <span aria-hidden="true">↗</span>
      </a>
      <p className="offCatalogue__note">
        Tell me the place and I will add it, and the budget alerts will cover it too.
      </p>
    </div>
  )
}

function Empty({ tab, resolved, money, onChange }) {
  if (tab === 'saved') {
    return (
      <div className="empty">
        <span className="empty__glyph" aria-hidden="true">
          ♡
        </span>
        <h2>Nothing saved yet</h2>
        <p>Tap the heart on any deal to keep it here while you decide.</p>
      </div>
    )
  }

  if (tab === 'budget') {
    return (
      <div className="empty">
        <span className="empty__glyph" aria-hidden="true">
          ⌛
        </span>
        <h2>Nothing under {money(resolved.effectiveBudget)} yet</h2>
        <p>
          The radar keeps running in the background. You will get a message the second
          something drops into budget — or nudge the budget up to see more now.
        </p>
        <div className="empty__actions">
          <button
            className="btn btn--primary"
            onClick={() => onChange((f) => ({ ...f, budget: Math.round(f.budget * 1.35) }))}
          >
            Raise budget 35%
          </button>
        </div>
      </div>
    )
  }

  // Nothing recognised at all, just leftover words: most likely a place the
  // catalogue does not have, rather than filters that are too tight.
  const q = resolved.parsed
  const looksLikeUnknownPlace =
    q.keywords.length > 0 && !q.city && !q.landmark && !q.amenities.length

  return (
    <div className="empty">
      <span className="empty__glyph" aria-hidden="true">
        ⌕
      </span>
      <h2>No stays match those filters</h2>
      {looksLikeUnknownPlace ? (
        <OffCatalogue query={resolved.query.trim()} />
      ) : (
        <p>
          The combination is a little tight. Try dropping an amenity, widening the star
          rating, or clearing the search text.
        </p>
      )}
      <div className="empty__actions">
        <button className="btn btn--ghost" onClick={() => onChange({ query: '' })}>
          Clear search text
        </button>
        <button className="btn btn--ghost" onClick={() => onChange({ amenities: [], stars: [] })}>
          Clear stars &amp; amenities
        </button>
      </div>
    </div>
  )
}
