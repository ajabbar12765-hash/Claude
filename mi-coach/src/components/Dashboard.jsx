import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import StatCard from './StatCard.jsx'
import SleepBar from './SleepBar.jsx'
import WorkoutList from './WorkoutList.jsx'
import Ring from './Ring.jsx'

const RANGES = [
  { id: 7, label: '7D' },
  { id: 30, label: '30D' },
  { id: 90, label: '90D' },
]

const STEP_GOAL = 10000

export default function Dashboard({ onGoToImport, onGoToCoach }) {
  const [range, setRange] = useState(7)
  const [summary, setSummary] = useState(null)
  const [insight, setInsight] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .data(range)
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => {
    api.insight().then(setInsight).catch(() => {})
  }, [])

  if (loading && !summary) {
    return <div className="page-loading">Loading your data…</div>
  }

  if (error) {
    return <div className="page-error">{error}</div>
  }

  if (!summary || summary.daysLogged === 0) {
    return (
      <div className="empty-state">
        <h1>Welcome to Mi Coach</h1>
        <p>No Smart Band data yet. Connect your Mi Fitness data to see your dashboard and get AI coaching.</p>
        <button className="btn-primary" onClick={onGoToImport}>Import your data</button>
      </div>
    )
  }

  const series = summary.series
  const t = summary.today

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-sub">
            {summary.daysLogged} day{summary.daysLogged === 1 ? '' : 's'} logged · streak {summary.streak}d
          </p>
        </div>
        <div className="range-switch">
          {RANGES.map((r) => (
            <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {insight && (
        <div className="insight-card">
          <div className="insight-card-icon">✦</div>
          <div>
            <div className="insight-card-label">Today's insight</div>
            <p>{insight.text}</p>
            <button className="link-btn" onClick={onGoToCoach}>Ask the coach more →</button>
          </div>
        </div>
      )}

      <div className="dashboard-hero">
        <Ring
          value={t?.steps ?? 0}
          goal={STEP_GOAL}
          color="#1a73e8"
          label={(t?.steps ?? 0).toLocaleString()}
          sublabel={`of ${STEP_GOAL.toLocaleString()} steps`}
        />
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-icon" style={{ background: '#fef7e0', color: '#f9ab00' }}>🔥</span>
            <div>
              <div className="hero-stat-value">{t?.activeCalories ? Math.round(t.activeCalories) : '—'}</div>
              <div className="hero-stat-label">kcal active</div>
            </div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-icon" style={{ background: '#e6f4ea', color: '#1e8e3e' }}>📍</span>
            <div>
              <div className="hero-stat-value">{t?.distanceKm ? t.distanceKm.toFixed(2) : '—'}</div>
              <div className="hero-stat-label">km distance</div>
            </div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-icon" style={{ background: '#fce8e6', color: '#ea4335' }}>♥</span>
            <div>
              <div className="hero-stat-value">{t?.avgHr ?? '—'}</div>
              <div className="hero-stat-label">bpm avg</div>
            </div>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-icon" style={{ background: '#e8f0fe', color: '#1a73e8' }}>🌙</span>
            <div>
              <div className="hero-stat-value">{t?.sleep?.totalMin ? (t.sleep.totalMin / 60).toFixed(1) + 'h' : '—'}</div>
              <div className="hero-stat-label">sleep</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          icon="👟"
          label="Steps trend"
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

      <div className="dashboard-lower">
        <div className="panel">
          <h2>Sleep last night</h2>
          <SleepBar sleep={t?.sleep} />
        </div>
        <div className="panel">
          <h2>Recent workouts</h2>
          <WorkoutList workouts={summary.recentWorkouts} />
        </div>
      </div>
    </div>
  )
}
