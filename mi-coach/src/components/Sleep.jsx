import { useState } from 'react'
import { useHealthData } from '../lib/useHealthData.js'
import SleepBar from './SleepBar.jsx'
import Sparkline from './Sparkline.jsx'
import RangeSwitch from './RangeSwitch.jsx'

export default function Sleep() {
  const [range, setRange] = useState(7)
  const { summary, loading, error } = useHealthData(range)

  if (loading && !summary) return <div className="page-loading">Loading your data…</div>
  if (error) return <div className="page-error">{error}</div>
  if (!summary || summary.daysLogged === 0) return <div className="page-error">No data yet — head to Import.</div>

  const series = summary.series
  const t = summary.today
  const avgHours = summary.trend.sleepTotalMin.avg ? (summary.trend.sleepTotalMin.avg / 60).toFixed(1) : null

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <h1>Sleep</h1>
        <RangeSwitch range={range} onChange={setRange} />
      </div>

      <div className="panel">
        <h2>Last night</h2>
        <SleepBar sleep={t?.sleep} />
      </div>

      <div className="panel">
        <h2>Trend</h2>
        {avgHours && <p className="dashboard-sub" style={{ marginBottom: 10 }}>Averaging {avgHours}h over this range</p>}
        <Sparkline values={series.map((s) => s.sleepTotalMin)} color="#1a73e8" />
      </div>
    </div>
  )
}
