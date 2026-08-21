import { saveAccount, startWatch } from '../_lib/gmail.js'

export default async function handler(req, res) {
  const { code, error } = req.query
  if (error) return res.status(400).send(`Google OAuth error: ${error}`)
  if (!code) return res.status(400).send('Missing authorization code')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return res.status(500).send(`Token exchange failed: ${await tokenRes.text()}`)
  const tokens = await tokenRes.json()

  if (!tokens.refresh_token) {
    return res
      .status(400)
      .send(
        'Google did not return a refresh token (it only issues one on first consent). ' +
          'Revoke ClickWarden at https://myaccount.google.com/permissions, then connect again.'
      )
  }

  await saveAccount({ refreshToken: tokens.refresh_token, connectedAt: new Date().toISOString() })

  try {
    await startWatch()
  } catch {
    // Account is saved even if the watch subscription fails here -- the
    // daily renew-watch cron will retry it.
  }

  res.writeHead(302, { Location: '/?gmail=connected' })
  res.end()
}
