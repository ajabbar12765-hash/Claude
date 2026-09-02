// Thin wrapper around Upstash Redis's REST API — the one piece of
// persistent server state in this app, used only to let the Scriptable
// home-screen widget (which runs outside the browser and can't see
// localStorage) show the real streak. Single fixed key: this is a
// personal, single-device app with no accounts, not a multi-user store.

const STREAK_KEY = 'pronto:streak:v1'

async function upstash(...args) {
  const base = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!base || !token) {
    const err = new Error('Streak sync needs UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set in this project’s Vercel Environment Variables.')
    err.code = 'missing_config'
    throw err
  }
  const url = `${base}/${args.map(encodeURIComponent).join('/')}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    // Upstash's response body normally names the exact problem (e.g. a
    // read-only REST token rejecting a write) — surfacing it in both the
    // error and the server log is the difference between "something broke"
    // and knowing what to fix in the Upstash/Vercel dashboards.
    const body = await res.text().catch(() => '')
    console.error(`upstash ${args[0]} failed: ${res.status} ${body}`)
    const err = new Error(`Upstash request failed (${res.status}): ${body || 'no response body'}`)
    err.code = 'upstash_error'
    throw err
  }
  const data = await res.json()
  return data.result
}

export async function getStreak() {
  const raw = await upstash('get', STREAK_KEY)
  if (!raw) return { streak: 0, date: null }
  try {
    return JSON.parse(raw)
  } catch {
    return { streak: 0, date: null }
  }
}

export async function setStreak(streak) {
  const payload = JSON.stringify({ streak, date: new Date().toISOString().slice(0, 10) })
  await upstash('set', STREAK_KEY, payload)
}

// Full-progress sync between the learner's own devices (phone + iPad) —
// same personal, single-key store as the streak above, just holding the
// whole progress blob instead of one number. Last-write-wins by
// `updatedAt`, resolved client-side in useProgress.js.
const PROGRESS_KEY = 'pronto:progress-sync:v1'

export async function getSyncedProgress() {
  const raw = await upstash('get', PROGRESS_KEY)
  if (!raw) return { state: null, updatedAt: 0 }
  try {
    return JSON.parse(raw)
  } catch {
    return { state: null, updatedAt: 0 }
  }
}

export async function setSyncedProgress(state, updatedAt) {
  await upstash('set', PROGRESS_KEY, JSON.stringify({ state, updatedAt }))
}
