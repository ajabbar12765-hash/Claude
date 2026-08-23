import { requireSession } from '../../_lib/auth.js'
import { listPasskeys, removePasskey } from '../../_lib/webauthn.js'

export default async function handler(req, res) {
  if (!requireSession(req, res)) return

  if (req.method === 'GET') {
    try {
      const devices = (await listPasskeys()).map((c) => ({
        id: c.id,
        deviceName: c.deviceName,
        createdAt: c.createdAt,
      }))
      return res.status(200).json({ devices })
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        body = {}
      }
    }
    if (!body?.id) return res.status(400).json({ error: 'id is required' })
    try {
      await removePasskey(body.id)
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'GET or DELETE only' })
}
