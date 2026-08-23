// Emergency escape hatch: if every enrolled device is lost/broken and
// password sign-in has been disabled (see api/auth/login.js), this wipes
// all registered passkeys and re-enables password login. Requires a
// separate secret (not the app password) precisely because it's meant to
// be used from outside a browser session — e.g. curl — when you can't sign
// in at all. Only set PASSKEY_RESET_SECRET if you want this available.

import { resetPasskeys } from '../../_lib/webauthn.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const secret = process.env.PASSKEY_RESET_SECRET
  if (!secret) {
    return res.status(503).json({ error: 'PASSKEY_RESET_SECRET is not set on the server, so this reset is disabled.' })
  }
  const auth = req.headers?.authorization || ''
  if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' })

  try {
    await resetPasskeys()
    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
