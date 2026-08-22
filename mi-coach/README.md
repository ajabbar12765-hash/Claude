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

Then attach storage: **Vercel → Project → Storage → Create Database → Blob** (free tier). This injects `BLOB_READ_WRITE_TOKEN` automatically — no manual value needed.

## Getting your data in

Two ways, both authenticated against the same `/api/ingest` endpoint. Use either or both.

### 1. Automatic sync

**iPad / iPhone:** Mi Fitness already writes steps, heart rate, sleep, and workouts into Apple Health. Install the free **Health Auto Export** app, create an Automation of type *REST API*, set the URL to `https://<your-deployment>/api/ingest`, method `POST`, and add header `Authorization: Bearer <your INGEST_SECRET>`. Schedule it hourly or daily. Health Auto Export's native export format is auto-detected server-side — no conversion needed on your end.

**Android:** Mi Fitness doesn't reliably sync to Google Fit / Health Connect, so there's no equivalent one-tap app. The reliable option is an automation app (HTTP Shortcuts, Tasker, MacroDroid) that POSTs the generic JSON schema below to the same URL and header. Otherwise, use manual import — it's the same effort on every platform since it's just a file picked in the browser.

### 2. Manual import

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
