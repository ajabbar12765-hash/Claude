export default function ProgressBar({ pct, over, color }) {
  return (
    <div className="progress-track">
      <div
        className={`progress-fill${over ? ' progress-fill--over' : ''}`}
        style={{ width: `${Math.round((pct || 0) * 100)}%`, background: over ? undefined : color }}
      />
    </div>
  )
}
