// Money, dates and small display helpers.

// Base currency for the catalog is EUR. These are display conversions at a
// fixed reference rate, not a live FX feed — the booking site charges in its
// own currency and its number is the one that counts.
export const CURRENCIES = {
  EUR: { symbol: '€', rate: 1, locale: 'de-DE', name: 'Euro' },
  USD: { symbol: '$', rate: 1.08, locale: 'en-US', name: 'US Dollar' },
  PKR: { symbol: '₨ ', rate: 302, locale: 'en-PK', name: 'Pakistani Rupee' },
  AED: { symbol: 'AED ', rate: 3.97, locale: 'en-AE', name: 'UAE Dirham' },
  GBP: { symbol: '£', rate: 0.85, locale: 'en-GB', name: 'Pound Sterling' },
  CHF: { symbol: 'CHF ', rate: 0.94, locale: 'de-CH', name: 'Swiss Franc' },
}

export function convert(eur, currency) {
  return eur * (CURRENCIES[currency]?.rate ?? 1)
}

/**
 * Format a EUR amount for display.
 *
 * High-magnitude currencies such as PKR turn a nightly rate into six or seven
 * digits, which overflows the price and budget readouts. Anything at or above
 * 10,000 units is shown compactly (₨76K) unless `exact` is asked for.
 */
export function money(eur, currency = 'EUR', { decimals = 0, exact = false } = {}) {
  const c = CURRENCIES[currency] ?? CURRENCIES.EUR
  const value = convert(eur, currency)

  if (!exact && Math.abs(value) >= 10000) {
    return (
      c.symbol +
      value.toLocaleString(c.locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
      })
    )
  }

  return (
    c.symbol +
    value.toLocaleString(c.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )
}

export function toISODate(d) {
  const dt = d instanceof Date ? d : new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1
  const ms = new Date(`${checkOut}T12:00:00`) - new Date(`${checkIn}T12:00:00`)
  return Math.max(1, Math.round(ms / 86400000))
}

export function prettyDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export function timeAgo(ts) {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function ratingWord(r) {
  if (r >= 9.3) return 'Exceptional'
  if (r >= 9) return 'Superb'
  if (r >= 8.5) return 'Excellent'
  if (r >= 8) return 'Very good'
  if (r >= 7) return 'Good'
  return 'Pleasant'
}

/** Stable 0..1 hash used to pick deterministic card artwork per hotel. */
export function hashUnit(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}
