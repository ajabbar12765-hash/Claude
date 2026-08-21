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
    const err = new Error(`Upstash request failed (${res.status}).`)
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
