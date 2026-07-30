// Request pacing for APIs that cap how fast you may call them.
//
// The deep walk fetches pages concurrently, which is what makes it fast enough
// to fit inside a serverless function. But "concurrently" to a free API plan
// looks like a burst, and those plans cap requests per second rather than only
// per month. The symptom is a 429 on an account that has barely been used —
// ten calls in a month, and still refused.
//
// So starts are spaced. Each caller reserves the next free slot the moment it
// asks, before awaiting anything, which keeps the ordering deterministic and
// stops two callers claiming the same slot. Requests still overlap — a slot
// governs when a request may *start*, not how long it may run — so the walk
// stays concurrent and simply stops arriving all at once.

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param {object} [opts]
 * @param {number} [opts.minIntervalMs=250] minimum gap between request starts
 * @param {() => number} [opts.now]         injectable clock, for tests
 * @param {(ms: number) => Promise<void>} [opts.sleep] injectable delay, for tests
 * @returns {(fn: () => Promise<any>) => Promise<any>}
 */
export function createRateLimiter({
  minIntervalMs = 250,
  now = Date.now,
  sleep = defaultSleep,
} = {}) {
  let nextSlot = 0

  return async function schedule(fn) {
    const t = now()
    const start = Math.max(t, nextSlot)
    // Reserved synchronously — an await here would let a second caller read
    // the same nextSlot and both would fire together, which is the bug this
    // whole module exists to prevent.
    nextSlot = start + minIntervalMs
    const wait = start - t
    if (wait > 0) await sleep(wait)
    return fn()
  }
}

/**
 * Fetch with one retry when the upstream says "too fast".
 *
 * A 429 is not a failure to report, it is a request to wait — so it is waited
 * out once rather than surfaced. Retrying more than once is pointless here:
 * the walk has a time budget, and a second refusal means the pacing is wrong
 * and needs fixing rather than papering over.
 *
 * @param {() => Promise<Response>} doFetch
 * @param {object} [opts]
 * @param {number} [opts.retryAfterMs=1200]
 * @param {(ms: number) => Promise<void>} [opts.sleep]
 */
export async function fetchWithBackoff(doFetch, { retryAfterMs = 1200, sleep = defaultSleep } = {}) {
  const first = await doFetch().catch(() => null)
  if (first?.status !== 429) return first

  // Honour the server's own figure when it gives one; it knows better.
  const header = Number(first.headers?.get?.('retry-after'))
  const waitMs = Number.isFinite(header) && header > 0
    ? Math.min(header * 1000, 5000)
    : retryAfterMs

  await sleep(waitMs)
  return doFetch().catch(() => null)
}
