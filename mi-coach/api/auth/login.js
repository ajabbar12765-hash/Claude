import { checkPassword, signSession, setSessionCookie } from '../_lib/auth.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  try {
    if (!checkPassword(body?.password)) {
      return res.status(401).json({ error: 'Wrong password' })
    }
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }

  setSessionCookie(res, signSession())
  return res.status(200).json({ ok: true })
}
