// Tiny JSON document store on top of Vercel Blob.
//
// This app is single-user, so there is no case for a real database — three
// small JSON blobs (health data, chat history, cached daily insight) cover
// everything. `addRandomSuffix: false` + `allowOverwrite: true` keeps each
// document at a stable pathname so it can be found again without an index.
//
// Requires Blob storage attached to the Vercel project (Storage -> Create
// Database -> Blob), which injects BLOB_READ_WRITE_TOKEN automatically.

import { put, list } from '@vercel/blob'

function requireToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const err = new Error(
      'Blob storage is not attached to this project yet. In Vercel: Storage -> Create Database -> Blob, then redeploy.'
    )
    err.statusCode = 503
    throw err
  }
}

export async function readJSON(pathname, fallback) {
  requireToken()
  const { blobs } = await list({ prefix: pathname, limit: 10 })
  const found = blobs.find((b) => b.pathname === pathname)
  if (!found) return fallback
  const res = await fetch(found.url, { cache: 'no-store' })
  if (!res.ok) return fallback
  try {
    return await res.json()
  } catch {
    return fallback
  }
}

export async function writeJSON(pathname, value) {
  requireToken()
  await put(pathname, JSON.stringify(value), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export const HEALTH_KEY = 'mi-coach/health.json'
export const CHAT_KEY = 'mi-coach/chat.json'
export const INSIGHT_KEY = 'mi-coach/insight.json'
