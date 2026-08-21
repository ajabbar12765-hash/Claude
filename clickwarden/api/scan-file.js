import { requireToken } from './_lib/auth.js'
import { vtLookupHash, vtUploadFile } from './_lib/virustotal.js'
import { aggregateVerdict } from './_lib/verdict.js'
import { kv } from './_lib/kv.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireToken(req, res)) return

  // The browser hashes the file locally (SubtleCrypto) and only ever sends
  // the SHA-256 -- the file itself never leaves the device unless the user
  // explicitly opts into uploadConsent below.
  const { sha256, filename, uploadConsent, fileBase64 } = req.body || {}
  if (!sha256 || !/^[a-f0-9]{64}$/i.test(sha256)) {
    return res.status(400).json({ error: 'sha256 (64 hex chars) is required -- compute it client-side' })
  }

  let virustotal = await vtLookupHash(sha256)

  // A hash VirusTotal has never seen isn't "safe" -- it's untested. If the
  // user explicitly consented, submit the actual bytes for a fresh scan.
  if (virustotal?.status === 'unknown' && uploadConsent && fileBase64) {
    const buffer = Buffer.from(fileBase64, 'base64')
    virustotal = await vtUploadFile(buffer, filename || 'upload.bin')
  }

  const result = aggregateVerdict({ virustotal })
  result.sha256 = sha256
  result.filename = filename || null
  if (result.sources.length === 0) {
    result.warning = 'VirusTotal is not configured yet -- see SETUP.md'
  }

  try {
    const store = kv()
    await store.lpush('clickwarden:history', {
      type: 'file',
      target: filename || sha256,
      sha256,
      verdict: result.verdict,
      checkedAt: result.checkedAt,
    })
    await store.ltrim('clickwarden:history', 0, 199)
  } catch {
    // history is best-effort; an unconfigured store shouldn't break scanning
  }

  return res.status(200).json(result)
}
