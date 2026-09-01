import { getPending } from '../_lib/kv.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const items = await getPending()
    res.status(200).json({ items })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
