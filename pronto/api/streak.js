// Tiny persistence bridge between the PWA (which only has localStorage)
// and the Scriptable home-screen widget (a separate app with no access to
// the browser at all). The app POSTs its streak whenever it changes;
// widget-phrase.js reads it back for the widget to display.
import { getStreak, setStreak } from './_lib/kv.js'

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
      const { streak } = req.body || {}
      if (typeof streak !== 'number' || streak < 0 || !Number.isFinite(streak)) {
        res.status(400).json({ error: 'bad_request', message: 'streak must be a non-negative number.' })
        return
      }
      await setStreak(Math.round(streak))
      res.status(200).json({ ok: true })
      return
    }

    if (req.method === 'GET') {
      const data = await getStreak()
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.status(200).json(data)
      return
    }

    res.status(405).json({ error: 'method_not_allowed', message: 'Use GET or POST.' })
  } catch (err) {
    if (err.code === 'missing_config') {
      res.status(503).json({ error: 'missing_config', message: err.message })
      return
    }
    res.status(500).json({ error: 'server_error', message: 'Something went wrong syncing the streak.' })
  }
}
