const SEGMENTS = [
  { key: 'deepMin', label: 'Deep', color: '#5b6cff' },
  { key: 'remMin', label: 'REM', color: '#8f6bff' },
  { key: 'lightMin', label: 'Light', color: '#4fc3e0' },
  { key: 'awakeMin', label: 'Awake', color: '#3a3f52' },
]

export default function SleepBar({ sleep }) {
  if (!sleep || !sleep.totalMin) {
    return <div className="sleep-empty">No sleep data for last night yet.</div>
  }

  const total = SEGMENTS.reduce((sum, s) => sum + (sleep[s.key] || 0), 0) || sleep.totalMin
  const hours = (sleep.totalMin / 60).toFixed(1)

  return (
    <div className="sleep-bar-wrap">
      <div className="sleep-bar-total">{hours}h total</div>
      <div className="sleep-bar">
        {SEGMENTS.map((s) => {
          const minutes = sleep[s.key] || 0
          if (!minutes) return null
          const pct = (minutes / total) * 100
          return (
            <div
              key={s.key}
              className="sleep-bar-seg"
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${Math.round(minutes)}min`}
            />
          )
        })}
      </div>
      <div className="sleep-bar-legend">
        {SEGMENTS.filter((s) => sleep[s.key]).map((s) => (
          <span key={s.key} className="sleep-bar-legend-item">
            <i style={{ background: s.color }} />
            {s.label} {Math.round(sleep[s.key] / 60 * 10) / 10}h
          </span>
        ))}
      </div>
    </div>
  )
}
