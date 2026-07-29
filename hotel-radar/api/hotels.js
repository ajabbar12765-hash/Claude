// Serverless price proxy (Vercel function).
//
// Exists for two reasons the browser cannot solve on its own:
//   1. None of the hotel APIs send permissive CORS headers, so a page cannot
//      call them directly.
//   2. API keys belong on the server. Anything shipped to the browser is
//      public, so keys live in Vercel environment variables and never reach
//      the client.
//
// Configure in Vercel → Settings → Environment Variables:
//   TRAVELPAYOUTS_TOKEN    Travelpayouts / Hotellook API token
//   TRAVELPAYOUTS_MARKER   your Travelpayouts partner marker (for booking links)
//   AMADEUS_KEY            Amadeus Self-Service API key
//   AMADEUS_SECRET         Amadeus Self-Service API secret
//
// GET /api/hotels?provider=travelpayouts&location=Lake%20Como
//                &checkIn=2026-09-10&checkOut=2026-09-13&adults=2

const CACHE_TTL_MS = 4 * 60 * 1000

// A warm function instance reuses this, which keeps a scan loop from burning
// through a free-tier quota. Cold starts simply refill it.
const cache = new Map()

function cached(key) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value
  return null
}

function remember(key, value) {
  cache.set(key, { value, at: Date.now() })
  if (cache.size > 200) cache.delete(cache.keys().next().value)
  return value
}

// ---------------------------------------------------------------- providers

async function travelpayouts({ location, checkIn, checkOut }) {
  const token = process.env.TRAVELPAYOUTS_TOKEN
  const marker = process.env.TRAVELPAYOUTS_MARKER || ''
  if (!token) throw new Error('TRAVELPAYOUTS_TOKEN is not set on the server')

  // The endpoint and parameter names below are confirmed against several
  // independent working implementations, so a wrong URL is not the problem.
  // What is not confirmed is which parameter shape this account is served,
  // so the variants are tried in order and the first usable answer wins.
  //
  // Notes drawn from those implementations:
  //   - currency is lowercased; the examples that work all pass it that way
  //   - `adults` is not a cache.json parameter and is not sent
  //   - a city name can be swapped for a locationId resolved via lookup.json
  const city = String(location || '').split(',')[0].trim()

  const withDates = (extra) => {
    const p = { currency: 'eur', limit: '60', token, ...extra }
    if (checkIn) p.checkIn = checkIn
    if (checkOut) p.checkOut = checkOut
    return new URLSearchParams(p).toString()
  }

  const candidates = [
    { label: 'cache.json location+dates', url: `https://engine.hotellook.com/api/v2/cache.json?${withDates({ location: city })}` },
    { label: 'cache.json location only', url: `https://engine.hotellook.com/api/v2/cache.json?${new URLSearchParams({ location: city, currency: 'eur', limit: '60', token })}` },
    { label: 'cache.json no token', url: `https://engine.hotellook.com/api/v2/cache.json?${withDates({ location: city })}`.replace(`&token=${token}`, '') },
    { label: 'http cache.json', url: `http://engine.hotellook.com/api/v2/cache.json?${withDates({ location: city })}` },
  ]

  const attempts = []

  // A locationId sidesteps any ambiguity in resolving the city name, so
  // resolve one first and try it ahead of the plain-name variants.
  try {
    const lookupUrl = `https://engine.hotellook.com/api/v2/lookup.json?${new URLSearchParams({
      query: city, lang: 'en', lookFor: 'city', limit: '1', token,
    })}`
    const lr = await fetch(lookupUrl, { headers: { Accept: 'application/json' } })
    if (lr.ok) {
      const lj = await lr.json().catch(() => null)
      const id = lj?.results?.locations?.[0]?.id
      if (id) {
        candidates.unshift({
          label: `cache.json locationId=${id}`,
          url: `https://engine.hotellook.com/api/v2/cache.json?${withDates({ locationId: String(id) })}`,
        })
      } else {
        attempts.push('lookup.json: 200 but no location id')
      }
    } else {
      attempts.push(`lookup.json: HTTP ${lr.status}`)
    }
  } catch (err) {
    attempts.push(`lookup.json: ${String(err).slice(0, 60)}`)
  }

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { headers: { Accept: 'application/json' } })
      if (!res.ok) {
        attempts.push(`${c.label}: HTTP ${res.status}`)
        continue
      }
      const json = await res.json().catch(() => null)
      const rows = Array.isArray(json) ? json : json?.results || []
      if (!rows.length) {
        attempts.push(`${c.label}: 200 but no rows`)
        continue
      }

      return rows.map((row) => ({
        name: row.hotelName ?? row.name ?? null,
        stars: row.stars ?? null,
        rating: typeof row.rating === 'number' ? row.rating / 10 : null,
        lat: row.location?.geo?.lat ?? null,
        lng: row.location?.geo?.lon ?? null,
        // priceFrom is the cheapest rate Hotellook found across the booking
        // sites it checks; priceAvg is the average across them.
        nightly: row.priceFrom != null ? Math.round(row.priceFrom) : null,
        reference: row.priceAvg != null ? Math.round(row.priceAvg) : null,
        marker,
        via: c.label,
      }))
    } catch (err) {
      attempts.push(`${c.label}: ${String(err).slice(0, 60)}`)
    }
  }

  // Every variant failing the same way points at the request being refused
  // rather than malformed — worth saying, since the fix differs completely.
  const all404 = attempts.filter((a) => a.includes('HTTP 404')).length >= candidates.length
  throw new Error(
    `Hotellook returned nothing usable${all404 ? ' (every variant 404 — the API is likely refusing this server, not rejecting the parameters)' : ''}. Tried — ${attempts.join(' | ')}`
  )
}

