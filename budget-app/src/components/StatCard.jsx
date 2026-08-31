import { formatMoney } from '../lib/currency'
import { useCountUp } from '../lib/useCountUp'

export default function StatCard({ label, value, currency, tone, delta }) {
  const animated = useCountUp(value)
  const toneClass = tone ? ` stat-value--${tone}` : ''

  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value${toneClass}`}>{formatMoney(animated, currency)}</div>
      {delta != null && (
        <div className={`stat-delta${delta >= 0 ? ' stat-delta--up' : ' stat-delta--down'}`}>
          <span className="stat-delta-arrow">{delta >= 0 ? '↑' : '↓'}</span>
          {formatMoney(Math.abs(delta), currency)} vs last month
        </div>
      )}
    </div>
  )
}
