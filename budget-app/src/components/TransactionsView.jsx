import { useMemo, useState } from 'react'
import { formatMoney } from '../lib/currency'
import { categoryById } from '../lib/calc'
import TransactionModal from './TransactionModal'
import { IconEdit, IconTrash, IconPlus } from './icons'

export default function TransactionsView({ state, month, monthKey, actions }) {
  const [modal, setModal] = useState(null) // { mode: 'add' | 'edit', tx }
  const [filterCat, setFilterCat] = useState('all')

  const transactions = useMemo(() => {
    const list = filterCat === 'all' ? month.transactions : month.transactions.filter((t) => t.categoryId === filterCat)
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [month.transactions, filterCat])

  const save = (data) => {
    if (modal.tx) {
      actions.updateTransaction(monthKey, modal.tx.id, data)
    } else {
      actions.addTransaction(monthKey, data)
    }
    setModal(null)
  }

  return (
    <div className="view">
      <div className="view-header">
        <h2>Transactions</h2>
        <div className="view-header-actions">
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">All categories</option>
            {state.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn--primary" onClick={() => setModal({ tx: null })}>
            <IconPlus size={15} /> Add transaction
          </button>
        </div>
      </div>

      <div className="card">
        {transactions.length === 0 ? (
          <p className="empty-hint">No transactions logged for this month yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th className="num">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const cat = categoryById(state.categories, t.categoryId)
                return (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>
                      {cat ? (
                        <span>
                          <span className="cat-icon">{cat.icon}</span> {cat.name}
                        </span>
                      ) : (
                        <span className="text-muted">Uncategorized</span>
                      )}
                    </td>
                    <td className="text-muted">{t.note || '—'}</td>
                    <td className="num">{formatMoney(t.amount, state.currency)}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => setModal({ tx: t })} aria-label="Edit">
                        <IconEdit size={15} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => actions.removeTransaction(monthKey, t.id)}
                        aria-label="Delete"
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <TransactionModal
          categories={state.categories}
          initial={modal.tx}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
