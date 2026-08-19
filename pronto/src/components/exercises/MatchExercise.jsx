import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Mascot from '../Mascot.jsx'
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
              <motion.button
                key={item.key}
                type="button"
                disabled={matched.has(item.pairIndex)}
                whileTap={!matched.has(item.pairIndex) ? { scale: 0.94 } : undefined}
                animate={matched.has(item.pairIndex) ? { scale: [1, 1.08, 1] } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={[
                  'match-tile',
                  matched.has(item.pairIndex) ? 'match-done' : '',
                  selectedIt?.key === item.key ? 'match-selected' : '',
                ].join(' ')}
                onClick={() => trySelect('it', item)}
              >
                {item.text}
              </motion.button>
            ))}
          </div>
          <div className="match-column">
            {enColumn.map((item) => (
              <motion.button
                key={item.key}
                type="button"
                disabled={matched.has(item.pairIndex)}
                whileTap={!matched.has(item.pairIndex) ? { scale: 0.94 } : undefined}
                animate={matched.has(item.pairIndex) ? { scale: [1, 1.08, 1] } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={[
                  'match-tile',
                  matched.has(item.pairIndex) ? 'match-done' : '',
                  selectedEn?.key === item.key ? 'match-selected' : '',
                ].join(' ')}
                onClick={() => trySelect('en', item)}
              >
                {item.text}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
      <div className="exercise-footer exercise-footer-answering">
        {isDone && (
          <motion.div
            className="feedback-banner feedback-correct"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            <div className="feedback-mascot">
              <Mascot expression="happy" celebrate size={40} />
            </div>
            <div className="feedback-text">
              <strong>All matched!</strong>
            </div>
          </motion.div>
        )}
        <motion.button type="button" whileTap={{ scale: 0.97 }} className={`btn-check ${isDone ? 'btn-check-correct' : ''}`} disabled={!isDone} onClick={onContinue}>
          Continue
        </motion.button>
      </div>
    </div>
  )
}
