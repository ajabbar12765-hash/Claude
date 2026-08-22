// The one data shape every source (Health Auto Export, the generic ingest
// schema, manual CSV) gets normalized into before it's stored, and the
// helpers /api/data uses to turn the flat day-record map into a dashboard
// payload.

const NUMERIC_FIELDS = [
  'steps',
  'distanceKm',
  'activeCalories',
  'totalCalories',
  'restingHr',
  'avgHr',
  'maxHr',
  'minHr',
  'spo2Avg',
  'stressAvg',
  'weightKg',
  'bodyFatPct',
]

const SLEEP_NUMERIC_FIELDS = ['totalMin', 'deepMin', 'lightMin', 'remMin', 'awakeMin', 'score']

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object' || !raw.date) return null
  const date = String(raw.date).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  const record = { date }
  for (const f of NUMERIC_FIELDS) {
    const v = toNumberOrNull(raw[f])
    if (v !== null) record[f] = v
  }

  if (raw.sleep && typeof raw.sleep === 'object') {
    const sleep = {}
    for (const f of SLEEP_NUMERIC_FIELDS) {
      const v = toNumberOrNull(raw.sleep[f])
      if (v !== null) sleep[f] = v
    }
    if (raw.sleep.start) sleep.start = String(raw.sleep.start)
    if (raw.sleep.end) sleep.end = String(raw.sleep.end)
    if (Object.keys(sleep).length) record.sleep = sleep
  }

  if (Array.isArray(raw.workouts)) {
    record.workouts = raw.workouts
      .map((w) => {
        if (!w || !w.start) return null
        return {
          id: w.id || `${w.type || 'workout'}-${w.start}`,
          type: w.type || 'Workout',
          start: String(w.start),
          end: w.end ? String(w.end) : null,
          durationMin: toNumberOrNull(w.durationMin) ?? undefined,
          calories: toNumberOrNull(w.calories) ?? undefined,
          avgHr: toNumberOrNull(w.avgHr) ?? undefined,
          maxHr: toNumberOrNull(w.maxHr) ?? undefined,
          distanceKm: toNumberOrNull(w.distanceKm) ?? undefined,
        }
      })
      .filter(Boolean)
  }

  return record
}

function mergeRecord(existing, incoming) {
  const merged = { ...existing, ...incoming, date: incoming.date }
  if (existing?.sleep || incoming.sleep) {
    merged.sleep = { ...(existing?.sleep || {}), ...(incoming.sleep || {}) }
  }
  if (existing?.workouts?.length || incoming.workouts?.length) {
    const byId = new Map((existing?.workouts || []).map((w) => [w.id, w]))
    for (const w of incoming.workouts || []) byId.set(w.id, { ...byId.get(w.id), ...w })
    merged.workouts = [...byId.values()].sort((a, b) => a.start.localeCompare(b.start))
  }
  return merged
}

// Mutates `store.records` in place, returns the list of dates touched.
export function mergeIntoStore(store, rawRecords) {
  if (!store.records) store.records = {}
  const touched = []
  for (const raw of rawRecords) {
    const normalized = normalizeRecord(raw)
    if (!normalized) continue
    store.records[normalized.date] = mergeRecord(store.records[normalized.date], normalized)
    touched.push(normalized.date)
  }
  store.updatedAt = new Date().toISOString()
  return [...new Set(touched)]
}

export function sortedDates(store) {
  return Object.keys(store.records || {}).sort()
}

export function recordsInRange(store, days) {
  const dates = sortedDates(store)
  const slice = days === 'all' ? dates : dates.slice(-days)
  return slice.map((d) => store.records[d])
}

function average(values) {
  const nums = values.filter((v) => typeof v === 'number')
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// Most recent non-null value for a field, scanning backward from today.
function latest(dates, store, field, sub) {
  for (let i = dates.length - 1; i >= 0; i--) {
    const r = store.records[dates[i]]
    const v = sub ? r?.[sub]?.[field] : r?.[field]
    if (typeof v === 'number') return { value: v, date: dates[i] }
  }
  return null
}

export function computeSummary(store, rangeDays) {
  const allDates = sortedDates(store)
  const todayKey = new Date().toISOString().slice(0, 10)
  const today = store.records[todayKey] || null

  const range = recordsInRange(store, rangeDays)
  const prevCount = range.length
  const prevRange =
    rangeDays === 'all' ? [] : allDates.slice(-rangeDays * 2, -rangeDays).map((d) => store.records[d])

  const trend = (field) => {
    const cur = average(range.map((r) => r[field]))
    const prev = average(prevRange.map((r) => r[field]))
    return { avg: cur, prevAvg: prev, deltaPct: cur != null && prev ? ((cur - prev) / prev) * 100 : null }
  }

  let streak = 0
  for (let i = allDates.length - 1; i >= 0; i--) {
    const steps = store.records[allDates[i]]?.steps
    if (typeof steps === 'number' && steps > 0) streak++
    else break
  }

  return {
    today,
    todayDate: todayKey,
    daysLogged: allDates.length,
    firstDate: allDates[0] || null,
    lastDate: allDates[allDates.length - 1] || null,
    streak,
    latest: {
      restingHr: latest(allDates, store, 'restingHr'),
      weightKg: latest(allDates, store, 'weightKg'),
      spo2Avg: latest(allDates, store, 'spo2Avg'),
      bodyFatPct: latest(allDates, store, 'bodyFatPct'),
    },
    trend: {
      steps: trend('steps'),
      activeCalories: trend('activeCalories'),
      distanceKm: trend('distanceKm'),
      avgHr: trend('avgHr'),
      stressAvg: trend('stressAvg'),
      sleepTotalMin: {
        avg: average(range.map((r) => r.sleep?.totalMin)),
        prevAvg: average(prevRange.map((r) => r.sleep?.totalMin)),
      },
    },
    series: range.map((r) => ({
      date: r.date,
      steps: r.steps ?? null,
      activeCalories: r.activeCalories ?? null,
      distanceKm: r.distanceKm ?? null,
      avgHr: r.avgHr ?? null,
      restingHr: r.restingHr ?? null,
      spo2Avg: r.spo2Avg ?? null,
      stressAvg: r.stressAvg ?? null,
      weightKg: r.weightKg ?? null,
      sleepTotalMin: r.sleep?.totalMin ?? null,
      sleepDeepMin: r.sleep?.deepMin ?? null,
      sleepRemMin: r.sleep?.remMin ?? null,
      sleepLightMin: r.sleep?.lightMin ?? null,
    })),
    recentWorkouts: range
      .flatMap((r) => r.workouts || [])
      .sort((a, b) => b.start.localeCompare(a.start))
      .slice(0, 20),
    rangeCount: prevCount,
  }
}
