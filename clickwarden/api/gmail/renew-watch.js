import { startWatch } from '../_lib/gmail.js'

// Vercel Cron (see vercel.json, runs daily) hits this to renew the Gmail
// watch subscription before its 7-day expiration.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).end()
  }

  try {
    const result = await startWatch()
    return res.status(200).json({ ok: true, ...result })
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) })
  }
}
