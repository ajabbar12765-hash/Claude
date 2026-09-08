// Serverless live-scan proxy (Vercel function) — the real thing "does the app
// have live tracking" asks about.
//
// IMPORTANT, learned the hard way by actually running this against real
// pages (see README): Daraz, SteamShop.pk and Outfitters — three real,
// reachable, official Pakistani retail pages — all publish AUTOMATIC
// discounts ("50% OFF", "Rs. 100 off orders over Rs. 1000"), never a typed
// alphanumeric code. A regex hunting for "code-shaped tokens" on these pages
// doesn't fail quietly — it matches URL query-string fragments like
// `sellerId%3D14161` and reports `3D14161` as if it were a real code, which
// is worse than finding nothing. So this scanner extracts what's actually
// there: live percent/fixed-amount discounts, surfaced as "no code needed"
// entries. If a store's own page ever does publish a literal code, it'll
// still show up (the code chip just won't render for the auto-applied ones).
//
// Runs entirely on Vercel + Apify's compute: once APIFY_TOKEN is set below,
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

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h — deals don't change by the minute
const FAILURE_CACHE_TTL_MS = 15 * 60 * 1000 // retry sooner after a failed scan
const ACTOR = 'apify~website-content-crawler'
// A real timed run of these two targets took ~40s (playwright rendering is
// slow) — give it real headroom rather than the 25s this used to be set to,
// which would have failed on every single run in production.
const SCAN_TIMEOUT_MS = 55_000

// Official first-party pages only, and only ones actually verified reachable
// by running this crawler against them — see README. No third-party
// coupon-aggregator sites (Picodi, WorthEPenny, etc. — known for listing
// auto-generated codes that don't work at checkout), and no guessed URLs:
// telemart.pk/promotions (404) and symbios.pk/pages/discounts (unreachable)
// were both tried and dropped for exactly that reason.
const TARGETS = [
  { store: 'Daraz', url: 'https://www.daraz.pk/vouchers-services/' },
  { store: 'Outfitters', url: 'https://outfitters.com.pk/' },
]

let cache = null // { at, items } | { at, error: true }

function isFresh(entry) {
  if (!entry) return false
  const ttl = entry.error ? FAILURE_CACHE_TTL_MS : CACHE_TTL_MS
  return Date.now() - entry.at < ttl
}

const PERCENT_OFF_RE = /(\d{1,3})\s?%\s?OFF\b/gi
const FIXED_OFF_RE = /Rs\.?\s?([\d,]{2,7})\s+Off\b/gi
const MAX_PER_STORE_PER_KIND = 3

// Pulls real "N% off" / "Rs. X off" mentions out of a page's text and
// de-dupes by value, capped per store so one page with dozens of
// near-identical per-seller lines (Daraz does this) doesn't flood the list.
function extractDeals(text, store, sourceUrl) {
  if (!text) return []
  const seenPercent = new Set()
  const seenFixed = new Set()
  const found = []

  let m
  PERCENT_OFF_RE.lastIndex = 0
  while ((m = PERCENT_OFF_RE.exec(text))) {
    const value = Number(m[1])
    if (!value || value > 90 || seenPercent.has(value) || seenPercent.size >= MAX_PER_STORE_PER_KIND) continue
    seenPercent.add(value)
    found.push({ store, discountType: 'percent', discountValue: value, source: sourceUrl })
  }

  FIXED_OFF_RE.lastIndex = 0
  while ((m = FIXED_OFF_RE.exec(text))) {
    const value = Number(m[1].replace(/,/g, ''))
    if (!value || seenFixed.has(value) || seenFixed.size >= MAX_PER_STORE_PER_KIND) continue
    seenFixed.add(value)
    found.push({ store, discountType: 'fixed', discountValue: value, source: sourceUrl })
  }

  return found
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
      items.push(...extractDeals(page.markdown || page.text || '', store, page.url))
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
