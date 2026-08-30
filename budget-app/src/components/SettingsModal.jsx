import Modal from './Modal'
import { CURRENCIES } from '../lib/currency'

export default function SettingsModal({ state, actions, onClose }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const confirmReset = () => {
    if (window.confirm('This deletes all budget data stored in this browser. Continue?')) {
      actions.resetAll()
      onClose()
    }
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="form">
        <label>
          Currency
          <select value={state.currency} onChange={(e) => actions.setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-muted" style={{ marginBottom: 8 }}>
            All data is stored only in this browser (localStorage) — nothing is sent anywhere.
          </p>
          <button type="button" className="btn btn--ghost" onClick={exportData}>
            Export data as JSON
          </button>
        </div>

        <div>
          <button type="button" className="btn btn--danger" onClick={confirmReset}>
            Reset all data
          </button>
        </div>
      </div>
    </Modal>
  )
}
