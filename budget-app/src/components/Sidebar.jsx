import { IconGrid, IconReceipt, IconTarget, IconRepeat, IconTrophy, IconGear, IconWallet } from './icons'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconGrid },
  { id: 'transactions', label: 'Transactions', Icon: IconReceipt },
  { id: 'budgets', label: 'Budgets & Income', Icon: IconTarget },
  { id: 'recurring', label: 'Recurring Bills', Icon: IconRepeat },
  { id: 'goals', label: 'Savings Goals', Icon: IconTrophy },
]

export default function Sidebar({ tab, onTab, onSettings }) {
  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <IconWallet size={20} />
        </span>
        <span className="brand-name">Budget</span>
      </div>
      <div className="nav-list">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item${tab === n.id ? ' nav-item--active' : ''}`}
            onClick={() => onTab(n.id)}
          >
            <span className="nav-icon">
              <n.Icon size={18} />
            </span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </div>
      <button className="nav-item nav-item--settings" onClick={onSettings}>
        <span className="nav-icon">
          <IconGear size={18} />
        </span>
        <span className="nav-label">Settings</span>
      </button>
    </nav>
  )
}
