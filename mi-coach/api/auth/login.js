import { checkPassword, signSession, setSessionCookie } from '../_lib/auth.js'
import { passkeysEnabled } from '../_lib/webauthn.js'

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

  try {
    // Once at least one device passkey is registered, password sign-in is
    // turned off — only enrolled devices can get in from then on. See
    // api/auth/passkey/reset.js for the emergency way back in.
    if (await passkeysEnabled()) {
      return res.status(403).json({ error: 'Password sign-in is disabled. Use a registered device to sign in.' })
    }
    if (!checkPassword(body?.password)) {
      return res.status(401).json({ error: 'Wrong password' })
    }
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }

  setSessionCookie(res, signSession())
  return res.status(200).json({ ok: true })
}
