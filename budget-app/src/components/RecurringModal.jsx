import { useState } from 'react'
import Modal from './Modal'

export default function RecurringModal({ categories, onSave, onClose }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState('expense')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [day, setDay] = useState(1)

  const submit = (e) => {
    e.preventDefault()
    const value = Number(amount)
    if (!name.trim() || !value || value <= 0) return
    onSave({
      name: name.trim(),
      amount: value,
      kind,
      categoryId: kind === 'expense' ? categoryId : null,
      day: Number(day) || 1,
    })
  }

  return (
    <Modal title="New recurring item" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent, Netflix" autoFocus required />
        </label>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="expense">Bill / expense</option>
            <option value="income">Recurring income</option>
          </select>
        </label>
        {kind === 'expense' && (
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
        )}
        <label>
          Amount
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          Day of month due
          <input type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Add recurring item
          </button>
        </div>
      </form>
    </Modal>
  )
}
