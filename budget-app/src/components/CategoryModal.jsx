import { useState } from 'react'
import Modal from './Modal'

const SWATCHES = ['#7c9cff', '#5fd0c0', '#f2b84b', '#f47b8f', '#c792ea', '#6fcf97', '#ff9f68', '#4fb6f0']

export default function CategoryModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏷️')
  const [color, setColor] = useState(SWATCHES[0])

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), icon, color })
  }

  return (
    <Modal title="New category" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>
        <label>
          Icon (emoji)
          <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} />
        </label>
        <label>
          Color
          <div className="swatch-row">
            {SWATCHES.map((s) => (
              <button
                type="button"
                key={s}
                className={`swatch${color === s ? ' swatch--active' : ''}`}
                style={{ background: s }}
                onClick={() => setColor(s)}
                aria-label={s}
              />
            ))}
          </div>
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Add category
          </button>
        </div>
      </form>
    </Modal>
  )
}
