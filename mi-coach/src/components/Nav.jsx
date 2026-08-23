const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 11.5L12 4l8 7.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v5h3a1 1 0 0 0 1-1v-9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 13h3.2l2-5.5 3.2 11 2.6-8.5 1.8 3h5.2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  health: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20.5s-7.6-4.6-10-9.3C.6 8 2 4.6 5.3 3.8c2-.5 3.9.3 5 2 .6-1 2.9-2.5 5-2 3.3.8 4.7 4.2 3.3 7.4-2.4 4.7-10 9.3-10 9.3.7-4-1.4-7.7-1.4-7.7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sleep: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  coach: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  import: (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3v12m0 0l-3.5-3.5M12 15l3.5-3.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'activity', label: 'Activity' },
  { id: 'health', label: 'Health' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'coach', label: 'Coach' },
  { id: 'import', label: 'Import' },
]

export default function Nav({ tab, onTab, onLogout }) {
  return (
    <nav className="app-nav">
      <div className="app-nav-brand">
        <img src="/icon.svg" alt="" width={28} height={28} />
        <span>Mi Coach</span>
      </div>
      <div className="app-nav-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`app-nav-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => onTab(t.id)}
          >
            <span className="app-nav-icon" aria-hidden="true">{ICONS[t.id]}</span>
            <span className="app-nav-label">{t.label}</span>
          </button>
        ))}
      </div>
      <button className="app-nav-logout" onClick={onLogout}>Sign out</button>
    </nav>
  )
}
