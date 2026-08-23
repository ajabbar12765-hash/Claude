// Registering a new device passkey requires an existing session — you must
// already be signed in (with the password, or an existing passkey) to add
// another trusted device. This is what stops a stranger who found the URL
// from just enrolling their own device.

import { requireSession } from '../../_lib/auth.js'
import { buildRegistrationOptions } from '../../_lib/webauthn.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireSession(req, res)) return

  try {
    const options = await buildRegistrationOptions(req, { userName: 'Mi Coach' })
    return res.status(200).json(options)
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
