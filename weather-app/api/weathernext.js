// Serverless bridge to Google Earth Engine, for WeatherNext-style forecast
// data. This MUST run server-side: Earth Engine's private-key auth throws
// on purpose if called from a browser ("insecure"), so there is no version
// of this that can live in src/ — the service account key can never reach
// the client.
//
// This is a working scaffold, not a finished integration. What it gets
// right (verified against the real @google/earthengine@1.7.43 package
// before writing this): the auth flow (authenticateViaPrivateKey ->
// initialize with a project id), and the query shape (ImageCollection ->
// filter/sort -> reduceRegion -> evaluate). What it can't get right from
// here: WeatherNext's actual Earth Engine asset id and band names. Google's
// data catalog isn't something this session can browse live, and I'm not
// going to hand you a guessed asset id — that would silently fail or,
// worse, silently query the wrong thing. So those are env vars you fill in
// after confirming them yourself at https://developers.google.com/earth-engine/datasets
// (or the EE Code Editor), and the raw reduceRegion() result is returned
// as-is so you can see the real band names on the first successful call.
//
// SETUP — Vercel -> Settings -> Environment Variables:
//   EE_PROJECT_ID     Cloud project id registered as "Unpaid usage" at
//                     https://code.earthengine.google.com/register
//   EE_SERVICE_ACCOUNT  Paste the *entire* contents of the service account
//                     JSON key file (IAM & Admin -> Service Accounts -> Keys
//                     -> Add key -> JSON). Keep this secret; never commit it.
//   EE_ASSET_ID       The WeatherNext collection/image id. Confirm this in
//                     the live Earth Engine catalog first.
//   EE_ASSET_TYPE     "collection" (default) or "image", depending on what
//                     EE_ASSET_ID points at.
//   EE_SCALE_METERS   Optional sample scale in meters (default 25000).
//
// GET /api/weathernext?lat=40.71&lon=-74.01
//   -> 200 { time, bands: { ...raw EE band values... }, source }
//   -> 501 { error, setup: [...] }   if the env vars above aren't set yet
//   -> 502 { error, detail }         if the EE query itself fails (bad
//                                    asset id, no image at that time, etc.)

import ee from '@google/earthengine'

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

class SetupError extends Error {}

// A warm function instance reuses the authenticated session; a cold start
// re-runs it. Only a *successful* init is cached — a failed one (bad key,
// transient network blip) is allowed to retry on the next request instead
// of wedging every request for the rest of the instance's lifetime.
let initPromise = null

function initEarthEngine() {
  if (initPromise) return initPromise

  const projectId = process.env.EE_PROJECT_ID
  const rawKey = process.env.EE_SERVICE_ACCOUNT
  if (!projectId || !rawKey) {
    return Promise.reject(
      new SetupError('EE_PROJECT_ID and EE_SERVICE_ACCOUNT environment variables are not set')
    )
  }

  let key
  try {
    key = JSON.parse(rawKey)
  } catch {
    return Promise.reject(
      new SetupError('EE_SERVICE_ACCOUNT is not valid JSON — paste the full downloaded key file contents')
    )
  }

  initPromise = new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      key,
      () => {
        ee.initialize(
          null,
          null,
          () => resolve(),
          (err) => reject(new Error(`Earth Engine initialize failed: ${err}`)),
          null,
          projectId
        )
      },
      (err) => reject(new Error(`Earth Engine auth failed: ${err}`))
    )
  }).catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}

function queryForecast({ lat, lon }) {
  const assetId = process.env.EE_ASSET_ID
  const assetType = process.env.EE_ASSET_TYPE || 'collection'
  if (!assetId) {
    return Promise.reject(
      new SetupError(
        'EE_ASSET_ID is not set — find the current WeatherNext asset id in the Earth Engine Data Catalog first'
      )
    )
  }

  const point = ee.Geometry.Point([lon, lat])
  const image =
    assetType === 'image'
      ? ee.Image(assetId)
      : ee.ImageCollection(assetId).filterBounds(point).sort('system:time_start', false).first()

  const scale = Number(process.env.EE_SCALE_METERS) || 25000

  const bands = image.reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: point,
    scale,
    bestEffort: true,
  })

  const payload = ee.Dictionary({
    time: image.get('system:time_start'),
    bands,
  })

  return new Promise((resolve, reject) => {
    payload.evaluate((result, error) => {
      if (error) reject(new Error(error))
      else resolve(result)
    })
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const url = new URL(req.url, `https://${req.headers.host}`)
  const latParam = url.searchParams.get('lat')
  const lonParam = url.searchParams.get('lon')
  const lat = latParam === null ? NaN : Number(latParam)
  const lon = lonParam === null ? NaN : Number(lonParam)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'lat and lon query params are required and must be valid coordinates' })
  }

  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const hit = cached(key)
  if (hit) {
    res.setHeader('X-WeatherNext-Cache', 'hit')
    return res.status(200).json(hit)
  }

  try {
    await initEarthEngine()
    const result = await queryForecast({ lat, lon })
    const payload = { time: result.time, bands: result.bands, source: process.env.EE_ASSET_ID }
    remember(key, payload)
    res.setHeader('X-WeatherNext-Cache', 'miss')
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800')
    return res.status(200).json(payload)
  } catch (err) {
    if (err instanceof SetupError) {
      return res.status(501).json({
        error: err.message,
        setup: [
          'Register a free "Unpaid usage" project at https://code.earthengine.google.com/register',
          'Create a service account in that project (IAM & Admin -> Service Accounts) and download its JSON key',
          'Set EE_PROJECT_ID, EE_SERVICE_ACCOUNT (full key JSON), and EE_ASSET_ID as Vercel environment variables',
          'Confirm the WeatherNext asset id and band names in the live Earth Engine Data Catalog before setting EE_ASSET_ID',
        ],
      })
    }
    return res.status(502).json({ error: 'Earth Engine query failed', detail: String(err.message || err) })
  }
}
