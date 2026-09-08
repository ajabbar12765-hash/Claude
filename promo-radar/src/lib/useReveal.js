import { useEffect, useRef, useState } from 'react'

// Powers the scroll-triggered reveals in the Hero — a plain IntersectionObserver,
// no scroll library. Once an element has entered the viewport it stays revealed.
export function useReveal(threshold = 0.35) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return [ref, visible]
}
