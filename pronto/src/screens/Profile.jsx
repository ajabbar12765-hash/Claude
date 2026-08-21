import { useState } from 'react'
import { motion } from 'framer-motion'
import { UNITS } from '../data/curriculum.js'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import { isSoundEnabled, setSoundEnabled } from '../lib/sound.js'
import { LEVEL_LABELS } from '../data/placementQuiz.js'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 32 } },
}

export default function Profile({ progress, theme, notifications, onOpenLevelCheck }) {
  const {
    streak,
    xp,
    completedCount,
    totalLessons,
    objectiveStatuses,
    readinessPercent,
    resetProgress,
    level,
    xpIntoLevel,
    xpPerLevel,
    achievementStatuses,
    italianLevel,
  } = progress
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  function handleReset() {
    if (window.confirm('Reset all progress? This clears your streak, XP, and readiness checklist on this device.')) {
      resetProgress()
    }
  }

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
  }

  const unlockedCount = achievementStatuses.filter((a) => a.unlocked).length

  return (
    <motion.div className="screen screen-profile" variants={container} initial="hidden" animate="show">
      <motion.section variants={item} className="level-card">
        <div className="level-card-badge">
          <Icon name="trophy" size={26} strokeWidth={1.9} />
        </div>
        <div className="level-card-body">
          <div className="level-card-heading">
            <span className="level-card-title">Level {level}</span>
            <span className="level-card-sub">{xpIntoLevel}/{xpPerLevel} XP to level {level + 1}</span>
          </div>
          <div className="goal-bar-track">
            <motion.div
              className="goal-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(xpIntoLevel / xpPerLevel) * 100}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 18 }}
            />
          </div>
        </div>
      </motion.section>

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

      <motion.section variants={item} className="notif-section">
        <div className="notif-heading">
          <Icon name="target" size={22} strokeWidth={1.9} />
          <div>
            <h2>Volpe's level</h2>
            <p className="notif-explainer">
              {italianLevel
                ? `Set to ${LEVEL_LABELS[italianLevel]} — Volpe matches its Italian to this on calls.`
                : 'Not set yet — take the quick check so Volpe talks at your level.'}
            </p>
          </div>
          <button type="button" className="btn-reset" onClick={onOpenLevelCheck}>
            {italianLevel ? 'Retake' : 'Quick check'}
          </button>
        </div>
      </motion.section>

      <motion.section variants={item} className="achievements-section">
        <div className="achievements-heading">
          <h2>Achievements</h2>
          <span className="achievements-count">{unlockedCount}/{achievementStatuses.length}</span>
        </div>
        <div className="achievements-grid">
          {achievementStatuses.map((a) => (
            <div key={a.id} className={`achievement-badge ${a.unlocked ? 'achievement-badge-unlocked' : ''}`} title={a.desc}>
              <span className="achievement-badge-icon">
                <Icon name={a.unlocked ? a.icon : 'lock'} size={20} strokeWidth={1.9} />
              </span>
              <span className="achievement-badge-label">{a.label}</span>
            </div>
          ))}
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

      <motion.section variants={item} className="notif-section">
        <div className="notif-heading">
          <Icon name="volume" size={22} strokeWidth={1.9} />
          <div>
            <h2>Sound effects</h2>
            <p className="notif-explainer">Chimes for correct/incorrect answers, combos, and celebrations.</p>
          </div>
          <button
            type="button"
            className={`notif-toggle ${soundOn ? 'notif-toggle-on' : ''}`}
            onClick={toggleSound}
            role="switch"
            aria-checked={soundOn}
            aria-label="Toggle sound effects"
          >
            <span className="notif-toggle-knob" />
          </button>
        </div>
      </motion.section>

      {notifications?.supported && (
        <motion.section variants={item} className="notif-section">
          <div className="notif-heading">
            <Icon name="alert" size={22} strokeWidth={1.9} />
            <div>
              <h2>Streak reminders</h2>
              <p className="notif-explainer">
                {notifications.permission === 'denied'
                  ? 'Notifications are blocked for this site in your browser settings.'
                  : 'Get a nudge when your streak is on the line or your daily goal is hit.'}
              </p>
            </div>
            <button
              type="button"
              className={`notif-toggle ${notifications.enabled ? 'notif-toggle-on' : ''}`}
              disabled={notifications.permission === 'denied'}
              onClick={() => (notifications.enabled ? notifications.disable() : notifications.requestPermission())}
              role="switch"
              aria-checked={notifications.enabled}
              aria-label="Toggle streak reminders"
            >
              <span className="notif-toggle-knob" />
            </button>
          </div>
        </motion.section>
      )}

      <div className="profile-footer-links">
        <motion.button variants={item} type="button" className="btn-reset" onClick={handleReset}>
          Reset progress
        </motion.button>
      </div>
    </motion.div>
  )
}
