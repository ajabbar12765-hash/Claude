// Run with: node lib/ratelimit.test.mjs

import { createRateLimiter, fetchWithBackoff } from './ratelimit.js'

let failed = 0
const check = (name, ok, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`)
}

// A fake clock, so the tests do not actually wait.
function fakeTime() {
  let t = 0
  return {
    now: () => t,
    sleep: async (ms) => { t += ms },
    advance: (ms) => { t += ms },
    get value() { return t },
  }
}

// Eight requests fired at once — the exact shape of a walk round — must leave
// the limiter spaced, not simultaneous. This is the 429 that a barely-used
// account was getting.
//
// The assertion is on the delay each caller was told to wait, with the clock
// frozen. Advancing a shared clock inside sleep cannot express concurrent
// waiters: they would all observe whichever time the last one left behind.
{
  const delays = []
  const schedule = createRateLimiter({
    minIntervalMs: 300,
    now: () => 0,
    sleep: async (ms) => { delays.push(ms) },
  })
  await Promise.all(Array.from({ length: 8 }, () => schedule(async () => {})))
  // First goes immediately (no sleep recorded), the rest step by 300ms.
  const expected = [300, 600, 900, 1200, 1500, 1800, 2100]
  check(
    'eight concurrent calls are spaced by the interval',
    delays.length === 7 && delays.every((d, i) => d === expected[i]),
    `delays ${delays.join(',')}`
  )
}

// Two callers must never reserve the same slot. If the slot were claimed after
// an await rather than before, both would read the same nextSlot and fire
// together — which is the whole bug.
{
  const clock = fakeTime()
  const schedule = createRateLimiter({ minIntervalMs: 500, now: clock.now, sleep: clock.sleep })
  const starts = []
  await Promise.all([
    schedule(async () => { starts.push(clock.now()) }),
    schedule(async () => { starts.push(clock.now()) }),
  ])
  check(
    'two simultaneous callers get distinct slots',
    new Set(starts).size === 2,
    `starts ${starts.join(',')}`
  )
}

// A request arriving long after the last one must not be delayed at all.
{
  const clock = fakeTime()
  const schedule = createRateLimiter({ minIntervalMs: 300, now: clock.now, sleep: clock.sleep })
  await schedule(async () => {})
  clock.advance(10_000)
  const before = clock.now()
  await schedule(async () => {})
  check('an idle limiter adds no delay', clock.now() === before, `waited ${clock.now() - before}ms`)
}

// A 429 is a request to wait, not a failure to report.
{
  const clock = fakeTime()
  let calls = 0
  const res = await fetchWithBackoff(
    async () => {
      calls++
      return calls === 1
        ? { status: 429, ok: false, headers: { get: () => null } }
        : { status: 200, ok: true, headers: { get: () => null } }
    },
    { sleep: clock.sleep }
  )
  check('a 429 is retried once and succeeds', res?.status === 200 && calls === 2, `${calls} calls`)
}

// The server's own Retry-After wins over the default, capped so a hostile or
// mistaken value cannot stall the whole function.
{
  const clock = fakeTime()
  await fetchWithBackoff(
    async () => ({ status: 429, ok: false, headers: { get: (h) => (h === 'retry-after' ? '2' : null) } }),
    { sleep: clock.sleep }
  )
  check('Retry-After is honoured', clock.value === 2000, `waited ${clock.value}ms`)

  const clock2 = fakeTime()
  await fetchWithBackoff(
    async () => ({ status: 429, ok: false, headers: { get: () => '9999' } }),
    { sleep: clock2.sleep }
  )
  check('an absurd Retry-After is capped at 5s', clock2.value === 5000, `waited ${clock2.value}ms`)
}

// A non-429 response is returned untouched, without a second call.
{
  let calls = 0
  const res = await fetchWithBackoff(async () => {
    calls++
    return { status: 200, ok: true, headers: { get: () => null } }
  })
  check('a success is not retried', res?.status === 200 && calls === 1, `${calls} calls`)
}

// A thrown fetch resolves to null rather than exploding the walk.
{
  const res = await fetchWithBackoff(async () => { throw new Error('network down') })
  check('a thrown fetch becomes null', res === null)
}

console.log(failed ? `\n${failed} failed` : '\nall rate limit cases passed')
process.exit(failed ? 1 : 0)
