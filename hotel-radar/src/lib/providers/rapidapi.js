// Booking.com prices via RapidAPI — live.
//
// This is the licensed route to Booking.com inventory. Scraping the site is
// the alternative and it is not a real one: it breaks their terms, and their
// servers refuse datacentre traffic, which is what any host running this app
// would be. RapidAPI resells the same data as an API product with a free
// tier, so the prices are genuine and nothing has to be circumvented.
//
// Unlike the other providers this one is not matched back onto the local
// catalogue. Booking.com knows about far more hotels than the catalogue does,
// so an unmatched result is shown on its own rather than discarded — which is
// what finally makes coverage open-ended rather than limited to what is
// listed here.

import { DESTINATIONS, HOTELS, distanceKm } from '../catalog.js'
import { nightsBetween } from '../format.js'

const MAX_DESTINATIONS = 2 // each destination costs two upstream calls

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

  const perDestination = await Promise.all(
    ids.map(async (id) => {
      const dest = DESTINATIONS.find((d) => d.id === id)
      if (!dest) return []

      const params = new URLSearchParams({
        provider: 'rapidapi',
        location: `${dest.city}, ${dest.country}`,
        adults: String(trip?.adults ?? 2),
        rooms: String(trip?.rooms ?? 1),
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

      return (json.offers || []).flatMap((row) => {
        if (row.total == null) return []
        const nightly = Math.max(1, Math.round(row.total / nights))
        const reference = row.strike != null
          ? Math.max(nightly, Math.round(row.strike / nights))
          : nightly

        const known = matchCatalog(row, pool)

        // A hotel Booking.com returned that the catalogue has never heard of
        // is still a real, bookable hotel. Synthesise an entry for it rather
        // than dropping it, so coverage is not capped by the catalogue.
        const hotel = known || {
          id: `rapid-${id}-${normalise(row.name).replace(/\s+/g, '-').slice(0, 40)}`,
          name: row.name || 'Hotel',
          area: dest.city,
          city: dest.city,
          country: dest.country,
          destinationId: id,
          stars: Math.round(row.stars) || 3,
          rating: row.rating != null ? Math.min(10, row.rating) : 8,
          reviews: 0,
          base: reference,
          lat: row.lat ?? dest.lat,
          lng: row.lng ?? dest.lng,
          amenities: ['wifi'],
          blurb: `Live result from Booking.com for ${dest.city}.`,
          synthetic: true,
        }

        return [{
          hotelId: hotel.id,
          hotel, // carried through so the grid can render unknown hotels
          nightly,
          reference,
          total: Math.round(row.total),
          nights,
          discount: reference > nightly ? 1 - nightly / reference : 0,
          flash: false,
          roomsLeft: null,
          seenAt: now,
          source: 'rapidapi',
          aggregated: true,
        }]
      })
    })
  )

  const offers = perDestination.flat()
  if (!offers.length) {
    throw new Error('Booking.com returned no hotels for these dates. Try widening the dates.')
  }
  return offers
}

export const meta = {
  id: 'rapidapi',
  label: 'Booking.com via RapidAPI (live)',
  needsKey: false,
  serverKey: true,
  description:
    'Real Booking.com prices through RapidAPI, which licenses the data. Free tier, no card. Subscribe at rapidapi.com/DataCrawler/api/booking-com15, then set RAPIDAPI_KEY in Vercel.',
  quotaNote:
    'Two destinations per pass and two upstream calls each, with the server caching for 4 minutes — the free tier lasts.',
}
