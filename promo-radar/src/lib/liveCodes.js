// Talks to /api/codes — the Apify-backed live scan. When APIFY_TOKEN isn't
// configured (or in local `npm run dev`, where /api routes don't exist),
// this just fails quietly and the app runs on the starter catalogue alone.
// See api/codes.js and the README for how it works and why entries here
// have no `code` — the scanned pages turned out to publish automatic
// discounts, not typed-in codes.

function guessCategory(store) {
  if (/outfitters|khaadi|springs|sapphire|gul ahmed|levi/i.test(store)) return 'fashion'
  return 'ecommerce'
}

function toCatalogEntry(raw, scannedAtIso, index) {
  const id = `live-${raw.store}-${raw.discountType}-${raw.discountValue}-${index}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  // The scanner finds a live rate but not a reliable expiry, so entries
  // default to a conservative 3-day window — the radar auto-retires it on
  // schedule rather than let an unconfirmed find linger.
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const label = raw.discountType === 'percent' ? `${raw.discountValue}% off` : `Rs. ${raw.discountValue.toLocaleString()} off`
  return {
    id,
    store: raw.store,
    category: guessCategory(raw.store),
    country: 'Pakistan (domestic)',
    code: null, // no code — applies automatically, see terms below
    title: `${label}, live right now`,
    discountType: raw.discountType,
    discountValue: raw.discountValue,
    minSpend: null,
    maxDiscount: null,
    description: `Spotted live on ${raw.store}'s own site — this discount applies automatically, no code to enter.`,
    terms: ["Applies automatically at checkout or in-cart — there is no code to type in", 'Extracted from a live scan of the store\'s own page; confirm the current rate before buying'],
    howTo: ['Add items to cart or check out as normal — the discount is already applied'],
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
    return {
      live: true,
      items: data.items.map((raw, i) => toCatalogEntry(raw, scannedAtIso, i)),
      scannedAt: scannedAtIso,
    }
  } catch {
    return { live: false, items: [] }
  }
}
