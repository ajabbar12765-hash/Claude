// Google redirects here after consent. Exchanges the code for tokens and
// stores the refresh token in an httpOnly cookie — scoped to whichever
// browser completed the flow, never shared app-wide.

import { GOOGLE_TOKEN_URL, isConfigured, redirectUri } from '../../_lib/google.js'
import { parseCookies, serializeCookie, clearCookie } from '../../_lib/cookies.js'

export const config = { runtime: 'edge' }

const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 180 // 180 days

export default async function handler(req) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const cookies = parseCookies(req)
  const expectedState = cookies['wryly_g_state']

  const headers = new Headers()
  headers.append('Set-Cookie', clearCookie('wryly_g_state'))

  if (error || !code || !state || state !== expectedState) {
    headers.set('Location', `/?gmail=error`)
    return new Response(null, { status: 302, headers })
  }

  if (!isConfigured()) {
    headers.set('Location', `/?gmail=error`)
    return new Response(null, { status: 302, headers })
  }

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri(req),
      }),
    })

    if (!res.ok) throw new Error(`token exchange failed (${res.status})`)
    const tokens = await res.json()

    if (!tokens.refresh_token) {
      // Google only sends a refresh_token on first consent (or when forced
      // with prompt=consent, which /start always sets) — if it's still
      // missing something's wrong with the OAuth client config.
      throw new Error('no refresh_token in response')
    }

    headers.append(
      'Set-Cookie',
      serializeCookie('wryly_g_refresh', tokens.refresh_token, { maxAge: REFRESH_COOKIE_MAX_AGE })
    )
    headers.set('Location', `/?gmail=connected`)
    return new Response(null, { status: 302, headers })
  } catch {
    headers.set('Location', `/?gmail=error`)
    return new Response(null, { status: 302, headers })
  }
}
