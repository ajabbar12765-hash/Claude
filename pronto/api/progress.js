// Syncs the learner's full progress (XP, completed lessons, streak, SRS
// deck, everything useProgress.js tracks) between their own devices —
// there's no login, just one shared record, same as the streak store this
// reuses the Upstash connection from. Last-write-wins by `updatedAt`; the
// client decides whether to adopt what comes back from GET.
import { getSyncedProgress, setSyncedProgress } from './_lib/kv.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    if (req.method === 'POST') {
      const { state, updatedAt } = req.body || {}
      if (!state || typeof state !== 'object') {
        res.status(400).json({ error: 'bad_request', message: 'state must be an object.' })
        return
      }
      if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) {
        res.status(400).json({ error: 'bad_request', message: 'updatedAt must be a number.' })
        return
      }
      await setSyncedProgress(state, updatedAt)
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'GET') {
      const data = await getSyncedProgress()
      res.setHeader('Cache-Control', 'no-store')
      res.status(200).json(data)
      return
    }

    res.status(405).json({ error: 'method_not_allowed', message: 'Use GET or POST.' })
  } catch (err) {
    if (err.code === 'missing_config') {
      res.status(503).json({ error: 'missing_config', message: err.message })
      return
    }
    res.status(500).json({ error: 'server_error', message: 'Something went wrong syncing progress.' })
  }
}
