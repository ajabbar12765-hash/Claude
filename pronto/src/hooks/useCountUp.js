import { useEffect, useRef, useState } from 'react'

// Animates a number counting up (or down) to its target instead of just
// appearing — used on the streak/XP chips and the home readiness ring so
// the app's own stats feel like they're landing, not just static labels.
// Starts from 0 on first mount, then eases from whatever it was on every
// later change.
export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  const from = useRef(0)
  const frame = useRef()

  useEffect(() => {
    const start = performance.now()
    const startValue = from.current

    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(startValue + (target - startValue) * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else from.current = target
    }

    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return value
}
