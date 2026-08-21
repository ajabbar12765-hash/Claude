import Icon from './Icon.jsx'

const TABS = [
  { id: 'home', label: 'Topics', icon: 'map' },
  { id: 'call', label: 'Call', icon: 'chat' },
  { id: 'dictionary', label: 'Dictionary', icon: 'book' },
  { id: 'profile', label: 'Profile', icon: 'user' },
]

export default function BottomTabs({ active, onChange }) {
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
          <Icon name={tab.icon} size={22} strokeWidth={active === tab.id ? 2.3 : 1.9} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
