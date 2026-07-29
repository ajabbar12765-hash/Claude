// Hotel photography via the Wikipedia REST API.
//
// Many of these are notable properties with Wikipedia articles, and the
// summary endpoint returns a lead image. That gives a real photograph of the
// actual hotel — not a stock shot of some other building — which matters,
// because a picture presented next to a named hotel is a claim about that
// hotel.
//
// No API key, CORS-enabled, and free. Anything without an article keeps the
// generated artwork rather than borrowing a photo that is not of it.

import { load, save } from './storage.js'

const CACHE_KEY = 'photos'
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // articles change slowly
const ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary/'

// hotelId -> { photo: object|null, at: number }. A null is cached too, so a
// hotel without an article is asked about once a month, not once per render.
let cache = null
const inflight = new Map()

function readCache() {
  if (!cache) cache = load(CACHE_KEY, {})
  return cache
}

function writeCache() {
  save(CACHE_KEY, cache)
}

async function wikiImage(title) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${ENDPOINT}${encodeURIComponent(title.replace(/\s+/g, '_'))}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    // 404 simply means no article — a normal outcome, not an error.
    if (!res.ok) return null
    const json = await res.json()
    // Disambiguation pages carry an unrelated image; skip them.
    if (json.type && json.type !== 'standard') return null
    return json.originalimage?.source || json.thumbnail?.source || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * A photo of the property where one exists, otherwise a photo of where it is.
 * The two are distinguished by `kind` so the card can label a location shot —
 * an unlabelled photo beside a hotel name reads as a photo *of* that hotel,
 * and only the first tier has earned that.
 *
 * @returns {Promise<{url: string, kind: 'hotel'|'city'}|null>}
 */
export async function hotelPhoto(hotel) {
  const store = readCache()
  const hit = store[hotel.id]
  if (hit && Date.now() - hit.at < TTL_MS) return hit.photo
  if (inflight.has(hotel.id)) return inflight.get(hotel.id)

  const promise = (async () => {
    const own = await wikiImage(hotel.name)
    if (own) return { url: own, kind: 'hotel' }

    // Fall back to the place. Try the neighbourhood first, since "Bellagio"
    // or "Trastevere" is closer to the stay than the city as a whole.
    for (const place of [`${hotel.area}, ${hotel.city}`, hotel.area, hotel.city]) {
      const img = await wikiImage(place)
      if (img) return { url: img, kind: 'city', label: place.split(',')[0] }
    }
    return null
  })()

  inflight.set(hotel.id, promise)
  const photo = await promise
  inflight.delete(hotel.id)

  store[hotel.id] = { photo, at: Date.now() }
  writeCache()
  return photo
}
