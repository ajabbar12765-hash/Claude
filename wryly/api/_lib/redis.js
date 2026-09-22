// Wraps the Upstash Redis store Vercel connected to this project (Storage
// tab -> Upstash for Redis). This is the one piece of real server-side
// persistence in the app — every other feature intentionally lives in the
// browser (localStorage) or is stateless per-request.

import { Redis } from '@upstash/redis'

let client = null

export function isConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export function redis() {
  if (!isConfigured()) {
    throw new Error('No Redis store connected — add Upstash for Redis from the Vercel Storage tab.')
  }
  if (!client) {
    client = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
  }
  return client
}
