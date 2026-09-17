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
