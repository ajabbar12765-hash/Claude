// The "constantly looks for" behaviour, kept honest: there is no live scraper
// behind this (see README for why that's not a viable default), so instead
// the radar continuously watches the catalogue you actually have — yours and
// the starter one — and:
//   1. auto-retires anything past its expiry date the moment a scan notices,
//   2. flags anything expiring soon so you catch it before it goes stale,
//   3. timestamps every pass so "last scanned" is always true.
//
// Runs on a plain timer, same shape as hotel-radar's scan loop.

export const SCAN_INTERVAL_MS = 20_000
export const EXPIRING_SOON_DAYS = 3

export function scan(items, removedIds) {
  const now = Date.now()
  const soonCutoff = now + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000

  const autoExpired = []
  const expiringSoon = []

  for (const item of items) {
    if (removedIds.has(item.id)) continue
    const expiresAt = new Date(item.expiresAt).getTime()
    if (Number.isNaN(expiresAt)) continue
    if (expiresAt <= now) {
      autoExpired.push(item)
    } else if (expiresAt <= soonCutoff) {
      expiringSoon.push(item)
    }
  }

  return { at: new Date().toISOString(), autoExpired, expiringSoon }
}
