// Alert engine.
//
// Decides which of the current deals are worth interrupting the user for.
// The rules exist to stop the same hotel pinging on every scan: a property
// alerts once when it first drops into budget, and again only if the price
// falls materially further or it re-enters budget after leaving it.

const RE_ALERT_DROP = 0.06 // price must fall a further 6% to alert again
const COOLDOWN_MS = 10 * 60 * 1000 // and at most once per hotel per 10 min

export const MAX_ALERTS = 200

/**
 * @param {Array} deals        current filtered deals
 * @param {object} seen        hotelId -> { price, at } from the last alert
 * @param {object} opts        { budget, basis, minStars, currency }
 * @returns {{alerts: Array, seen: object}}
 */
export function findNewAlerts(deals, seen, opts) {
  const now = Date.now()
  const nextSeen = { ...seen }
  const alerts = []

  for (const deal of deals) {
    if (!deal.withinBudget) {
      // Leaving budget resets the memory, so a later re-entry alerts again.
      if (nextSeen[deal.hotelId]) delete nextSeen[deal.hotelId]
      continue
    }

    const prev = nextSeen[deal.hotelId]
    if (prev) {
      const fellFurther = deal.price <= prev.price * (1 - RE_ALERT_DROP)
      const cooledDown = now - prev.at >= COOLDOWN_MS
      if (!fellFurther || !cooledDown) continue
    }

    nextSeen[deal.hotelId] = { price: deal.price, at: now }
    alerts.push({
      id: `${deal.hotelId}-${now}-${Math.random().toString(36).slice(2, 7)}`,
      hotelId: deal.hotelId,
      hotelName: deal.hotel.name,
      city: deal.hotel.city,
      area: deal.hotel.area,
      stars: deal.hotel.stars,
      rating: deal.hotel.rating,
      price: deal.price,
      nightly: deal.nightly,
      total: deal.total,
      nights: deal.nights,
      reference: deal.reference,
      discount: deal.discount,
      basis: opts.basis,
      budget: opts.budget,
      flash: deal.flash,
      repeat: Boolean(prev),
      distanceToLandmark: deal.distanceToLandmark,
      landmarkName: deal.landmarkName,
      at: now,
      read: false,
    })
  }

  // Best deal first, and never flood: at most 4 messages per scan.
  alerts.sort((a, b) => b.discount - a.discount)
  return { alerts: alerts.slice(0, 4), seen: nextSeen }
}

/** The text that goes into the notification and the alert list. */
export function alertText(alert, money) {
  const basis = alert.basis === 'total' ? `total · ${alert.nights} nights` : 'per night'
  const saving = alert.reference > alert.price
    ? ` — down ${Math.round(alert.discount * 100)}% from ${money(alert.reference)}`
    : ''
  const where = alert.landmarkName && alert.distanceToLandmark != null
    ? `${alert.hotel?.area ?? alert.area}, ${alert.distanceToLandmark.toFixed(1)} km from ${alert.landmarkName}`
    : `${alert.area}, ${alert.city}`

  return {
    title: `${money(alert.price)} ${basis} — ${alert.hotelName}`,
    body: `${'★'.repeat(alert.stars)} · ${where}${saving}`,
  }
}
