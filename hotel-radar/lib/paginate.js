// Walks a paged hotel listing until it runs out.
//
// Lives outside api/ on purpose: Vercel turns every file under api/ into a
// serverless route, and this is a helper, not an endpoint.
//
// The problem it solves is that a fixed page count is wrong at both ends. Ask
// for four pages and a city like Dubai is capped at eighty hotels when it has
// hundreds; ask for sixteen and a small town spends twelve calls of quota
// re-reading the same twelve hotels. So the walk is adaptive.
//
// The exhaustion signal is "this page added nothing new" rather than "this
// page was empty", because these APIs pad past the last page by repeating the
// tail. It is deliberately not "this page was short" — page size is not
// contractual, and a provider that returns fifteen rows a page would look
// exhausted on page one.
//
// The walk is bounded by wall-clock time as well as page count. A serverless
// function that overruns its limit returns a gateway timeout and therefore no
// hotels at all, which is a much worse outcome than returning fewer.

/**
 * @param {object} opts
 * @param {(page: number) => Promise<Array>} opts.fetchPage  resolves to a page of rows
 * @param {(row: any) => string|number|null} opts.idOf       stable id, for de-duplication
 * @param {number} [opts.maxPages=16]      hard ceiling on pages walked
 * @param {number} [opts.firstBatch=8]     pages in the first round
 * @param {number} [opts.batch=8]          pages in every later round
 * @param {number} [opts.timeBudgetMs=7000] stop starting rounds past this
 * @param {() => number} [opts.now]        injectable clock, for tests
 * @returns {Promise<Array>} de-duplicated rows, in page order
 */
export async function walkPages({
  fetchPage,
  idOf,
  maxPages = 16,
  firstBatch = 8,
  batch = 8,
  timeBudgetMs = 7000,
  now = Date.now,
}) {
  const seen = new Set()
  const rows = []
  const startedAt = now()
  let page = 1
  let size = firstBatch
  let exhausted = false

  while (page <= maxPages && !exhausted) {
    // A page ceiling alone is not enough of a guard. The function has a hard
    // wall-clock limit, and blowing it returns a gateway timeout — no hotels
    // at all, which is far worse than fewer hotels. So rounds stop being
    // started once the budget is spent, and the walk returns what it has.
    if (page > 1 && now() - startedAt >= timeBudgetMs) break

    const count = Math.min(size, maxPages - page + 1)
    const pages = await Promise.all(
      Array.from({ length: count }, (_, i) => fetchPage(page + i))
    )

    // Each page is judged on its own. A round that added hotels overall can
    // still contain the page where the listing ended, and catching that here
    // is what keeps a small town from paying for another round.
    for (const list of pages) {
      let added = 0
      for (const row of list) {
        const id = idOf(row)
        if (id == null || id === '' || seen.has(id)) continue
        seen.add(id)
        rows.push(row)
        added++
      }
      if (added === 0) exhausted = true
    }

    page += count
    size = batch
  }

  return rows
}

/** Clamp a page budget coming from an environment variable. A typo must not
 *  silently turn the search off — NaN or 0 would skip the walk entirely and
 *  read as "no hotels found". */
export function pageBudget(raw, fallback, ceiling) {
  return Math.min(ceiling, Math.max(1, Number(raw) || fallback))
}
