// Serverless live-scan proxy (Vercel function) — the real thing "does the app
// have live tracking" asks about.
//
// This calls Apify (apify/website-content-crawler) server-side, against a
// curated list of OFFICIAL store pages (never third-party coupon-listicle
// sites — see catalog.js for why those are unreliable), pulls back page
// text, and regex-extracts code-shaped tokens near discount language. It
// runs entirely on Vercel + Apify's compute: once APIFY_TOKEN is set below,
// nobody's Claude usage is involved in any later scan — a page load just
// hits this endpoint, which hits Apify directly over HTTPS.
//
// Configure in Vercel → Settings → Environment Variables:
//   APIFY_TOKEN   your Apify API token (from apify.com → Settings → Integrations)
//
// Without it, this endpoint reports { live: false } and the app falls back
// to the static starter catalogue — nothing breaks.
//
// GET /api/codes

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h — codes don't change by the minute
const FAILURE_CACHE_TTL_MS = 15 * 60 * 1000 // retry sooner after a failed scan
const ACTOR = 'apify~website-content-crawler'
const SCAN_TIMEOUT_MS = 25_000

// Official first-party pages only — see README for why we don't scrape
// coupon-aggregator sites (Picodi, WorthEPenny, etc. are known to list
// auto-generated codes that don't actually work at checkout).
const TARGETS = [
  { store: 'Daraz', url: 'https://www.daraz.pk/vouchers-services/' },
  { store: 'Telemart', url: 'https://telemart.pk/promotions' },
  { store: 'Symbios.pk', url: 'https://symbios.pk/pages/discounts' },
]

let cache = null // { at, items } | { at, error: true }

function isFresh(entry) {
  if (!entry) return false
  const ttl = entry.error ? FAILURE_CACHE_TTL_MS : CACHE_TTL_MS
  return Date.now() - entry.at < ttl
}

// Looks for CODE-shaped tokens (4-15 uppercase letters/digits, at least one
// digit or at least 6 letters so we don't match random acronyms) within ~80
// characters of a discount cue ("% off", "Rs", "flat", "discount", "code",
// "voucher"). Heuristic, not perfect — see README.
const CODE_RE = /\b[A-Z0-9]{4,15}\b/g
const CUE_RE = /(%|off|flat|discount|voucher|coupon|code|rs\.?\s?\d)/i
const STOPWORDS = new Set([
  'DARAZ', 'PAKISTAN', 'PAY', 'BUY', 'GET', 'FREE', 'SHOP', 'NOW', 'NEW', 'SALE',
  'HELP', 'HOME', 'LOGIN', 'SIGN', 'MENU', 'MORE', 'VIEW', 'SHOW', 'HIDE',
])

function extractCandidates(text, store, sourceUrl) {
  if (!text) return []
  const found = new Map()
  const lines = text.split(/\n+/)
  for (const line of lines) {
    if (!CUE_RE.test(line)) continue
    let m
    CODE_RE.lastIndex = 0
    while ((m = CODE_RE.exec(line))) {
      const token = m[0]
      if (STOPWORDS.has(token)) continue
      if (!/[0-9]/.test(token) && token.length < 6) continue
      if (found.has(token)) continue
      found.set(token, {
        store,
        code: token,
        context: line.trim().slice(0, 160),
        source: sourceUrl,
      })
    }
  }
  return [...found.values()]
}

async function runApifyCrawl(token) {
  const params = new URLSearchParams({ token })
  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?${params}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: TARGETS.map((t) => ({ url: t.url })),
        crawlerType: 'playwright:adaptive',
        maxCrawlPages: TARGETS.length,
        maxResults: TARGETS.length,
        proxyConfiguration: { useApifyProxy: true },
        saveMarkdown: true,
      }),
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
    }
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Apify responded ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const token = process.env.APIFY_TOKEN
  if (!token) {
    return res.status(200).json({
      live: false,
      items: [],
      reason: 'APIFY_TOKEN is not set on the server — see README for setup',
    })
  }

  if (isFresh(cache) && !cache.error) {
    res.setHeader('X-Radar-Cache', 'hit')
    return res.status(200).json({ live: true, items: cache.items, scannedAt: cache.at, cached: true })
  }

  try {
    const pages = await runApifyCrawl(token)
    const items = []
    for (const page of pages || []) {
      const target = TARGETS.find((t) => page?.url?.includes(new URL(t.url).hostname))
      const store = target?.store || page?.metadata?.title || 'Unknown store'
      items.push(...extractCandidates(page.markdown || page.text || '', store, page.url))
    }
    cache = { at: Date.now(), items }
    res.setHeader('X-Radar-Cache', 'miss')
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
    return res.status(200).json({ live: true, items, scannedAt: cache.at, cached: false })
  } catch (err) {
    cache = { at: Date.now(), error: true }
    return res.status(502).json({
      live: false,
      items: [],
      error: err?.message || 'Live scan failed',
    })
  }
}
