# Budget

A local-first monthly budgeting app. No sign-up, no server required for
day-to-day use — everything is stored in your browser's `localStorage`.

## Features

- **Dashboard** — income, spending, remaining balance, animated stat cards
  with month-over-month deltas, and a 6-month income vs. expense trend chart.
- **Transactions** — log and edit expenses per category, per month.
- **Budgets & Income** — set monthly income sources and a spending budget per
  category (with progress bars and over-budget warnings).
- **Recurring bills** — rent, subscriptions, or a paycheck that repeats every
  month; mark each one paid/received per month with one click.
- **Savings goals** — set a target and log contributions toward it.
- **Import from Revolut (CSV)** — export a statement from the Revolut app and
  upload it to add all those transactions at once. See below.
- **Bank connection (optional, Open Banking)** — live sync via GoCardless,
  for if/when you get access. See below.
- **Settings** — switch currency (PKR, EUR, USD, GBP), export your data as
  JSON, or reset everything.

Design: a dark, glassmorphic "cinema" theme with an ambient glow that shifts
accent color per section, a Calistoga + Inter + JetBrains Mono type system,
and hand-drawn SVG icons throughout (no emoji in the interface chrome).

## Importing transactions from Revolut (CSV)

The straightforward way to get your Revolut transactions in, and the one
that works with zero setup:

1. In the Revolut app: open the account → the **⋯** menu → **Statement** →
   pick a date range → export as **CSV**.
2. In the budgeting app: **Transactions → Import from Revolut** (or
   **Settings → Import from Revolut**), choose the file, review the preview,
   click Import.
3. Expenses land in that month's transaction list under the "Other" category
   so you can re-file them; incoming payments become income entries.
   Re-importing a file (e.g. an overlapping date range) skips transactions
   already imported, matched by date + description + amount — so it's safe
   to just export "everything" each time rather than tracking exact ranges.

## Bank connection setup (Open Banking, optional)

Live sync — no manual export needed — via
[GoCardless Bank Account Data](https://bankaccountdata.gocardless.com/)
(formerly Nordigen), since Revolut doesn't offer individuals a direct API.
**Note:** GoCardless has closed self-serve signups for new developers as of
this writing, so this path may require applying for access rather than
signing up instantly — the CSV import above is the reliable option today.
Access is read-only and consent expires automatically after 90 days.

1. Get a `secret_id` / `secret_key` pair from GoCardless (User secrets →
   Create new, once you have access).
2. Add them as **server-side** environment variables on the Vercel project
   (Project Settings → Environment Variables) — never in client code, never
   in this repo:
   - `GOCARDLESS_SECRET_ID`
   - `GOCARDLESS_SECRET_KEY`
3. Redeploy. Open the app → Settings → Bank connection → pick your country →
   Connect Revolut. You'll be redirected to Revolut's real login to grant
   access, then back here.
4. Use "Sync transactions" any time to pull in new transactions, deduped the
   same way as CSV import.

The `api/gocardless/*` serverless functions hold the secrets and talk to
GoCardless; the browser never sees them.

## Background auto-sync (optional, needs the bank connection above)

Once connected, new transactions can appear without manually clicking
"Sync" — a scheduled job checks GoCardless in the background and the app
picks up whatever it found next time you open it (or bring the tab back
into focus).

This needs its own storage, since a background job has no browser to read
`localStorage` from:

1. Vercel dashboard → the project → **Storage** tab → add a Redis database
   (Marketplace Database Integrations → **Upstash for Redis**, or similar).
   This auto-injects the `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or
   `UPSTASH_REDIS_REST_*`) environment variables `api/_lib/kv.js` reads —
   nothing to configure by hand.
2. That's it for setup — `vercel.json` already defines the cron schedule
   (`/api/cron/sync`, daily at 07:00 UTC) and the app already calls the
   sync endpoints once a bank connection is linked.

**Two real limits, not a bug if you hit them:**
- **Vercel's Hobby (free) plan only allows cron jobs to run once a day** —
  it's a hard limit, not a soft throttle: a more frequent schedule in
  `vercel.json` fails the deployment outright with `cron_jobs_limits_reached`.
  Upgrading to Pro allows more frequent schedules (e.g. hourly), which you'd
  set by editing the `schedule` in `vercel.json`.
- It's "checked automatically, shown next time you open the app" — not a
  live push the instant you tap your card. Nothing (free or not) does true
  per-transaction real-time for a personal project like this.

Without a Redis database attached, this silently no-ops — the cron
endpoint returns a clear "no Redis attached" error and nothing breaks;
manual "Sync now" and CSV import keep working exactly as before.

## Development

```bash
npm install
npm run dev      # start the dev server (bank-connection API routes need `vercel dev` instead)
npm run build    # production build to dist/
```
