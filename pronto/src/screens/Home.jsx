import { motion } from 'framer-motion'
import { UNITS } from '../data/curriculum.js'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 32 } },
}

function scrollToUnit(unitId) {
  document.getElementById(`unit-${unitId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function CourseMap({ currentUnitIndex, isUnitUnlocked, isUnitComplete }) {
  return (
    <motion.section variants={item} className="course-map" aria-label="Course map">
      <p className="course-map-label">Your syllabus</p>
      <div className="course-map-track">
        {UNITS.map((unit, ui) => {
          const unlocked = isUnitUnlocked(ui)
          const done = isUnitComplete(ui)
          const current = ui === currentUnitIndex
          return (
            <button
              key={unit.id}
              type="button"
              className={[
                'course-map-node',
                unit.checkpointUnit ? 'course-map-node-checkpoint' : '',
                !unlocked ? 'course-map-node-locked' : '',
                done ? 'course-map-node-done' : '',
                current ? 'course-map-node-current' : '',
              ].join(' ')}
              style={{ '--unit-color': unit.color }}
              onClick={() => scrollToUnit(unit.id)}
              disabled={!unlocked}
              title={unit.title}
            >
              <Icon name={!unlocked ? 'lock' : done ? 'check' : unit.icon} size={15} strokeWidth={2.1} />
            </button>
          )
        })}
      </div>
    </motion.section>
  )
}

function LessonNode({ unit, lesson, index, total, status, onOpen }) {
  const isScenario = lesson.type === 'scenario'
  const isCheckpoint = !!lesson.checkpoint
  const locked = status === 'locked'
  const done = status === 'done'

  return (
    <motion.button
      variants={item}
      type="button"
      whileTap={locked ? undefined : { scale: 0.97 }}
      className={[
        'lesson-node',
        isScenario ? 'lesson-node-scenario' : '',
        isCheckpoint ? 'lesson-node-checkpoint' : '',
        locked ? 'lesson-node-locked' : '',
        done ? 'lesson-node-done' : '',
      ].join(' ')}
      style={{ '--unit-color': unit.color }}
      disabled={locked}
      onClick={() => onOpen(lesson)}
    >
      <span className="lesson-node-marker">
        {locked ? <Icon name="lock" size={16} strokeWidth={2} /> : done ? <Icon name="check" size={16} strokeWidth={2.4} /> : <Icon name={lesson.icon} size={16} strokeWidth={2} />}
      </span>
      <span className="lesson-node-text">
        <span className="lesson-node-title">
          {lesson.title}
          {isScenario && <span className="scenario-tag">Scenario</span>}
          {isCheckpoint && <span className="checkpoint-tag">Checkpoint</span>}
        </span>
        <span className="lesson-node-subtitle">{lesson.subtitle}</span>
        {!isCheckpoint && <span className="lesson-node-index">Lesson {index + 1} of {total}</span>}
      </span>
      {!locked && <Icon className="lesson-node-chevron" name="chevronRight" size={18} strokeWidth={2} />}
    </motion.button>
  )
}

export default function Home({ progress, onOpenLesson, onOpenProfile, onOpenCall }) {
  const { isLessonComplete, isUnitUnlocked, isLessonUnlocked, readinessPercent, xpToday, goalXpPerDay, dailyGoalMet, nextLesson } = progress
  const currentUnitIndex = nextLesson ? nextLesson.unitIndex : UNITS.length - 1

  function isUnitComplete(ui) {
    return UNITS[ui].lessons.every((l) => isLessonComplete(l.id))
  }

  const circumference = 264
  const ringOffset = circumference - (readinessPercent / 100) * circumference

  return (
    <motion.div className="screen screen-home" variants={container} initial="hidden" animate="show">
      <motion.section variants={item} className="hero-card">
        <div className="hero-copy">
          <p className="hero-eyebrow">Real-life readiness</p>
          <h1 className="hero-title">{readinessPercent}% ready for Italy</h1>
          <p className="hero-sub">
            Not "lessons completed" — situations you can actually handle. See what you can already say on your{' '}
            <button type="button" className="link-inline" onClick={onOpenProfile}>
              readiness checklist
            </button>
            .
          </p>
        </div>
        <div className="hero-ring" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="96" height="96">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="10" />
            <motion.circle
              cx="50" cy="50" r="42" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ type: 'spring', stiffness: 60, damping: 16, delay: 0.2 }}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="hero-ring-value">{readinessPercent}%</span>
        </div>
        <div className="hero-mascot">
          <Mascot expression={dailyGoalMet ? 'happy' : 'idle'} celebrate={dailyGoalMet} size={72} />
        </div>
      </motion.section>

      <CourseMap currentUnitIndex={currentUnitIndex} isUnitUnlocked={isUnitUnlocked} isUnitComplete={isUnitComplete} />

      <motion.section variants={item} className="goal-strip">
        <div className="goal-row">
          <Icon name="target" size={18} strokeWidth={2} />
          <span>Daily goal</span>
          <span className="goal-amount">{Math.min(xpToday, goalXpPerDay)} / {goalXpPerDay} XP</span>
        </div>
        <div className="goal-bar-track">
          <motion.div
            className="goal-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (xpToday / goalXpPerDay) * 100)}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          />
        </div>
        {dailyGoalMet && <p className="goal-met">Today’s goal is done — anything more is a bonus. 🎉</p>}
      </motion.section>

      {nextLesson && (
        <motion.button variants={item} whileTap={{ scale: 0.98 }} type="button" className="continue-card" onClick={() => onOpenLesson(nextLesson.lesson)}>
          <span className="continue-card-label">Jump back in</span>
          <span className="continue-card-title">{nextLesson.lesson.title}</span>
          <span className="continue-card-cta">
            Continue <Icon name="chevronRight" size={18} strokeWidth={2.2} />
          </span>
        </motion.button>
      )}

      <motion.button variants={item} whileTap={{ scale: 0.98 }} type="button" className="call-card" onClick={onOpenCall}>
        <span className="call-card-mascot">
          <Mascot expression="talking" size={44} />
        </span>
        <span className="call-card-text">
          <span className="call-card-title">Call Volpe</span>
          <span className="call-card-sub">Practice a real spoken conversation in Italian</span>
        </span>
        <Icon name="chevronRight" size={18} strokeWidth={2.2} />
      </motion.button>

      <div className="unit-list">
        {UNITS.map((unit, ui) => {
          const unlocked = isUnitUnlocked(ui)
          return (
            <motion.section
              variants={item}
              key={unit.id}
              id={`unit-${unit.id}`}
              className={[
                'unit-block',
                unlocked ? '' : 'unit-block-locked',
                unit.checkpointUnit ? 'unit-block-checkpoint' : '',
              ].join(' ')}
              style={{ '--unit-color': unit.color }}
            >
              <div className="unit-header">
                <span className="unit-icon">
                  <Icon name={unit.icon} size={22} strokeWidth={1.9} />
                </span>
                <div>
                  <h2 className="unit-title">{unit.title}</h2>
                  <p className="unit-subtitle">{unit.subtitle}</p>
                </div>
              </div>
              {unit.learn?.length > 0 && (
                <ul className="unit-learn-list">
                  {unit.learn.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              <motion.div className="lesson-path" variants={container} initial="hidden" animate="show">
                {unit.lessons.map((lesson, li) => {
                  const status = !unlocked || !isLessonUnlocked(ui, li) ? 'locked' : isLessonComplete(lesson.id) ? 'done' : 'open'
                  return (
                    <LessonNode
                      key={lesson.id}
                      unit={unit}
                      lesson={lesson}
                      index={li}
                      total={unit.lessons.length}
                      status={status}
                      onOpen={onOpenLesson}
                    />
                  )
                })}
              </motion.div>
            </motion.section>
          )
        })}
      </div>
    </motion.div>
  )
}
