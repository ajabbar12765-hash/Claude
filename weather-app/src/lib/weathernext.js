// Frontend client for the /api/weathernext serverless function (see
// api/weathernext.js for the backend side and setup instructions).
//
// NOT wired into App.jsx by default — Open-Meteo (lib/weather.js) remains
// the active data source until you've confirmed this endpoint actually
// returns real WeatherNext data for your Earth Engine setup. Call
// fetchWeatherNextRaw() directly (e.g. from a browser console or a temporary
// debug button) to see the raw band values first, then decide how to map
// them into the app's UI.

export async function fetchWeatherNextRaw({ latitude, longitude }) {
  const url = new URL('/api/weathernext', window.location.origin)
  url.searchParams.set('lat', latitude)
  url.searchParams.set('lon', longitude)

  const res = await fetch(url)
  const body = await res.json()

  if (!res.ok) {
    const err = new Error(body.error || `WeatherNext request failed (${res.status})`)
    err.status = res.status
    err.setup = body.setup
    err.detail = body.detail
    throw err
  }

  return body
}
