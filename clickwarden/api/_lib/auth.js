// Every /api/scan-* and /api/gmail/status|disconnect endpoint burns quota on
// paid-adjacent free-tier APIs (VirusTotal: 500/day). Without this check,
// anyone who finds your public Vercel URL could drain it. The web app and the
// browser extension both send this header; set the same value in both places.
export function requireToken(req, res) {
  const expected = process.env.CLICKWARDEN_API_TOKEN
  if (!expected) return true // not configured yet (e.g. local dev) -- allow through

  const got = req.headers['x-clickwarden-token']
  if (got === expected) return true

  res.status(401).json({ error: 'Missing or invalid x-clickwarden-token header' })
  return false
}

// For endpoints hit both by the app (x-clickwarden-token) and by Vercel Cron
// (which sends `Authorization: Bearer <CRON_SECRET>` automatically once
// CRON_SECRET is set -- see vercel.json).
export function requireTokenOrCron(req, res) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization === `Bearer ${cronSecret}`) return true
  return requireToken(req, res)
}
