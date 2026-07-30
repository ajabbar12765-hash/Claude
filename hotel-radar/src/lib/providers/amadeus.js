// Amadeus Self-Service adapter — live, through the server proxy.
//
// This exists as a *second* source of real prices. One free tier is a single
// point of failure: when it runs out of requests the app has nothing real left
// to show, and falls back to invented hotels. Amadeus has its own separate
// free allowance that renews monthly, so with both configured a search that
// one source refuses can still be answered by the other.
//
// It used to call Amadeus straight from the browser, which could not work:
// Amadeus sends no permissive CORS headers, and it required the secret to be
// shipped to the page. Both calls now go through /api/hotels, where the
// credentials stay in server environment variables.
//
// Amadeus identifies a place by IATA city code rather than by name, so
// destinations without a code are skipped rather than guessed at.

import { DESTINATIONS, HOTELS, distanceKm } from '../catalog.js'
import { iataFor } from '../iata.js'
import { nightsBetween } from '../format.js'

const MAX_DESTINATIONS = 2

function normalise(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
  const chosen = [...ids].filter(iataFor).slice(0, MAX_DESTINATIONS)
  if (chosen.length) return chosen
  return DESTINATIONS.filter((d) => iataFor(d.id))
    .slice(0, MAX_DESTINATIONS)
    .map((d) => d.id)
}

export async function scan(trip, config) {
  const base = config?.proxyUrl || '/api/hotels'
  const nights = nightsBetween(trip?.checkIn, trip?.checkOut)
  const ids = targetDestinations(config?.filters)
  const now = Date.now()

  if (!ids.length) {
    throw new Error('Amadeus has no city code for this destination.')
  }

  const failures = []

  const perDestination = await Promise.all(
    ids.map(async (id) => {
      const dest = DESTINATIONS.find((d) => d.id === id)
      const cityCode = iataFor(id)
      if (!dest || !cityCode) return []

      const params = new URLSearchParams({
        provider: 'amadeus',
        cityCode,
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
        if (row.total == null) return []
        const nightly = Math.max(1, Math.round(row.total / nights))

        const known = matchCatalog(row, pool)
        // As with Booking, a hotel Amadeus knows and the catalogue does not is
        // still a real hotel. Keeping it is what makes this a genuine second
        // source rather than a lookup against the same short list.
        const hotel = known || {
          id: `amadeus-${id}-${normalise(row.name).replace(/\s+/g, '-').slice(0, 40)}`,
          name: row.name || 'Hotel',
          area: dest.city,
          city: dest.city,
          country: dest.country,
          destinationId: id,
          stars: Math.round(row.stars) || 3,
          rating: row.rating != null ? Math.min(10, row.rating) : 8,
          reviews: 0,
          base: nightly,
          lat: row.lat ?? dest.lat,
          lng: row.lng ?? dest.lng,
          amenities: ['wifi'],
          blurb: `Live result from Amadeus for ${dest.city}.`,
          synthetic: true,
        }

        return [{
          hotelId: hotel.id,
          hotel,
          nightly,
          reference: nightly,
          total: Math.round(row.total),
          nights,
          discount: 0,
          flash: false,
          roomsLeft: null,
          seenAt: now,
          source: 'amadeus',
          aggregated: true,
        }]
      })
    })
  )

  const offers = perDestination.flat()
  if (!offers.length) {
    throw new Error(
      failures.length ? failures[0] : 'Amadeus returned no hotels for these dates.'
    )
  }
  return offers
}

export const meta = {
  id: 'amadeus',
  label: 'Amadeus (live)',
  needsKey: false,
  serverKey: true,
  description:
    'Live rates from the Amadeus Self-Service Hotel Search API — a second source of real prices with its own free allowance, so the app has somewhere to turn when Booking.com has run out. Sign up at developers.amadeus.com, create an app, then set AMADEUS_KEY and AMADEUS_SECRET in Vercel.',
  quotaNote:
    'Amadeus renews its free test quota monthly and it is separate from RapidAPI’s, which is the point of having both. Covers the destinations that have an IATA city code.',
}
