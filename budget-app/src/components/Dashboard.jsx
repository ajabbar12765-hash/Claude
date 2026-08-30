import { formatMoney } from '../lib/currency'
import { categoryBreakdown, monthTotals, monthTrend } from '../lib/calc'
import { lastNMonthKeys } from '../lib/dates'
import ProgressBar from './ProgressBar'
import TrendChart from './TrendChart'

export default function Dashboard({ state, month, monthKey, onTab }) {
  const { totalIncome, totalSpent, remaining, totalBudgeted } = monthTotals(month)
  const breakdown = categoryBreakdown(month, state.categories)
    .filter((b) => b.spent > 0 || b.budget > 0)
    .sort((a, b) => b.spent - a.spent)
  const trend = monthTrend(state.months, lastNMonthKeys(6, monthKey))
  const dueRecurring = state.recurring.filter((r) => r.active)

  return (
    <div className="view">
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Income</div>
          <div className="stat-value stat-value--pos">{formatMoney(totalIncome, state.currency)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spent</div>
          <div className="stat-value">{formatMoney(totalSpent, state.currency)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Remaining</div>
          <div className={`stat-value ${remaining >= 0 ? 'stat-value--pos' : 'stat-value--neg'}`}>
            {formatMoney(remaining, state.currency)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Budgeted</div>
          <div className="stat-value">{formatMoney(totalBudgeted, state.currency)}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Spending by category</h3>
            <button className="link-btn" onClick={() => onTab('budgets')}>
              Edit budgets
            </button>
          </div>
          {breakdown.length === 0 ? (
            <p className="empty-hint">No budgets or transactions yet this month.</p>
          ) : (
            <div className="category-list">
              {breakdown.map((b) => (
                <div className="category-row" key={b.category.id}>
                  <div className="category-row-top">
                    <span>
                      <span className="cat-icon">{b.category.icon}</span> {b.category.name}
                    </span>
                    <span className={b.over ? 'text-neg' : 'text-muted'}>
                      {formatMoney(b.spent, state.currency)}
                      {b.budget > 0 && ` / ${formatMoney(b.budget, state.currency)}`}
                    </span>
                  </div>
                  <ProgressBar pct={b.pct} over={b.over} color={b.category.color} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recurring bills this month</h3>
            <button className="link-btn" onClick={() => onTab('recurring')}>
              Manage
            </button>
          </div>
          {dueRecurring.length === 0 ? (
            <p className="empty-hint">No recurring bills set up yet.</p>
          ) : (
            <RecurringMini state={state} monthKey={monthKey} items={dueRecurring} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Income vs. expenses — last 6 months</h3>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-dot legend-dot--income" /> Income
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-dot--expense" /> Expense
            </span>
          </div>
        </div>
        <TrendChart data={trend} currency={state.currency} />
      </div>
    </div>
  )
}

function RecurringMini({ items, state, monthKey }) {
  return (
    <div className="recurring-mini-list">
      {items.slice(0, 5).map((r) => (
        <div className="recurring-mini-row" key={r.id}>
          <span>
            {r.kind === 'income' ? '💵' : '📅'} {r.name}
          </span>
          <span className="text-muted">{formatMoney(r.amount, state.currency)}</span>
        </div>
      ))}
      {items.length > 5 && <p className="empty-hint">+{items.length - 5} more in Recurring Bills</p>}
    </div>
  )
}
