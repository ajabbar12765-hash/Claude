import { kv } from '../_lib/kv.js'
import { fetchNewMessagesSince, getMessage, getAttachmentBytes, extractLinksAndAttachments, saveAccount } from '../_lib/gmail.js'
import { vtLookupUrl, vtLookupHash } from '../_lib/virustotal.js'
import { checkSafeBrowsing } from '../_lib/safeBrowsing.js'
import { checkUrlhaus } from '../_lib/urlhaus.js'
import { aggregateVerdict } from '../_lib/verdict.js'
import crypto from 'node:crypto'

// Skip hashing attachments bigger than this -- Gmail API + serverless
// function memory/time budgets aren't built for large-file transfer.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
// One malicious-looking email shouldn't be able to burn VirusTotal's whole
// daily 500-request quota by itself.
const MAX_LINKS_PER_EMAIL = 20

const VERDICT_RANK = { malicious: 3, suspicious: 2, unknown: 1, safe: 0 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Pub/Sub push subscriptions are created with this shared secret baked
  // into the endpoint URL (see SETUP.md) so random internet POSTs can't
  // trigger scans or spend your API quota.
  if (req.query.token !== process.env.GMAIL_PUSH_SECRET) {
    return res.status(401).end()
  }

  // Pub/Sub retries (and backs up) if we don't ack within ~10s, well before
  // scanning every link/attachment in a message could finish -- so ack now
  // and keep working. The serverless invocation stays alive until this async
  // handler's promise settles, even though the response already went out.
  res.status(204).end()

  try {
    const payload = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf-8'))
    const { historyId } = payload

    const store = kv()
    const account = await store.get('clickwarden:gmail:account')
    if (!account) return

    const since = account.lastHistoryId
    await saveAccount({ lastHistoryId: historyId })
    if (!since) return

    const { messageIds, gap } = await fetchNewMessagesSince(since)
    if (gap || messageIds.length === 0) return

    for (const id of messageIds) {
      await scanMessage(id, store)
    }
  } catch (e) {
    console.error('gmail push handling failed', e)
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
}
