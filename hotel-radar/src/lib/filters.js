// Filter evaluation: turns raw offers plus the active filter set into the
// ranked deal list the UI renders and the alert engine watches.

import { hotelById, distanceKm } from './catalog.js'
import { parseQuery } from './nlq.js'

export const SORTS = [
  { id: 'best', label: 'Best deal' },
  { id: 'price', label: 'Price: low to high' },
  { id: 'discount', label: 'Biggest drop' },
  { id: 'rating', label: 'Guest rating' },
  { id: 'stars', label: 'Stars' },
  { id: 'distance', label: 'Distance' },
]

export const DEFAULT_FILTERS = {
  query: '',
  budget: 250, // max EUR per night — this is the alert threshold
  minPrice: 0,
  stars: [], // e.g. [4, 5]; empty means any
  minRating: 0,
  amenities: [],
  cities: [],
  sort: 'best',
  budgetBasis: 'nightly', // 'nightly' | 'total'
}

/**
 * Combine the explicit controls with anything parsed out of the text box.
 * Explicit controls win where they conflict, except that the text box can
 * only tighten the budget, never loosen it past the slider.
 */
export function resolveFilters(filters, parsedOverride) {
  // Smart parsing is async and arrives a beat after the keystroke. Only use
  // it when it belongs to the query currently in the box, so a stale result
  // can never filter against text the user has already changed.
  const parsed =
    parsedOverride && parsedOverride.raw === filters.query
      ? parsedOverride
      : parseQuery(filters.query)
  // The star chips are an exact set; a typed "4 star" reads as 4 and up.
  const stars = filters.stars.length
    ? filters.stars
    : parsed.minStars
      ? [5, 4, 3, 2, 1].filter((s) => s >= parsed.minStars)
      : []

  return {
    ...filters,
    parsed,
    effectiveStars: stars,
    effectiveMinStars: filters.stars.length ? Math.min(...filters.stars) : parsed.minStars,
    effectiveBudget:
      parsed.maxPrice != null ? Math.min(filters.budget, parsed.maxPrice) : filters.budget,
    effectiveMinPrice: Math.max(filters.minPrice, parsed.minPrice ?? 0),
    effectiveAmenities: [...new Set([...filters.amenities, ...parsed.amenities])],
    notes: parsed.notes,
  }
}

function keywordHit(hotel, keywords) {
  if (!keywords.length) return true
  const hay = `${hotel.name} ${hotel.area} ${hotel.city} ${hotel.country} ${hotel.blurb}`.toLowerCase()
  return keywords.every((k) => hay.includes(k))
}

/**
 * @returns {Array} deals: offer + hotel + derived fields, filtered and sorted
 */
export function buildDeals(offers, filters, parsedOverride) {
  const f = resolveFilters(filters, parsedOverride)
  const { parsed } = f

  const deals = []
  for (const offer of offers) {
    const hotel = hotelById(offer.hotelId)
    if (!hotel) continue

    const price = f.budgetBasis === 'total' ? offer.total : offer.nightly

    if (f.effectiveStars.length && !f.effectiveStars.includes(hotel.stars)) continue
    if (f.effectiveMinPrice && price < f.effectiveMinPrice) continue
    if (hotel.rating < f.minRating) continue
    if (f.cities.length && !f.cities.includes(hotel.destinationId)) continue
    if (parsed.city && hotel.destinationId !== parsed.city.id) continue
    if (f.effectiveAmenities.some((a) => !hotel.amenities.includes(a))) continue
    if (!keywordHit(hotel, parsed.keywords)) continue

    let distanceToLandmark = null
    if (parsed.landmark) {
      distanceToLandmark = distanceKm(parsed.landmark, hotel)
      if (parsed.radiusKm && distanceToLandmark > parsed.radiusKm) continue
    }

    const withinBudget = price <= f.effectiveBudget
    // Composite score: value for money, weighted by how good the property is.
    const value = offer.reference > 0 ? offer.reference / Math.max(1, offer.nightly) : 1
    const score =
      offer.discount * 100 +
      (hotel.rating - 7) * 6 +
      hotel.stars * 2 +
      (value - 1) * 25 +
      (offer.flash ? 12 : 0) -
      (distanceToLandmark != null ? Math.min(distanceToLandmark, 25) * 0.8 : 0)

    deals.push({
      ...offer,
      hotel,
      price,
      withinBudget,
      distanceToLandmark,
      landmarkName: parsed.landmark?.name ?? null,
      score,
      key: `${offer.hotelId}`,
    })
  }

  const sorters = {
    // Affordable first — the default view should not lead with stays
    // that are out of budget however good the discount.
    best: (a, b) => b.withinBudget - a.withinBudget || b.score - a.score,
    price: (a, b) => a.price - b.price,
    discount: (a, b) => b.discount - a.discount,
    rating: (a, b) => b.hotel.rating - a.hotel.rating,
    stars: (a, b) => b.hotel.stars - a.hotel.stars || b.hotel.rating - a.hotel.rating,
    distance: (a, b) =>
      (a.distanceToLandmark ?? Infinity) - (b.distanceToLandmark ?? Infinity),
  }
  deals.sort(sorters[f.sort] || sorters.best)

  return { deals, resolved: f }
}

/** Count of filters the user has actively set, for the "clear all" affordance. */
export function activeFilterCount(filters) {
  let n = 0
  if (filters.query.trim()) n++
  if (filters.stars.length) n++
  if (filters.minRating > 0) n++
  if (filters.amenities.length) n++
  if (filters.cities.length) n++
  if (filters.minPrice > 0) n++
  return n
}
