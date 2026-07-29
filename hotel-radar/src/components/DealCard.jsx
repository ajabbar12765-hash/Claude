import { useState } from 'react'
import { AMENITY_ICON, AMENITY_LABEL } from '../lib/catalog.js'
import { bookingLinks, PROVIDERS } from '../lib/deeplinks.js'
import { hashUnit, ratingWord, timeAgo } from '../lib/format.js'

// Deterministic per-hotel artwork. Keeping it generative means no external
// image requests, so cards never flash a broken thumbnail.
function artwork(hotel) {
  const seed = hashUnit(hotel.id + hotel.name)
  const hue = Math.round(180 + seed * 160) % 360
  const hue2 = (hue + 45) % 360
  const glyph = hotel.amenities.includes('lakeview')
    ? '🏔'
    : hotel.amenities.includes('seaview') || hotel.amenities.includes('beach')
      ? '🌊'
      : hotel.stars === 5
        ? '✦'
        : hotel.amenities.includes('rooftop')
          ? '🌇'
          : '🏛'
  return {
    style: {
      '--h1': hue,
      '--h2': hue2,
      '--tilt': `${(seed - 0.5) * 24}deg`,
    },
    glyph,
  }
}

const TOP_AMENITIES = ['lakeview', 'seaview', 'beach', 'pool', 'spa', 'rooftop', 'breakfast', 'parking', 'gym']

export default function DealCard({ deal, trip, money, saved, onToggleSave, rank }) {
  const [linksOpen, setLinksOpen] = useState(false)
  const { hotel } = deal
  const art = artwork(hotel)
  const links = bookingLinks(hotel, trip)
  const pct = Math.round(deal.discount * 100)

  const shown = TOP_AMENITIES.filter((a) => hotel.amenities.includes(a)).slice(0, 4)
  const extra = hotel.amenities.length - shown.length

  return (
    <article className={`card ${deal.withinBudget ? 'card--match' : ''}`}>
      <div className="card__art" style={art.style}>
        <span className="card__glyph" aria-hidden="true">
          {art.glyph}
        </span>
        <div className="card__artTags">
          {deal.withinBudget && <span className="tag tag--match">In budget</span>}
          {deal.flash && <span className="tag tag--flash">⚡ Flash drop</span>}
          {pct >= 20 && !deal.flash && <span className="tag tag--save">−{pct}%</span>}
          {rank === 0 && deal.withinBudget && <span className="tag tag--top">Best value</span>}
        </div>
        <button
          className={`card__save ${saved ? 'is-saved' : ''}`}
          onClick={() => onToggleSave(hotel.id)}
          aria-label={saved ? 'Remove from saved' : 'Save this deal'}
          title={saved ? 'Saved' : 'Save'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>

      <div className="card__body">
        <header className="card__head">
          <div>
            <h3 className="card__name">{hotel.name}</h3>
            <p className="card__where">
              <span className="card__stars" aria-label={`${hotel.stars} stars`}>
                {'★'.repeat(hotel.stars)}
              </span>
              <span>
                {hotel.area}, {hotel.city}
              </span>
            </p>
          </div>
          <div className="score" title={`${hotel.reviews.toLocaleString()} reviews`}>
            <span className="score__value">{hotel.rating.toFixed(1)}</span>
            <span className="score__word">{ratingWord(hotel.rating)}</span>
          </div>
        </header>

        {deal.distanceToLandmark != null && (
          <p className="card__distance">
            <span aria-hidden="true">📍</span> {deal.distanceToLandmark.toFixed(1)} km from{' '}
            {deal.landmarkName}
          </p>
        )}

        <p className="card__blurb">{hotel.blurb}</p>

        <ul className="card__amenities">
          {shown.map((a) => (
            <li key={a}>
              <span aria-hidden="true">{AMENITY_ICON[a]}</span> {AMENITY_LABEL[a]}
            </li>
          ))}
          {extra > 0 && <li className="card__amenityMore">+{extra} more</li>}
        </ul>

        <footer className="card__footer">
          <div className="price">
            {deal.reference > deal.nightly && (
              <span className="price__was">{money(deal.reference)}</span>
            )}
            <span className="price__now">{money(deal.nightly)}</span>
            <span className="price__unit">/ night</span>
            <span className="price__total">
              {money(deal.total)} total · {deal.nights} night{deal.nights === 1 ? '' : 's'}
            </span>
            {deal.roomsLeft && (
              <span className="price__urgency">
                Only {deal.roomsLeft} room{deal.roomsLeft === 1 ? '' : 's'} at this rate
              </span>
            )}
          </div>

          <div className="card__cta">
            <a
              className="btn btn--primary"
              href={links.booking}
              target="_blank"
              rel="noopener noreferrer"
            >
              Book now <span aria-hidden="true">↗</span>
            </a>
            <button
              className="btn btn--ghost btn--icon"
              onClick={() => setLinksOpen((v) => !v)}
              aria-expanded={linksOpen}
              aria-label="Compare on other sites"
              title="Compare on other sites"
            >
              {linksOpen ? '▴' : '▾'}
            </button>
          </div>
        </footer>

        {linksOpen && (
          <div className="card__links">
            <span className="card__linksLead">Compare live prices</span>
            <div className="card__linkRow">
              {PROVIDERS.filter((p) => !p.primary).map((p) => (
                <a
                  key={p.id}
                  className="chip chip--link"
                  href={links[p.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {p.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
            <p className="card__disclaimer">
              Rates shown here are indicative and refresh on every scan. The booking site
              confirms the real, final price.
            </p>
          </div>
        )}

        <p className="card__seen">Seen {timeAgo(deal.seenAt)}</p>
      </div>
    </article>
  )
}
