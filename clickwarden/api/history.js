import { requireToken } from './_lib/auth.js'
import { kv } from './_lib/kv.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  if (!requireToken(req, res)) return

  try {
    const store = kv()
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const entries = await store.lrange('clickwarden:history', 0, limit - 1)
    return res.status(200).json({ entries })
  } catch {
    return res.status(200).json({
      entries: [],
      warning: 'Redis not configured -- history is unavailable until KV_REST_API_URL/TOKEN are set (see SETUP.md)',
    })
  }
}
