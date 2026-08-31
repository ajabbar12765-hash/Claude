import { makeId } from './id'

export const DEFAULT_CATEGORIES = [
  { name: 'Housing', icon: '🏠', color: '#7c9cff' },
  { name: 'Utilities', icon: '💡', color: '#5fd0c0' },
  { name: 'Groceries', icon: '🛒', color: '#f2b84b' },
  { name: 'Transportation', icon: '🚗', color: '#f47b8f' },
  { name: 'Dining Out', icon: '🍽️', color: '#c792ea' },
  { name: 'Health', icon: '🩺', color: '#6fcf97' },
  { name: 'Entertainment', icon: '🎬', color: '#ff9f68' },
  { name: 'Shopping', icon: '🛍️', color: '#4fb6f0' },
  { name: 'Savings', icon: '🐖', color: '#9ae6a3' },
  { name: 'Other', icon: '📦', color: '#9aa5b1' },
].map((c) => ({ id: makeId(), type: 'expense', ...c }))

export function createDefaultState() {
  return {
    version: 1,
    currency: 'PKR',
    categories: DEFAULT_CATEGORIES,
    months: {},
    recurring: [],
    recurringPaid: [],
    goals: [],
    bank: null,
  }
}

export function emptyMonth() {
  return {
    income: [],
    budgets: {},
    transactions: [],
  }
}
