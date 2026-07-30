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

import { walkPages, pageBudget } from '../lib/paginate.js'

// The built-in engine is free to re-run; a licensed API is not. Live results
// barely move within a quarter of an hour, so cache them for that long and
// spend the quota on coverage instead.
const CACHE_TTL_MS = 15 * 60 * 1000

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

  // engine.hotellook.com returns 404 for every path from this server,
  // including an unauthenticated call and a different endpoint entirely.
  // That is the host refusing the request, not the parameters being wrong,
  // so the candidates below vary the HOST as well as the shape. api.
  // hotellook.com and api.travelpayouts.com are the two other origins in
  // active use by public implementations.
  const city = String(location || '').split(',')[0].trim()

  const q = (extra) => {
    const p = { currency: 'eur', limit: '60', token, ...extra }
    if (checkIn) p.checkIn = checkIn
    if (checkOut) p.checkOut = checkOut
    return new URLSearchParams(p).toString()
  }

  const candidates = [
    { label: 'api.hotellook cache+dates', url: `https://api.hotellook.com/v2/cache.json?${q({ location: city })}` },
    { label: 'api.hotellook cache', url: `https://api.hotellook.com/v2/cache.json?${new URLSearchParams({ location: city, currency: 'eur', limit: '60', token })}` },
    {
      label: 'api.travelpayouts prices/hotels',
      url: `https://api.travelpayouts.com/v2/prices/hotels?${new URLSearchParams({
        location: city, currency: 'eur', limit: '60', token,
        ...(marker ? { marker } : {}),
        ...(checkIn ? { check_in: checkIn } : {}),
        ...(checkOut ? { check_out: checkOut } : {}),
      })}`,
    },
    { label: 'engine.hotellook cache+dates', url: `https://engine.hotellook.com/api/v2/cache.json?${q({ location: city })}` },
  ]

  const attempts = []
  const statuses = []

  for (const c of candidates) {
    try {
      const res = await fetch(c.url, { headers: { Accept: 'application/json' } })
      statuses.push(res.status)
      if (!res.ok) {
        attempts.push(`${c.label}: HTTP ${res.status}`)
        continue
      }
      const json = await res.json().catch(() => null)
      // Different origins wrap the list differently.
      const rows = Array.isArray(json) ? json : json?.results || json?.data || []
      if (!rows.length) {
        attempts.push(`${c.label}: 200 but no rows`)
        continue
      }

      return rows.map((row) => ({
        name: row.hotelName ?? row.name ?? null,
        stars: row.stars ?? null,
        rating: typeof row.rating === 'number' ? row.rating / 10 : null,
        lat: row.location?.geo?.lat ?? row.lat ?? null,
        lng: row.location?.geo?.lon ?? row.lon ?? null,
        // priceFrom is the cheapest rate found across the booking sites
        // checked; priceAvg is the average across them.
        nightly: row.priceFrom != null ? Math.round(row.priceFrom) : null,
        reference: row.priceAvg != null ? Math.round(row.priceAvg) : null,
        marker,
        via: c.label,
      }))
    } catch (err) {
      attempts.push(`${c.label}: ${String(err).slice(0, 60)}`)
    }
  }

  const all404 = statuses.length > 0 && statuses.every((s) => s === 404)
  throw new Error(
    `No Travelpayouts host answered${all404 ? ' — every origin returned 404, which means the account is not entitled to this data or these servers are blocked. This is not fixable in the app.' : ''}. Tried — ${attempts.join(' | ')}`
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

// ---------------------------------------------------------------- RapidAPI
//
// RapidAPI resells Booking.com inventory as a licensed API product, which is
// the sanctioned way to get those prices. Scraping the site would be neither
// legal under its terms nor workable — it blocks datacentre traffic, which is
// exactly what a serverless function is.
//
// Free tier, no card. Subscribe at rapidapi.com/DataCrawler/api/booking-com15
// then set RAPIDAPI_KEY in Vercel. RAPIDAPI_HOST can override the host if you
// subscribe to a different Booking.com API on the same platform.
async function rapidapi({ location, checkIn, checkOut, adults, rooms }) {
  const key = process.env.RAPIDAPI_KEY
  const host = process.env.RAPIDAPI_HOST || 'booking-com15.p.rapidapi.com'
  if (!key) throw new Error('RAPIDAPI_KEY is not set on the server')

  const headers = { 'x-rapidapi-key': key, 'x-rapidapi-host': host, Accept: 'application/json' }
  const city = String(location || '').split(',')[0].trim()

  // Step 1: turn the place name into the destination id the search needs.
  const destRes = await fetch(
    `https://${host}/api/v1/hotels/searchDestination?${new URLSearchParams({ query: city })}`,
    { headers }
  )
  if (!destRes.ok) {
    throw new Error(
      destRes.status === 403
        ? 'RapidAPI rejected the key (403). Check the key is correct and that you are subscribed to this API.'
        : `RapidAPI destination lookup returned ${destRes.status}`
    )
  }
  const destJson = await destRes.json()
  const dest = (destJson?.data || []).find((d) => d.dest_id) || destJson?.data?.[0]
  if (!dest?.dest_id) throw new Error(`RapidAPI could not resolve "${city}" to a destination`)

  // Step 2: the price search. One page is about twenty hotels, far fewer than
  // a city actually has, so walk the listing until it runs out — see
  // lib/paginate.js for why the walk is adaptive rather than a fixed count.
  const rows = await walkPages({
    maxPages: pageBudget(process.env.RAPIDAPI_MAX_PAGES, 16, 40),
    idOf: (row) => row?.hotel_id ?? row?.property?.id ?? row?.property?.name ?? row?.hotel_name,
    fetchPage: async (pageNumber) => {
      const params = new URLSearchParams({
        dest_id: String(dest.dest_id),
        search_type: dest.search_type || 'CITY',
        adults: String(adults || 2),
        room_qty: String(rooms || 1),
        currency_code: 'EUR',
        page_number: String(pageNumber),
      })
      if (checkIn) params.set('arrival_date', checkIn)
      if (checkOut) params.set('departure_date', checkOut)

      const r = await fetch(`https://${host}/api/v1/hotels/searchHotels?${params}`, { headers })
      if (!r.ok) return []
      const j = await r.json()
      return j?.data?.hotels || j?.data?.result || []
    },
  })

  if (!rows.length) throw new Error(`RapidAPI returned no hotels for ${city} on these dates`)

  return rows.flatMap((row) => {
    const p = row.property || row
    // Gross price is what the guest actually pays, so prefer it.
    const total =
      p.priceBreakdown?.grossPrice?.value ??
      p.priceBreakdown?.allInclusivePrice?.value ??
      p.composite_price_breakdown?.gross_amount?.value ??
      null
    if (total == null) return []

    const strike =
      p.priceBreakdown?.strikethroughPrice?.value ??
      p.composite_price_breakdown?.strikethrough_amount?.value ??
      null

    return [{
      name: p.name ?? row.hotel_name ?? null,
      stars: p.propertyClass ?? p.class ?? null,
      rating: typeof p.reviewScore === 'number' ? p.reviewScore : null,
      lat: p.latitude ?? row.latitude ?? null,
      lng: p.longitude ?? row.longitude ?? null,
      total: Math.round(total),
      strike: strike != null ? Math.round(strike) : null,
      via: 'rapidapi/booking',
    }]
  })
}

// ------------------------------------------------------------------- multi
//
// Queries several licensed hotel APIs at once and merges them, so a hotel
// carries a price from each site that quoted it and the cheapest wins. This
// is the multi-site comparison done through sanctioned APIs; scraping the
// same sites is not an alternative, since they refuse datacentre traffic and
// their terms forbid it.
//
// Each source is optional. Whatever has a key configured is used, and a
// source that fails is reported without sinking the others.
//
//   RAPIDAPI_KEY        booking-com15 and tripadvisor16 on RapidAPI
//   MAKCORPS_API_KEY    api.makcorps.com, itself a multi-vendor comparator

// Tripadvisor prefixes result titles with their rank ("1. Hotel Danieli"),
// which changes between pages, so strip it before using the name as an id.
function cleanTitle(title) {
  return title ? String(title).replace(/^\d+\.\s*/, '') : null
}

async function fromTripadvisor({ location, checkIn, checkOut, adults, rooms }) {
  const key = process.env.RAPIDAPI_KEY
  if (!key) return { site: 'Tripadvisor', skipped: 'RAPIDAPI_KEY not set', rows: [] }
  const host = 'tripadvisor16.p.rapidapi.com'
  const headers = { 'x-rapidapi-key': key, 'x-rapidapi-host': host, Accept: 'application/json' }
  const city = String(location || '').split(',')[0].trim()

  const geoRes = await fetch(
    `https://${host}/api/v1/hotels/searchLocation?${new URLSearchParams({ query: city })}`,
    { headers }
  )
  if (!geoRes.ok) return { site: 'Tripadvisor', error: `location lookup ${geoRes.status}`, rows: [] }
  const geoJson = await geoRes.json()
  const geoId = geoJson?.data?.[0]?.geoId
  if (!geoId) return { site: 'Tripadvisor', error: `no geoId for ${city}`, rows: [] }

  // Same reasoning as Booking above — one page is a fraction of a city. Fewer
  // pages than Booking, because this side is mainly here to add a second quote
  // to hotels the merge already has.
  let lastStatus = null
  const raw = await walkPages({
    maxPages: pageBudget(process.env.TRIPADVISOR_MAX_PAGES, 8, 20),
    idOf: (r) => cleanTitle(r?.title),
    fetchPage: async (pageNumber) => {
      const params = new URLSearchParams({
        geoId: String(geoId),
        pageNumber: String(pageNumber),
        currencyCode: 'EUR',
        adults: String(adults || 2),
        rooms: String(rooms || 1),
      })
      if (checkIn) params.set('checkIn', checkIn)
      if (checkOut) params.set('checkOut', checkOut)

      const res = await fetch(`https://${host}/api/v1/hotels/searchHotels?${params}`, { headers })
      lastStatus = res.status
      if (!res.ok) return []
      const json = await res.json()
      return json?.data?.data || []
    },
  })

  if (!raw.length && lastStatus !== 200) {
    return { site: 'Tripadvisor', error: `search ${lastStatus}`, rows: [] }
  }

  const rows = raw.flatMap((r) => {
    const amount = Number(String(r.priceForDisplay || r.price || '').replace(/[^0-9.]/g, ''))
    if (!amount) return []
    return [{
      name: cleanTitle(r.title),
      stars: null,
      rating: typeof r.bubbleRating?.rating === 'number' ? r.bubbleRating.rating * 2 : null,
      lat: null,
      lng: null,
      nightly: Math.round(amount),
    }]
  })
  return { site: 'Tripadvisor', rows }
}

async function fromMakcorps({ location, checkIn, checkOut, adults, rooms }) {
  const key = process.env.MAKCORPS_API_KEY
  if (!key) return { site: 'Makcorps', skipped: 'MAKCORPS_API_KEY not set', rows: [] }
  const city = String(location || '').split(',')[0].trim()

  const mapRes = await fetch(
    `https://api.makcorps.com/mapping?${new URLSearchParams({ api_key: key, name: city })}`
  )
  if (!mapRes.ok) return { site: 'Makcorps', error: `mapping ${mapRes.status}`, rows: [] }
  const mapJson = await mapRes.json()
  const cityId = Array.isArray(mapJson) ? mapJson[0]?.document_id : mapJson?.document_id
  if (!cityId) return { site: 'Makcorps', error: `no id for ${city}`, rows: [] }

  const params = new URLSearchParams({
    api_key: key, cityid: String(cityId), pagination: '0',
    cur: 'EUR', rooms: String(rooms || 1), adults: String(adults || 2),
  })
  if (checkIn) params.set('checkin', checkIn)
  if (checkOut) params.set('checkout', checkOut)

  const res = await fetch(`https://api.makcorps.com/city?${params}`)
  if (!res.ok) return { site: 'Makcorps', error: `city ${res.status}`, rows: [] }
  const json = await res.json()

  // Makcorps returns one entry per hotel holding several vendor quotes, which
  // is precisely the multi-site comparison wanted — keep every vendor.
  const rows = []
  for (const entry of Array.isArray(json) ? json : []) {
    const fields = Array.isArray(entry) ? entry : [entry]
    const nameField = fields.find((f) => f && f.name)
    if (!nameField) continue
    for (const f of fields) {
      for (let i = 1; i <= 4; i++) {
        const vendor = f?.[`vendor${i}`]
        const price = f?.[`price${i}`]
        const amount = Number(String(price ?? '').replace(/[^0-9.]/g, ''))
        if (vendor && amount) {
          rows.push({ name: nameField.name, vendor, nightly: Math.round(amount), stars: null, rating: null, lat: null, lng: null })
        }
      }
    }
  }
  return { site: 'Makcorps', rows }
}

async function fromBooking(args) {
  try {
    const rows = await rapidapi(args)
    const nights = 1
    return {
      site: 'Booking.com',
      rows: rows.map((r) => ({ ...r, nightly: r.total != null ? Math.round(r.total / nights) : null })),
    }
  } catch (err) {
    return { site: 'Booking.com', error: String(err.message || err).slice(0, 120), rows: [] }
  }
}

function mergeKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(hotel|the|resort|and|spa|by|a|of)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 28)
}

