import { useEffect, useState, useCallback, useMemo } from 'react'
import { load, save } from './storage'
import { createDefaultState, emptyMonth } from './defaultState'
import { makeId } from './id'
import { monthKey as currentMonthKey } from './dates'

const STORE_KEY = 'state'

function withMonth(state, key) {
  if (state.months[key]) return state
  return { ...state, months: { ...state.months, [key]: emptyMonth() } }
}

export function useBudget() {
  const [state, setState] = useState(() => {
    const loaded = load(STORE_KEY, null)
    return loaded ? { ...createDefaultState(), ...loaded } : createDefaultState()
  })

  useEffect(() => {
    save(STORE_KEY, state)
  }, [state])

  const getMonth = useCallback(
    (key) => state.months[key] || emptyMonth(),
    [state.months]
  )

  const touchMonth = useCallback((key) => {
    setState((s) => withMonth(s, key))
  }, [])

  const setCurrency = useCallback((code) => {
    setState((s) => ({ ...s, currency: code }))
  }, [])

  // --- income ---
  const addIncome = useCallback((key, entry) => {
    setState((s) => {
      const s2 = withMonth(s, key)
      const m = s2.months[key]
      const income = [...m.income, { id: makeId(), ...entry }]
      return { ...s2, months: { ...s2.months, [key]: { ...m, income } } }
    })
  }, [])

  const removeIncome = useCallback((key, id) => {
    setState((s) => {
      const m = s.months[key]
      if (!m) return s
      const income = m.income.filter((i) => i.id !== id)
      const recurringPaid = s.recurringPaid.filter(
        (p) => !(p.monthKey === key && p.linkId === id)
      )
      return { ...s, recurringPaid, months: { ...s.months, [key]: { ...m, income } } }
    })
  }, [])

  // --- budgets ---
  const setBudget = useCallback((key, categoryId, amount) => {
    setState((s) => {
      const s2 = withMonth(s, key)
      const m = s2.months[key]
      const budgets = { ...m.budgets, [categoryId]: amount }
      return { ...s2, months: { ...s2.months, [key]: { ...m, budgets } } }
    })
  }, [])

  // --- transactions ---
  const addTransaction = useCallback((key, entry) => {
    setState((s) => {
      const s2 = withMonth(s, key)
      const m = s2.months[key]
      const transactions = [...m.transactions, { id: makeId(), ...entry }]
      return { ...s2, months: { ...s2.months, [key]: { ...m, transactions } } }
    })
  }, [])

  const updateTransaction = useCallback((key, id, patch) => {
    setState((s) => {
      const m = s.months[key]
      if (!m) return s
      const transactions = m.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t))
      return { ...s, months: { ...s.months, [key]: { ...m, transactions } } }
    })
  }, [])

  const removeTransaction = useCallback((key, id) => {
    setState((s) => {
      const m = s.months[key]
      if (!m) return s
      const transactions = m.transactions.filter((t) => t.id !== id)
      const recurringPaid = s.recurringPaid.filter(
        (p) => !(p.monthKey === key && p.linkId === id)
      )
      return { ...s, recurringPaid, months: { ...s.months, [key]: { ...m, transactions } } }
    })
  }, [])

  // --- categories ---
  const addCategory = useCallback((cat) => {
    setState((s) => ({
      ...s,
      categories: [...s.categories, { id: makeId(), type: 'expense', ...cat }],
    }))
  }, [])

  const removeCategory = useCallback((id) => {
    setState((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }))
  }, [])

  // --- recurring ---
  const addRecurring = useCallback((entry) => {
    setState((s) => ({
      ...s,
      recurring: [...s.recurring, { id: makeId(), active: true, ...entry }],
    }))
  }, [])

  const removeRecurring = useCallback((id) => {
    setState((s) => ({
      ...s,
      recurring: s.recurring.filter((r) => r.id !== id),
      recurringPaid: s.recurringPaid.filter((p) => p.recurringId !== id),
    }))
  }, [])

  const isRecurringPaid = useCallback(
    (key, recurringId) =>
      state.recurringPaid.some((p) => p.monthKey === key && p.recurringId === recurringId),
    [state.recurringPaid]
  )

  const markRecurringPaid = useCallback((key, recurring) => {
    setState((s) => {
      const s2 = withMonth(s, key)
      const m = s2.months[key]
      const linkId = makeId()
      let months
      if (recurring.kind === 'income') {
        const income = [
          ...m.income,
          { id: linkId, source: recurring.name, amount: recurring.amount, recurringId: recurring.id },
        ]
        months = { ...s2.months, [key]: { ...m, income } }
      } else {
        const transactions = [
          ...m.transactions,
          {
            id: linkId,
            categoryId: recurring.categoryId,
            amount: recurring.amount,
            note: recurring.name,
            date: `${key}-${String(Math.min(recurring.day || 1, 28)).padStart(2, '0')}`,
            recurringId: recurring.id,
          },
        ]
        months = { ...s2.months, [key]: { ...m, transactions } }
      }
      const recurringPaid = [
        ...s2.recurringPaid,
        { monthKey: key, recurringId: recurring.id, linkId },
      ]
      return { ...s2, months, recurringPaid }
    })
  }, [])

  // --- goals ---
  const addGoal = useCallback((goal) => {
    setState((s) => ({
      ...s,
      goals: [...s.goals, { id: makeId(), saved: 0, contributions: [], ...goal }],
    }))
  }, [])

  const removeGoal = useCallback((id) => {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }))
  }, [])

  const contributeToGoal = useCallback((id, amount, date) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              saved: Math.max(0, (g.saved || 0) + amount),
              contributions: [...(g.contributions || []), { id: makeId(), amount, date }],
            }
          : g
      ),
    }))
  }, [])

  const resetAll = useCallback(() => {
    setState(createDefaultState())
  }, [])

  // --- bank connection (GoCardless / Revolut) ---
  const setBank = useCallback((patch) => {
    setState((s) => ({ ...s, bank: { ...(s.bank || {}), ...patch } }))
  }, [])

  const clearBank = useCallback(() => {
    setState((s) => ({ ...s, bank: null }))
  }, [])

  // Imports normalized bank transactions (see src/lib/gocardless.js), skipping
  // any whose id was already imported. Negative amounts become expense
  // transactions, positive amounts become income entries.
  const importBankTransactions = useCallback((items) => {
    let imported = 0
    setState((s) => {
      const alreadyImported = new Set(s.bank?.importedIds || [])
      const fallbackCategoryId =
        s.categories.find((c) => c.name === 'Other')?.id || s.categories[0]?.id

      let months = s.months
      const newIds = []

      for (const item of items) {
        if (!item.id || alreadyImported.has(item.id) || item.pending || !item.date || !item.amount) continue
        const key = item.date.slice(0, 7)
        months = withMonth({ months }, key).months
        const m = months[key]

        if (item.amount < 0) {
          const transactions = [
            ...m.transactions,
            {
              id: makeId(),
              categoryId: fallbackCategoryId,
              amount: Math.abs(item.amount),
              note: item.description,
              date: item.date,
              externalId: item.id,
            },
          ]
          months = { ...months, [key]: { ...m, transactions } }
        } else {
          const income = [
            ...m.income,
            { id: makeId(), source: item.description, amount: item.amount, externalId: item.id },
          ]
          months = { ...months, [key]: { ...m, income } }
        }
        newIds.push(item.id)
        imported++
      }

      if (newIds.length === 0) return s
      return {
        ...s,
        months,
        bank: { ...(s.bank || {}), importedIds: [...alreadyImported, ...newIds], lastSyncedAt: Date.now() },
      }
    })
    return imported
  }, [])

  return useMemo(
    () => ({
      state,
      getMonth,
      touchMonth,
      setCurrency,
      addIncome,
      removeIncome,
      setBudget,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addCategory,
      removeCategory,
      addRecurring,
      removeRecurring,
      isRecurringPaid,
      markRecurringPaid,
      addGoal,
      removeGoal,
      contributeToGoal,
      resetAll,
      setBank,
      clearBank,
      importBankTransactions,
    }),
    [
      state,
      getMonth,
      touchMonth,
      setCurrency,
      addIncome,
      removeIncome,
      setBudget,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addCategory,
      removeCategory,
      addRecurring,
      removeRecurring,
      isRecurringPaid,
      markRecurringPaid,
      addGoal,
      removeGoal,
      contributeToGoal,
      resetAll,
      setBank,
      clearBank,
      importBankTransactions,
    ]
  )
}

export { currentMonthKey }
