// Simulated deal engine.
//
// Holds a live nightly rate per hotel and nudges it on every scan: a small
// random walk, a seasonality curve driven by the check-in date, a weekend
// premium, and an occasional flash drop standing in for a last-minute release.
// Rates are indicative, not quoted — the card always links out to the real
// booking page for the true price.

import { HOTELS } from '../catalog.js'
import { nightsBetween } from '../format.js'

const state = new Map() // hotelId -> { price, floor, ceiling, trend, lastDrop }

function seasonality(checkIn, hotel) {
  if (!checkIn) return 1
  const d = new Date(`${checkIn}T12:00:00`)
  const month = d.getMonth() // 0-11
  // Northern-hemisphere leisure curve; beach/lake destinations swing harder.
  const base = [0.78, 0.78, 0.86, 0.95, 1.05, 1.18, 1.28, 1.3, 1.12, 0.98, 0.8, 0.92][month]
  const swing = hotel.amenities.includes('beach') || hotel.amenities.includes('lakeview') || hotel.amenities.includes('seaview') ? 1.25 : 1
  return 1 + (base - 1) * swing
}

function weekendPremium(checkIn) {
  if (!checkIn) return 1
  const day = new Date(`${checkIn}T12:00:00`).getDay()
  return day === 5 || day === 6 ? 1.14 : day === 0 ? 1.05 : 1
}

function leadTimeFactor(checkIn) {
  if (!checkIn) return 1
  const days = Math.round((new Date(`${checkIn}T12:00:00`) - Date.now()) / 86400000)
  if (days <= 3) return 0.88 // last-minute clearance
  if (days <= 10) return 0.97
  if (days <= 45) return 1
  if (days <= 120) return 1.04
  return 1.08
}

function lengthDiscount(nights) {
  if (nights >= 7) return 0.9
  if (nights >= 4) return 0.95
  return 1
}

function init(hotel) {
  const jitter = 0.9 + Math.random() * 0.2
  const price = hotel.base * jitter
  return {
    price,
    floor: hotel.base * 0.52,
    ceiling: hotel.base * 1.45,
    trend: (Math.random() - 0.5) * 0.01,
    lastDrop: 0,
  }
}

function step(hotel, s) {
  // Slow-moving trend plus per-tick noise.
  s.trend = s.trend * 0.85 + (Math.random() - 0.5) * 0.012
  let next = s.price * (1 + s.trend + (Math.random() - 0.5) * 0.03)

  // Flash drop: rare, sharp, and it decays back over subsequent ticks.
  if (Math.random() < 0.02) {
    next *= 0.72 + Math.random() * 0.12
    s.lastDrop = Date.now()
  }

  // Mean-revert towards the base rate so prices never run away.
  next += (hotel.base - next) * 0.05
  s.price = Math.min(s.ceiling, Math.max(s.floor, next))
  return s.price
}

/**
 * Run one scan pass.
 * @param {object} trip { checkIn, checkOut, adults, rooms }
 * @returns {Array} offers
 */
export function scan(trip) {
  const nights = nightsBetween(trip?.checkIn, trip?.checkOut)
  const now = Date.now()

  return HOTELS.map((hotel) => {
    let s = state.get(hotel.id)
    if (!s) {
      s = init(hotel)
      state.set(hotel.id, s)
    }
    const live = step(hotel, s)

    const multiplier =
      seasonality(trip?.checkIn, hotel) *
      weekendPremium(trip?.checkIn) *
      leadTimeFactor(trip?.checkIn) *
      lengthDiscount(nights)

    const nightly = Math.round(live * multiplier)
    // "Was" price: what the same room trends at without the current dip.
    const reference = Math.round(hotel.base * multiplier)
    const discount = reference > 0 ? Math.max(0, 1 - nightly / reference) : 0

    return {
      hotelId: hotel.id,
      nightly,
      reference,
      total: nightly * nights,
      nights,
      discount,
      flash: now - s.lastDrop < 90_000 && discount > 0.15,
      roomsLeft: nightly < hotel.base * 0.8 ? 1 + Math.floor(Math.random() * 3) : null,
      seenAt: now,
      source: 'simulated',
    }
  })
}

export const meta = {
  id: 'simulated',
  label: 'Simulated engine',
  needsKey: false,
  description:
    'Built-in engine over a real hotel catalog. Prices are indicative and move on every scan; booking links go to live inventory.',
}
