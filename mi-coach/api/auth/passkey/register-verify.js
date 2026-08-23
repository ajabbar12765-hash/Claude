import { requireSession } from '../../_lib/auth.js'
import { verifyRegistration } from '../../_lib/webauthn.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireSession(req, res)) return

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  if (!body?.response) return res.status(400).json({ error: 'response is required' })

  try {
    const result = await verifyRegistration(req, { response: body.response, deviceName: body.deviceName })
    return res.status(200).json(result)
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
