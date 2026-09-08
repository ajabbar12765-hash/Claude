// Talks to /api/codes — the Apify-backed live scan. When APIFY_TOKEN isn't
// configured (or in local `npm run dev`, where /api routes don't exist),
// this just fails quietly and the app runs on the starter catalogue alone.
// See api/codes.js and the README for how to turn the live scan on.

function guessCategory(store) {
  return 'ecommerce'
}

function toCatalogEntry(raw, scannedAtIso) {
  const id = `live-${raw.store}-${raw.code}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  // The scanner finds a code but not a reliable expiry, so entries default to
  // a conservative 7-day window — the radar will auto-retire it on schedule
  // rather than let an unconfirmed find linger indefinitely.
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return {
    id,
    store: raw.store,
    category: guessCategory(raw.store),
    country: 'Pakistan (domestic)',
    code: raw.code,
    title: raw.context ? raw.context.slice(0, 80) : `Code found on ${raw.store}'s official page`,
    discountType: 'unknown',
    discountValue: null,
    minSpend: null,
    maxDiscount: null,
    description: raw.context || '',
    terms: ["Extracted automatically from the store's own page — always confirm at checkout"],
    howTo: ['Apply at checkout'],
    url: raw.source,
    addedAt: scannedAtIso ? scannedAtIso.slice(0, 10) : new Date().toISOString().slice(0, 10),
    expiresAt,
    sample: false,
    source: 'Live scan (Apify)',
  }
}

export async function fetchLiveCodes() {
  try {
    const res = await fetch('/api/codes')
    if (!res.ok) return { live: false, items: [] }
    const data = await res.json()
    if (!data.live || !Array.isArray(data.items)) return { live: false, items: [], reason: data.reason }
    const scannedAtIso = data.scannedAt ? new Date(data.scannedAt).toISOString() : null
    return { live: true, items: data.items.map((raw) => toCatalogEntry(raw, scannedAtIso)), scannedAt: scannedAtIso }
  } catch {
    return { live: false, items: [] }
  }
}
