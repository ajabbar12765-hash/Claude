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

## Development

```bash
npm install
npm run dev      # start the dev server (bank-connection API routes need `vercel dev` instead)
npm run build    # production build to dist/
```
