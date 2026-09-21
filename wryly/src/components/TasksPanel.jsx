import { useState } from 'react'

export function TasksPanel({ tasks, onAdd, onToggle, onDelete }) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState('')
  const openTasks = tasks.filter((t) => !t.done)
  const doneTasks = tasks.filter((t) => t.done)

  function submit(e) {
    e.preventDefault()
    const text = value.trim()
    if (!text) return
    onAdd(text)
    setValue('')
  }

  return (
    <div className="tasks-panel">
      <button className="tasks-header" onClick={() => setOpen((o) => !o)} type="button">
        <span>Tasks{openTasks.length > 0 ? ` (${openTasks.length})` : ''}</span>
        <span className="chevron">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <>
          <form className="task-add" onSubmit={submit}>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Add a task…"
            />
            <button type="submit" disabled={!value.trim()}>
              +
            </button>
          </form>

          <div className="task-list">
            {tasks.length === 0 && <div className="task-empty">Nothing here yet. Keeper's bored.</div>}
            {openTasks.map((t) => (
              <label key={t.id} className="task-item">
                <input type="checkbox" checked={false} onChange={() => onToggle(t.id)} />
                <span>{t.text}</span>
                <button type="button" className="task-delete" onClick={() => onDelete(t.id)}>
                  ✕
                </button>
              </label>
            ))}
            {doneTasks.length > 0 && (
              <div className="task-done-group">
                {doneTasks.map((t) => (
                  <label key={t.id} className="task-item done">
                    <input type="checkbox" checked={true} onChange={() => onToggle(t.id)} />
                    <span>{t.text}</span>
                    <button type="button" className="task-delete" onClick={() => onDelete(t.id)}>
                      ✕
                    </button>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
