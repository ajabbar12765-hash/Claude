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
// invented hotels while another still has requests left. Configuring several
// therefore gives the app the sum of their allowances rather than the smaller
// of them. Sources without credentials fail immediately and cost nothing.
const LIVE_FALLBACKS = ['rapidapi', 'multi', 'amadeus']

// How long a source that says "out of requests" is left alone for.
export const COOL_OFF_MS = 15 * 60 * 1000

// A source that has just reported an exhausted quota will report it again a
// minute later. Retrying it at the front of every scan means every scan waits
// for a guaranteed failure before reaching a source that works, which is slow
// and pointless. So an exhausted source is skipped for a while and the next one
// becomes the effective primary.
const coolingOff = new Map() // providerId -> timestamp to resume trying

function isExhausted(message) {
  return /\b429\b|rate limit|quota|out of (free )?(searches|requests)/i.test(String(message))
}

function noteFailure(id, message, now) {
  if (isExhausted(message)) coolingOff.set(id, now + COOL_OFF_MS)
}

function isCoolingOff(id, now) {
  const until = coolingOff.get(id)
  if (until == null) return false
  if (until > now) return true
  coolingOff.delete(id)
  return false
}

/** Exposed for tests, and so switching provider in Settings gets a clean try. */
export function resetCoolOff() {
  coolingOff.clear()
}

/**
 * Run a scan. Tries the chosen provider, then any other live source that might
 * still answer, and only then the simulated engine — so the app degrades from
 * real prices to other real prices before it degrades to invented ones.
 * @returns {Promise<{offers: Array, source: string, error: string|null}>}
 */
export async function runScan(providerId, trip, config, now = Date.now()) {
  const provider = getProvider(providerId)
  const failures = []

  const order = [
    provider.meta.id,
    ...LIVE_FALLBACKS.filter((id) => id !== provider.meta.id),
  ].filter((id) => PROVIDERS[id])

  // Anything cooling off goes to the back rather than being dropped: if every
  // source is exhausted it is still better to try one and serve its cached
  // results than to skip straight to invented hotels.
  const ready = order.filter((id) => !isCoolingOff(id, now))
  const queue = ready.length ? ready : order

  for (const id of queue) {
    const source = PROVIDERS[id]
    try {
      const offers = await source.scan(trip, config)
      // A source may return real results with something worth saying about
      // them — prices served from cache because the API is out of requests,
      // for instance. That is a note on a success, not a failure.
      const swapped = id !== provider.meta.id
      return {
        offers,
        source: source.meta.id,
        error:
          offers.notice ||
          (swapped
            ? `${provider.meta.label} is out of requests, so these are live prices from ${source.meta.label} instead.`
            : null),
      }
    } catch (err) {
      const message = err?.message || `${source.meta.label} failed`
      if (id === 'simulated') throw err
      noteFailure(id, message, now)
      failures.push(message)
    }
  }

  return {
    offers: await simulated.scan(trip),
    source: 'simulated',
    error: failures[0] || 'No live source could be reached — using the built-in engine.',
  }
}
