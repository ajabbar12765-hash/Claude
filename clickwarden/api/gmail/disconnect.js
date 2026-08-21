import { requireToken } from '../_lib/auth.js'
import { kv } from '../_lib/kv.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireToken(req, res)) return

  const store = kv()
  const account = await store.get('clickwarden:gmail:account')
  if (account?.refreshToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${account.refreshToken}`, { method: 'POST' })
    } catch {
      // best-effort revoke; deleting our copy below is what actually stops scanning
    }
  }
  await store.del('clickwarden:gmail:account')
  await store.del('clickwarden:gmail:scans')
  return res.status(200).json({ ok: true })
}
