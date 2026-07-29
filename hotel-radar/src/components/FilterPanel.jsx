import { useEffect, useRef, useState } from 'react'
import { AMENITIES, CITIES } from '../lib/catalog.js'
import { SORTS, DEFAULT_FILTERS, activeFilterCount } from '../lib/filters.js'
import { describeQuery } from '../lib/nlq.js'
import { prettyDate, nightsBetween } from '../lib/format.js'

const EXAMPLES = [
  'a hotel near Lake Como',
  '5 star near the Duomo in Milan',
  'rooftop pool in Barcelona',
  'near the Colosseum in Rome under 200',
]

const BUDGET_MAX = 1200

export default function FilterPanel({
  className = '',
  filters,
  resolved,
  trip,
  money,
  dealCount,
  matchCount,
  notificationState,
  onEnableNotifications,
  onChange,
  onTripChange,
  onClose,
}) {
  const [draft, setDraft] = useState(filters.query)
  const [exampleIndex, setExampleIndex] = useState(0)
  const debounce = useRef(null)

  // Keep the box in sync when the query is cleared from elsewhere.
  useEffect(() => {
    setDraft(filters.query)
  }, [filters.query])

  // Debounce so every keystroke does not re-run the whole filter pass.
  useEffect(() => {
    if (draft === filters.query) return
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => onChange({ query: draft }), 350)
    return () => clearTimeout(debounce.current)
  }, [draft, filters.query, onChange])

  useEffect(() => {
    const t = setInterval(() => setExampleIndex((i) => (i + 1) % EXAMPLES.length), 4200)
    return () => clearInterval(t)
  }, [])

  const chips = describeQuery(resolved.parsed)
  const activeCount = activeFilterCount(filters)
  const nights = nightsBetween(trip.checkIn, trip.checkOut)

  const toggleIn = (key, value) =>
    onChange((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }))

  return (
    <aside className={`panel ${className}`}>
      <div className="panel__scroll">
        <button className="panel__close" onClick={onClose} aria-label="Close filters">
          ✕
        </button>

        {/* ---- natural language search ---- */}
        <section className="field">
          <label className="field__label" htmlFor="nlq">
            What are you looking for?
          </label>
          <div className="search">
            <span className="search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              id="nlq"
              className="search__input"
              value={draft}
              placeholder={EXAMPLES[exampleIndex]}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  clearTimeout(debounce.current)
                  onChange({ query: draft })
                }
                if (e.key === 'Escape') setDraft('')
              }}
              autoComplete="off"
              spellCheck="false"
            />
            {draft && (
              <button
                className="search__clear"
                onClick={() => {
                  setDraft('')
                  onChange({ query: '' })
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {chips.length > 0 && (
            <div className="parsed">
              <span className="parsed__lead">Reading that as</span>
              <div className="parsed__chips">
                {chips.map((c) => (
                  <span className="chip chip--parsed" key={c.key}>
                    <span aria-hidden="true">{c.icon}</span> {c.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resolved.notes?.map((note) => (
            <p className="note" key={note}>
              <span aria-hidden="true">ⓘ</span> {note}
            </p>
          ))}

          {!draft && (
            <div className="suggestions">
              {EXAMPLES.slice(0, 3).map((ex) => (
                <button
                  key={ex}
                  className="chip chip--suggest"
                  onClick={() => {
                    setDraft(ex)
                    onChange({ query: ex })
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ---- budget ---- */}
        <section className="field">
          <div className="field__row">
            <label className="field__label" htmlFor="budget">
              Budget
            </label>
            <div className="segmented segmented--sm">
              {[
                ['nightly', 'per night'],
                ['total', `total (${nights}n)`],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={filters.budgetBasis === id ? 'is-active' : ''}
                  onClick={() => onChange({ budgetBasis: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="budget">
            <output className="budget__value">
              {money(resolved.effectiveBudget)}
              <span className="budget__unit">
                {filters.budgetBasis === 'total' ? ` / ${nights} nights` : ' / night'}
              </span>
            </output>
            {resolved.effectiveBudget < filters.budget && (
              <span className="budget__override">tightened by your search text</span>
            )}
          </div>

          <input
            id="budget"
            className="slider"
            type="range"
            min="40"
            max={BUDGET_MAX}
            step="10"
            value={Math.min(filters.budget, BUDGET_MAX)}
            onChange={(e) => onChange({ budget: +e.target.value })}
            style={{ '--fill': `${((filters.budget - 40) / (BUDGET_MAX - 40)) * 100}%` }}
          />
          <div className="slider__scale">
            <span>{money(40)}</span>
            <span>{money(BUDGET_MAX)}+</span>
          </div>

          <p className="field__hint">
            You get a message the moment a stay lands at or under this.
          </p>
        </section>

        {/* ---- notifications ---- */}
        {notificationState === 'default' && (
          <button className="btn btn--primary btn--wide" onClick={onEnableNotifications}>
            🔔 Turn on deal alerts
          </button>
        )}
        {notificationState === 'denied' && (
          <p className="note note--warn">
            <span aria-hidden="true">⚠</span> Browser notifications are blocked for this site.
            Alerts still appear in Messages. Re-enable them in your browser&apos;s site settings.
          </p>
        )}

        {/* ---- dates ---- */}
        <section className="field">
          <label className="field__label">Dates &amp; guests</label>
          <div className="grid2">
            <label className="mini">
              <span>Check in</span>
              <input
                type="date"
                value={trip.checkIn}
                onChange={(e) => {
                  const checkIn = e.target.value
                  onTripChange((t) => ({
                    ...t,
                    checkIn,
                    checkOut: t.checkOut > checkIn ? t.checkOut : checkIn,
                  }))
                }}
              />
            </label>
            <label className="mini">
              <span>Check out</span>
              <input
                type="date"
                min={trip.checkIn}
                value={trip.checkOut}
                onChange={(e) => onTripChange((t) => ({ ...t, checkOut: e.target.value }))}
              />
            </label>
            <label className="mini">
              <span>Adults</span>
              <input
                type="number"
                min="1"
                max="12"
                value={trip.adults}
                onChange={(e) => onTripChange((t) => ({ ...t, adults: Math.max(1, +e.target.value) }))}
              />
            </label>
            <label className="mini">
              <span>Rooms</span>
              <input
                type="number"
                min="1"
                max="6"
                value={trip.rooms}
                onChange={(e) => onTripChange((t) => ({ ...t, rooms: Math.max(1, +e.target.value) }))}
              />
            </label>
          </div>
          <p className="field__hint">
            {prettyDate(trip.checkIn)} → {prettyDate(trip.checkOut)} · {nights} night
            {nights === 1 ? '' : 's'}
          </p>
        </section>

        {/* ---- stars ---- */}
        <section className="field">
          <label className="field__label">Star rating</label>
          <div className="stars">
            {[5, 4, 3, 2].map((s) => (
              <button
                key={s}
                className={`chip chip--star ${filters.stars.includes(s) ? 'is-active' : ''}`}
                onClick={() => toggleIn('stars', s)}
                aria-pressed={filters.stars.includes(s)}
              >
                {s}
                <span aria-hidden="true">★</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---- guest rating ---- */}
        <section className="field">
          <div className="field__row">
            <label className="field__label" htmlFor="rating">
              Guest rating
            </label>
            <span className="field__value">
              {filters.minRating > 0 ? `${filters.minRating.toFixed(1)}+` : 'Any'}
            </span>
          </div>
          <input
            id="rating"
            className="slider"
            type="range"
            min="0"
            max="9.5"
            step="0.5"
            value={filters.minRating}
            onChange={(e) => onChange({ minRating: +e.target.value })}
            style={{ '--fill': `${(filters.minRating / 9.5) * 100}%` }}
          />
        </section>

        {/* ---- destinations ---- */}
        <section className="field">
          <label className="field__label">Destinations</label>
          <div className="chips">
            {CITIES.map((c) => (
              <button
                key={c.id}
                className={`chip ${filters.cities.includes(c.id) ? 'is-active' : ''}`}
                onClick={() => toggleIn('cities', c.id)}
                aria-pressed={filters.cities.includes(c.id)}
              >
                {c.city}
              </button>
            ))}
          </div>
        </section>

        {/* ---- amenities ---- */}
        <section className="field">
          <label className="field__label">Must have</label>
          <div className="chips">
            {AMENITIES.map((a) => {
              const on = resolved.effectiveAmenities.includes(a.id)
              const fromText = on && !filters.amenities.includes(a.id)
              return (
                <button
                  key={a.id}
                  className={`chip ${on ? 'is-active' : ''} ${fromText ? 'is-implied' : ''}`}
                  onClick={() => toggleIn('amenities', a.id)}
                  aria-pressed={on}
                  title={fromText ? 'From your search text' : undefined}
                >
                  <span aria-hidden="true">{a.icon}</span> {a.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* ---- sort ---- */}
        <section className="field">
          <label className="field__label" htmlFor="sort">
            Sort by
          </label>
          <select
            id="sort"
            className="select"
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </section>

        <div className="panel__footer">
          <span className="panel__count">
            <strong>{matchCount}</strong> in budget of {dealCount} matching
          </span>
          {activeCount > 0 && (
            <button
              className="btn btn--link"
              onClick={() => onChange({ ...DEFAULT_FILTERS, budget: filters.budget })}
            >
              Clear filters ({activeCount})
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
