// Minimal CSV parsing for the manual-import template. No quoting edge
// cases to worry about since the template only ever contains plain numbers
// and ISO dates/timestamps.

export const CSV_COLUMNS = [
  'date', 'steps', 'distanceKm', 'activeCalories', 'totalCalories',
  'restingHr', 'avgHr', 'maxHr', 'minHr', 'spo2Avg', 'stressAvg',
  'weightKg', 'bodyFatPct',
  'sleepTotalMin', 'sleepDeepMin', 'sleepLightMin', 'sleepRemMin', 'sleepAwakeMin',
]

export const CSV_TEMPLATE =
  CSV_COLUMNS.join(',') + '\n' +
  '2026-08-20,9820,7.1,412,2180,58,74,132,52,97,28,71.4,18.2,430,88,64,210,12\n' +
  '2026-08-21,6110,4.3,260,2030,57,71,118,53,98,24,71.2,18.0,455,95,70,220,10\n'

export function parseCSV(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map((h) => h.trim())

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    const row = {}
    header.forEach((key, i) => {
      if (cells[i] !== undefined && cells[i] !== '') row[key] = cells[i]
    })
    return row
  })
}

export function rowsToRecords(rows) {
  return rows
    .filter((r) => r.date)
    .map((r) => {
      const record = { date: r.date }
      for (const key of CSV_COLUMNS) {
        if (key === 'date' || !(key in r)) continue
        if (key.startsWith('sleep')) continue
        record[key] = r[key]
      }
      const sleepMap = {
        sleepTotalMin: 'totalMin', sleepDeepMin: 'deepMin', sleepLightMin: 'lightMin',
        sleepRemMin: 'remMin', sleepAwakeMin: 'awakeMin',
      }
      const sleep = {}
      for (const [csvKey, field] of Object.entries(sleepMap)) {
        if (r[csvKey] !== undefined) sleep[field] = r[csvKey]
      }
      if (Object.keys(sleep).length) record.sleep = sleep
      return record
    })
}
