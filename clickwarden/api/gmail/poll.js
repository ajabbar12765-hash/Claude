import { requireTokenOrCron } from '../_lib/auth.js'
import { kv } from '../_lib/kv.js'
import { fetchNewMessagesSince, getMessage, getAttachmentBytes, extractLinksAndAttachments, getProfileHistoryId } from '../_lib/gmail.js'
import { vtLookupUrl, vtLookupHash } from '../_lib/virustotal.js'
import { checkSafeBrowsing } from '../_lib/safeBrowsing.js'
import { checkUrlhaus } from '../_lib/urlhaus.js'
import { aggregateVerdict } from '../_lib/verdict.js'
import crypto from 'node:crypto'

// Google Cloud Pub/Sub push notifications would need a billing account (a
// credit card) even to stay free -- not acceptable here, so this polls
// instead. Three things call this endpoint: the browser extension's
// ~1-minute alarm (near-real-time while your browser is open), a once-daily
// Vercel Cron as a safety net (see vercel.json), and the dashboard's
// "Check now" button.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
const MAX_LINKS_PER_EMAIL = 20
const VERDICT_RANK = { malicious: 3, suspicious: 2, unknown: 1, safe: 0 }

export default async function handler(req, res) {
  // Vercel Cron always invokes via GET; the extension alarm and the
  // dashboard's "Check now" button use POST. Both are accepted here.
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' })
  if (!requireTokenOrCron(req, res)) return

  let store
  try {
    store = kv()
  } catch {
    return res.status(200).json({ scanned: 0, warning: 'Redis not configured -- see SETUP.md' })
  }

  const account = await store.get('clickwarden:gmail:account')
  if (!account) return res.status(200).json({ scanned: 0, connected: false })

  try {
    if (!account.lastHistoryId) {
      // First poll since connecting -- just establish the baseline, nothing
      // to scan yet (scanning everything already in the inbox would blow
      // through the day's VirusTotal quota on one request).
      await getProfileHistoryId()
      return res.status(200).json({ scanned: 0, baselineSet: true })
    }

    const { messageIds, gap } = await fetchNewMessagesSince(account.lastHistoryId)
    const freshHistoryId = await getProfileHistoryId()

    if (gap) {
      return res.status(200).json({ scanned: 0, gap: true })
    }

    let flagged = 0
    for (const id of messageIds) {
      const verdict = await scanMessage(id, store)
      if (verdict === 'malicious' || verdict === 'suspicious') flagged += 1
    }
    return res.status(200).json({ scanned: messageIds.length, flagged, historyId: freshHistoryId })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}

async function scanMessage(id, store) {
  const message = await getMessage(id)
  const { links, attachments, subject, from } = extractLinksAndAttachments(message)

  const linkResults = []
  for (const url of links.slice(0, MAX_LINKS_PER_EMAIL)) {
    const [virustotal, safeBrowsing, urlhaus] = await Promise.all([
      vtLookupUrl(url).catch((e) => ({ status: 'error', detail: String(e) })),
      checkSafeBrowsing(url).catch((e) => ({ status: 'error', detail: String(e) })),
      checkUrlhaus(url).catch((e) => ({ status: 'error', detail: String(e) })),
    ])
    linkResults.push({ url, verdict: aggregateVerdict({ virustotal, safeBrowsing, urlhaus }).verdict })
  }

  const attachmentResults = []
  for (const att of attachments) {
    if (att.size > MAX_ATTACHMENT_BYTES) {
      attachmentResults.push({ filename: att.filename, verdict: 'unknown', detail: 'Too large to hash automatically' })
      continue
    }
    const bytes = await getAttachmentBytes(id, att.attachmentId)
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
    const virustotal = await vtLookupHash(sha256).catch((e) => ({ status: 'error', detail: String(e) }))
    attachmentResults.push({ filename: att.filename, sha256, verdict: aggregateVerdict({ virustotal }).verdict })
  }

  const worst = [...linkResults, ...attachmentResults].reduce(
    (acc, r) => (VERDICT_RANK[r.verdict] > VERDICT_RANK[acc] ? r.verdict : acc),
    'safe'
  )

  await store.lpush('clickwarden:gmail:scans', {
    messageId: id,
    subject,
    from,
    verdict: worst,
    links: linkResults,
    attachments: attachmentResults,
    scannedAt: new Date().toISOString(),
  })
  await store.ltrim('clickwarden:gmail:scans', 0, 99)
  return worst
}
