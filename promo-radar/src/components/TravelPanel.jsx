import { COUNTRIES } from '../lib/catalog.js'

export default function TravelPanel({ country, setCountry, counts }) {
  return (
    <div className="travel-panel">
      <label htmlFor="travel-country">Where are you headed?</label>
      <input
        id="travel-country"
        type="text"
        list="travel-countries"
        placeholder="Type a country — e.g. UAE, Turkey, Saudi Arabia…"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />
      <datalist id="travel-countries">
        {COUNTRIES.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div className="country-chips">
        {COUNTRIES.map((c) => (
          <button
            key={c}
            className={c === country ? 'chip active' : 'chip'}
            onClick={() => setCountry(c)}
          >
            {c} <span className="count">{counts[c] ?? 0}</span>
          </button>
        ))}
      </div>
      <p className="travel-hint">
        Shows travel deals — flights, hotels, tour packages — tagged for that destination, plus gift cards
        that work anywhere.
      </p>
    </div>
  )
}
