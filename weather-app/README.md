# Weather

A small React + Vite weather app.

## Data source

Uses [Open-Meteo](https://open-meteo.com) for geocoding and forecasts — free,
no API key required, and the active provider today. All forecast fetching
lives in `src/lib/weather.js`, so swapping in a different provider later
only touches that one file.

Update (Sept 2026): Google Maps Platform's Weather API is now powered by
WeatherNext 3 directly — see the "Recommended" section below for a much
simpler path to real WeatherNext data than the Earth Engine route this repo
tried first. It still isn't reachable through a Gemini API key or by asking
the Gemini chat model for the weather on a timer: that would mean paying
for LLM inference to get back paraphrased text instead of structured data,
when the same model now powers a purpose-built REST endpoint you can call
directly on your own schedule.

## Run locally

```bash
npm install
npm run dev
```

## Recommended: WeatherNext 3 via Google Maps Platform Weather API

`api/googleweather.js` calls `weather.googleapis.com` directly — a plain
REST API authenticated with a single API key, now backed by WeatherNext 3.
No service account, no BigQuery/Earth Engine geospatial code. It is **not
wired into the app by default** (Open-Meteo stays active until a real key
is confirmed working), but the request/response plumbing has been tested
against the *live* API (with a deliberately invalid key, to confirm the
error path without spending quota) — see the comment block at the top of
that file.

To try it:

1. In Google Cloud Console -> APIs & Services, enable **Weather API** on a
   project.
2. Create an API key. For free, no-credit-card prototyping, Google offers a
   **Maps Demo Key** (see the Weather API docs) — fine for trying this out,
   not for production traffic. A real key needs Maps Platform billing (a
   card on the project) but carries a recurring free monthly credit that a
   small personal app's polling should comfortably stay under.
3. Copy `.env.example` to `.env.local` and set `GOOGLE_WEATHER_API_KEY`.
4. `vercel dev`, then
   `curl "http://localhost:3000/api/googleweather?lat=40.7&lon=-74"` — a 501
   means the key isn't set; 200 returns Google's raw JSON for current
   conditions, hourly, and daily forecasts (field names aren't remapped yet
   — the docs for the exact response schema weren't reachable from here, so
   see the real shape first, then map it into the UI).
5. `src/lib/googleweather.js` has a `fetchGoogleWeatherRaw()` helper ready
   to call from the frontend once confirmed.

## Alternative: WeatherNext via Google Earth Engine

`api/weathernext.js` is an older scaffold that queries Earth Engine's
noncommercial (free, no-credit-card) tier instead. It works but needs more
setup than the Maps Platform route above — a service account, and hand
-written geospatial grid sampling since Earth Engine returns gridded data
rather than a point forecast. Worth it only if you specifically want to
avoid ever attaching a card to a Cloud project. Setup is documented in that
file's header comment and in `.env.example`.

Known tradeoff: `@google/earthengine` pulls in `googleapis` as a dependency,
which is large and will add to that function's cold-start time and bundle
size — acceptable for a personal project, worth knowing about.
