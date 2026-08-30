const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'transactions', label: 'Transactions', icon: '🧾' },
  { id: 'budgets', label: 'Budgets & Income', icon: '🎯' },
  { id: 'recurring', label: 'Recurring Bills', icon: '🔁' },
  { id: 'goals', label: 'Savings Goals', icon: '🏆' },
]

export default function Sidebar({ tab, onTab, onSettings }) {
  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="brand-mark">💰</span>
        <span className="brand-name">Budget</span>
      </div>
      <div className="nav-list">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item${tab === n.id ? ' nav-item--active' : ''}`}
            onClick={() => onTab(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </div>
      <button className="nav-item nav-item--settings" onClick={onSettings}>
        <span className="nav-icon">⚙️</span>
        Settings
      </button>
    </nav>
  )
}
