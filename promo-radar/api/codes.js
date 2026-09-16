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
// Expanded the target list by actually fetching every store in the starter
// catalogue and checking what's really on the page right now (see README):
// Gul Ahmed ("DEFENCE DAY SALE — UP TO 50% OFF") and Bonanza Satrangi
// ("FLAT 40% OFF" / "FLAT 30% OFF" sale sections) both had real, clean,
// currently-live sitewide banners. Springs turned out to be a general
// grocery store now (not the old lawn/fashion brand the seed catalogue
// described — that fabricated entry was removed), but its own page does
// show a genuine live "Wall's FLAT 20% OFF" promo. Khaadi and Sapphire had
// no current discount of any kind. iShopping.pk was dropped after its page
// produced obviously-fake values via this same extractor (e.g. "245% OFF")
// — noise from per-product markup, not a real rate; not worth the false
// positives. Foodpanda, Metro and Imtiaz didn't render an extractable
// sitewide offer via a simple page fetch (personalized/app-only or
// JS-rendered content this crawler doesn't see).
//
// SECOND lesson learned the hard way: crawling 2 targets synchronously
// (start the Apify run, wait for it, return the result — all in one
// request) took a real, measured ~40s. Crawling all 5 of the targets above
// the same way took a real, measured ~66-81s even after tuning concurrency
// — comfortably past Vercel's Hobby-plan hard 60s function ceiling, which
// isn't a soft limit you can raise: the function gets killed mid-crawl and
// the whole scan fails, every time, for every store, not just the slow one.
// So this no longer waits for the crawl inside a request at all. A request
// either (a) serves cached results, (b) *starts* an Apify run and returns
// immediately — starting a run is near-instant, the crawl itself runs on
// Apify's infrastructure afterward — or (c) checks on a run already in
// flight, which is also near-instant. No request here ever blocks on the
// 60-80s the actual crawl takes; the client just polls back (see
// src/lib/liveCodes.js) until a run started earlier has finished.
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
const PENDING_ABANDON_MS = 5 * 60 * 1000 // if a run hasn't resolved in 5min, stop waiting on it and let the next request start a fresh one
const ACTOR = 'apify~website-content-crawler'
const APIFY_API_TIMEOUT_MS = 10_000 // starting a run / checking its status / fetching a finished dataset are all near-instant calls

// Official first-party pages only, and only ones actually verified reachable
// by running this crawler against them — see README. No third-party
// coupon-aggregator sites (Picodi, WorthEPenny, etc. — known for listing
// auto-generated codes that don't work at checkout), and no guessed URLs:
// telemart.pk/promotions (404) and symbios.pk/pages/discounts (unreachable)
// were both tried and dropped for exactly that reason.
const TARGETS = [
  { store: 'Daraz', url: 'https://www.daraz.pk/vouchers-services/' },
  { store: 'Outfitters', url: 'https://outfitters.com.pk/' },
  { store: 'Gul Ahmed', url: 'https://www.gulahmedshop.com/' },
  { store: 'Bonanza Satrangi', url: 'https://bonanzasatrangi.com/' },
  { store: 'Springs', url: 'https://www.springs.com.pk/' },
]

let cache = null // { at, items } | { at, error: true }
let pending = null // { runId, startedAt }

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

function extractAllDeals(pages) {
  const items = []
  for (const page of pages || []) {
    const target = TARGETS.find((t) => page?.url?.includes(new URL(t.url).hostname))
    const store = target?.store || page?.metadata?.title || 'Unknown store'
    items.push(...extractDeals(page.markdown || page.text || '', store, page.url))
  }
  return items
}

async function startApifyRun(token) {
  const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startUrls: TARGETS.map((t) => ({ url: t.url })),
      crawlerType: 'playwright:adaptive',
      maxCrawlPages: TARGETS.length,
      maxResults: TARGETS.length,
      proxyConfiguration: { useApifyProxy: true },
      saveMarkdown: true,
      initialConcurrency: TARGETS.length,
      dynamicContentWaitSecs: 5,
      maxScrollHeightPixels: 1500,
    }),
    signal: AbortSignal.timeout(APIFY_API_TIMEOUT_MS),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Apify run-start responded ${res.status}: ${body.slice(0, 200)}`)
  }
  const body = await res.json()
  return body.data // { id, status, defaultDatasetId, ... }
}

async function checkApifyRun(runId, token) {
  const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`, {
    signal: AbortSignal.timeout(APIFY_API_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Apify run-status responded ${res.status}`)
  const body = await res.json()
  return body.data // { status, defaultDatasetId, ... }
}

async function fetchDatasetItems(datasetId, token) {
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&format=json&clean=true`, {
    signal: AbortSignal.timeout(APIFY_API_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Apify dataset fetch responded ${res.status}`)
  return res.json()
}

function cachedPayload(extra) {
  const live = !!(cache && !cache.error)
  return { live, items: live ? cache.items : [], scannedAt: cache?.at, ...extra }
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

  if (isFresh(cache) && !cache.error && !pending) {
    res.setHeader('X-Radar-Cache', 'hit')
    return res.status(200).json(cachedPayload({ cached: true }))
  }

  try {
    if (pending) {
      if (Date.now() - pending.startedAt > PENDING_ABANDON_MS) {
        // Something's stuck (or our own status-check keeps failing) — stop
        // waiting on this run so the next request can start a fresh one
        // instead of polling a dead run forever.
        pending = null
      } else {
        const run = await checkApifyRun(pending.runId, token)
        if (run.status === 'SUCCEEDED') {
          const pages = await fetchDatasetItems(run.defaultDatasetId, token)
          cache = { at: Date.now(), items: extractAllDeals(pages) }
          pending = null
          res.setHeader('X-Radar-Cache', 'miss')
          return res.status(200).json(cachedPayload({ cached: false }))
        }
        if (run.status === 'FAILED' || run.status === 'ABORTED' || run.status === 'TIMED-OUT') {
          pending = null
          cache = { at: Date.now(), error: true }
          return res.status(200).json(cachedPayload({ scanning: false }))
        }
        // still READY/RUNNING — tell the client to check back, serving
        // whatever's cached (possibly stale, possibly nothing) meanwhile.
        return res.status(200).json(cachedPayload({ scanning: true }))
      }
    }

    // No run in flight — kick one off and return immediately. The crawl
    // itself (60-80s for 5 targets) happens on Apify's side; a later
    // request picks up the result via the branch above.
    const run = await startApifyRun(token)
    pending = { runId: run.id, startedAt: Date.now() }
    return res.status(200).json(cachedPayload({ scanning: true }))
  } catch (err) {
    pending = null
    cache = { at: Date.now(), error: true }
    return res.status(502).json({ live: false, items: [], error: err?.message || 'Live scan failed' })
  }
}
