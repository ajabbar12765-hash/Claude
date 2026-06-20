import React from 'react'

const tabs = [
  { id: 'home',        icon: '🏠', label: 'Home' },
  { id: 'live',        icon: '📡', label: 'Live' },
  { id: 'tournaments', icon: '🏆', label: 'Events' },
  { id: 'rankings',    icon: '📊', label: 'Rankings' },
  { id: 'settings',    icon: '⚙️', label: 'Settings' },
]

export default function NavBar({ active, onChange, hasLive }) {
  return (
    <nav className="navbar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`nav-btn ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-icon">
            {t.icon}
            {t.id === 'live' && hasLive && <span className="live-dot" />}
          </span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
