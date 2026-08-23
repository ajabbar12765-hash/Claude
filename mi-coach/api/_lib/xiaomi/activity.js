// Node port of the Mi Fitness cloud activity API — fetching logged workout
// sessions (runs, walks, rides, etc.), ported from the verified Python
// reference (mi_fitness_sync.activity.transport / .client). This does NOT
// cover passive all-day steps/heart-rate/sleep — no verified endpoint for
// that was found; see api/_lib/xiaomi/sync.js for the honest explanation.

import { generateNonce, encryptQueryParams, decryptResponsePayload } from './crypto.js'

const ACTIVITY_LIST_ENDPOINT = 'https://hlth.io.mi.com/app/v1/data/get_sport_records_by_time'
const REGION_BY_IP_ENDPOINT = 'https://region.hlth.io.mi.com/app/v1/public/user_region_by_ip'
const REGION_BY_IP_AUTH_KEY = 'rwelJuWBFJxmbMKD'

async function resolveRegion() {
  const override = process.env.XIAOMI_REGION?.trim().toLowerCase()
  if (override) return override
  try {
    const res = await fetch(REGION_BY_IP_ENDPOINT, {
      headers: { Cookie: `auth_key=${REGION_BY_IP_AUTH_KEY}`, RegionTag: 'ignore' },
    })
    if (!res.ok) return 'cn'
    const payload = await res.json()
    const region = payload?.result?.region
    return typeof region === 'string' && region ? region.toLowerCase() : 'cn'
  } catch {
    return 'cn'
  }
}

function regionalize(endpoint, region) {
  if (region === 'cn') return endpoint
  return endpoint.replace('://', `://${region}.`)
}

function buildCookieHeader(session) {
  const parts = [`serviceToken=${session.serviceToken}`, `cUserId=${session.cUserId}`]
  return parts.join('; ')
}

async function requestJson(session, { endpoint, path, requestPayload, label }) {
  const nonce = generateNonce(0)
  const params = encryptQueryParams({
    method: 'GET',
    path,
    params: { data: JSON.stringify(requestPayload) },
    nonce,
    ssecurity: session.ssecurity,
  })
  const url = new URL(endpoint)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      Cookie: buildCookieHeader(session),
      region_tag: session.region,
    },
  })
  if (res.status === 401) throw new Error(`${label} was rejected with 401 (session expired or invalid).`)
  if (!res.ok) throw new Error(`${label} failed with HTTP ${res.status}.`)

  const bodyText = await res.text()
  const payload = decryptResponsePayload(bodyText, nonce, session.ssecurity)
  if (payload.code !== 0) throw new Error(payload.message || `${label} returned an API error (code ${payload.code}).`)
  return payload
}

// Maps a Mi Fitness `sport_type` integer to a friendly label. Not
// exhaustive — unknown codes just render as "Workout N", which is honest
// rather than guessing at a name.
const SPORT_TYPE_NAMES = {
  1: 'Run', 2: 'Walk', 3: 'Cycling', 6: 'Pool Swim', 9: 'Elliptical',
  14: 'Freestyle', 15: 'Hiking', 22: 'Indoor Run', 23: 'Indoor Cycling',
  60: 'Open Water Swim', 92: 'Strength Training', 96: 'Yoga', 97: 'HIIT',
}

function titleFor(sportType, category) {
  if (typeof sportType === 'number' && SPORT_TYPE_NAMES[sportType]) return SPORT_TYPE_NAMES[sportType]
  if (typeof category === 'string' && category.trim()) {
    return category.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (typeof sportType === 'number') return `Workout ${sportType}`
  return 'Workout'
}

function parseRecord(record) {
  let report = {}
  if (typeof record.value === 'string' && record.value) {
    try {
      report = JSON.parse(record.value)
    } catch {
      report = {}
    }
  }
  const startTime = typeof report.start_time === 'number' ? report.start_time : typeof record.time === 'number' ? record.time : null
  if (!startTime) return null

  return {
    id: `xiaomi-${record.sid || ''}-${record.key || ''}-${startTime}`,
    type: titleFor(report.sport_type, record.category),
    start: new Date(startTime * 1000).toISOString(),
    end: typeof report.end_time === 'number' ? new Date(report.end_time * 1000).toISOString() : undefined,
    durationMin: typeof report.duration === 'number' ? Math.round(report.duration / 60) : undefined,
    calories: typeof report.calories === 'number' ? report.calories : undefined,
    distanceKm: typeof report.distance === 'number' ? report.distance / 1000 : undefined,
  }
}

// Returns { date: 'YYYY-MM-DD', workouts: [...] }[] for the given lookback
// window, ready to hand to schema.js's mergeIntoStore.
export async function fetchRecentWorkouts(session, { days = 14 } = {}) {
  const region = await resolveRegion()
  const sessionWithRegion = { ...session, region }
  const endTime = Math.floor(Date.now() / 1000)
  const startTime = endTime - days * 86400

  const byDate = new Map()
  let nextKey
  let guard = 0
  do {
    guard += 1
    const payload = await requestJson(sessionWithRegion, {
      endpoint: regionalize(ACTIVITY_LIST_ENDPOINT, region),
      path: '/app/v1/data/get_sport_records_by_time',
      requestPayload: { reverse: true, limit: 20, startTime, endTime, ...(nextKey ? { next_key: nextKey } : {}) },
      label: 'Mi Fitness activity list request',
    })
    const result = payload.result || {}
    for (const raw of result.sport_records || []) {
      if (raw.deleted) continue
      const workout = parseRecord(raw)
      if (!workout) continue
      const date = workout.start.slice(0, 10)
      if (!byDate.has(date)) byDate.set(date, [])
      byDate.get(date).push(workout)
    }
    nextKey = result.has_more ? result.next_key : null
  } while (nextKey && guard < 20)

  return [...byDate.entries()].map(([date, workouts]) => ({ date, workouts }))
}
