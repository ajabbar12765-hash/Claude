import { requireToken } from './_lib/auth.js'
import { vtLookupUrl } from './_lib/virustotal.js'
import { checkSafeBrowsing } from './_lib/safeBrowsing.js'
import { checkUrlhaus } from './_lib/urlhaus.js'
import { aggregateVerdict } from './_lib/verdict.js'
import { kv } from './_lib/kv.js'

// Repeated checks on the same link (e.g. the extension re-checking a page you
// revisit) shouldn't burn VirusTotal's 4-req/min free quota every time.
const CACHE_TTL_SECONDS = 30 * 60

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!requireToken(req, res)) return

  const { url } = req.body || {}
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'A valid http(s) url is required' })
  }

  let store = null
  try {
    store = kv()
  } catch {
    // Redis is optional for a single scan -- only history/caching need it.
  }

  const cacheKey = `clickwarden:cache:url:${url}`
  if (store) {
    const cached = await store.get(cacheKey)
    if (cached) return res.status(200).json({ ...cached, cached: true })
  }

  const [virustotal, safeBrowsing, urlhaus] = await Promise.all([
    vtLookupUrl(url).catch((e) => ({ status: 'error', detail: String(e) })),
    checkSafeBrowsing(url).catch((e) => ({ status: 'error', detail: String(e) })),
    checkUrlhaus(url).catch((e) => ({ status: 'error', detail: String(e) })),
  ])

  const result = aggregateVerdict({ virustotal, safeBrowsing, urlhaus })
  result.target = url
  if (result.sources.length === 0) {
    result.warning = 'No threat-intel API keys configured yet -- see SETUP.md'
  }

  if (store) {
    await store.set(cacheKey, result, { ex: CACHE_TTL_SECONDS })
    await store.lpush('clickwarden:history', { type: 'url', target: url, verdict: result.verdict, checkedAt: result.checkedAt })
    await store.ltrim('clickwarden:history', 0, 199)
  }

  return res.status(200).json(result)
}
