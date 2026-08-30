import { useState } from 'react'
import { formatMoney } from '../lib/currency'
import { categoryById } from '../lib/calc'
import RecurringModal from './RecurringModal'

export default function RecurringView({ state, monthKey, actions }) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="view">
      <div className="view-header">
        <h2>Recurring Bills &amp; Income</h2>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          + Add recurring item
        </button>
      </div>

      <div className="card">
        {state.recurring.length === 0 ? (
          <p className="empty-hint">
            Add subscriptions, rent, or a paycheck that repeats every month. You'll be able to mark
            each one paid/received per month from here.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Due day</th>
                <th className="num">Amount</th>
                <th>Status this month</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {state.recurring.map((r) => {
                const cat = r.categoryId ? categoryById(state.categories, r.categoryId) : null
                const paid = actions.isRecurringPaid(monthKey, r.id)
                return (
                  <tr key={r.id}>
                    <td>
                      {r.kind === 'income' ? '💵' : '📅'} {r.name}
                    </td>
                    <td>{cat ? `${cat.icon} ${cat.name}` : <span className="text-muted">Income</span>}</td>
                    <td>{r.day}</td>
                    <td className="num">{formatMoney(r.amount, state.currency)}</td>
                    <td>
                      {paid ? (
                        <span className="pill pill--paid">
                          {r.kind === 'income' ? 'Received' : 'Paid'}
                        </span>
                      ) : (
                        <button className="btn btn--sm" onClick={() => actions.markRecurringPaid(monthKey, r)}>
                          Mark {r.kind === 'income' ? 'received' : 'paid'}
                        </button>
                      )}
                    </td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => actions.removeRecurring(r.id)} aria-label="Delete">
                        🗑
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <RecurringModal
          categories={state.categories}
          onSave={(entry) => {
            actions.addRecurring(entry)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
