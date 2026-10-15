// All passkey (WebAuthn) operations in one route, dispatched by an `action`
// field — Vercel's Hobby plan caps a deployment at 12 serverless functions,
// so this collapses what would otherwise be 7 separate route files into
// one. Each action still enforces its own auth requirement below.

import { requireSession, signSession, setSessionCookie } from '../_lib/auth.js'
import {
  passkeysEnabled,
  listPasskeys,
  removePasskey,
  buildRegistrationOptions,
  verifyRegistration,
  buildAuthenticationOptions,
  verifyAuthentication,
  resetPasskeys,
} from '../_lib/webauthn.js'

function parseBody(req) {
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  return body || {}
}

export default async function handler(req, res) {
  const action = req.method === 'GET' || req.method === 'DELETE'
    ? new URL(req.url, `https://${req.headers.host}`).searchParams.get('action')
    : parseBody(req).action

  try {
    if (req.method === 'GET' && action === 'status') {
      return res.status(200).json({ enabled: await passkeysEnabled() })
    }

    if (req.method === 'GET' && action === 'list') {
      if (!requireSession(req, res)) return
      const devices = (await listPasskeys()).map((c) => ({ id: c.id, deviceName: c.deviceName, createdAt: c.createdAt }))
      return res.status(200).json({ devices })
    }

    if (req.method === 'DELETE') {
      if (!requireSession(req, res)) return
      const body = parseBody(req)
      if (!body.id) return res.status(400).json({ error: 'id is required' })
      await removePasskey(body.id)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'POST') {
      const body = parseBody(req)

      if (action === 'register-options') {
        if (!requireSession(req, res)) return
        const options = await buildRegistrationOptions(req, { userName: 'Mi Coach' })
        return res.status(200).json(options)
      }

      if (action === 'register-verify') {
        if (!requireSession(req, res)) return
        if (!body.response) return res.status(400).json({ error: 'response is required' })
        const result = await verifyRegistration(req, { response: body.response, deviceName: body.deviceName })
        return res.status(200).json(result)
      }

      if (action === 'login-options') {
        const options = await buildAuthenticationOptions(req)
        return res.status(200).json(options)
      }

      if (action === 'login-verify') {
        if (!body.response) return res.status(400).json({ error: 'response is required' })
        await verifyAuthentication(req, { response: body.response })
        setSessionCookie(res, signSession())
        return res.status(200).json({ ok: true })
      }

      if (action === 'reset') {
        const secret = process.env.PASSKEY_RESET_SECRET
        if (!secret) {
          return res.status(503).json({ error: 'PASSKEY_RESET_SECRET is not set on the server, so this reset is disabled.' })
        }
        const auth = req.headers?.authorization || ''
        if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' })
        await resetPasskeys()
        return res.status(200).json({ ok: true })
      }
    }

    return res.status(400).json({ error: 'Unknown or unsupported action' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
