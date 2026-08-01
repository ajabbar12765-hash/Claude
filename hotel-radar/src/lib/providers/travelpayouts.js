// Travelpayouts / Hotellook adapter — live prices.
//
// Calls the serverless proxy at /api/hotels rather than Hotellook directly:
// the API sends no CORS headers, and the token belongs on the server.
//
// Hotellook returns its own hotel list, which is matched back onto the local
// catalogue by name and coordinates so the cards keep their descriptions,
// amenities and landmark distances. Anything that cannot be matched is
// skipped rather than shown with half its fields blank.

import { DESTINATIONS, HOTELS, distanceKm } from '../catalog.js'
import { nightsBetween } from '../format.js'

// Only scan destinations the user is actually looking at. Scanning all twelve
// on a 30-second timer would exhaust a free tier within the hour.
const MAX_DESTINATIONS = 3

function normalise(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Match a Hotellook row back onto a catalogue hotel. */
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
    if (rowName === catName) return h
    if (rowName.includes(catName) || catName.includes(rowName)) return h
  }
  return null
}

/**
 * Which destinations to query this pass. Explicit city chips win; otherwise
 * a parsed city or landmark from the filter box; otherwise the busiest few.
 */
export function targetDestinations(filters) {
  const ids = new Set()
  for (const id of filters?.cities ?? []) ids.add(id)
  if (filters?.parsedCityId) ids.add(filters.parsedCityId)
  if (filters?.parsedLandmarkDestinationId) ids.add(filters.parsedLandmarkDestinationId)

  const chosen = [...ids].slice(0, MAX_DESTINATIONS)
  if (chosen.length) return chosen
  return DESTINATIONS.slice(0, MAX_DESTINATIONS).map((d) => d.id)
}

export async function scan(trip, config) {
  const base = config?.proxyUrl || '/api/hotels'
  const nights = nightsBetween(trip?.checkIn, trip?.checkOut)
  const destinationIds = targetDestinations(config?.filters)

  const results = await Promise.all(
    destinationIds.map(async (id) => {
      const dest = DESTINATIONS.find((d) => d.id === id)
      if (!dest) return []

      const params = new URLSearchParams({
        provider: 'travelpayouts',
        location: `${dest.city}, ${dest.country}`,
        adults: String(trip?.adults ?? 2),
      })
      if (trip?.checkIn) params.set('checkIn', trip.checkIn)
      if (trip?.checkOut) params.set('checkOut', trip.checkOut)

      const res = await fetch(`${base}?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Price proxy responded ${res.status}`)
      }
      const json = await res.json()

      const pool = HOTELS.filter((h) => h.destinationId === id)
      const offers = []
      const now = Date.now()

      for (const row of json.offers || []) {
        if (row.nightly == null) continue
        const hotel = matchCatalog(row, pool)
        if (!hotel) continue

        // nightly is the cheapest rate across the sites Hotellook checked;
        // reference is the average, so discount is how far below typical the
        // cheapest sits. Guard the order rather than assume it.
        const nightly = Math.round(row.nightly)
        const reference = Math.max(nightly, Math.round(row.reference ?? hotel.base))
        const aggregated = true

        offers.push({
          hotelId: hotel.id,
          nightly,
          reference,
          total: nightly * nights,
          nights,
          discount: reference > nightly ? 1 - nightly / reference : 0,
          flash: false,
          roomsLeft: null,
          seenAt: now,
          source: 'travelpayouts',
          aggregated,
        })
      }
      return offers
    })
  )

  const offers = results.flat()
  if (!offers.length) {
    throw new Error(
      'Travelpayouts returned no matching hotels for these dates. Check the proxy token, or widen the dates.'
    )
  }
  return offers
}

export const meta = {
  id: 'travelpayouts',
  label: 'Travelpayouts / Hotellook (live)',
  needsKey: false,
  serverKey: true,
  description:
    'Live prices via Travelpayouts. Free to join with no traffic minimum. The token lives in the TRAVELPAYOUTS_TOKEN environment variable on the server, not in this browser.',
  quotaNote:
    'Scans at most 3 destinations per pass and the server caches for 4 minutes, so a free tier is not burned by the scan loop.',
}
