export function monthTotals(month) {
  const totalIncome = month.income.reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const totalSpent = month.transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalBudgeted = Object.values(month.budgets || {}).reduce(
    (sum, v) => sum + Number(v || 0),
    0
  )
  return {
    totalIncome,
    totalSpent,
    totalBudgeted,
    remaining: totalIncome - totalSpent,
    unbudgeted: totalIncome - totalBudgeted,
  }
}

export function categoryBreakdown(month, categories) {
  const spentByCategory = {}
  for (const t of month.transactions) {
    spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + Number(t.amount || 0)
  }
  return categories.map((c) => {
    const spent = spentByCategory[c.id] || 0
    const budget = Number(month.budgets?.[c.id] || 0)
    return {
      category: c,
      spent,
      budget,
      remaining: budget - spent,
      pct: budget > 0 ? Math.min(1, spent / budget) : spent > 0 ? 1 : 0,
      over: budget > 0 && spent > budget,
    }
  })
}

export function categoryById(categories, id) {
  return categories.find((c) => c.id === id)
}

export function monthTrend(months, keys) {
  return keys.map((key) => {
    const m = months[key] || { income: [], transactions: [] }
    const { totalIncome, totalSpent } = monthTotals(m)
    return { key, income: totalIncome, expense: totalSpent }
  })
}
