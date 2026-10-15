import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useHealthData } from '../lib/useHealthData.js'
import Ring from './Ring.jsx'
import BarChart from './BarChart.jsx'

const STEP_GOAL = 10000

export default function Home({ onGoToImport, onGoToCoach }) {
  const { summary, loading, error } = useHealthData(7)
  const [insight, setInsight] = useState(null)

  useEffect(() => {
    api.insight().then(setInsight).catch(() => {})
  }, [])

  if (loading && !summary) return <div className="page-loading">Loading your data…</div>
  if (error) return <div className="page-error">{error}</div>

  if (!summary || summary.daysLogged === 0) {
    return (
      <div className="empty-state">
        <h1>Welcome to Mi Coach</h1>
        <p>No Smart Band data yet. Connect your Mi Fitness data to see your dashboard and get AI coaching.</p>
        <button className="btn-primary" onClick={onGoToImport}>Import your data</button>
      </div>
    )
  }

  const t = summary.today

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <div>
          <h1>Home</h1>
          <p className="dashboard-sub">
            {summary.daysLogged} day{summary.daysLogged === 1 ? '' : 's'} logged · streak {summary.streak}d
          </p>
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

      <div className="panel">
        <h2>This week</h2>
        <BarChart values={summary.series.map((s) => s.steps)} dates={summary.series.map((s) => s.date)} color="#1a73e8" />
      </div>
    </div>
  )
}
