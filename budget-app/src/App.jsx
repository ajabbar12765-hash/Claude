import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import MonthSwitcher from './components/MonthSwitcher'
import Dashboard from './components/Dashboard'
import TransactionsView from './components/TransactionsView'
import BudgetsView from './components/BudgetsView'
import RecurringView from './components/RecurringView'
import GoalsView from './components/GoalsView'
import SettingsModal from './components/SettingsModal'
import { useBudget, currentMonthKey } from './lib/useBudget'
import { getStatus, saveSyncConfig, getPendingSync, ackPendingSync } from './lib/gocardless'

export default function App() {
  const budget = useBudget()
  const [tab, setTab] = useState('dashboard')
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)

  const month = budget.getMonth(monthKey)

  // Finish the GoCardless/Revolut consent flow: the user is redirected back
  // here after authorizing (or declining) access at Revolut.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('gocardless') !== 'return') return
    url.searchParams.delete('gocardless')
    window.history.replaceState({}, '', url.toString())

    const requisitionId = budget.state.bank?.requisitionId
    if (!requisitionId) return

    getStatus(requisitionId)
      .then(({ status, accountIds }) => {
        if (status === 'LN' && accountIds.length > 0) {
          budget.setBank({ status: 'linked', accountIds, connectedAt: Date.now() })
          // Registers the connection server-side so the cron job can poll it
          // without needing this browser tab open.
          saveSyncConfig({
            requisitionId,
            accountIds,
            institutionName: budget.state.bank?.institutionName,
            importedIds: budget.state.bank?.importedIds || [],
          }).catch(() => {})
        } else {
          budget.setBank({ status: 'error', error: `Connection did not complete (status: ${status}).` })
        }
      })
      .catch((e) => budget.setBank({ status: 'error', error: e.message }))
    setShowSettings(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Picks up whatever the cron job found since the last visit, merges it in
  // (idempotent — already-imported transactions are skipped), and clears
  // the server-side queue. Runs on load and whenever the tab regains focus,
  // since that's the closest thing to "automatic" a static app can do.
  const syncing = useRef(false)
  useEffect(() => {
    if (budget.state.bank?.status !== 'linked') return

    const checkPending = async () => {
      if (syncing.current) return
      syncing.current = true
      try {
        const { items } = await getPendingSync()
        if (items.length > 0) {
          const imported = budget.importBankTransactions(items)
          await ackPendingSync(items.map((i) => i.id))
          if (imported > 0) {
            setToast(`${imported} new transaction${imported === 1 ? '' : 's'} synced from Revolut`)
            setTimeout(() => setToast(null), 5000)
          }
        }
      } catch {
        // Background check — fail silently, the manual "Sync now" button
        // in Settings still works and surfaces errors there.
      } finally {
        syncing.current = false
      }
    }

    checkPending()
    window.addEventListener('focus', checkPending)
    return () => window.removeEventListener('focus', checkPending)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget.state.bank?.status])

  return (
    <div className="app-shell" data-tab={tab}>
      <div className="ambient-glow" aria-hidden="true">
        <span className="ambient-blob ambient-blob--a" />
        <span className="ambient-blob ambient-blob--b" />
      </div>
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

      {toast && <div className="toast">{toast}</div>}
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
