// Data source: Open-Meteo (https://open-meteo.com) — free, no API key required.
// Kept isolated here so the fetch layer can be swapped later (e.g. for a
// keyed provider) without touching UI components.

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export const WEATHER_CODES = {
  0: { label: 'Clear sky', icon: 'sun' },
  1: { label: 'Mostly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'fog' },
  48: { label: 'Rime fog', icon: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle' },
  53: { label: 'Drizzle', icon: 'drizzle' },
  55: { label: 'Heavy drizzle', icon: 'drizzle' },
  56: { label: 'Freezing drizzle', icon: 'drizzle' },
  57: { label: 'Freezing drizzle', icon: 'drizzle' },
  61: { label: 'Light rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  66: { label: 'Freezing rain', icon: 'rain' },
  67: { label: 'Freezing rain', icon: 'rain' },
  71: { label: 'Light snow', icon: 'snow' },
  73: { label: 'Snow', icon: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow' },
  77: { label: 'Snow grains', icon: 'snow' },
  80: { label: 'Light showers', icon: 'rain' },
  81: { label: 'Showers', icon: 'rain' },
  82: { label: 'Heavy showers', icon: 'rain' },
  85: { label: 'Snow showers', icon: 'snow' },
  86: { label: 'Snow showers', icon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'storm' },
  96: { label: 'Thunderstorm w/ hail', icon: 'storm' },
  99: { label: 'Thunderstorm w/ hail', icon: 'storm' },
}

export function describeCode(code) {
  return WEATHER_CODES[code] || { label: 'Unknown', icon: 'cloud' }
}

export async function searchCity(query) {
  if (!query || query.trim().length < 2) return []
  const url = new URL(GEOCODE_URL)
  url.searchParams.set('name', query.trim())
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Location search failed')
  const data = await res.json()
  return (data.results || []).map((r) => ({
    id: `${r.id}`,
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }))
}

export async function fetchForecast({ latitude, longitude, unit = 'celsius' }) {
  const url = new URL(FORECAST_URL)
  url.searchParams.set('latitude', latitude)
  url.searchParams.set('longitude', longitude)
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('temperature_unit', unit === 'fahrenheit' ? 'fahrenheit' : 'celsius')
  url.searchParams.set('wind_speed_unit', unit === 'fahrenheit' ? 'mph' : 'kmh')
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'is_day',
      'precipitation',
    ].join(',')
  )
  url.searchParams.set(
    'hourly',
    ['temperature_2m', 'weather_code', 'precipitation_probability'].join(',')
  )
  url.searchParams.set(
    'daily',
    [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
    ].join(',')
  )
  url.searchParams.set('forecast_days', '7')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Forecast fetch failed')
  return res.json()
}
