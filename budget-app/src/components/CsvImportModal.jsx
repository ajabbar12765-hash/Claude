import { useRef, useState } from 'react'
import Modal from './Modal'
import { parseRevolutCsv } from '../lib/csvImport'
import { formatMoney } from '../lib/currency'
import { IconAlertTriangle, IconDownload } from './icons'

export default function CsvImportModal({ state, actions, onClose }) {
  const fileInput = useRef(null)
  const [preview, setPreview] = useState(null) // { items, income, expense, from, to }
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [fileName, setFileName] = useState('')

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    setPreview(null)
    setResult(null)
    try {
      const text = await file.text()
      const items = parseRevolutCsv(text)
      const income = items.filter((i) => i.amount > 0).reduce((s, i) => s + i.amount, 0)
      const expense = items.filter((i) => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0)
      const dates = items.map((i) => i.date).sort()
      setPreview({ items, income, expense, from: dates[0], to: dates[dates.length - 1] })
    } catch (err) {
      setError(err.message)
    }
  }

  const doImport = () => {
    if (!preview) return
    const imported = actions.importBankTransactions(preview.items)
    const skipped = preview.items.length - imported
    setResult({ imported, skipped })
    setPreview(null)
  }

  const reset = () => {
    setPreview(null)
    setError(null)
    setResult(null)
    setFileName('')
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <Modal title="Import from Revolut" onClose={onClose}>
      <div className="form">
        <div className="csv-steps">
          <p className="text-muted">
            In the Revolut app: go to your account → the <code>⋯</code> menu → <strong>Statement</strong>, pick a
            date range, and export as <strong>CSV</strong>. Then upload that file here.
          </p>
        </div>

        {!preview && !result && (
          <label className="btn btn--ghost csv-file-btn">
            <IconDownload size={14} /> {fileName || 'Choose CSV file'}
            <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={onFile} hidden />
          </label>
        )}

        {error && (
          <p className="bank-error">
            <IconAlertTriangle size={14} /> {error}
          </p>
        )}

        {preview && (
          <div className="csv-preview">
            <p>
              Found <strong>{preview.items.length}</strong> transaction{preview.items.length === 1 ? '' : 's'}
              {preview.from && preview.to ? ` from ${preview.from} to ${preview.to}` : ''}.
            </p>
            <p className="text-muted">
              <span className="text-pos">+{formatMoney(preview.income, state.currency)}</span> in ·{' '}
              <span className="text-neg">-{formatMoney(preview.expense, state.currency)}</span> out
            </p>
            <div className="form-actions" style={{ justifyContent: 'flex-start', gap: 10 }}>
              <button type="button" className="btn btn--primary" onClick={doImport}>
                Import {preview.items.length} transaction{preview.items.length === 1 ? '' : 's'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={reset}>
                Choose a different file
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="csv-preview">
            <p className="pill pill--paid" style={{ display: 'inline-flex' }}>
              Imported {result.imported} new transaction{result.imported === 1 ? '' : 's'}
            </p>
            {result.skipped > 0 && (
              <p className="empty-hint">
                Skipped {result.skipped} already imported previously.
              </p>
            )}
            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="btn btn--ghost" onClick={reset}>
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
