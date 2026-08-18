import { UNITS } from '../data/curriculum.js'
import Icon from '../components/Icon.jsx'

export default function Profile({ progress }) {
  const { streak, xp, completedCount, totalLessons, objectiveStatuses, readinessPercent, resetProgress } = progress

  function handleReset() {
    if (window.confirm('Reset all progress? This clears your streak, XP, and readiness checklist on this device.')) {
      resetProgress()
    }
  }

  return (
    <div className="screen screen-profile">
      <section className="profile-stats">
        <div className="profile-stat-card">
          <Icon name="flame" size={22} strokeWidth={1.9} />
          <span className="profile-stat-value">{streak.count}</span>
          <span className="profile-stat-label">Day streak</span>
        </div>
        <div className="profile-stat-card">
          <Icon name="spark" size={22} strokeWidth={1.9} />
          <span className="profile-stat-value">{xp}</span>
          <span className="profile-stat-label">Total XP</span>
        </div>
        <div className="profile-stat-card">
          <Icon name="map" size={22} strokeWidth={1.9} />
          <span className="profile-stat-value">{completedCount}/{totalLessons}</span>
          <span className="profile-stat-label">Stops completed</span>
        </div>
      </section>

      <section className="readiness-section">
        <div className="readiness-heading">
          <h2>Your readiness checklist</h2>
          <span className="readiness-percent">{readinessPercent}%</span>
        </div>
        <p className="readiness-explainer">
          Duolingo counts lessons finished. We count situations you can actually get through in Italian — each item below only
          checks off once you’ve produced the phrase yourself, not just recognized it.
        </p>
        <ul className="readiness-list">
          {objectiveStatuses.map((obj) => {
            const unit = UNITS.find((u) => u.id === obj.unit)
            return (
              <li key={obj.id} className={`readiness-item ${obj.done ? 'readiness-done' : ''}`}>
                <span className="readiness-check" style={{ '--unit-color': unit?.color }}>
                  <Icon name={obj.done ? 'check' : 'target'} size={16} strokeWidth={2.2} />
                </span>
                <span className="readiness-item-text">
                  <span className="readiness-label">{obj.label}</span>
                  {!obj.done && (
                    <span className="readiness-progress">
                      {obj.have}/{obj.total} phrases proven
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <button type="button" className="btn-reset" onClick={handleReset}>
        Reset progress
      </button>
    </div>
  )
}
