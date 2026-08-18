import { useEffect, useMemo, useState } from 'react'
import Icon from '../Icon.jsx'
import { shuffle } from '../../lib/matching.js'

export default function MatchExercise({ exercise, onAnswered, onContinue }) {
  const { pairs } = exercise
  const itColumn = useMemo(() => shuffle(pairs.map((p, i) => ({ text: p.it, pairIndex: i, key: `it-${i}` }))), [exercise.id])
  const enColumn = useMemo(() => shuffle(pairs.map((p, i) => ({ text: p.en, pairIndex: i, key: `en-${i}` }))), [exercise.id])

  const [matched, setMatched] = useState(new Set())
  const [selectedIt, setSelectedIt] = useState(null)
  const [selectedEn, setSelectedEn] = useState(null)
  const [wrongPulse, setWrongPulse] = useState(false)
  const [reported, setReported] = useState(false)

  const isDone = matched.size === pairs.length

  useEffect(() => {
    if (isDone && !reported) {
      setReported(true)
      onAnswered(true)
    }
  }, [isDone, reported, onAnswered])

  function trySelect(side, item) {
    if (matched.has(item.pairIndex)) return
    if (side === 'it') setSelectedIt(item)
    else setSelectedEn(item)

    const otherSelected = side === 'it' ? selectedEn : selectedIt
    if (otherSelected) {
      const a = side === 'it' ? item : otherSelected
      const b = side === 'it' ? otherSelected : item
      if (a.pairIndex === b.pairIndex) {
        setMatched((prev) => new Set(prev).add(a.pairIndex))
        setSelectedIt(null)
        setSelectedEn(null)
      } else {
        setWrongPulse(true)
        setTimeout(() => {
          setWrongPulse(false)
          setSelectedIt(null)
          setSelectedEn(null)
        }, 450)
      }
    }
  }

  return (
    <div className="exercise">
      <div className="exercise-body">
        <p className="exercise-eyebrow">Match the pairs</p>
        <h2 className="exercise-prompt">Tap an Italian word, then its English match</h2>
        <div className={`match-grid ${wrongPulse ? 'match-pulse-wrong' : ''}`}>
          <div className="match-column">
            {itColumn.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={matched.has(item.pairIndex)}
                className={[
                  'match-tile',
                  matched.has(item.pairIndex) ? 'match-done' : '',
                  selectedIt?.key === item.key ? 'match-selected' : '',
                ].join(' ')}
                onClick={() => trySelect('it', item)}
              >
                {item.text}
              </button>
            ))}
          </div>
          <div className="match-column">
            {enColumn.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={matched.has(item.pairIndex)}
                className={[
                  'match-tile',
                  matched.has(item.pairIndex) ? 'match-done' : '',
                  selectedEn?.key === item.key ? 'match-selected' : '',
                ].join(' ')}
                onClick={() => trySelect('en', item)}
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="exercise-footer exercise-footer-answering">
        {isDone && (
          <div className="feedback-banner feedback-correct">
            <div className="feedback-icon">
              <Icon name="check" size={22} strokeWidth={2.4} />
            </div>
            <div className="feedback-text">
              <strong>All matched!</strong>
            </div>
          </div>
        )}
        <button type="button" className={`btn-check ${isDone ? 'btn-check-correct' : ''}`} disabled={!isDone} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  )
}
