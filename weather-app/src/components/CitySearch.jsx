import { useEffect, useRef, useState } from 'react'
import { searchCity } from '../lib/weather.js'

export default function CitySearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const r = await searchCity(query)
        setResults(r)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="city-search" ref={boxRef}>
      <input
        type="text"
        value={query}
        placeholder="Search for a city…"
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {open && (loading || results.length > 0) && (
        <ul className="city-search-results">
          {loading && <li className="city-search-loading">Searching…</li>}
          {!loading &&
            results.map((r) => (
              <li
                key={r.id}
                onClick={() => {
                  onSelect(r)
                  setQuery('')
                  setResults([])
                  setOpen(false)
                }}
              >
                <span className="city-name">{r.name}</span>
                <span className="city-meta">
                  {[r.admin1, r.country].filter(Boolean).join(', ')}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
