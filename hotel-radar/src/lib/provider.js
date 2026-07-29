// Provider registry.
//
// A provider is anything that can answer `scan(trip, config)` with an array of
// offers shaped like:
//   { hotelId, nightly, reference, total, nights, discount, flash,
//     roomsLeft, seenAt, source }
//
// Swapping providers is the only change needed to move from the built-in
// engine to live inventory; the filters, alerts and UI stay put.

import * as simulated from './providers/simulated.js'
import * as amadeus from './providers/amadeus.js'

export const PROVIDERS = { simulated, amadeus }

export const PROVIDER_LIST = Object.values(PROVIDERS).map((p) => p.meta)

export function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS.simulated
}

/**
 * Run a scan, falling back to the simulated engine if a live provider fails
 * so the app keeps working rather than going blank.
 * @returns {Promise<{offers: Array, source: string, error: string|null}>}
 */
export async function runScan(providerId, trip, config) {
  const provider = getProvider(providerId)
  try {
    const offers = await provider.scan(trip, config)
    return { offers, source: provider.meta.id, error: null }
  } catch (err) {
    if (provider.meta.id === 'simulated') throw err
    return {
      offers: await simulated.scan(trip),
      source: 'simulated',
      error: err?.message || 'Live provider unavailable — using the built-in engine.',
    }
  }
}
