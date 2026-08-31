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
- **Bank connection (optional)** — link a Revolut account via GoCardless Open
  Banking and pull in real transactions automatically. See below.
- **Settings** — switch currency (PKR, EUR, USD, GBP), export your data as
  JSON, or reset everything.

Design: a dark, glassmorphic "cinema" theme with an ambient glow that shifts
accent color per section, a Calistoga + Inter + JetBrains Mono type system,
and hand-drawn SVG icons throughout (no emoji in the interface chrome).

## Bank connection setup (Revolut)

Revolut doesn't offer individuals a direct API, so this connects through
[GoCardless Bank Account Data](https://bankaccountdata.gocardless.com/)
(formerly Nordigen), a licensed Open Banking data provider with a free tier.
Access is read-only and consent expires automatically after 90 days.

1. Create a free account at bankaccountdata.gocardless.com and generate a
   `secret_id` / `secret_key` pair (User secrets → Create new).
2. Add them as **server-side** environment variables on the Vercel project
   (Project Settings → Environment Variables) — never in client code, never
   in this repo:
   - `GOCARDLESS_SECRET_ID`
   - `GOCARDLESS_SECRET_KEY`
3. Redeploy. Open the app → Settings → Bank connection → pick your country →
   Connect Revolut. You'll be redirected to Revolut's real login to grant
   access, then back here.
4. Use "Sync transactions" any time to pull in new transactions (expenses go
   into that month's transaction list under the "Other" category so you can
   re-file them; incoming payments become income entries). Previously
   imported transactions are skipped automatically.

The `api/gocardless/*` serverless functions hold the secrets and talk to
GoCardless; the browser never sees them.

## Development

```bash
npm install
npm run dev      # start the dev server (bank-connection API routes need `vercel dev` instead)
npm run build    # production build to dist/
```
