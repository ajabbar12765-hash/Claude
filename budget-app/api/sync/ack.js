import { removeFromPending } from '../_lib/kv.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const { ids } = req.body || {}
    if (!Array.isArray(ids)) {
      res.status(400).json({ error: 'Missing "ids" array.' })
      return
    }
    await removeFromPending(ids)
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
