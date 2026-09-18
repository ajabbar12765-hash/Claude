// Serverless proxy for the Google Maps Platform Weather API, which as of
// September 2026 is powered by WeatherNext 3 (Google DeepMind's weather
// model) — see https://blog.google/innovation-and-ai/models-and-research/google-deepmind/introducing-weathernext-3/
// This is a far simpler path to real WeatherNext data than Earth Engine /
// BigQuery (api/weathernext.js): it's a plain REST API with a standard
// API key, no service account, no geospatial grid-sampling code.
//
// Asking the Gemini chat model for the weather in a loop and parsing its
// prose is NOT what this does, and isn't what you want: it would burn LLM
// quota/latency on every poll and return paraphrased text instead of
// structured data, for no benefit over calling the REST API this model
// now actually powers. This function calls that REST API directly.
//
// Why a backend at all (never call this from the browser): an unrestricted
// Google API key shipped to the frontend is public and abusable. Restrict
// the key (HTTP referrer or IP, in Cloud Console) and keep it server-side.
//
// SETUP — Vercel -> Settings -> Environment Variables:
//   GOOGLE_WEATHER_API_KEY   A Maps Platform API key with "Weather API"
//                            enabled (Cloud Console -> APIs & Services).
//                            For free, no-card prototyping, Google offers
//                            a "Maps Demo Key" — see the Weather API docs.
//                            A real billing-enabled key gets a recurring
//                            Maps Platform free credit that a small
//                            personal app should comfortably stay under,
//                            but it does need a card on the project.
//
// Endpoints and auth were confirmed directly against the live API before
// writing this (weather.googleapis.com returns a clean, documented 400
// for an invalid key, which is what a throwaway test key against each of
// the three lookups below returned). What was NOT confirmed is the full
// shape of a *successful* response body — those docs live on domains this
// session couldn't fetch. So this deliberately does not invent a field
// mapping; it passes Google's JSON through as-is. Add friendly parsing
// once you've seen one real response.
//
// GET /api/googleweather?lat=37.42&lon=-122.08&hours=24&days=7&units=IMPERIAL
//   -> 200 { current, hourly, daily }
//        Each key holds Google's raw JSON for that lookup, or
//        { error: <message> } if just that one lookup failed — a bad
//        forecast request doesn't need to take down current conditions too.
//   -> 501 { error, setup }   if GOOGLE_WEATHER_API_KEY isn't set
//   -> 400                    if lat/lon are missing or out of range

const BASE_URL = 'https://weather.googleapis.com/v1'
const CACHE_TTL_MS = 15 * 60 * 1000
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

async function lookup(path, apiKey, params) {
  const url = new URL(`${BASE_URL}/${path}`)
  url.searchParams.set('key', apiKey)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, v)
  }

  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body?.error?.message || `${path} request failed (${res.status})`)
  }
  return body
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const apiKey = process.env.GOOGLE_WEATHER_API_KEY
  if (!apiKey) {
    return res.status(501).json({
      error: 'GOOGLE_WEATHER_API_KEY environment variable is not set',
      setup: [
        'Enable "Weather API" on a project in Google Cloud Console -> APIs & Services',
        'Create an API key (a free "Maps Demo Key" works for prototyping with no card on file)',
        'Restrict the key (HTTP referrer / IP) before using it for anything real',
        'Set GOOGLE_WEATHER_API_KEY in your Vercel environment variables',
      ],
    })
  }

  const url = new URL(req.url, `https://${req.headers.host}`)
  const latParam = url.searchParams.get('lat')
  const lonParam = url.searchParams.get('lon')
  const lat = latParam === null ? NaN : Number(latParam)
  const lon = lonParam === null ? NaN : Number(lonParam)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'lat and lon query params are required and must be valid coordinates' })
  }

  const hours = Number(url.searchParams.get('hours')) || 24
  const days = Number(url.searchParams.get('days')) || 7
  const unitsSystem = url.searchParams.get('units') === 'IMPERIAL' ? 'IMPERIAL' : 'METRIC'

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${hours},${days},${unitsSystem}`
  const hit = cached(cacheKey)
  if (hit) {
    res.setHeader('X-GoogleWeather-Cache', 'hit')
    return res.status(200).json(hit)
  }

  const location = { 'location.latitude': lat, 'location.longitude': lon, unitsSystem }

  const [current, hourly, daily] = await Promise.allSettled([
    lookup('currentConditions:lookup', apiKey, location),
    lookup('forecast/hours:lookup', apiKey, { ...location, hours }),
    lookup('forecast/days:lookup', apiKey, { ...location, days }),
  ])

  const unwrap = (settled) => (settled.status === 'fulfilled' ? settled.value : { error: settled.reason.message })

  const payload = {
    current: unwrap(current),
    hourly: unwrap(hourly),
    daily: unwrap(daily),
  }

  remember(cacheKey, payload)
  res.setHeader('X-GoogleWeather-Cache', 'miss')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
  return res.status(200).json(payload)
}
