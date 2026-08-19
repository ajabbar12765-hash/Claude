import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'pronto:accent:v1'

export const ACCENTS = [
  { id: 'coral', label: 'Coral', primary: '#ff5a36', dark: '#e0431f' },
  { id: 'grape', label: 'Grape', primary: '#8b5cf6', dark: '#6d3ff0' },
  { id: 'ocean', label: 'Ocean', primary: '#0ea5e9', dark: '#0284c7' },
  { id: 'forest', label: 'Forest', primary: '#16a34a', dark: '#0f7c38' },
  { id: 'berry', label: 'Berry', primary: '#e2377a', dark: '#c21f61' },
]

function applyAccent(accent) {
  const root = document.documentElement
  root.style.setProperty('--color-terracotta', accent.primary)
  root.style.setProperty('--color-terracotta-dark', accent.dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', accent.primary)
}

export function useTheme() {
  const [accentId, setAccentId] = useState(() => {
    if (typeof window === 'undefined') return ACCENTS[0].id
    return window.localStorage.getItem(STORAGE_KEY) || ACCENTS[0].id
  })

  useEffect(() => {
    const accent = ACCENTS.find((a) => a.id === accentId) || ACCENTS[0]
    applyAccent(accent)
    try {
      window.localStorage.setItem(STORAGE_KEY, accentId)
    } catch {
      // ignore — theme just won't persist
    }
  }, [accentId])

  const setAccent = useCallback((id) => setAccentId(id), [])

  return { accentId, setAccent, accents: ACCENTS }
}
