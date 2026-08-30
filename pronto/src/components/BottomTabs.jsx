import Icon from './Icon.jsx'

const TABS = [
  { id: 'home', label: 'Topics', icon: 'map' },
  { id: 'review', label: 'Review', icon: 'refresh' },
  { id: 'call', label: 'Call', icon: 'chat' },
  { id: 'dictionary', label: 'Dictionary', icon: 'book' },
  { id: 'profile', label: 'Profile', icon: 'user' },
]

export default function BottomTabs({ active, onChange, reviewDueCount = 0 }) {
  return (
    <nav className="bottom-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-tab ${active === tab.id ? 'bottom-tab-active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-label={tab.label}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <span className="bottom-tab-icon">
            <Icon name={tab.icon} size={22} strokeWidth={active === tab.id ? 2.3 : 1.9} />
            {tab.id === 'review' && reviewDueCount > 0 && <span className="bottom-tab-badge">{reviewDueCount > 9 ? '9+' : reviewDueCount}</span>}
          </span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
