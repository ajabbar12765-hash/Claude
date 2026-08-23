// Vercel Cron entry point — runs on the schedule in vercel.json's "crons"
// array. Vercel signs these invocations with `Authorization: Bearer
// $CRON_SECRET` when that env var is set; we check it when present so the
// endpoint can't be triggered by an outsider who finds the URL, but still
// works if you haven't bothered setting CRON_SECRET.

import { runXiaomiSync } from '../_lib/xiaomi/sync.js'

export default async function handler(req, res) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const auth = req.headers?.authorization || ''
    if (auth !== `Bearer ${expected}`) return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await runXiaomiSync({ days: 3 })
    return res.status(200).json(result)
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message, kind: err.kind })
  }
}
