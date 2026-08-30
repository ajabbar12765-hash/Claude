import { useState } from 'react'
import Modal from './Modal'

export default function GoalModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🎯')
  const [target, setTarget] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const value = Number(target)
    if (!name.trim() || !value || value <= 0) return
    onSave({ name: name.trim(), icon, target: value })
  }

  return (
    <Modal title="New savings goal" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" autoFocus required />
        </label>
        <label>
          Icon (emoji)
          <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} />
        </label>
        <label>
          Target amount
          <input type="number" min="0" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} required />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Create goal
          </button>
        </div>
      </form>
    </Modal>
  )
}