async function multi(args) {
  const settled = await Promise.allSettled([
    fromBooking(args),
    fromTripadvisor(args),
    fromMakcorps(args),
  ])
  const sources = settled.map((s) =>
    s.status === 'fulfilled' ? s.value : { site: 'unknown', error: String(s.reason).slice(0, 100), rows: [] }
  )

  const merged = new Map()
  for (const src of sources) {
    for (const row of src.rows) {
      const key = mergeKey(row.name)
      if (!key || row.nightly == null) continue
      const existing = merged.get(key)
      const quote = { site: row.vendor || src.site, nightly: row.nightly }
      if (existing) {
        if (!existing.quotes.some((q) => q.site === quote.site)) existing.quotes.push(quote)
        existing.stars = existing.stars ?? row.stars
        existing.rating = existing.rating ?? row.rating
        existing.lat = existing.lat ?? row.lat
        existing.lng = existing.lng ?? row.lng
      } else {
        merged.set(key, {
          name: row.name, stars: row.stars, rating: row.rating,
          lat: row.lat, lng: row.lng, quotes: [quote],
        })
      }
    }
  }

  const offers = [...merged.values()].map((m) => {
    const cheapest = m.quotes.reduce((a, b) => (b.nightly < a.nightly ? b : a))
    const dearest = m.quotes.reduce((a, b) => (b.nightly > a.nightly ? b : a))
    return {
      ...m,
      nightly: cheapest.nightly,
      reference: dearest.nightly,
      cheapestSite: cheapest.site,
      siteCount: m.quotes.length,
      quotes: m.quotes.sort((a, b) => a.nightly - b.nightly),
    }
  })

  if (!offers.length) {
    const why = sources
      .map((s) => `${s.site}: ${s.skipped || s.error || `${s.rows.length} rows`}`)
      .join(' | ')
    throw new Error(`No source returned prices. ${why}`)
  }
  return offers
}

const PROVIDERS = { travelpayouts, amadeus, rapidapi, multi }

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
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
    return res.status(200).json({ offers, cached: false })
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'Upstream request failed' })
  }
}
