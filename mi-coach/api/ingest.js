// Single ingestion point for all Mi Fitness data, from either source:
//   - automation (Health Auto Export webhook, or any script) authenticated
//     with `Authorization: Bearer <INGEST_SECRET>`
//   - the app's own Import tab (manual CSV/JSON upload), authenticated with
//     the normal session cookie
//
// Accepts three body shapes:
//   1. Health Auto Export's native JSON export (auto-detected)
//   2. { records: [DayRecord, ...] } - the app's generic schema
//   3. [DayRecord, ...] - a bare array of the generic schema

import { isAuthorizedForIngest } from './_lib/auth.js'
import { readJSON, writeJSON, HEALTH_KEY } from './_lib/store.js'
import { mergeIntoStore } from './_lib/schema.js'
import { isHealthAutoExportPayload, convertHealthAutoExport } from './_lib/healthAutoExport.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  if (!isAuthorizedForIngest(req)) {
    return res.status(401).json({
      error: 'Unauthorized. Sign in, or send Authorization: Bearer <INGEST_SECRET>.',
    })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }
  }

  let rawRecords
  if (isHealthAutoExportPayload(body)) {
    rawRecords = convertHealthAutoExport(body)
  } else if (Array.isArray(body)) {
    rawRecords = body
  } else if (Array.isArray(body?.records)) {
    rawRecords = body.records
  } else {
    return res.status(400).json({
      error:
        'Unrecognized payload shape. Expected a Health Auto Export export, { "records": [...] }, or a bare array of day records.',
    })
  }

  try {
    const store = await readJSON(HEALTH_KEY, { records: {} })
    const touched = mergeIntoStore(store, rawRecords)
    await writeJSON(HEALTH_KEY, store)
    return res.status(200).json({ ok: true, daysUpdated: touched.length, totalDaysLogged: Object.keys(store.records).length })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message })
  }
}
