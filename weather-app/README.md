# Weather

A small React + Vite weather app.

## Data source

Uses [Open-Meteo](https://open-meteo.com) for geocoding and forecasts — free,
no API key required. Google's WeatherNext model isn't reachable through a
Gemini API key: it's distributed via Google Cloud (BigQuery public datasets /
Earth Engine / Vertex AI), a different surface from the Gemini Developer API.
All forecast fetching lives in `src/lib/weather.js`, so swapping in a
different provider later only touches that one file.

## Run locally

```bash
npm install
npm run dev
```

## Optional: WeatherNext via Google Earth Engine

`api/weathernext.js` is a serverless function scaffold that queries Google
Earth Engine (the only realistic **free, no-credit-card** path to WeatherNext
data — see the comment block at the top of that file for the full reasoning
and setup checklist). It is **not wired into the app by default**: it needs
real credentials only you can obtain, and its dataset id has to be confirmed
against the live Earth Engine catalog rather than guessed.

To try it:

1. Register a free "Unpaid usage" project at
   https://code.earthengine.google.com/register — no card required.
2. Create a service account in that project and download its JSON key.
3. Copy `.env.example` to `.env.local` and fill in `EE_PROJECT_ID`,
   `EE_SERVICE_ACCOUNT` (the full key JSON), and `EE_ASSET_ID` (confirmed
   from the live catalog, not guessed).
4. `vercel dev`, then `curl "http://localhost:3000/api/weathernext?lat=40.7&lon=-74"`
   — a 501 response means a setup step above is still missing; 200 returns
   the raw Earth Engine band values for that point so you can see the real
   band names before wiring them into the UI.
5. Once confirmed, `src/lib/weathernext.js` has a `fetchWeatherNextRaw()`
   helper ready to call from the frontend.

Known tradeoff: `@google/earthengine` pulls in `googleapis` as a dependency,
which is large and will add to the function's cold-start time and bundle
size — acceptable for a personal project, worth knowing about.
