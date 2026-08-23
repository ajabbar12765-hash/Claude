export default function BarChart({ values, dates, color = '#1a73e8', height = 120 }) {
  const points = values.map((v, i) => ({ i, v: typeof v === 'number' ? v : 0, has: typeof v === 'number' }))
  const max = Math.max(1, ...points.map((p) => p.v))
  const todayKey = new Date().toISOString().slice(0, 10)

  if (!points.some((p) => p.has)) {
    return (
      <div className="bar-chart-empty" style={{ height }}>
        Not enough data yet
      </div>
    )
  }

  return (
    <div className="bar-chart" style={{ height }}>
      {points.map((p, i) => {
        const pct = p.v / max
        const isToday = dates?.[i] === todayKey
        return (
          <div className="bar-chart-col" key={i}>
            <div className="bar-chart-track">
              <div
                className={`bar-chart-bar ${isToday ? 'today' : ''}`}
                style={{ height: `${Math.max(p.has ? 4 : 0, pct * 100)}%`, background: isToday ? color : `${color}55` }}
                title={p.has ? p.v.toLocaleString() : undefined}
              />
            </div>
            {dates?.[i] && (
              <span className="bar-chart-label">
                {new Date(dates[i]).toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
