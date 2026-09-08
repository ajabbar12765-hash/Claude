export default function Toasts({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind || 'info'}`}>
          <span onClick={() => onDismiss(t.id)}>{t.message}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action.onClick()
                onDismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
