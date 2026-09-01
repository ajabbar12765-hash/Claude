// Server-side storage for the background bank sync. This is what makes
// "automatic" possible: the cron job has no browser to read localStorage
// from, so the bank connection details and any newly-found transactions
// have to live somewhere the server can reach on its own.
//
// Requires a Redis database attached to the project — add one via the
// Vercel dashboard: Storage tab -> Marketplace Database Integrations ->
// "Upstash for Redis" (or similar). That auto-injects the REST URL/token
// env vars this reads (naming varies slightly by how it was provisioned,
// so a couple of variants are checked).

import { Redis } from '@upstash/redis'

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

function assertConfigured() {
  if (!url || !token) {
    const err = new Error(
      'No Redis database is attached: add one via the Vercel dashboard (Storage tab -> Marketplace Database Integrations -> Upstash for Redis).'
    )
    err.statusCode = 501
    throw err
  }
}

let client = null
function kv() {
  assertConfigured()
  if (!client) client = new Redis({ url, token })
  return client
}

const CONFIG_KEY = 'bank:config' // { requisitionId, accountIds, institutionName }
const DEDUPE_KEY = 'bank:dedupeIds' // Redis set of already-seen transaction ids
const PENDING_KEY = 'bank:pending' // JSON array of transactions not yet picked up by the client

export async function getBankConfig() {
  return (await kv().get(CONFIG_KEY)) || null
}

export async function setBankConfig(config) {
  if (!config) {
    await kv().del(CONFIG_KEY)
    return
  }
  await kv().set(CONFIG_KEY, config)
}

export async function seedDedupeIds(ids) {
  if (!ids || ids.length === 0) return
  await kv().sadd(DEDUPE_KEY, ...ids)
}

export async function filterNewIds(ids) {
  if (ids.length === 0) return []
  const isMember = await Promise.all(ids.map((id) => kv().sismember(DEDUPE_KEY, id)))
  return ids.filter((_, i) => !isMember[i])
}

export async function markSeen(ids) {
  if (!ids || ids.length === 0) return
  await kv().sadd(DEDUPE_KEY, ...ids)
}

export async function appendPending(items) {
  if (!items || items.length === 0) return
  const current = (await kv().get(PENDING_KEY)) || []
  await kv().set(PENDING_KEY, [...current, ...items])
}

export async function getPending() {
  return (await kv().get(PENDING_KEY)) || []
}

export async function removeFromPending(ids) {
  const idSet = new Set(ids)
  const current = (await kv().get(PENDING_KEY)) || []
  const remaining = current.filter((item) => !idSet.has(item.id))
  await kv().set(PENDING_KEY, remaining)
}

export async function clearBankData() {
  await kv().del(CONFIG_KEY)
  await kv().del(DEDUPE_KEY)
  await kv().del(PENDING_KEY)
}
