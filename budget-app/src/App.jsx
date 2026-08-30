import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MonthSwitcher from './components/MonthSwitcher'
import Dashboard from './components/Dashboard'
import TransactionsView from './components/TransactionsView'
import BudgetsView from './components/BudgetsView'
import RecurringView from './components/RecurringView'
import GoalsView from './components/GoalsView'
import SettingsModal from './components/SettingsModal'
import { useBudget, currentMonthKey } from './lib/useBudget'

export default function App() {
  const budget = useBudget()
  const [tab, setTab] = useState('dashboard')
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [showSettings, setShowSettings] = useState(false)

  const month = budget.getMonth(monthKey)

  return (
    <div className="app-shell">
      <Sidebar tab={tab} onTab={setTab} onSettings={() => setShowSettings(true)} />
      <main className="main">
        <header className="topbar">
          <h1>{titleFor(tab)}</h1>
          <MonthSwitcher monthKey={monthKey} onChange={setMonthKey} />
        </header>

        {tab === 'dashboard' && (
          <Dashboard state={budget.state} month={month} monthKey={monthKey} onTab={setTab} />
        )}
        {tab === 'transactions' && (
          <TransactionsView state={budget.state} month={month} monthKey={monthKey} actions={budget} />
        )}
        {tab === 'budgets' && (
          <BudgetsView state={budget.state} month={month} monthKey={monthKey} actions={budget} />
        )}
        {tab === 'recurring' && (
          <RecurringView state={budget.state} monthKey={monthKey} actions={budget} />
        )}
        {tab === 'goals' && <GoalsView state={budget.state} actions={budget} />}
      </main>

      {showSettings && (
        <SettingsModal state={budget.state} actions={budget} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

function titleFor(tab) {
  return (
    {
      dashboard: 'Dashboard',
      transactions: 'Transactions',
      budgets: 'Budgets & Income',
      recurring: 'Recurring Bills',
      goals: 'Savings Goals',
    }[tab] || 'Budget'
  )
}
