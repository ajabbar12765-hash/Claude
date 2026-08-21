import { requireToken } from '../_lib/auth.js'
import { kv } from '../_lib/kv.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  if (!requireToken(req, res)) return

  try {
    const store = kv()
    const account = await store.get('clickwarden:gmail:account')
    const scans = account ? await store.lrange('clickwarden:gmail:scans', 0, 24) : []
    return res.status(200).json({
      connected: !!account,
      connectedAt: account?.connectedAt || null,
      lastHistoryId: account?.lastHistoryId || null,
      scans,
    })
  } catch {
    return res.status(200).json({ connected: false, scans: [], warning: 'Redis not configured -- see SETUP.md' })
  }
}
