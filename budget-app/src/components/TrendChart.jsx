import { shortMonthLabel } from '../lib/dates'
import { formatMoney } from '../lib/currency'

export default function TrendChart({ data, currency }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const w = 640
  const h = 180
  const pad = 24
  const groupW = (w - pad * 2) / data.length

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="trend-chart" preserveAspectRatio="xMidYMid meet">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={pad}
          x2={w - pad}
          y1={h - 28 - f * (h - 48)}
          y2={h - 28 - f * (h - 48)}
          className="trend-grid"
        />
      ))}
      {data.map((d, i) => {
        const x = pad + i * groupW
        const barW = Math.min(18, groupW / 3)
        const incomeH = (d.income / max) * (h - 48)
        const expenseH = (d.expense / max) * (h - 48)
        return (
          <g key={d.key}>
            <title>
              {d.key}: income {formatMoney(d.income, currency)}, expense{' '}
              {formatMoney(d.expense, currency)}
            </title>
            <rect
              x={x + groupW / 2 - barW - 2}
              y={h - 28 - incomeH}
              width={barW}
              height={incomeH}
              rx={3}
              className="trend-bar trend-bar--income"
            />
            <rect
              x={x + groupW / 2 + 2}
              y={h - 28 - expenseH}
              width={barW}
              height={expenseH}
              rx={3}
              className="trend-bar trend-bar--expense"
            />
            <text x={x + groupW / 2} y={h - 8} textAnchor="middle" className="trend-label">
              {shortMonthLabel(d.key)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
