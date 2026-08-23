import { requireSession } from './_lib/auth.js'
import { readJSON, HEALTH_KEY } from './_lib/store.js'
import { computeSummary } from './_lib/schema.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  if (!requireSession(req, res)) return

  const url = new URL(req.url, `https://${req.headers.host}`)
  const rangeParam = url.searchParams.get('range') || '30'
  const range = rangeParam === 'all' ? 'all' : Math.max(1, Math.min(365, Number(rangeParam) || 30))

  try {
    const store = await readJSON(HEALTH_KEY, { records: {} })
    const summary = computeSummary(store, range)
    return res.status(200).json(summary)
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
