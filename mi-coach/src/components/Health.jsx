import { useState } from 'react'
import { useHealthData } from '../lib/useHealthData.js'
import StatCard from './StatCard.jsx'
import RangeSwitch from './RangeSwitch.jsx'

export default function Health() {
  const [range, setRange] = useState(7)
  const { summary, loading, error } = useHealthData(range)

  if (loading && !summary) return <div className="page-loading">Loading your data…</div>
  if (error) return <div className="page-error">{error}</div>
  if (!summary || summary.daysLogged === 0) return <div className="page-error">No data yet — head to Import.</div>

  const series = summary.series
  const t = summary.today

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <h1>Health</h1>
        <RangeSwitch range={range} onChange={setRange} />
      </div>

      <div className="stat-grid">
        <StatCard
          icon="♥"
          label="Heart rate"
          value={t?.avgHr ?? '—'}
          unit="bpm avg"
          color="#ea4335"
          deltaPct={summary.trend.avgHr.deltaPct}
          series={series.map((s) => s.avgHr)}
          sub={summary.latest.restingHr ? `Resting ${summary.latest.restingHr.value} bpm` : null}
        />
        <StatCard
          icon="💧"
          label="SpO2"
          value={summary.latest.spo2Avg ? summary.latest.spo2Avg.value.toFixed(0) : '—'}
          unit="%"
          color="#12b5cb"
          series={series.map((s) => s.spo2Avg)}
        />
        <StatCard
          icon="🧠"
          label="Stress"
          value={t?.stressAvg ?? '—'}
          color="#9334e6"
          deltaPct={summary.trend.stressAvg.deltaPct}
          series={series.map((s) => s.stressAvg)}
        />
        <StatCard
          icon="⚖️"
          label="Weight"
          value={summary.latest.weightKg ? summary.latest.weightKg.value.toFixed(1) : '—'}
          unit="kg"
          color="#1e8e3e"
          series={series.map((s) => s.weightKg)}
          sub={summary.latest.bodyFatPct ? `Body fat ${summary.latest.bodyFatPct.value.toFixed(1)}%` : null}
        />
      </div>
    </div>
  )
}
