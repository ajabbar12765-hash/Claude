import { useState } from 'react'
import { toISODate, addDays } from '../lib/format.js'

// Answers "is my token actually working?" without making the user read logs.
// It exercises the real chain — browser to the serverless proxy to the
// upstream API — and reports exactly what came back, including the upstream
// error text when something is wrong.

const SAMPLE = { location: 'Lake Como, Italy', adults: '2' }

export default function ConnectionTest({ provider }) {
  const [state, setState] = useState({ status: 'idle' })

  async function run() {
    setState({ status: 'running' })
    const checkIn = addDays(toISODate(new Date()), 30)
    const params = new URLSearchParams({
      provider,
      ...SAMPLE,
      checkIn,
      checkOut: addDays(checkIn, 3),
    })

    try {
      const res = await fetch(`/api/hotels?${params}`)

      if (res.status === 404) {
        return setState({
          status: 'error',
          title: 'Price proxy not found',
          detail:
            'The /api/hotels function is not deployed. Run this on the deployed site rather than a local dev server — Vite does not serve serverless functions.',
        })
      }

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        return setState({
          status: 'error',
          // "Upstream returned 502 / destination lookup returned 429" told the
          // truth and explained nothing. Running out of free searches is the
          // ordinary case here, so it gets said in words.
          title: /\b429\b|rate limit|quota/i.test(json.error || '')
            ? 'Out of searches for now'
            : `Could not reach Booking.com (${res.status})`,
          detail:
            json.error ||
            'No detail supplied. Check RAPIDAPI_KEY is set in Vercel and the project has been redeployed since.',
        })
      }

      const count = json.offers?.length ?? 0
      // Providers differ in which price field they fill, so count any of them
      // — otherwise a working provider reports "0 with a rate".
      const priced = (json.offers || []).filter(
        (o) => o.nightly != null || o.total != null || o.quotes?.length
      ).length

      if (!count) {
        return setState({
          status: 'warn',
          title: 'Connected, but no hotels came back',
          detail:
            'The token is reaching the API. The query returned nothing for these dates — try widening them, or check the account has hotel data access enabled.',
        })
      }

      setState({
        status: json.stale ? 'warn' : 'ok',
        title: json.stale
          ? `Showing recent prices — ${count} hotels`
          : `Live prices working — ${count} hotels, ${priced} with a rate`,
        detail:
          json.notice ||
          (json.cached
            ? `Served from the ${json.cacheMinutes ?? 240}-minute cache.`
            : 'Fetched fresh from the API.'),
      })
    } catch (err) {
      setState({
        status: 'error',
        title: 'Request failed',
        detail: err?.message || 'Could not reach the price proxy.',
      })
    }
  }

  const tone =
    state.status === 'ok' ? 'note--ok' : state.status === 'warn' ? 'note--warn' : 'note--warn'

  return (
    <div className="field">
      <button
        className="btn btn--ghost btn--wide"
        onClick={run}
        disabled={state.status === 'running'}
      >
        {state.status === 'running' ? 'Testing…' : 'Test live connection'}
      </button>

      {state.status !== 'idle' && state.status !== 'running' && (
        <p className={`note ${tone}`}>
          <span aria-hidden="true">
            {state.status === 'ok' ? '✓' : state.status === 'warn' ? '⚠' : '✕'}
          </span>
          <span>
            <strong>{state.title}</strong>
            <br />
            {state.detail}
          </span>
        </p>
      )}
    </div>
  )
}
