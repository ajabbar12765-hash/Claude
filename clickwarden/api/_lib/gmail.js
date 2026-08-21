// Gmail API helpers for the single connected mailbox. ClickWarden is a
// personal tool, so account state lives under one fixed Redis key rather than
// a multi-user table.
import { kv } from './kv.js'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const ACCOUNT_KEY = 'clickwarden:gmail:account'

export async function getAccount() {
  const store = kv()
  const account = await store.get(ACCOUNT_KEY)
  if (!account) throw new Error('Gmail is not connected')
  return account
}

export async function saveAccount(patch) {
  const store = kv()
  const existing = (await store.get(ACCOUNT_KEY)) || {}
  const merged = { ...existing, ...patch }
  await store.set(ACCOUNT_KEY, merged)
  return merged
}

async function getAccessToken() {
  const account = await getAccount()
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: account.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Failed to refresh Gmail token: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

// Registers (or renews) the Gmail -> Pub/Sub push subscription. Google
// expires this every 7 days, hence the daily renew-watch cron.
export async function startWatch() {
  const token = await getAccessToken()
  const topicName = process.env.GMAIL_PUBSUB_TOPIC // projects/<project>/topics/<topic>
  const res = await fetch(`${GMAIL_API}/watch`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ topicName, labelIds: ['INBOX'], labelFilterAction: 'include' }),
  })
  if (!res.ok) throw new Error(`Gmail watch() failed: ${res.status} ${await res.text()}`)
  const data = await res.json() // { historyId, expiration }
  await saveAccount({ lastHistoryId: data.historyId, watchExpiration: data.expiration })
  return data
}

// Pub/Sub only tells us "something changed as of historyId X" -- this turns
// that into the actual list of newly-arrived message ids.
export async function fetchNewMessagesSince(startHistoryId) {
  const token = await getAccessToken()
  let pageToken = null
  const messageIds = new Set()
  do {
    const params = new URLSearchParams({ startHistoryId, historyTypes: 'messageAdded' })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await fetch(`${GMAIL_API}/history?${params}`, { headers: { authorization: `Bearer ${token}` } })
    if (res.status === 404) {
      // startHistoryId fell outside Gmail's retained history (long gap since
      // last check) -- nothing we can safely reconstruct, caller skips.
      return { messageIds: [], gap: true }
    }
    if (!res.ok) throw new Error(`Gmail history.list failed: ${res.status}`)
    const data = await res.json()
    for (const h of data.history || []) {
      for (const m of h.messagesAdded || []) messageIds.add(m.message.id)
    }
    pageToken = data.nextPageToken
  } while (pageToken)
  return { messageIds: [...messageIds], gap: false }
}

export async function getMessage(id) {
  const token = await getAccessToken()
  const res = await fetch(`${GMAIL_API}/messages/${id}?format=full`, { headers: { authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Gmail messages.get failed: ${res.status}`)
  return res.json()
}

export async function getAttachmentBytes(messageId, attachmentId) {
  const token = await getAccessToken()
  const res = await fetch(`${GMAIL_API}/messages/${messageId}/attachments/${attachmentId}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Gmail attachments.get failed: ${res.status}`)
  const data = await res.json() // { size, data: base64url }
  return Buffer.from(data.data, 'base64url')
}

// Pulls http(s) links out of the text/html + text/plain body parts and
// collects attachment metadata (name/size/attachmentId) for later hashing.
export function extractLinksAndAttachments(message) {
  const links = new Set()
  const attachments = []

  function walk(part) {
    if (!part) return
    const mimeType = part.mimeType || ''
    if (part.body?.data && (mimeType === 'text/html' || mimeType === 'text/plain')) {
      const text = Buffer.from(part.body.data, 'base64url').toString('utf-8')
      const found = text.match(/https?:\/\/[^\s"'<>)\]]+/g) || []
      found.forEach((u) => links.add(u.replace(/[.,;]+$/, '')))
    }
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType,
        attachmentId: part.body.attachmentId,
        size: part.body.size || 0,
      })
    }
    for (const child of part.parts || []) walk(child)
  }
  walk(message.payload)

  const headers = Object.fromEntries((message.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]))
  return { links: [...links], attachments, subject: headers.subject || '(no subject)', from: headers.from || 'unknown' }
}
