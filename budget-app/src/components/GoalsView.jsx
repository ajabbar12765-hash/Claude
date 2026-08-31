import { useState } from 'react'
import { formatMoney } from '../lib/currency'
import { todayIso } from '../lib/dates'
import ProgressBar from './ProgressBar'
import GoalModal from './GoalModal'
import { IconTrash, IconPlus, IconSparkle } from './icons'

export default function GoalsView({ state, actions }) {
  const [showModal, setShowModal] = useState(false)
  const [contribAmount, setContribAmount] = useState({})

  const contribute = (goal) => {
    const value = Number(contribAmount[goal.id])
    if (!value) return
    actions.contributeToGoal(goal.id, value, todayIso())
    setContribAmount((c) => ({ ...c, [goal.id]: '' }))
  }

  return (
    <div className="view">
      <div className="view-header">
        <h2>Savings Goals</h2>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          <IconPlus size={15} /> New goal
        </button>
      </div>

      {state.goals.length === 0 ? (
        <div className="card">
          <p className="empty-hint">
            Set a target — an emergency fund, a trip, a down payment — and log contributions as you
            save toward it.
          </p>
        </div>
      ) : (
        <div className="goal-grid">
          {state.goals.map((g) => {
            const pct = g.target > 0 ? Math.min(1, g.saved / g.target) : 0
            const done = g.saved >= g.target
            return (
              <div className="card goal-card" key={g.id}>
                <div className="card-header">
                  <h3>
                    {g.icon} {g.name}
                  </h3>
                  <button className="icon-btn" onClick={() => actions.removeGoal(g.id)} aria-label="Delete goal">
                    <IconTrash size={15} />
                  </button>
                </div>
                <div className="goal-amounts">
                  <span className="text-pos">{formatMoney(g.saved, state.currency)}</span>
                  <span className="text-muted"> / {formatMoney(g.target, state.currency)}</span>
                </div>
                <ProgressBar pct={pct} color="#9ae6a3" />
                {done ? (
                  <p className="pill pill--paid" style={{ marginTop: 10 }}>
                    <IconSparkle size={13} /> Goal reached
                  </p>
                ) : (
                  <div className="inline-form" style={{ marginTop: 10 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Add contribution"
                      value={contribAmount[g.id] || ''}
                      onChange={(e) => setContribAmount((c) => ({ ...c, [g.id]: e.target.value }))}
                    />
                    <button className="btn btn--sm" onClick={() => contribute(g)}>
                      Add
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <GoalModal
          onSave={(goal) => {
            actions.addGoal(goal)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
