// Manual "sync now" trigger for the Import tab — same underlying sync as
// the daily cron, but with a wider lookback window (useful for the first
// run, which otherwise has to wait for a whole day of cron cycles to
// backfill anything).

import { requireSession } from '../_lib/auth.js'
import { runXiaomiSync } from '../_lib/xiaomi/sync.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireSession(req, res)) return

  try {
    const result = await runXiaomiSync({ days: 30 })
    return res.status(200).json(result)
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message, kind: err.kind })
  }
}
