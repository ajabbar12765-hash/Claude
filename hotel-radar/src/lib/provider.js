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
import * as travelpayouts from './providers/travelpayouts.js'
import * as multi from './providers/multi.js'
import * as rapidapi from './providers/rapidapi.js'
import * as amadeus from './providers/amadeus.js'

export const PROVIDERS = { simulated, multi, rapidapi, travelpayouts, amadeus }

export const PROVIDER_LIST = Object.values(PROVIDERS).map((p) => p.meta)

export function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS.simulated
}

// Live sources to try, in order, when the chosen one cannot answer. Every free
// tier runs out eventually, and one running out is not a reason to show
// invented hotels while another still has requests left. Sources without
// credentials fail immediately and cost nothing to skip.
const LIVE_FALLBACKS = ['rapidapi', 'multi', 'amadeus']

/**
 * Run a scan. Tries the chosen provider, then any other live source that might
 * still answer, and only then the simulated engine — so the app degrades from
 * real prices to other real prices before it degrades to invented ones.
 * @returns {Promise<{offers: Array, source: string, error: string|null}>}
 */
export async function runScan(providerId, trip, config) {
  const provider = getProvider(providerId)
  const failures = []

  try {
    const offers = await provider.scan(trip, config)
    // A provider may return real results with something worth saying about
    // them — prices served from cache because the API is out of searches, for
    // instance. That is a note on a success, not a failure.
    return { offers, source: provider.meta.id, error: offers.notice || null }
  } catch (err) {
    if (provider.meta.id === 'simulated') throw err
    failures.push(err?.message || `${provider.meta.label} failed`)
  }

  for (const id of LIVE_FALLBACKS) {
    if (id === provider.meta.id) continue
    const alternate = PROVIDERS[id]
    if (!alternate) continue
    try {
      const offers = await alternate.scan(trip, config)
      return {
        offers,
        source: alternate.meta.id,
        error:
          offers.notice ||
          `${provider.meta.label} is unavailable right now, so these are live prices from ${alternate.meta.label} instead.`,
      }
    } catch (err) {
      failures.push(err?.message || `${alternate.meta.label} failed`)
    }
  }

  return {
    offers: await simulated.scan(trip),
    source: 'simulated',
    error: failures[0] || 'No live source could be reached — using the built-in engine.',
  }
}
