import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#ff5a36', '#12b5ac', '#ffb627', '#8b5cf6', '#e2377a']

function pieces(count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
    const distance = 100 + Math.random() * 130
    return {
      key: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 50,
      rotate: Math.random() * 360,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 0.12,
    }
  })
}

// A short celebratory burst, shown once per `active` toggle. Respects
// prefers-reduced-motion by rendering nothing (the framer-motion
// reduced-motion context isn't wired app-wide, so this checks directly).
export default function Confetti({ active }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) return null

  return (
    <AnimatePresence>
      {active && (
        <div className="confetti-burst" aria-hidden="true">
          {pieces(34).map((p) => (
            <motion.span
              key={p.key}
              className="confetti-piece"
              style={{ background: p.color }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.6 }}
              transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
