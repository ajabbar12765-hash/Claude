const RANGES = [
  { id: 7, label: '7D' },
  { id: 30, label: '30D' },
  { id: 90, label: '90D' },
]

export default function RangeSwitch({ range, onChange }) {
  return (
    <div className="range-switch">
      {RANGES.map((r) => (
        <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => onChange(r.id)}>
          {r.label}
        </button>
      ))}
    </div>
  )
}
