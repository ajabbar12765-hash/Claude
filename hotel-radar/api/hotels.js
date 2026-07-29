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

async function travelpayouts({ location, checkIn, checkOut, adults }) {
  const token = process.env.TRAVELPAYOUTS_TOKEN
  const marker = process.env.TRAVELPAYOUTS_MARKER || ''
  if (!token) throw new Error('TRAVELPAYOUTS_TOKEN is not set on the server')

  // The documented cache.json endpoint returned 404 in production and this
  // environment cannot reach Hotellook to find out why. Rather than pin one
  // guess, try the known request shapes in order and keep the first that
  // answers with usable JSON. If they all fail the thrown error lists what
  // each one did, so the cause is visible from the Test connection button
  // instead of needing another deploy to investigate.
  const city = String(location || '').split(',')[0].trim()

  const base = { currency: 'EUR', limit: '60', token }
  if (adults) base.adults = String(adults)
  const dated = { ...base }
  if (checkIn) dated.checkIn = checkIn
  if (checkOut) dated.checkOut = checkOut

  const candidates = [
    { label: 'cache.json city+dates', url: `https://engine.hotellook.com/api/v2/cache.json?${new URLSearchParams({ ...dated, location: city })}` },
    { label: 'cache.json city only', url: `https://engine.hotellook.com/api/v2/cache.json?${new URLSearchParams({ ...base, location: city })}` },
    { label: 'cache.json full location', url: `https://engine.hotellook.com/api/v2/cache.json?${new URLSearchParams({ ...dated, location })}` },
    { label: 'cache.json no token', url: `https://engine.hotellook.com/api/v2/cache.json?${new URLSearchParams({ currency: 'EUR', limit: '60', location: city })}` },
    { label: 'http cache.json', url: `http://engine.hotellook.com/api/v2/cache.json?${new URLSearchParams({ ...dated, location: city })}` },
  ]

  const attempts = []
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
        // sites it checks; priceAvg is the average. A deal finder wants the
        // cheapest as the headline and the average as the "was" figure.
        nightly: row.priceFrom != null ? Math.round(row.priceFrom) : null,
        reference: row.priceAvg != null ? Math.round(row.priceAvg) : null,
        marker,
        via: c.label,
      }))
    } catch (err) {
      attempts.push(`${c.label}: ${String(err).slice(0, 80)}`)
    }
  }

  throw new Error(`Hotellook returned nothing usable. Tried — ${attempts.join(' | ')}`)
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
