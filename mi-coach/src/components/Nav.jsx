const TABS = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'activity', label: 'Activity', icon: '👟' },
  { id: 'health', label: 'Health', icon: '♥' },
  { id: 'sleep', label: 'Sleep', icon: '🌙' },
  { id: 'coach', label: 'Coach', icon: '✦' },
  { id: 'import', label: 'Import', icon: '⇅' },
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
            <span className="app-nav-icon" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <button className="app-nav-logout" onClick={onLogout}>Sign out</button>
    </nav>
  )
}
