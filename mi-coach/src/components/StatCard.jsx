import Sparkline from './Sparkline.jsx'
import BarChart from './BarChart.jsx'

export default function StatCard({ label, value, unit, deltaPct, color, series, dates, chartType = 'line', sub, icon }) {
  const hasDelta = typeof deltaPct === 'number' && Number.isFinite(deltaPct)
  const deltaClass = hasDelta ? (deltaPct >= 0 ? 'up' : 'down') : ''

  return (
    <div className="stat-card" style={{ '--accent': color }}>
      <div className="stat-card-head">
        <span className="stat-card-label">
          {icon && (
            <span className="stat-card-icon" style={{ background: `${color}1f`, color }}>
              {icon}
            </span>
          )}
          {label}
        </span>
        {hasDelta && (
          <span className={`stat-card-delta ${deltaClass}`}>
            {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="stat-card-value">
        {value ?? '—'} {value != null && unit && <span className="stat-card-unit">{unit}</span>}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
      {series && (
        <div className="stat-card-chart">
          {chartType === 'bar' ? (
            <BarChart values={series} dates={dates} color={color} height={70} />
          ) : (
            <Sparkline values={series} color={color} />
          )}
        </div>
      )}
    </div>
  )
}
