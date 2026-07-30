// Multi-site price comparison — live.
//
// Queries every licensed hotel API that has a key configured, merges the
// results by hotel, and keeps one quote per site. The cheapest becomes the
// headline price and the card shows what each site wanted, which is the
// comparison the app was asked for.
//
// Scraping those same sites is not the alternative it appears to be. They
// refuse datacentre traffic — the 404s the Travelpayouts integration got were
// exactly that — and their terms forbid it. These APIs carry the same prices
// under a licence, so nothing has to be worked around.
//
// Results are not restricted to the local catalogue. A hotel these sites know
// about and the catalogue does not is still real, so it is shown.

import { DESTINATIONS, HOTELS, distanceKm } from '../catalog.js'
import { nightsBetween } from '../format.js'

const MAX_DESTINATIONS = 2 // each destination fans out to several upstreams

function normalise(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function matchCatalog(row, pool) {
  if (row.lat != null && row.lng != null) {
    for (const h of pool) {
      if (distanceKm({ lat: row.lat, lng: row.lng }, h) < 0.3) return h
    }
  }
  const rowName = normalise(row.name)
  if (!rowName) return null
  for (const h of pool) {
    const catName = normalise(h.name)
    if (rowName === catName || rowName.includes(catName) || catName.includes(rowName)) return h
  }
  return null
}

function targetDestinations(filters) {
  const ids = new Set()
  for (const id of filters?.cities ?? []) ids.add(id)
  if (filters?.parsedCityId) ids.add(filters.parsedCityId)
  if (filters?.parsedLandmarkDestinationId) ids.add(filters.parsedLandmarkDestinationId)
  const chosen = [...ids].slice(0, MAX_DESTINATIONS)
  return chosen.length ? chosen : DESTINATIONS.slice(0, MAX_DESTINATIONS).map((d) => d.id)
}

export async function scan(trip, config) {
  const base = config?.proxyUrl || '/api/hotels'
  const nights = nightsBetween(trip?.checkIn, trip?.checkOut)
  const ids = targetDestinations(config?.filters)
  const now = Date.now()
  const failures = []

  const perDestination = await Promise.all(
    ids.map(async (id) => {
      const dest = DESTINATIONS.find((d) => d.id === id)
      if (!dest) return []

      const params = new URLSearchParams({
        provider: 'multi',
        location: `${dest.city}, ${dest.country}`,
        adults: String(trip?.adults ?? 2),
        rooms: String(trip?.rooms ?? 1),
      })
      if (trip?.checkIn) params.set('checkIn', trip.checkIn)
      if (trip?.checkOut) params.set('checkOut', trip.checkOut)

      const res = await fetch(`${base}?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        failures.push(body.error || `proxy ${res.status}`)
        return []
      }
      const json = await res.json()
      const pool = HOTELS.filter((h) => h.destinationId === id)

      return (json.offers || []).flatMap((row) => {
        if (row.nightly == null) return []
        const known = matchCatalog(row, pool)

        const hotel = known || {
          id: `multi-${id}-${normalise(row.name).replace(/\s+/g, '-').slice(0, 40)}`,
          name: row.name || 'Hotel',
          area: dest.city,
          city: dest.city,
          country: dest.country,
          destinationId: id,
          stars: Math.round(row.stars) || 3,
          rating: row.rating != null ? Math.min(10, Math.max(0, row.rating)) : 8,
          reviews: 0,
          base: row.reference ?? row.nightly,
          lat: row.lat ?? dest.lat,
          lng: row.lng ?? dest.lng,
          amenities: ['wifi'],
          blurb: `Compared across ${row.siteCount} site${row.siteCount === 1 ? '' : 's'}.`,
          synthetic: true,
        }

        const nightly = Math.round(row.nightly)
        const reference = Math.max(nightly, Math.round(row.reference ?? nightly))

        return [{
          hotelId: hotel.id,
          hotel,
          nightly,
          reference,
          total: nightly * nights,
          nights,
          discount: reference > nightly ? 1 - nightly / reference : 0,
          flash: false,
          roomsLeft: null,
          seenAt: now,
          source: 'multi',
          aggregated: true,
          // What each site quoted, cheapest first.
          quotes: row.quotes || [],
          cheapestSite: row.cheapestSite || null,
          siteCount: row.siteCount || (row.quotes?.length ?? 1),
        }]
      })
    })
  )

  const offers = perDestination.flat()
  if (!offers.length) {
    throw new Error(
      failures.length ? failures[0] : 'No site returned prices for these dates.'
    )
  }
  return offers
}

export const meta = {
  id: 'multi',
  label: 'Compare multiple sites (live)',
  needsKey: false,
  serverKey: true,
  description:
    'Queries every licensed hotel API that has a key set, merges them by hotel and shows what each site quoted. Set RAPIDAPI_KEY for Booking.com and Tripadvisor, and MAKCORPS_API_KEY for a further multi-vendor comparison. Any one of them is enough to start.',
  quotaNote:
    'Sources queried in parallel and walked until the listing runs out, so a large city returns a few hundred hotels rather than one page. Each site on RapidAPI has its own separate allowance, so subscribing to a second one stacks its quota on top of the first. Results are cached for four hours to make free tiers last.',
}
