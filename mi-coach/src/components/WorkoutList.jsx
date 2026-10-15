function formatWhen(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function WorkoutList({ workouts }) {
  if (!workouts?.length) {
    return <div className="workout-empty">No workouts logged in this range.</div>
  }

  return (
    <ul className="workout-list">
      {workouts.map((w) => (
        <li key={w.id} className="workout-item">
          <div className="workout-item-main">
            <span className="workout-item-type">{w.type}</span>
            <span className="workout-item-when">{formatWhen(w.start)}</span>
          </div>
          <div className="workout-item-stats">
            {w.durationMin != null && <span>{Math.round(w.durationMin)} min</span>}
            {w.calories != null && <span>{Math.round(w.calories)} kcal</span>}
            {w.distanceKm != null && <span>{w.distanceKm.toFixed(2)} km</span>}
            {w.avgHr != null && <span>{Math.round(w.avgHr)} bpm avg</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
