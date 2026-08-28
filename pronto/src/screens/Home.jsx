import { motion } from 'framer-motion'
import { UNITS } from '../data/curriculum.js'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import { useCountUp } from '../hooks/useCountUp.js'

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

const PATH_SIDES = ['path-row-left', 'path-row-center', 'path-row-right']

function LessonNode({ unit, lesson, index, total, status, side, onOpen }) {
  const isScenario = lesson.type === 'scenario'
  const isCheckpoint = !!lesson.checkpoint
  const isMilestone = isScenario || isCheckpoint
  const locked = status === 'locked'
  const done = status === 'done'

  return (
    <motion.div variants={item} className={`path-row ${side}`}>
      <motion.button
        type="button"
        whileTap={locked ? undefined : { scale: 0.92 }}
        className={[
          'path-node',
          isMilestone ? 'path-node-milestone' : '',
          locked ? 'path-node-locked' : '',
          done ? 'path-node-done' : '',
        ].join(' ')}
        style={{ '--unit-color': unit.color }}
        disabled={locked}
        onClick={() => onOpen(lesson)}
        aria-label={lesson.title}
      >
        {locked ? (
          <Icon name="lock" size={isMilestone ? 24 : 20} strokeWidth={2.1} />
        ) : done ? (
          <Icon name="check" size={isMilestone ? 26 : 22} strokeWidth={2.6} />
        ) : (
          <Icon name={isCheckpoint ? 'trophy' : lesson.icon} size={isMilestone ? 24 : 20} strokeWidth={2.1} />
        )}
      </motion.button>
      <span className="path-node-label">
        <span className="path-node-title">{lesson.title}</span>
        {isScenario && <span className="scenario-tag">Scenario</span>}
        {isCheckpoint && <span className="checkpoint-tag">Checkpoint</span>}
        {!isCheckpoint && <span className="path-node-index">Lesson {index + 1} of {total}</span>}
      </span>
    </motion.div>
  )
}

const MOTIVATION_EYEBROW = {
  trip: 'Trip readiness',
  family: 'Ready for family',
  living: 'Ready to live it',
  fun: 'Real-life readiness',
}

// Which units get a "Recommended for you" nudge, based on the onboarding
// answer — the syllabus is still linear (survival-first ordering matters
// pedagogically), but this flags what to look forward to.
const RECOMMENDED_UNITS = {
  trip: ['u2', 'u3', 'u4'],
  family: ['u1', 'u6'],
  living: ['u4', 'u5', 'u6'],
  fun: [],
}

export default function Home({ progress, onOpenLesson, onOpenProfile, onOpenLevelCheck, onOpenUnitTest }) {
  const { isLessonComplete, isUnitUnlocked, isLessonUnlocked, unitAwaitingTest, readinessPercent, xpToday, goalXpPerDay, dailyGoalMet, nextLesson, motivation, italianLevel } = progress
  const currentUnitIndex = nextLesson ? nextLesson.unitIndex : UNITS.length - 1
  const heroEyebrow = MOTIVATION_EYEBROW[motivation] || 'Real-life readiness'
  const recommendedUnitIds = RECOMMENDED_UNITS[motivation] || []

  function isUnitComplete(ui) {
    return UNITS[ui].lessons.every((l) => isLessonComplete(l.id))
  }

  const circumference = 264
  const ringOffset = circumference - (readinessPercent / 100) * circumference
  const readinessShown = useCountUp(readinessPercent)

  return (
    <motion.div className="screen screen-home" variants={container} initial="hidden" animate="show">
      <motion.section variants={item} className="hero-card">
        <div className="hero-copy">
          <p className="hero-eyebrow">{heroEyebrow}</p>
          <h1 className="hero-title">{readinessShown}% ready for Italy</h1>
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
          <span className="hero-ring-value">{readinessShown}%</span>
        </div>
        <div className="hero-mascot">
          <Mascot expression={dailyGoalMet ? 'happy' : 'idle'} celebrate={dailyGoalMet} size={72} />
        </div>
      </motion.section>

      {!italianLevel && (
        <motion.button variants={item} whileTap={{ scale: 0.98 }} type="button" className="level-cta-card" onClick={onOpenLevelCheck}>
          <span className="level-cta-icon">
            <Icon name="target" size={22} strokeWidth={1.9} />
          </span>
          <span className="level-cta-copy">
            <span className="level-cta-title">Find your Italian level</span>
            <span className="level-cta-sub">A 2-minute check — Volpe and your lessons match what you already know.</span>
          </span>
          <Icon name="chevronRight" size={18} strokeWidth={2.2} />
        </motion.button>
      )}

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
                  <h2 className="unit-title">
                    {unit.title}
                    {recommendedUnitIds.includes(unit.id) && <span className="recommended-tag">Recommended for you</span>}
                  </h2>
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
              {unlocked ? (
                <>
                  <motion.div className="lesson-path" variants={container} initial="hidden" animate="show">
                    {(() => {
                      let zigzag = 0
                      return unit.lessons.map((lesson, li) => {
                        const status = !isLessonUnlocked(ui, li) ? 'locked' : isLessonComplete(lesson.id) ? 'done' : 'open'
                        const isMilestone = lesson.type === 'scenario' || lesson.checkpoint
                        const side = isMilestone ? 'path-row-center' : PATH_SIDES[zigzag++ % 2 === 0 ? 0 : 2]
                        return (
                          <LessonNode
                            key={lesson.id}
                            unit={unit}
                            lesson={lesson}
                            index={li}
                            total={unit.lessons.length}
                            status={status}
                            side={side}
                            onOpen={onOpenLesson}
                          />
                        )
                      })
                    })()}
                  </motion.div>
                  {unitAwaitingTest(ui) && (
                    <motion.button
                      variants={item}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      className="level-cta-card"
                      onClick={() => onOpenUnitTest(unit)}
                    >
                      <span className="level-cta-icon">
                        <Icon name="clock" size={22} strokeWidth={1.9} />
                      </span>
                      <span className="level-cta-copy">
                        <span className="level-cta-title">Take the {unit.title} test</span>
                        <span className="level-cta-sub">Timed — pass it to unlock the next topic.</span>
                      </span>
                      <Icon name="chevronRight" size={18} strokeWidth={2.2} />
                    </motion.button>
                  )}
                </>
              ) : (
                // Locked units have nothing interactive to show yet — a
                // full zigzag path of grey lock icons was just visual
                // noise. One compact line instead.
                <div className="unit-locked-summary">
                  <Icon name="lock" size={15} strokeWidth={2.1} />
                  <span>
                    {ui > 0 && unitAwaitingTest(ui - 1)
                      ? `Pass the ${UNITS[ui - 1].title} test above to unlock ${unit.lessons.length} lesson${unit.lessons.length === 1 ? '' : 's'}`
                      : `Finish the unit above to unlock ${unit.lessons.length} lesson${unit.lessons.length === 1 ? '' : 's'}`}
                  </span>
                </div>
              )}
            </motion.section>
          )
        })}
      </div>
    </motion.div>
  )
}
