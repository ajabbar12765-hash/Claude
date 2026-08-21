// Kicks off Google's consent screen. Visit /api/gmail/oauth-start from the
// dashboard's "Connect Gmail" button -- this is a plain browser redirect, not
// a JSON API call, so it isn't behind the x-clickwarden-token check.
export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return res.status(500).send('Google OAuth is not configured yet -- see SETUP.md')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent', // forces a refresh_token even on a re-connect
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  })

  res.writeHead(302, { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
  res.end()
}
