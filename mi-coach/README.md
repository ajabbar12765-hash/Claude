# Mi Coach

An iPad-friendly (installable, works on iPhone/Android/desktop too) dashboard for your Xiaomi Smart Band 9 / Mi Fitness data, with a Gemini-powered AI coach that reads your actual numbers and talks back.

Xiaomi doesn't publish a public Mi Fitness API, so this app doesn't try to log into your Mi account. Instead it accepts your data through a single ingestion endpoint that both automation tools and manual uploads can feed — see **Getting your data in** below.

## Stack

- Vite + React, single-page PWA (installable on iPad's home screen, offline app shell via a service worker)
- Vercel serverless functions (`api/`) for auth, ingestion, dashboard data, and the AI coach
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) as the (single-user) JSON data store — no separate database needed
- [Gemini API](https://aistudio.google.com/apikey) (free tier) for the AI coach

## One-time setup after deploy

Set these in **Vercel → Project → Settings → Environment Variables**, then redeploy:

| Variable | Required | Purpose |
|---|---|---|
| `APP_PASSWORD` | yes | The password used to sign into the app. Also used to sign session cookies. |
| `INGEST_SECRET` | yes, for automatic sync | Bearer token automation tools (Health Auto Export, Tasker, etc.) use to POST data without a browser session. Pick any long random string. |
| `GEMINI_API_KEY` | yes, for the AI coach | Free key from [Google AI Studio](https://aistudio.google.com/apikey). Without it, everything except the Coach tab and daily insight card works fine. |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash`. Override if that model is ever retired/renamed. |
| `XIAOMI_USER` | no, for Xiaomi account sync | Your Xiaomi/Mi account ID, email, or phone number — whichever you sign into Mi Fitness with. |
| `XIAOMI_PASSWORD` | no, for Xiaomi account sync | Your Xiaomi account password. Accounts with only phone+SMS or Google/Apple sign-in (no traditional password) can't use this. |
| `XIAOMI_REGION` | no | Override the auto-detected Xiaomi cloud region (`cn`, `sg`, `de`, `us`, `ru`, `i2`) if sync fails with a region-related error. |
| `CRON_SECRET` | no | If set, the daily Xiaomi sync cron endpoint requires this as a bearer token (Vercel sends it automatically for scheduled runs). Recommended once you have this set up. |
| `PASSKEY_RESET_SECRET` | no | Emergency override. If every enrolled device passkey is lost and you're locked out (see **Locking the app to your own devices**), `POST /api/auth/passkey/reset` with `Authorization: Bearer <this value>` wipes all passkeys and re-enables the password screen. Leave unset to disable this escape hatch entirely. |

Then attach storage: **Vercel → Project → Storage → Create Database → Blob** (free tier). This injects `BLOB_READ_WRITE_TOKEN` automatically — no manual value needed.

## Locking the app to your own devices

By default the app is gated by the shared `APP_PASSWORD` — anyone who has the password can sign in from any device. To restrict access to specific devices instead:

1. Sign in normally with the password.
2. Go to the **Import** tab → **"Trusted devices"** panel → name the device (e.g. "My iPhone") → **Add this device**. This creates a **passkey** (Face ID / Touch ID / fingerprint / Windows Hello, whichever your device offers) via the browser's built-in WebAuthn support — the private key never leaves the device's secure hardware.
3. The moment the first device is added, password sign-in turns off automatically. From then on, only devices with a registered passkey can sign in — the password screen won't work anymore, even if someone else knows it.
4. Repeat step 2 on each additional device (iPad, phone, laptop) while signed in — you can remove any device from the same panel later.

If you ever lose every enrolled device (or a browser update breaks a passkey) and can't sign in, set `PASSKEY_RESET_SECRET` and call:

```bash
curl -X POST https://<your-deployment>/api/auth/passkey/reset \
  -H "Authorization: Bearer <your PASSKEY_RESET_SECRET>"
```

That clears all registered devices and brings back the password screen so you can start over.

## Getting your data in

Two ways, both authenticated against the same `/api/ingest` endpoint. Use either or both.

### 1. Automatic sync

**iPad / iPhone:** Mi Fitness already writes steps, heart rate, sleep, and workouts into Apple Health. Install the free **Health Auto Export** app, create an Automation of type *REST API*, set the URL to `https://<your-deployment>/api/ingest`, method `POST`, and add header `Authorization: Bearer <your INGEST_SECRET>`. Schedule it hourly or daily. Health Auto Export's native export format is auto-detected server-side — no conversion needed on your end.

**Android:** Mi Fitness doesn't reliably sync to Google Fit / Health Connect, so there's no equivalent one-tap app. The reliable option is an automation app (HTTP Shortcuts, Tasker, MacroDroid) that POSTs the generic JSON schema below to the same URL and header. Otherwise, use manual import — it's the same effort on every platform since it's just a file picked in the browser.

### 2. Xiaomi account sync (workouts only, experimental)

If `XIAOMI_USER` and `XIAOMI_PASSWORD` are set, a Vercel Cron job runs daily (6am UTC, configurable in `vercel.json`) and pulls your **logged workouts** — runs, walks, rides: distance, calories, duration, heart rate — directly from Xiaomi's cloud. You can also trigger it immediately from the Import tab's "Sync Xiaomi workouts now" button.

This uses Xiaomi's unofficial, undocumented API (reverse-engineered from an open-source reference, not published by Xiaomi), so:
- It can break without notice if Xiaomi changes something.
- It does **not** cover passive all-day steps, resting heart rate, or sleep — no working endpoint for that was found. Use one of the other two methods for those.
- If your account requires a captcha, SMS code, or "approve this device" prompt at login (common for new devices or after a while), the sync will fail with a clear message rather than hanging — sign into Mi Fitness on your phone once to usually clear it, then retry.
- Storing your Xiaomi password in Vercel env vars is a real tradeoff worth being deliberate about, even though it's encrypted and never exposed in the dashboard after saving.

### 3. Manual import

Open the **Import** tab in the app itself, and upload either:
- a `.csv` file — download the template from the Import tab for the exact columns
- a `.json` file matching the generic schema (shown in the Import tab), or a raw Health Auto Export JSON export

Manual import authenticates with your normal logged-in session, so no secret is needed there.

### Generic ingest JSON schema

```json
{
  "records": [
    {
      "date": "2026-08-21",
      "steps": 9820,
      "distanceKm": 7.1,
      "activeCalories": 412,
      "totalCalories": 2180,
      "avgHr": 74,
      "restingHr": 58,
      "maxHr": 132,
      "minHr": 52,
      "spo2Avg": 97,
      "stressAvg": 28,
      "weightKg": 71.4,
      "bodyFatPct": 18.2,
      "sleep": { "totalMin": 430, "deepMin": 88, "remMin": 64, "lightMin": 210, "awakeMin": 12 },
      "workouts": [
        { "type": "Run", "start": "2026-08-21T07:00:00Z", "end": "2026-08-21T07:31:00Z", "calories": 260, "distanceKm": 5.0, "avgHr": 141, "maxHr": 168 }
      ]
    }
  ]
}
```

Fields are all optional except `date`; posting the same date again merges into the existing record rather than replacing it, so partial updates throughout the day are fine.

## Data & privacy notes

- This is a single-user app gated by one shared password (`APP_PASSWORD`) — there's no multi-account system.
- Health data is stored as JSON in Vercel Blob with `access: "public"`, meaning anyone with the exact (long, random, unlisted) blob URL could read it directly — it is not indexed or guessable, but it is not the same guarantee as a private database. Fine for a personal hobby project; worth knowing if your data is sensitive.
- Nothing here talks to Xiaomi/Mi Fitness servers or stores Xiaomi account credentials — all data arrives via the ingestion endpoint you control.

## Local development

```bash
npm install
npm run dev
```

API routes (`api/*.js`) only run under `vercel dev` or once deployed — plain `vite dev` serves the frontend only, so sign-in and data calls will fail against a bare `npm run dev` unless you also run `vercel dev`.
