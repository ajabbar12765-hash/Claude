import { useCallback, useEffect, useState } from 'react'
import CitySearch from './components/CitySearch.jsx'
import WeatherIcon from './components/WeatherIcon.jsx'
import { describeCode, fetchForecast } from './lib/weather.js'

const DEFAULT_LOCATION = {
  name: 'New York',
  admin1: 'New York',
  country: 'United States',
  latitude: 40.7128,
  longitude: -74.006,
}

const RECENTS_KEY = 'weather-app:recents'

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecents(list) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 5)))
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

function dayLabel(dateStr, index) {
  if (index === 0) return 'Today'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function hourLabel(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(undefined, { hour: 'numeric' })
}

export default function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [unit, setUnit] = useState('celsius')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recents, setRecents] = useState(loadRecents)

  const load = useCallback(async (loc, u) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchForecast({
        latitude: loc.latitude,
        longitude: loc.longitude,
        unit: u,
      })
      setData(result)
    } catch (e) {
      setError('Could not load weather right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(location, unit)
  }, [location, unit, load])

  function selectLocation(loc) {
    setLocation(loc)
    setRecents((prev) => {
      const next = [loc, ...prev.filter((r) => r.id !== loc.id)]
      saveRecents(next)
      return next
    })
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectLocation({
          id: 'geo',
          name: 'My Location',
          admin1: '',
          country: '',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {},
      { timeout: 8000 }
    )
  }

  const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C'
  const current = data?.current
  const currentInfo = current ? describeCode(current.weather_code) : null
  const isDay = current?.is_day === 1

  return (
    <div className={`app ${isDay === false ? 'is-night' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <WeatherIcon icon="sun" size={22} />
          <span>Weather</span>
        </div>
        <CitySearch onSelect={selectLocation} />
        <div className="topbar-actions">
          <button className="ghost-btn" onClick={useMyLocation} title="Use my location">
            📍
          </button>
          <div className="unit-toggle">
            <button
              className={unit === 'celsius' ? 'active' : ''}
              onClick={() => setUnit('celsius')}
            >
              °C
            </button>
            <button
              className={unit === 'fahrenheit' ? 'active' : ''}
              onClick={() => setUnit('fahrenheit')}
            >
              °F
            </button>
          </div>
        </div>
      </header>

      {recents.length > 0 && (
        <div className="recents">
          {recents.map((r) => (
            <button
              key={r.id ?? `${r.latitude},${r.longitude}`}
              className={r.name === location.name ? 'chip active' : 'chip'}
              onClick={() => selectLocation(r)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <main className="content">
        {error && <div className="error-banner">{error}</div>}

        {loading && !data && <div className="loading">Loading forecast…</div>}

        {data && current && (
          <>
            <section className="current-card">
              <div className="current-location">
                <h1>{location.name}</h1>
                <p>{[location.admin1, location.country].filter(Boolean).join(', ')}</p>
              </div>
              <div className="current-main">
                <WeatherIcon icon={currentInfo.icon} size={72} />
                <div className="current-temp">
                  {Math.round(current.temperature_2m)}
                  <span>{unitSymbol}</span>
                </div>
              </div>
              <p className="current-desc">{currentInfo.label}</p>
              <div className="current-stats">
                <div>
                  <span className="stat-label">Feels like</span>
                  <span className="stat-value">
                    {Math.round(current.apparent_temperature)}
                    {unitSymbol}
                  </span>
                </div>
                <div>
                  <span className="stat-label">Humidity</span>
                  <span className="stat-value">{current.relative_humidity_2m}%</span>
                </div>
                <div>
                  <span className="stat-label">Wind</span>
                  <span className="stat-value">
                    {Math.round(current.wind_speed_10m)} {unit === 'fahrenheit' ? 'mph' : 'km/h'}
                  </span>
                </div>
                <div>
                  <span className="stat-label">Precip.</span>
                  <span className="stat-value">{current.precipitation} mm</span>
                </div>
              </div>
            </section>

            <section className="hourly-card">
              <h2>Next 24 hours</h2>
              <div className="hourly-scroll">
                {data.hourly.time
                  .map((t, i) => ({
                    time: t,
                    temp: data.hourly.temperature_2m[i],
                    code: data.hourly.weather_code[i],
                    pop: data.hourly.precipitation_probability[i],
                  }))
                  .filter((h) => new Date(h.time).getTime() >= Date.now() - 3600_000)
                  .slice(0, 24)
                  .map((h) => (
                    <div className="hour-item" key={h.time}>
                      <span className="hour-time">{hourLabel(h.time)}</span>
                      <WeatherIcon icon={describeCode(h.code).icon} size={26} />
                      <span className="hour-pop">{h.pop}%</span>
                      <span className="hour-temp">
                        {Math.round(h.temp)}
                        {unitSymbol}
                      </span>
                    </div>
                  ))}
              </div>
            </section>

            <section className="daily-card">
              <h2>7-day forecast</h2>
              <ul className="daily-list">
                {data.daily.time.map((t, i) => {
                  const info = describeCode(data.daily.weather_code[i])
                  return (
                    <li key={t}>
                      <span className="daily-day">{dayLabel(t, i)}</span>
                      <WeatherIcon icon={info.icon} size={24} />
                      <span className="daily-pop">
                        {data.daily.precipitation_probability_max[i]}%
                      </span>
                      <span className="daily-range">
                        <span className="daily-min">
                          {Math.round(data.daily.temperature_2m_min[i])}°
                        </span>
                        <span className="daily-max">
                          {Math.round(data.daily.temperature_2m_max[i])}°
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <span>Data: Open-Meteo</span>
      </footer>
    </div>
  )
}
