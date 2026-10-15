import crypto from 'node:crypto'
import { readJSON, writeJSON, HEALTH_KEY } from '../store.js'
import { mergeIntoStore } from '../schema.js'
import { loginWithPassword, XiaomiAuthError } from './auth.js'
import { fetchRecentWorkouts } from './activity.js'

const DEVICE_ID_KEY = 'mi-coach/xiaomi-device-id.json'

// Reusing the same device ID across runs (instead of a fresh random one
// every time) makes daily syncs look like the same trusted device signing
// in repeatedly, rather than a new device every day — which is what
// actually triggers Xiaomi's extra verification prompts.
async function getOrCreateDeviceId() {
  const existing = await readJSON(DEVICE_ID_KEY, null)
  if (existing?.deviceId) return existing.deviceId
  const deviceId = crypto.randomBytes(8).toString('hex').toUpperCase()
  await writeJSON(DEVICE_ID_KEY, { deviceId })
  return deviceId
}

export async function runXiaomiSync({ days = 14 } = {}) {
  const email = process.env.XIAOMI_USER
  const password = process.env.XIAOMI_PASSWORD
  if (!email || !password) {
    const err = new Error('XIAOMI_USER / XIAOMI_PASSWORD are not set on the server.')
    err.statusCode = 503
    throw err
  }

  const deviceId = await getOrCreateDeviceId()

  let session
  try {
    session = await loginWithPassword({ email, password, deviceId })
  } catch (err) {
    if (err instanceof XiaomiAuthError) {
      err.statusCode = 502
      throw err
    }
    throw err
  }

  const records = await fetchRecentWorkouts(session, { days })

  const store = await readJSON(HEALTH_KEY, { records: {} })
  const touchedDates = mergeIntoStore(store, records)
  await writeJSON(HEALTH_KEY, store)

  const workoutCount = records.reduce((sum, r) => sum + (r.workouts?.length || 0), 0)
  return { ok: true, workoutsFound: workoutCount, daysUpdated: touchedDates.length }
}
