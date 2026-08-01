// Amadeus Self-Service adapter.
//
// Amadeus has a free test tier: sign up at developers.amadeus.com, create an
// app, and paste the API key + secret into Settings. This adapter exchanges
// them for a bearer token and queries Hotel Search v3, then maps the response
// onto the same offer shape the simulated engine returns, so the rest of the
// app does not change.
//
// Note: the token endpoint must be reachable from the browser. Amadeus does
// not send permissive CORS headers on the test host, so in production you
// would proxy these two calls through your own tiny backend and point
// AMADEUS_BASE at it. The request/response mapping below stays identical.

import { HOTELS, distanceKm } from '../catalog.js'
import { nightsBetween } from '../format.js'

const AMADEUS_BASE = 'https://test.api.amadeus.com'

let token = null // { value, expiresAt }

async function getToken(key, secret) {
  if (token && token.expiresAt > Date.now() + 30_000) return token.value

  const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
    }),
  })
  if (!res.ok) throw new Error(`Amadeus auth failed (${res.status})`)
  const json = await res.json()
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return token.value
}

/** Match an Amadeus hotel record back onto a catalog entry. */
function matchCatalog(record) {
  const name = String(record?.hotel?.name || '').toLowerCase()
  const geo = record?.hotel?.latitude != null
    ? { lat: record.hotel.latitude, lng: record.hotel.longitude }
    : null

  let best = null
  for (const h of HOTELS) {
    const byName = name && name.includes(h.name.toLowerCase().slice(0, 12))
    const byGeo = geo && distanceKm(geo, h) < 0.35
    if (byName || byGeo) {
      best = h
      break
    }
  }
  return best
}

export async function scan(trip, config) {
  const { apiKey, apiSecret, cityCodes = ['MIL', 'ROM', 'PAR', 'BCN', 'LON'] } = config || {}
  if (!apiKey || !apiSecret) throw new Error('Amadeus API key and secret required')

  const bearer = await getToken(apiKey, apiSecret)
  const nights = nightsBetween(trip?.checkIn, trip?.checkOut)
  const offers = []

  for (const cityCode of cityCodes) {
    const params = new URLSearchParams({
      cityCode,
      adults: String(trip?.adults ?? 2),
      roomQuantity: String(trip?.rooms ?? 1),
      currency: 'EUR',
      bestRateOnly: 'true',
    })
    if (trip?.checkIn) params.set('checkInDate', trip.checkIn)
    if (trip?.checkOut) params.set('checkOutDate', trip.checkOut)

    const res = await fetch(`${AMADEUS_BASE}/v3/shopping/hotel-offers?${params}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    })
    if (!res.ok) continue
    const json = await res.json()

    for (const record of json.data || []) {
      const hotel = matchCatalog(record)
      if (!hotel) continue
      const offer = record.offers?.[0]
      if (!offer) continue

      const total = Number(offer.price?.total ?? 0)
      if (!total) continue
      const nightly = Math.round(total / nights)
      const reference = Math.round(
        Number(offer.price?.base ?? total) / nights || hotel.base
      )

      offers.push({
        hotelId: hotel.id,
        nightly,
        reference: Math.max(reference, nightly),
        total: Math.round(total),
        nights,
        discount: reference > nightly ? 1 - nightly / reference : 0,
        flash: false,
        roomsLeft: null,
        seenAt: Date.now(),
        source: 'amadeus',
        bookingRef: offer.id,
      })
    }
  }

  if (!offers.length) throw new Error('Amadeus returned no offers for these dates')
  return offers
}

export const meta = {
  id: 'amadeus',
  label: 'Amadeus (live)',
  needsKey: true,
  description:
    'Live rates from the Amadeus Self-Service Hotel Search API. Free test tier at developers.amadeus.com — paste your API key and secret below.',
  fields: [
    { id: 'apiKey', label: 'API key', type: 'text' },
    { id: 'apiSecret', label: 'API secret', type: 'password' },
  ],
}
