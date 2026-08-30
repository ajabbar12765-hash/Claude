export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function shortMonthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short' })
}

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function isCurrentMonth(key) {
  return key === monthKey(new Date())
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function lastNMonthKeys(n, endKey = monthKey(new Date())) {
  const out = []
  let k = endKey
  for (let i = 0; i < n; i++) {
    out.unshift(k)
    k = shiftMonth(k, -1)
  }
  return out
}
