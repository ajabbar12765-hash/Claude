import Icon from './Icon.jsx'

export default function TopBar({ streak, xp, onProfileClick, active }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="compass" size={22} strokeWidth={2} />
        </span>
        <span className="brand-name">Pronto</span>
      </div>
      <div className="topbar-stats">
        <div className="stat-chip stat-streak" title="Day streak">
          <Icon name="flame" size={18} strokeWidth={2} />
          <span>{streak}</span>
        </div>
        <div className="stat-chip stat-xp" title="Total XP">
          <Icon name="spark" size={18} strokeWidth={2} />
          <span>{xp}</span>
        </div>
        <button
          type="button"
          className={`stat-chip stat-profile ${active === 'profile' ? 'stat-profile-active' : ''}`}
          onClick={onProfileClick}
          title="Your progress"
          aria-label="Your progress"
        >
          <Icon name="user" size={18} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
