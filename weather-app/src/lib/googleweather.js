// Frontend client for /api/googleweather (see that file for setup and for
// why the request goes through a backend rather than the browser).
//
// NOT wired into App.jsx by default — Open-Meteo (lib/weather.js) stays the
// active provider until a real GOOGLE_WEATHER_API_KEY is confirmed working.
// Call fetchGoogleWeatherRaw() to see the real response shape first (the
// backend passes Google's JSON through unmodified), then decide how to map
// it into the UI.

export async function fetchGoogleWeatherRaw({ latitude, longitude, hours = 24, days = 7, units = 'METRIC' }) {
  const url = new URL('/api/googleweather', window.location.origin)
  url.searchParams.set('lat', latitude)
  url.searchParams.set('lon', longitude)
  url.searchParams.set('hours', hours)
  url.searchParams.set('days', days)
  url.searchParams.set('units', units)

  const res = await fetch(url)
  const body = await res.json()

  if (!res.ok) {
    const err = new Error(body.error || `Weather request failed (${res.status})`)
    err.status = res.status
    err.setup = body.setup
    throw err
  }

  return body
}
