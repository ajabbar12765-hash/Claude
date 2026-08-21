// VirusTotal v3: aggregates ~70 AV engines' verdicts on a URL or file hash.
// Free public API key: 4 req/min, 500/day -- see SETUP.md.
const BASE = 'https://www.virustotal.com/api/v3'

function urlToId(url) {
  return Buffer.from(url).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function statusFromStats(stats) {
  if (!stats) return 'unknown'
  if (stats.malicious > 0) return 'malicious'
  if (stats.suspicious > 0) return 'suspicious'
  return 'clean'
}

async function submitUrlForAnalysis(url, key) {
  // Best-effort: queues the URL so a follow-up check has results. VirusTotal
  // only analyzes URLs on request, unlike files which are looked up by hash.
  try {
    await fetch(`${BASE}/urls`, {
      method: 'POST',
      headers: { 'x-apikey': key, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url }),
    })
  } catch {
    // ignore -- this is a courtesy re-check trigger, not the primary result
  }
}

export async function vtLookupUrl(url) {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) return null
  const id = urlToId(url)
  const res = await fetch(`${BASE}/urls/${id}`, { headers: { 'x-apikey': key } })

  if (res.status === 404) {
    await submitUrlForAnalysis(url, key)
    return { status: 'unknown', detail: 'Not analyzed yet -- submitted to VirusTotal, check again shortly', stats: null }
  }
  if (res.status === 429) return { status: 'error', detail: 'VirusTotal rate limit hit (free tier: 4/min)' }
  if (!res.ok) return { status: 'error', detail: `VirusTotal error ${res.status}` }

  const data = await res.json()
  const stats = data.data?.attributes?.last_analysis_stats
  return { status: statusFromStats(stats), detail: null, stats, permalink: `https://www.virustotal.com/gui/url/${id}` }
}

export async function vtLookupHash(sha256) {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) return null
  const res = await fetch(`${BASE}/files/${sha256}`, { headers: { 'x-apikey': key } })

  if (res.status === 404) return { status: 'unknown', detail: 'This file hash has never been seen by VirusTotal', stats: null }
  if (res.status === 429) return { status: 'error', detail: 'VirusTotal rate limit hit (free tier: 4/min)' }
  if (!res.ok) return { status: 'error', detail: `VirusTotal error ${res.status}` }

  const data = await res.json()
  const stats = data.data?.attributes?.last_analysis_stats
  return { status: statusFromStats(stats), detail: null, stats, permalink: `https://www.virustotal.com/gui/file/${sha256}` }
}

// Opt-in only: uploading a real file makes its contents visible to every
// VirusTotal customer, so the frontend must get explicit user consent before
// this is ever called. 32MB cap matches the free `/files` endpoint's limit.
export async function vtUploadFile(buffer, filename) {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) return null
  if (buffer.length > 32 * 1024 * 1024) {
    return { status: 'error', detail: 'File exceeds VirusTotal free-tier 32MB upload limit' }
  }
  const form = new FormData()
  form.append('file', new Blob([buffer]), filename)
  const res = await fetch(`${BASE}/files`, {
    method: 'POST',
    headers: { 'x-apikey': key },
    body: form,
  })
  if (!res.ok) return { status: 'error', detail: `VirusTotal upload error ${res.status}` }
  const data = await res.json()
  return { status: 'unknown', detail: 'Uploaded -- analysis takes ~1-2 minutes, check the hash again shortly', analysisId: data.data?.id }
}
