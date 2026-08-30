import { useState } from 'react'
import Modal from './Modal'
import { todayIso } from '../lib/dates'

export default function TransactionModal({ categories, initial, onSave, onClose }) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId || categories[0]?.id || '')
  const [amount, setAmount] = useState(initial?.amount ?? '')
  const [note, setNote] = useState(initial?.note || '')
  const [date, setDate] = useState(initial?.date || todayIso())

  const submit = (e) => {
    e.preventDefault()
    const value = Number(amount)
    if (!categoryId || !value || value <= 0) return
    onSave({ categoryId, amount: value, note: note.trim(), date })
  }

  return (
    <Modal title={initial ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            required
          />
        </label>
        <label>
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekly groceries" />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            {initial ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
