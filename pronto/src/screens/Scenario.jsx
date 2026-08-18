import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'

export default function Scenario({ scenario, progress, onExit, onFinished }) {
  const [turnIndex, setTurnIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('answering')
  const [finished, setFinished] = useState(false)

  const turn = scenario.turns[turnIndex]
  const total = scenario.turns.length

  useEffect(() => {
    if (finished) {
      progress.recordCorrect(`${scenario.id}-done`)
      progress.completeLesson(scenario.id, total)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  function pick(choice, index) {
    if (status === 'correct') return
    setSelected(index)
    setStatus(choice.correct ? 'correct' : 'incorrect')
  }

  function handleContinue() {
    if (turnIndex + 1 >= total) {
      setFinished(true)
      return
    }
    setTurnIndex((i) => i + 1)
    setSelected(null)
    setStatus('answering')
  }

  if (finished) {
    const xpEarned = total * 10 + 20
    return (
      <div className="screen screen-lesson-complete">
        <div className="complete-card">
          <span className="complete-badge">
            <Icon name="chat" size={36} strokeWidth={1.6} />
          </span>
          <h1>Conversation handled.</h1>
          <p className="complete-sub">That’s a full real-life exchange, start to finish — not a translated sentence in isolation.</p>
          <div className="complete-stats">
            <div className="complete-stat">
              <Icon name="spark" size={18} strokeWidth={2} />
              <span>+{xpEarned} XP</span>
            </div>
            <div className="complete-stat">
              <Icon name="flame" size={18} strokeWidth={2} />
              <span>{progress.streak.count} day streak</span>
            </div>
          </div>
          <button type="button" className="btn-primary" onClick={onFinished}>
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen screen-scenario">
      <div className="lesson-header">
        <button type="button" className="lesson-exit" onClick={onExit} aria-label="Exit scenario">
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <div className="lesson-progress-track">
          <div className="lesson-progress-fill" style={{ width: `${(turnIndex / total) * 100}%` }} />
        </div>
      </div>

      {turnIndex === 0 && <p className="scenario-intro">{scenario.intro}</p>}

      <div className="scenario-body">
        <div className="scenario-speech">
          <span className="scenario-speaker">{turn.speaker}</span>
          <p className="scenario-line-it">{turn.it}</p>
          <p className="scenario-line-en">{turn.en}</p>
        </div>

        <p className="scenario-prompt-label">How do you respond?</p>
        <div className="scenario-choices">
          {turn.choices.map((choice, i) => {
            const isSelected = selected === i
            const showCorrect = status === 'correct' && isSelected
            const showWrong = status === 'incorrect' && isSelected
            return (
              <button
                key={choice.it}
                type="button"
                className={['scenario-choice', showCorrect ? 'choice-correct' : '', showWrong ? 'choice-wrong' : ''].join(' ')}
                onClick={() => pick(choice, i)}
                disabled={status === 'correct'}
              >
                <span className="scenario-choice-it">{choice.it}</span>
                <span className="scenario-choice-en">{choice.en}</span>
                {(showCorrect || showWrong) && <span className="scenario-choice-feedback">{choice.feedback}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {status === 'correct' && (
        <div className="scenario-footer">
          <button type="button" className="btn-primary" onClick={handleContinue}>
            {turnIndex + 1 >= total ? 'Finish' : 'Continue'}
          </button>
        </div>
      )}
    </div>
  )
}
