// Parses a Revolut transaction statement export (CSV) into the same shape
// useBudget's importBankTransactions() already expects — { id, date, amount,
// description, pending } — so CSV import reuses the exact same dedupe +
// bucketing logic as the (currently unavailable) live bank sync.
//
// Revolut's export columns have shifted a little across app versions/regions,
// so headers are matched by name (case-insensitive) with a few fallbacks
// rather than by fixed position.

const HEADER_CANDIDATES = {
  date: ['completed date', 'date completed', 'started date', 'date started', 'date'],
  description: ['description', 'merchant', 'reference'],
  amount: ['amount'],
  state: ['state', 'status'],
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

// Minimal RFC4180-ish CSV parser: handles quoted fields, embedded commas,
// and "" as an escaped quote. Does not support embedded newlines inside a
// quoted field spanning the whole file oddly, but Revolut's export doesn't
// need that.
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.length > 1 || row[0] !== '') rows.push(row)
  }
  return rows
}

function normalizeHeader(h) {
  return h.trim().toLowerCase()
}

function findColumn(headers, candidates) {
  for (const candidate of candidates) {
    const idx = headers.indexOf(candidate)
    if (idx !== -1) return idx
  }
  return -1
}

// Small non-cryptographic hash for a stable dedupe id, since CSV rows have
// no transaction id of their own.
function fnv1aHex(str) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

function toIsoDate(raw) {
  if (!raw) return null
  const s = raw.trim()
  // Revolut format: "2024-01-15 10:23:45" — also tolerate a plain date.
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

export function parseRevolutCsv(text) {
  const rows = parseCsv(stripBom(text))
  if (rows.length < 2) {
    throw new Error('No data rows found in this file.')
  }

  const headers = rows[0].map(normalizeHeader)
  const dateCol = findColumn(headers, HEADER_CANDIDATES.date)
  const descCol = findColumn(headers, HEADER_CANDIDATES.description)
  const amountCol = findColumn(headers, HEADER_CANDIDATES.amount)
  const stateCol = findColumn(headers, HEADER_CANDIDATES.state)

  if (dateCol === -1 || amountCol === -1) {
    throw new Error(
      "Couldn't find date/amount columns. Make sure this is a Revolut transaction statement exported as CSV."
    )
  }

  const seen = new Map()
  const items = []

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r]
    if (cols.length < 2) continue

    const date = toIsoDate(cols[dateCol])
    const amount = Number(cols[amountCol])
    const description = (descCol !== -1 ? cols[descCol] : '').trim() || 'Transaction'
    const state = stateCol !== -1 ? cols[stateCol].trim().toUpperCase() : 'COMPLETED'

    if (!date || !Number.isFinite(amount) || amount === 0) continue
    if (state && state !== 'COMPLETED') continue // skip pending/declined/reverted rows

    const key = `${date}|${description}|${amount}`
    const occurrence = (seen.get(key) || 0) + 1
    seen.set(key, occurrence)
    const id = `csv-${fnv1aHex(occurrence > 1 ? `${key}#${occurrence}` : key)}`

    items.push({ id, date, amount, description, pending: false })
  }

  if (items.length === 0) {
    throw new Error('No completed transactions found in this file.')
  }

  return items
}
