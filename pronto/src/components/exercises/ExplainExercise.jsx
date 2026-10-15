import { motion } from 'framer-motion'
import Mascot from '../Mascot.jsx'
import Icon from '../Icon.jsx'

// A short grammar note — no scoring, no wrong answer. It's the "just
// enough theory" step a good course pairs with practice, shown once
// before the phrases that use the pattern.
export default function ExplainExercise({ exercise, onAnswered, onContinue }) {
  const { title, body, examples = [] } = exercise

  function handleContinue() {
    onAnswered(true)
    onContinue()
  }

  return (
    <motion.div className="exercise explain-exercise" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
      <div className="exercise-body">
        <div className="explain-header">
          <Mascot expression="thinking" size={44} />
          <p className="exercise-eyebrow">Grammar note</p>
        </div>
        <h2 className="exercise-prompt">{title}</h2>
        <p className="explain-body-text">{body}</p>
        {examples.length > 0 && (
          <ul className="explain-examples">
            {examples.map((ex) => (
              <li key={ex.it} className="explain-example">
                <span className="explain-example-it">{ex.it}</span>
                <span className="explain-example-en">{ex.en}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="exercise-footer exercise-footer-answering">
        <motion.button type="button" whileTap={{ scale: 0.97 }} className="btn-check btn-check-correct" onClick={handleContinue}>
          Got it <Icon name="chevronRight" size={18} strokeWidth={2.2} />
        </motion.button>
      </div>
    </motion.div>
  )
}