let amadeusToken = null

async function amadeusAuth() {
  if (amadeusToken && amadeusToken.expiresAt > Date.now() + 30_000) return amadeusToken.value
  const key = process.env.AMADEUS_KEY
  const secret = process.env.AMADEUS_SECRET
  if (!key || !secret) throw new Error('AMADEUS_KEY / AMADEUS_SECRET are not set on the server')

  const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
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
  amadeusToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return amadeusToken.value
}

async function amadeus({ cityCode, checkIn, checkOut, adults, rooms }) {
  const bearer = await amadeusAuth()
  const params = new URLSearchParams({
    cityCode,
    adults: String(adults || 2),
    roomQuantity: String(rooms || 1),
    currency: 'EUR',
    bestRateOnly: 'true',
  })
  if (checkIn) params.set('checkInDate', checkIn)
  if (checkOut) params.set('checkOutDate', checkOut)

  const res = await fetch(`https://test.api.amadeus.com/v3/shopping/hotel-offers?${params}`, {
    headers: { Authorization: `Bearer ${bearer}` },
  })
  if (!res.ok) throw new Error(`Amadeus responded ${res.status}`)
  const json = await res.json()

  return (json.data || []).flatMap((record) => {
    const offer = record.offers?.[0]
    if (!offer?.price?.total) return []
    return [{
      name: record.hotel?.name ?? null,
      stars: null,
      rating: null,
      lat: record.hotel?.latitude ?? null,
      lng: record.hotel?.longitude ?? null,
      total: Number(offer.price.total),
      currency: offer.price.currency,
    }]
  })
}

const PROVIDERS = { travelpayouts, amadeus }

// ------------------------------------------------------------------ handler

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const url = new URL(req.url, `https://${req.headers.host}`)
  const q = Object.fromEntries(url.searchParams)
  const provider = PROVIDERS[q.provider]

  if (!provider) {
    return res.status(400).json({
      error: `Unknown provider "${q.provider ?? ''}"`,
      available: Object.keys(PROVIDERS),
    })
  }

  const key = `${q.provider}:${url.searchParams.toString()}`
  const hit = cached(key)
  if (hit) {
    res.setHeader('X-Radar-Cache', 'hit')
    return res.status(200).json({ offers: hit, cached: true })
  }

  try {
    const offers = remember(key, await provider(q))
    res.setHeader('X-Radar-Cache', 'miss')
    // A short CDN cache absorbs several browser tabs scanning at once.
    res.setHeader('Cache-Control', 's-maxage=240, stale-while-revalidate=600')
    return res.status(200).json({ offers, cached: false })
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'Upstream request failed' })
  }
}
