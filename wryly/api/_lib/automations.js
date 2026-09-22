// Data access for the Automations feature: standing rules that fire from an
// external webhook (a Zapier "Webhooks by Zapier" step) instead of a live
// chat message, plus the pending-approval queue and activity log so the
// same "ask before anything real-world" rule can apply even when nobody's
// looking at the app when the trigger fires.

import { redis } from './redis.js'

const AUTOMATIONS_KEY = 'wryly:automations'
const PENDING_KEY = 'wryly:pending'
const ACTIVITY_KEY = 'wryly:activity'
const ACTIVITY_MAX = 50

// @upstash/redis (de)serializes hash values as JSON automatically, but
// tolerate either shape defensively — a client/version difference here
// should never crash the request.
function parse(value) {
  if (value == null) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export async function listAutomations() {
  const all = await redis().hgetall(AUTOMATIONS_KEY)
  if (!all) return []
  return Object.values(all).map(parse).filter(Boolean).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getAutomation(id) {
  const value = await redis().hget(AUTOMATIONS_KEY, id)
  return parse(value)
}

export async function saveAutomation(automation) {
  await redis().hset(AUTOMATIONS_KEY, { [automation.id]: automation })
  return automation
}

export async function deleteAutomation(id) {
  await redis().hdel(AUTOMATIONS_KEY, id)
}

export async function listPending() {
  const all = await redis().hgetall(PENDING_KEY)
  if (!all) return []
  return Object.values(all).map(parse).filter(Boolean).sort((a, b) => a.createdAt - b.createdAt)
}

export async function getPending(id) {
  const value = await redis().hget(PENDING_KEY, id)
  return parse(value)
}

export async function savePending(item) {
  await redis().hset(PENDING_KEY, { [item.id]: item })
  return item
}

export async function deletePending(id) {
  await redis().hdel(PENDING_KEY, id)
}

export async function logActivity(entry) {
  await redis().lpush(ACTIVITY_KEY, entry)
  await redis().ltrim(ACTIVITY_KEY, 0, ACTIVITY_MAX - 1)
}

export async function listActivity() {
  const items = await redis().lrange(ACTIVITY_KEY, 0, ACTIVITY_MAX - 1)
  return (items || []).map(parse).filter(Boolean)
}
