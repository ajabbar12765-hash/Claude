import { motion } from 'framer-motion'
import { UNITS } from '../data/curriculum.js'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 32 } },
}

export default function Profile({ progress, theme }) {
  const { streak, xp, completedCount, totalLessons, objectiveStatuses, readinessPercent, resetProgress } = progress

  function handleReset() {
    if (window.confirm('Reset all progress? This clears your streak, XP, and readiness checklist on this device.')) {
      resetProgress()
    }
  }

  return (
    <motion.div className="screen screen-profile" variants={container} initial="hidden" animate="show">
      <motion.section variants={item} className="profile-stats">
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
      </motion.section>

      <motion.section variants={item} className="readiness-section">
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
      </motion.section>

      {theme && (
        <motion.section variants={item} className="theme-section">
          <div className="theme-heading">
            <Mascot expression="idle" size={32} />
            <div>
              <h2>Make it yours</h2>
              <p className="theme-explainer">Pick an accent color — it customizes the app and the installed home-screen icon.</p>
            </div>
          </div>
          <div className="theme-swatches">
            {theme.accents.map((accent) => (
              <button
                key={accent.id}
                type="button"
                className={`theme-swatch ${theme.accentId === accent.id ? 'theme-swatch-active' : ''}`}
                style={{ '--swatch-color': accent.primary }}
                onClick={() => theme.setAccent(accent.id)}
                aria-label={accent.label}
                title={accent.label}
              >
                {theme.accentId === accent.id && <Icon name="check" size={16} strokeWidth={2.6} />}
              </button>
            ))}
          </div>
        </motion.section>
      )}

      <motion.button variants={item} type="button" className="btn-reset" onClick={handleReset}>
        Reset progress
      </motion.button>
    </motion.div>
  )
}
