import Icon from './Icon.jsx'
import Mascot from './Mascot.jsx'
import { useCountUp } from '../hooks/useCountUp.js'

export default function TopBar({ streak, xp }) {
  const streakShown = useCountUp(streak)
  const xpShown = useCountUp(xp)

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-mark" aria-hidden="true">
          <Mascot expression="idle" size={30} />
        </span>
        <span className="brand-name">Pronto</span>
      </div>
      <div className="topbar-stats">
        <div className="stat-chip stat-streak" title="Day streak">
          <Icon name="flame" size={18} strokeWidth={2} />
          <span>{streakShown}</span>
        </div>
        <div className="stat-chip stat-xp" title="Total XP">
          <Icon name="spark" size={18} strokeWidth={2} />
          <span>{xpShown}</span>
        </div>
      </div>
    </header>
  )
}
