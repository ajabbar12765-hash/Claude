import { useState } from 'react'
import Modal from './Modal'
import { CURRENCIES } from '../lib/currency'
import { IconDownload } from './icons'
import BankConnect from './BankConnect'
import CsvImportModal from './CsvImportModal'

export default function SettingsModal({ state, actions, onClose }) {
  const [showImport, setShowImport] = useState(false)

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
    <Modal title="Settings" onClose={onClose} wide>
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

        <div className="settings-section">
          <h4 className="settings-section-title">Import from Revolut</h4>
          <p className="text-muted" style={{ marginBottom: 8 }}>
            Works today, no setup: export a statement from the Revolut app and upload it here.
          </p>
          <button type="button" className="btn btn--primary" onClick={() => setShowImport(true)}>
            <IconDownload size={14} /> Import CSV
          </button>
        </div>

        <div className="settings-section">
          <h4 className="settings-section-title">Bank connection (Open Banking, optional)</h4>
          <BankConnect state={state} actions={actions} />
        </div>

        <div>
          <p className="text-muted" style={{ marginBottom: 8 }}>
            All data is stored only in this browser (localStorage) — nothing is sent anywhere.
          </p>
          <button type="button" className="btn btn--ghost" onClick={exportData}>
            <IconDownload size={14} /> Export data as JSON
          </button>
        </div>

        <div>
          <button type="button" className="btn btn--danger" onClick={confirmReset}>
            Reset all data
          </button>
        </div>
      </div>

      {showImport && <CsvImportModal state={state} actions={actions} onClose={() => setShowImport(false)} />}
    </Modal>
  )
}
