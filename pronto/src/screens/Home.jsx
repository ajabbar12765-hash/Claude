import { UNITS } from '../data/curriculum.js'
import Icon from '../components/Icon.jsx'

function LessonNode({ unit, lesson, index, status, onOpen }) {
  const isScenario = lesson.type === 'scenario'
  const locked = status === 'locked'
  const done = status === 'done'

  return (
    <button
      type="button"
      className={[
        'lesson-node',
        isScenario ? 'lesson-node-scenario' : '',
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
        </span>
        <span className="lesson-node-subtitle">{lesson.subtitle}</span>
      </span>
      {!locked && <Icon className="lesson-node-chevron" name="chevronRight" size={18} strokeWidth={2} />}
    </button>
  )
}

export default function Home({ progress, onOpenLesson, onOpenProfile }) {
  const { isLessonComplete, isUnitUnlocked, isLessonUnlocked, readinessPercent, streak, xp, xpToday, goalXpPerDay, dailyGoalMet } = progress

  let nextLesson = null
  outer: for (let ui = 0; ui < UNITS.length; ui++) {
    const unit = UNITS[ui]
    for (let li = 0; li < unit.lessons.length; li++) {
      const lesson = unit.lessons[li]
      if (isLessonUnlocked(ui, li) && !isLessonComplete(lesson.id)) {
        nextLesson = { unit, lesson }
        break outer
      }
    }
  }

  return (
    <div className="screen screen-home">
      <section className="hero-card">
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
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-ring-track)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke="var(--color-terracotta)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(readinessPercent / 100) * 264} 264`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="hero-ring-value">{readinessPercent}%</span>
        </div>
      </section>

      <section className="goal-strip">
        <div className="goal-row">
          <Icon name="target" size={18} strokeWidth={2} />
          <span>Daily goal</span>
          <span className="goal-amount">{Math.min(xpToday, goalXpPerDay)} / {goalXpPerDay} XP</span>
        </div>
        <div className="goal-bar-track">
          <div className="goal-bar-fill" style={{ width: `${Math.min(100, (xpToday / goalXpPerDay) * 100)}%` }} />
        </div>
        {dailyGoalMet && <p className="goal-met">Today’s goal is done — anything more is a bonus. 🎉</p>}
      </section>

      {nextLesson && (
        <button type="button" className="continue-card" onClick={() => onOpenLesson(nextLesson.lesson)}>
          <span className="continue-card-label">Jump back in</span>
          <span className="continue-card-title">{nextLesson.lesson.title}</span>
          <span className="continue-card-cta">
            Continue <Icon name="chevronRight" size={18} strokeWidth={2.2} />
          </span>
        </button>
      )}

      <div className="unit-list">
        {UNITS.map((unit, ui) => {
          const unlocked = isUnitUnlocked(ui)
          return (
            <section key={unit.id} className={`unit-block ${unlocked ? '' : 'unit-block-locked'}`} style={{ '--unit-color': unit.color }}>
              <div className="unit-header">
                <span className="unit-icon">
                  <Icon name={unit.icon} size={22} strokeWidth={1.9} />
                </span>
                <div>
                  <h2 className="unit-title">{unit.title}</h2>
                  <p className="unit-subtitle">{unit.subtitle}</p>
                </div>
              </div>
              <div className="lesson-path">
                {unit.lessons.map((lesson, li) => {
                  const status = !unlocked || !isLessonUnlocked(ui, li) ? 'locked' : isLessonComplete(lesson.id) ? 'done' : 'open'
                  return <LessonNode key={lesson.id} unit={unit} lesson={lesson} index={li} status={status} onOpen={onOpenLesson} />
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
