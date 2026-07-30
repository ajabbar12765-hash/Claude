// Failover behaviour: several free tiers should add up to their sum, not
// collapse to the smallest.
//
// Run with: node src/lib/provider.test.mjs

import { PROVIDERS, runScan, resetCoolOff, COOL_OFF_MS } from './provider.js'

let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`)
}

const TRIP = { checkIn: '2026-09-10', checkOut: '2026-09-13', adults: 2, rooms: 1 }
const real = {}
const calls = []

function stub(id, behaviour) {
  calls.length = calls.length // keep reference
  PROVIDERS[id] = {
    meta: { ...real[id].meta },
    scan: async (...args) => {
      calls.push(id)
      return behaviour(...args)
    },
  }
}

function offersFrom(id) {
  return [{ hotelId: `${id}-1`, nightly: 100, source: id }]
}

for (const id of ['rapidapi', 'multi', 'amadeus', 'simulated']) real[id] = PROVIDERS[id]
const restore = () => { for (const id of Object.keys(real)) PROVIDERS[id] = real[id] }

// The chosen source works — nothing else should be touched.
{
  resetCoolOff(); calls.length = 0
  stub('rapidapi', () => offersFrom('rapidapi'))
  const r = await runScan('rapidapi', TRIP, {})
  check(
    'a working source is used alone',
    r.source === 'rapidapi' && r.error === null && calls.length === 1,
    `source ${r.source}, ${calls.length} calls`
  )
  restore()
}

// Booking is out; Amadeus still has requests. Real prices must win over
// invented ones, and the app should say which source answered.
{
  resetCoolOff(); calls.length = 0
  stub('rapidapi', () => { throw new Error("Booking.com's free tier is out of searches for now.") })
  stub('multi', () => { throw new Error('No source returned prices.') })
  stub('amadeus', () => offersFrom('amadeus'))
  const r = await runScan('rapidapi', TRIP, {})
  check(
    'an exhausted source falls through to a live one',
    r.source === 'amadeus' && /out of requests/i.test(r.error || ''),
    `source ${r.source}`
  )
  restore()
}

// The whole point: an exhausted source must not be retried at the front of
// every scan, or every scan pays for a guaranteed failure first.
{
  resetCoolOff(); calls.length = 0
  stub('rapidapi', () => { throw new Error('RapidAPI returned 429') })
  stub('multi', () => { throw new Error('no key') })
  stub('amadeus', () => offersFrom('amadeus'))

  const first = await runScan('rapidapi', TRIP, {})
  const firstRound = [...calls]
  calls.length = 0
  const second = await runScan('rapidapi', TRIP, {})

  // Only the exhausted source is sidelined. `multi` failing for want of a key
  // is not a quota problem, so it rightly stays in the queue ahead of Amadeus.
  check(
    'an exhausted source is skipped on the next scan',
    firstRound.includes('rapidapi') &&
      !calls.includes('rapidapi') &&
      first.source === 'amadeus' &&
      second.source === 'amadeus',
    `second scan tried ${calls.join(',') || 'nothing'}`
  )
  restore()
}

// ...but only for a while. After the cool-off it must be tried again, or a
// quota that resets overnight would never be noticed.
{
  resetCoolOff(); calls.length = 0
  stub('rapidapi', () => { throw new Error('429 rate limit') })
  stub('multi', () => { throw new Error('no key') })
  stub('amadeus', () => offersFrom('amadeus'))

  const t0 = 1_000_000
  await runScan('rapidapi', TRIP, {}, t0)
  calls.length = 0
  await runScan('rapidapi', TRIP, {}, t0 + COOL_OFF_MS + 1)

  check(
    'a cooled-off source is retried once the window passes',
    calls[0] === 'rapidapi',
    `tried ${calls.join(',')}`
  )
  restore()
}

// A failure that is not about quota must not sideline the source — a bad date
// range is not a reason to stop using Booking.com for fifteen minutes.
{
  resetCoolOff(); calls.length = 0
  stub('rapidapi', () => { throw new Error('Booking.com returned no hotels for these dates.') })
  stub('multi', () => { throw new Error('no key') })
  stub('amadeus', () => offersFrom('amadeus'))

  await runScan('rapidapi', TRIP, {})
  calls.length = 0
  await runScan('rapidapi', TRIP, {})

  check(
    'a non-quota failure does not sideline the source',
    calls[0] === 'rapidapi',
    `tried ${calls.join(',')}`
  )
  restore()
}

// Everything exhausted: still try one real source rather than going straight
// to invented hotels, since its cached results may still answer.
{
  resetCoolOff(); calls.length = 0
  stub('rapidapi', () => { throw new Error('429') })
  stub('multi', () => { throw new Error('429') })
  stub('amadeus', () => { throw new Error('429') })
  stub('simulated', () => offersFrom('simulated'))

  await runScan('rapidapi', TRIP, {})
  calls.length = 0
  const r = await runScan('rapidapi', TRIP, {})

  check(
    'all sources exhausted still attempts a real one',
    calls.includes('rapidapi') && r.source === 'simulated',
    `tried ${calls.join(',')}, ended on ${r.source}`
  )
  restore()
}

console.log(failed ? `\n${failed} failed` : '\nall failover cases passed')
process.exit(failed ? 1 : 0)
