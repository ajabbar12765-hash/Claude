// Exercises the real walkPages against a fake upstream that behaves like
// Booking's: twenty rows a page, and once the listing runs out it repeats the
// tail rather than returning nothing.
//
// Run with: node lib/paginate.test.mjs

import { walkPages, pageBudget } from './paginate.js'

function makeUpstream(totalHotels, perPage = 20) {
  let calls = 0
  return {
    get calls() { return calls },
    async fetchPage(pageNumber) {
      calls++
      const start = (pageNumber - 1) * perPage
      if (start >= totalHotels) {
        const tail = Math.max(0, totalHotels - perPage)
        return Array.from(
          { length: Math.min(perPage, totalHotels) },
          (_, i) => ({ hotel_id: tail + i })
        )
      }
      return Array.from(
        { length: Math.min(perPage, totalHotels - start) },
        (_, i) => ({ hotel_id: start + i })
      )
    },
  }
}

const idOf = (row) => row?.hotel_id

const cases = [
  // Small places must not spend a second round on repeats.
  { name: 'tiny town (12 hotels)', total: 12, expect: 12, calls: 4 },
  { name: 'small city (60)', total: 60, expect: 60, calls: 4 },
  { name: 'exactly one page (20)', total: 20, expect: 20, calls: 4 },
  // Large places must not be capped at one page's worth.
  { name: 'mid city (160)', total: 160, expect: 160, calls: 12 },
  { name: 'big city (400) hits the ceiling', total: 400, expect: 320, calls: 16 },
  // Degenerate upstreams.
  { name: 'no hotels at all', total: 0, expect: 0, calls: 4 },
  // Page size is not contractual — a 15-row page must not read as "exhausted".
  { name: 'short pages (15/page, 150 total)', total: 150, expect: 150, calls: 12, perPage: 15 },
]

let failed = 0

for (const c of cases) {
  const up = makeUpstream(c.total, c.perPage)
  const rows = await walkPages({ fetchPage: up.fetchPage, idOf })
  const unique = new Set(rows.map(idOf)).size

  const ok = rows.length === c.expect && unique === rows.length && up.calls === c.calls
  if (!ok) failed++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${c.name}: ${rows.length} rows (want ${c.expect}), ` +
    `${unique} unique, ${up.calls} calls (want ${c.calls})`
  )
}

// A bad environment variable must never disable the search.
const budgets = [
  [undefined, 16], ['', 16], ['nonsense', 16], ['0', 16],
  ['-5', 1], ['4', 4], ['999', 40],
]
for (const [raw, want] of budgets) {
  const got = pageBudget(raw, 16, 40)
  const ok = got === want
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  pageBudget(${JSON.stringify(raw)}) = ${got} (want ${want})`)
}

console.log(failed ? `\n${failed} failed` : '\nall pagination cases passed')
process.exit(failed ? 1 : 0)
