import { motion } from 'framer-motion'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
}

const SECTIONS = [
  {
    id: 'problem',
    glow: 'teal',
    eyebrow: 'The problem',
    headline: 'Duolingo taught us everything — except how to ask for water.',
    body: 'Years of streaks, and still not one lesson on ordering a drink, finding a bathroom, or asking someone to slow down.',
    visual: 'droplet',
  },
  {
    id: 'curriculum',
    glow: 'gold',
    eyebrow: 'The curriculum',
    headline: 'Learn what you’ll actually say — and why it works that way.',
    body: 'Survival-first situations, paired with just enough grammar to make the pattern stick. Checkpoints along the way, like a real syllabus.',
    visual: 'map',
  },
  {
    id: 'call',
    glow: 'grape',
    eyebrow: 'Real conversation',
    headline: 'Practice out loud, for real — with someone who talks back.',
    body: 'Call Volpe and have an actual spoken conversation in Italian, powered by a real AI voice on the other end.',
    visual: 'call',
  },
  {
    id: 'yours',
    glow: 'terracotta',
    eyebrow: 'Make it yours',
    headline: 'Install it. Customize it. Make it yours.',
    body: 'Pronto lives on your home screen like any other app, in the accent color you pick.',
    visual: 'swatches',
  },
]

function SectionVisual({ kind }) {
  if (kind === 'droplet') {
    return (
      <div className="landing-visual landing-visual-icon">
        <Icon name="droplet" size={72} strokeWidth={1.3} />
      </div>
    )
  }
  if (kind === 'map') {
    return (
      <div className="landing-visual landing-path">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`landing-path-node ${i === 1 ? 'landing-path-node-checkpoint' : ''}`} />
        ))}
      </div>
    )
  }
  if (kind === 'call') {
    return (
      <div className="landing-visual">
        <div className="landing-call-ring">
          <Mascot expression="talking" size={96} />
        </div>
      </div>
    )
  }
  return (
    <div className="landing-visual landing-swatches">
      {['#ff5a36', '#8b5cf6', '#0ea5e9', '#16a34a', '#e2377a'].map((c) => (
        <span key={c} className="landing-swatch" style={{ background: c }} />
      ))}
    </div>
  )
}

export default function Landing({ onStart }) {
  return (
    <div className="landing">
      <header className="landing-topbar">
        <span className="landing-brand">
          <Mascot expression="idle" size={26} />
          Pronto
        </span>
        <button type="button" className="landing-pill" onClick={onStart}>
          Start Learning
        </button>
      </header>

      <section className="landing-section landing-section-hero">
        <div className="landing-glow landing-glow-terracotta" aria-hidden="true" />
        <motion.div
          className="landing-hero-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 18, delay: 0.1 }}
        >
          <Mascot expression="happy" size={120} celebrate />
          <h1 className="landing-wordmark">Pronto</h1>
          <p className="landing-tagline">Real Italian for real life.</p>
          <button type="button" className="landing-cta" onClick={onStart}>
            Start Learning
          </button>
        </motion.div>
        <motion.div
          className="landing-scroll-cue"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <Icon name="chevronRight" size={20} strokeWidth={2} className="landing-scroll-icon" />
        </motion.div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.id} className="landing-section">
          <div className={`landing-glow landing-glow-${s.glow}`} aria-hidden="true" />
          <motion.div
            className="landing-content"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
          >
            <SectionVisual kind={s.visual} />
            <p className="landing-eyebrow">{s.eyebrow}</p>
            <h2 className="landing-headline">{s.headline}</h2>
            <p className="landing-body">{s.body}</p>
          </motion.div>
        </section>
      ))}

      <section className="landing-section landing-section-final">
        <div className="landing-glow landing-glow-terracotta" aria-hidden="true" />
        <motion.div
          className="landing-content"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
        >
          <Mascot expression="happy" size={80} />
          <h2 className="landing-headline">Ready when you are.</h2>
          <button type="button" className="landing-cta" onClick={onStart}>
            Start Learning
          </button>
        </motion.div>
      </section>
    </div>
  )
}
