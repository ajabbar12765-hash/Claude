import { signSession, setSessionCookie } from '../../_lib/auth.js'
import { verifyAuthentication } from '../../_lib/webauthn.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

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
    await verifyAuthentication(req, { response: body.response })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }

  setSessionCookie(res, signSession())
  return res.status(200).json({ ok: true })
}
