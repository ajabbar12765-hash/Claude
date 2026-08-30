import { useState } from 'react'
import { formatMoney } from '../lib/currency'
import { monthTotals } from '../lib/calc'
import CategoryModal from './CategoryModal'

export default function BudgetsView({ state, month, monthKey, actions }) {
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ source: '', amount: '' })
  const { totalIncome, totalBudgeted } = monthTotals(month)

  const addIncome = (e) => {
    e.preventDefault()
    const value = Number(incomeForm.amount)
    if (!incomeForm.source.trim() || !value || value <= 0) return
    actions.addIncome(monthKey, { source: incomeForm.source.trim(), amount: value })
    setIncomeForm({ source: '', amount: '' })
  }

  const changeBudget = (categoryId, value) => {
    actions.setBudget(monthKey, categoryId, Number(value) || 0)
  }

  return (
    <div className="view">
      <div className="view-header">
        <h2>Budgets &amp; Income</h2>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Income sources</h3>
          <span className="text-muted">Total: {formatMoney(totalIncome, state.currency)}</span>
        </div>
        {month.income.length > 0 && (
          <ul className="simple-list">
            {month.income.map((i) => (
              <li key={i.id}>
                <span>{i.source}</span>
                <span className="row-right">
                  <span className="text-pos">{formatMoney(i.amount, state.currency)}</span>
                  <button className="icon-btn" onClick={() => actions.removeIncome(monthKey, i.id)} aria-label="Remove">
                    🗑
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form className="inline-form" onSubmit={addIncome}>
          <input
            placeholder="Source (e.g. Salary)"
            value={incomeForm.source}
            onChange={(e) => setIncomeForm((f) => ({ ...f, source: e.target.value }))}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={incomeForm.amount}
            onChange={(e) => setIncomeForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <button type="submit" className="btn btn--primary">
            Add
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Category budgets</h3>
          <span className="text-muted">
            Total budgeted: {formatMoney(totalBudgeted, state.currency)}
          </span>
        </div>
        <ul className="simple-list">
          {state.categories.map((c) => (
            <li key={c.id}>
              <span>
                <span className="cat-icon">{c.icon}</span> {c.name}
              </span>
              <span className="row-right">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="budget-input"
                  value={month.budgets[c.id] ?? ''}
                  placeholder="0"
                  onChange={(e) => changeBudget(c.id, e.target.value)}
                />
                <button className="icon-btn" onClick={() => actions.removeCategory(c.id)} aria-label="Delete category">
                  🗑
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button className="btn btn--ghost" onClick={() => setShowCategoryModal(true)}>
          + New category
        </button>
      </div>

      {showCategoryModal && (
        <CategoryModal
          onSave={(cat) => {
            actions.addCategory(cat)
            setShowCategoryModal(false)
          }}
          onClose={() => setShowCategoryModal(false)}
        />
      )}
    </div>
  )
}
