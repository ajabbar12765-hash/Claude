// Thin wrapper around the Upstash Redis REST client.
//
// Configure in Vercel -> Settings -> Environment Variables (auto-filled if you
// add the "Upstash Redis" integration from the Marketplace):
//   KV_REST_API_URL / KV_REST_API_TOKEN
//   (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN, both are accepted)
import { Redis } from '@upstash/redis'

let client = null

export function kv() {
  if (client) return client
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error('Redis is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN (see SETUP.md)')
  }
  client = new Redis({ url, token })
  return client
}
