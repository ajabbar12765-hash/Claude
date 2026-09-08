import { CATEGORIES } from '../lib/catalog.js'

// Travel has its own dedicated mode (country picker), so it's left out of
// the local-deals category filter — it would only ever show a stuck "0".
const LOCAL_CATEGORIES = CATEGORIES.filter((c) => c.id !== 'travel')

export default function CategoryTabs({ active, onChange, counts }) {
  return (
    <div className="category-tabs">
      <button className={active === 'all' ? 'active' : ''} onClick={() => onChange('all')}>
        All <span className="count">{counts.all ?? 0}</span>
      </button>
      {LOCAL_CATEGORIES.map((c) => (
        <button key={c.id} className={active === c.id ? 'active' : ''} onClick={() => onChange(c.id)}>
          <span className="cat-icon">{c.icon}</span> {c.label} <span className="count">{counts[c.id] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}
