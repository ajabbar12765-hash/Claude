import { useState } from 'react'
import { useHealthData } from '../lib/useHealthData.js'
import StatCard from './StatCard.jsx'
import WorkoutList from './WorkoutList.jsx'
import RangeSwitch from './RangeSwitch.jsx'

export default function Activity() {
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
        <h1>Activity</h1>
        <RangeSwitch range={range} onChange={setRange} />
      </div>

      <div className="stat-grid">
        <StatCard
          icon="👟"
          label="Steps"
          value={t?.steps?.toLocaleString() ?? '—'}
          color="#1a73e8"
          deltaPct={summary.trend.steps.deltaPct}
          series={series.map((s) => s.steps)}
        />
        <StatCard
          icon="🔥"
          label="Active calories"
          value={t?.activeCalories ? Math.round(t.activeCalories) : '—'}
          unit="kcal"
          color="#f9ab00"
          deltaPct={summary.trend.activeCalories.deltaPct}
          series={series.map((s) => s.activeCalories)}
        />
        <StatCard
          icon="📍"
          label="Distance"
          value={t?.distanceKm ? t.distanceKm.toFixed(2) : '—'}
          unit="km"
          color="#1e8e3e"
          deltaPct={summary.trend.distanceKm.deltaPct}
          series={series.map((s) => s.distanceKm)}
        />
      </div>

      <div className="panel">
        <h2>Recent workouts</h2>
        <WorkoutList workouts={summary.recentWorkouts} />
      </div>
    </div>
  )
}
