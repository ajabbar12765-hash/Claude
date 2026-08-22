// Single-user session auth, HMAC-signed, no dependencies.
//
// Session cookie value is `<expiryEpochMs>.<hmac>`, signed with APP_PASSWORD
// as the secret. That's enough for a one-person app: anyone who can read
// APP_PASSWORD from Vercel env vars already has full access anyway.
//
// The ingest endpoint additionally accepts a separate INGEST_SECRET bearer
// token, since automation (Health Auto Export, Tasker, etc.) can't hold a
// browser cookie.

import crypto from 'node:crypto'

const COOKIE_NAME = 'mi_coach_session'
const SESSION_MS = 30 * 24 * 60 * 60 * 1000

function secret() {
  const s = process.env.APP_PASSWORD
  if (!s) {
    const err = new Error('APP_PASSWORD is not set on the server. Add it in Vercel -> Settings -> Environment Variables.')
    err.statusCode = 500
    throw err
  }
  return s
}

function hmac(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex')
}

export function signSession() {
  const expires = String(Date.now() + SESSION_MS)
  return `${expires}.${hmac(expires)}`
}

export function verifySession(token) {
  if (!token) return false
  const [expires, sig] = token.split('.')
  if (!expires || !sig) return false
  let expected
  try {
    expected = hmac(expires)
  } catch {
    return false
  }
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  return Number(expires) > Date.now()
}

function parseCookies(req) {
  if (req.cookies) return req.cookies
  const header = req.headers?.cookie
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((p) => {
      const i = p.indexOf('=')
      return [decodeURIComponent(p.slice(0, i).trim()), decodeURIComponent(p.slice(i + 1).trim())]
    })
  )
}

export function hasValidSession(req) {
  const cookies = parseCookies(req)
  return verifySession(cookies[COOKIE_NAME])
}

export function setSessionCookie(res, token) {
  const maxAge = Math.floor(SESSION_MS / 1000)
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`)
}

export function checkPassword(input) {
  const expected = secret()
  const a = Buffer.from(String(input || ''))
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// True if the request carries either a logged-in session cookie (the web
// app, for manual uploads) or the ingest bearer secret (automation).
export function isAuthorizedForIngest(req) {
  if (hasValidSession(req)) return true
  const auth = req.headers?.authorization || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null
  const expected = process.env.INGEST_SECRET
  if (!bearer || !expected) return false
  const a = Buffer.from(bearer)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function requireSession(req, res) {
  if (!hasValidSession(req)) {
    res.status(401).json({ error: 'Not signed in' })
    return false
  }
  return true
}
