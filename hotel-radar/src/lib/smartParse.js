// Smart parsing client.
//
// Asks /api/parse to interpret the phrase with Gemini, then resolves the
// names it returns against the local catalogue. The model never supplies
// coordinates or hotels — only vocabulary terms — so a hallucinated place
// simply fails to resolve rather than corrupting the results.
//
// Everything degrades cleanly: no key, no network, a bad response, or a slow
// reply all fall back to the built-in regex parser, which is what runs by
// default anyway.

import { CITIES, LANDMARKS, AMENITIES, distanceKm } from './catalog.js'
import { parseQuery } from './nlq.js'

const TIMEOUT_MS = 6000

// Endpoint availability is discovered once, then remembered, so a deployment
// without a Gemini key does not make a request per keystroke.
let availability = 'unknown' // 'unknown' | 'yes' | 'no'

export function smartAvailability() {
  return availability
}

function findByName(list, name) {
  if (!name) return null
  const wanted = String(name).toLowerCase().trim()
  return (
    list.find((x) => (x.name ?? x.city).toLowerCase() === wanted) ??
    list.find((x) => (x.name ?? x.city).toLowerCase().includes(wanted)) ??
    null
  )
}

/** Turn the model's JSON into the same shape parseQuery returns. */
function resolve(raw, filters) {
  const landmark = findByName(LANDMARKS, filters.landmark)
  let city = findByName(CITIES, filters.city)
  const notes = []

  if (filters.note) notes.push(filters.note)

  // The model was asked to use known names only; if it named something we
  // cannot resolve, say so rather than silently dropping the constraint.
  if (filters.landmark && !landmark) {
    notes.push(`No coverage for "${filters.landmark}" yet — showing the closest matches instead.`)
  }
  if (filters.city && !city) {
    notes.push(`No coverage for "${filters.city}" yet.`)
  }

  // Same reconciliation the built-in parser does: a landmark beats a city
  // somewhere else, and the gap gets explained.
  if (landmark && city && city.id !== landmark.destinationId) {
    const km = Math.round(distanceKm(landmark, city))
    notes.push(
      `${landmark.name} is about ${km} km from ${city.city}. Showing stays near ${landmark.name}.`
    )
    city = CITIES.find((c) => c.id === landmark.destinationId) ?? null
  }

  const validAmenities = new Set(AMENITIES.map((a) => a.id))
  const clamp = (n, lo, hi) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null

  return {
    raw,
    landmark,
    city,
    radiusKm: clamp(filters.radiusKm, 0.2, 200),
    minStars: clamp(filters.minStars, 1, 5),
    maxPrice: clamp(filters.maxPrice, 1, 100000),
    minPrice: clamp(filters.minPrice, 0, 100000),
    amenities: (filters.amenities ?? []).filter((a) => validAmenities.has(a)),
    keywords: (filters.keywords ?? [])
      .map((k) => String(k).toLowerCase().trim())
      .filter((k) => k.length > 2)
      .slice(0, 3),
    notes,
    smart: true,
  }
}

/**
 * @returns {Promise<object|null>} parsed filters, or null to use the built-in
 *   parser (no key configured, request failed, or nothing useful came back).
 */
export async function smartParse(query, { currency = 'EUR', signal } = {}) {
  const text = String(query ?? '').trim()
  if (!text || availability === 'no') return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    const res = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        query: text,
        currency,
        cities: CITIES.map((c) => c.city),
        landmarks: LANDMARKS.map((l) => l.name),
        amenities: AMENITIES.map((a) => a.id),
      }),
    })

    // A 404 means the function is not deployed at all — stop asking.
    if (res.status === 404) {
      availability = 'no'
      return null
    }
    if (!res.ok) return null

    const json = await res.json()
    if (json.available === false) {
      availability = 'no'
      return null
    }
    if (!json.filters) return null

    availability = 'yes'
    return resolve(text, json.filters)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parse with Gemini when it is available, otherwise with the built-in parser.
 * The built-in result is returned immediately via `onFallback` so the UI never
 * waits on the network before showing something.
 */
export async function parseBest(query, opts = {}) {
  const local = parseQuery(query)
  const smart = await smartParse(query, opts)
  return smart ?? local
}
