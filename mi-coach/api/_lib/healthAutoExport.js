// Best-effort converter for the "Health Auto Export" iOS app's JSON export
// format into our generic day-record schema.
//
// Why this exists: Mi Fitness has no public API, but on iOS it writes
// steps/heart rate/sleep/workouts into Apple Health, and Health Auto Export
// (a free/cheap iOS app) can then push that Health data to a webhook on a
// schedule. That makes it the closest thing to an automatic Mi Fitness sync
// this app can offer. Field names/shapes have shifted across HAE versions,
// so every lookup here is defensive rather than assuming one exact shape.

function dateKey(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const m = s.match(/^\d{4}-\d{2}-\d{2}/)
  return m ? m[0] : null
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toKcal(qty, units) {
  const n = num(qty)
  if (n === null) return null
  if (/kj/i.test(units || '')) return n / 4.184
  return n
}

function toKm(qty, units) {
  const n = num(qty)
  if (n === null) return null
  if (/mi\b/i.test(units || '')) return n * 1.60934
  if (/^m$/i.test((units || '').trim())) return n / 1000
  return n
}

function toKg(qty, units) {
  const n = num(qty)
  if (n === null) return null
  if (/lb/i.test(units || '')) return n * 0.453592
  return n
}

function toPercent(n) {
  if (n === null) return null
  return n <= 1 ? n * 100 : n
}

function bucketAdd(bucket, date, field, value, mode) {
  if (date === null || value === null || value === undefined) return
  if (!bucket[date]) bucket[date] = {}
  const cur = bucket[date][field]
  if (mode === 'sum') bucket[date][field] = (cur || 0) + value
  else if (mode === 'max') bucket[date][field] = cur === undefined ? value : Math.max(cur, value)
  else if (mode === 'min') bucket[date][field] = cur === undefined ? value : Math.min(cur, value)
  else if (mode === 'avg') {
    const list = (bucket[date][`_${field}_list`] ||= [])
    list.push(value)
    bucket[date][field] = list.reduce((a, b) => a + b, 0) / list.length
  } else {
    bucket[date][field] = value // 'last'
  }
}

const STEP_NAMES = new Set(['step_count', 'steps'])
const DISTANCE_NAMES = new Set(['walking_running_distance', 'distance_walking_running'])
const ACTIVE_ENERGY_NAMES = new Set(['active_energy', 'active_energy_burned'])
const BASAL_ENERGY_NAMES = new Set(['basal_energy_burned', 'resting_energy'])
const HR_NAMES = new Set(['heart_rate'])
const RESTING_HR_NAMES = new Set(['resting_heart_rate'])
const SPO2_NAMES = new Set(['oxygen_saturation', 'blood_oxygen_saturation'])
const STRESS_NAMES = new Set(['stress', 'stress_level', 'mindful_minutes'])
const WEIGHT_NAMES = new Set(['weight_body_mass', 'body_mass'])
const BODY_FAT_NAMES = new Set(['body_fat_percentage'])
const SLEEP_NAMES = new Set(['sleep_analysis'])

export function isHealthAutoExportPayload(body) {
  return !!(body && body.data && (Array.isArray(body.data.metrics) || Array.isArray(body.data.workouts)))
}

export function convertHealthAutoExport(body) {
  const bucket = {}
  const metrics = body?.data?.metrics || []

  for (const metric of metrics) {
    const name = String(metric?.name || '').toLowerCase()
    const units = metric?.units || ''
    const points = Array.isArray(metric?.data) ? metric.data : []

    for (const p of points) {
      const date = dateKey(p.date || p.Date)
      if (!date) continue

      if (STEP_NAMES.has(name)) bucketAdd(bucket, date, 'steps', num(p.qty), 'sum')
      else if (DISTANCE_NAMES.has(name)) bucketAdd(bucket, date, 'distanceKm', toKm(p.qty, units), 'sum')
      else if (ACTIVE_ENERGY_NAMES.has(name)) bucketAdd(bucket, date, 'activeCalories', toKcal(p.qty, units), 'sum')
      else if (BASAL_ENERGY_NAMES.has(name)) bucketAdd(bucket, date, 'basalCalories', toKcal(p.qty, units), 'sum')
      else if (RESTING_HR_NAMES.has(name)) bucketAdd(bucket, date, 'restingHr', num(p.qty ?? p.Avg), 'avg')
      else if (SPO2_NAMES.has(name)) bucketAdd(bucket, date, 'spo2Avg', toPercent(num(p.qty ?? p.Avg)), 'avg')
      else if (STRESS_NAMES.has(name)) bucketAdd(bucket, date, 'stressAvg', num(p.qty ?? p.Avg), 'avg')
      else if (WEIGHT_NAMES.has(name)) bucketAdd(bucket, date, 'weightKg', toKg(p.qty, units), 'last')
      else if (BODY_FAT_NAMES.has(name)) bucketAdd(bucket, date, 'bodyFatPct', toPercent(num(p.qty)), 'last')
      else if (HR_NAMES.has(name)) {
        const avg = num(p.Avg ?? p.qty)
        const max = num(p.Max ?? p.qty)
        const min = num(p.Min ?? p.qty)
        bucketAdd(bucket, date, 'avgHr', avg, 'avg')
        bucketAdd(bucket, date, 'maxHr', max, 'max')
        bucketAdd(bucket, date, 'minHr', min, 'min')
      } else if (SLEEP_NAMES.has(name)) {
        const asleepHr = num(p.asleep ?? p.qty)
        const inBedHr = num(p.inBed)
        const deepHr = num(p.deep)
        const remHr = num(p.rem)
        const coreHr = num(p.core)
        const awakeHr = num(p.awake)
        if (!bucket[date]) bucket[date] = {}
        const sleep = (bucket[date].sleep ||= {})
        const totalHr = asleepHr ?? inBedHr
        if (totalHr !== null) sleep.totalMin = Math.round(totalHr * 60)
        if (deepHr !== null) sleep.deepMin = Math.round(deepHr * 60)
        if (remHr !== null) sleep.remMin = Math.round(remHr * 60)
        if (coreHr !== null) sleep.lightMin = Math.round(coreHr * 60)
        if (awakeHr !== null) sleep.awakeMin = Math.round(awakeHr * 60)
        if (p.sleepStart) sleep.start = p.sleepStart
        if (p.sleepEnd) sleep.end = p.sleepEnd
      }
    }
  }

  // Fold resting energy into a total-calories figure once both are known.
  for (const date of Object.keys(bucket)) {
    const rec = bucket[date]
    if (rec.activeCalories != null || rec.basalCalories != null) {
      rec.totalCalories = (rec.activeCalories || 0) + (rec.basalCalories || 0)
    }
    delete rec.basalCalories
    for (const key of Object.keys(rec)) {
      if (key.startsWith('_')) delete rec[key]
    }
  }

  const workouts = Array.isArray(body?.data?.workouts) ? body.data.workouts : []
  for (const w of workouts) {
    const date = dateKey(w.start || w.startDate)
    if (!date) continue
    const start = w.start || w.startDate
    const end = w.end || w.endDate
    let durationMin
    if (start && end) {
      const ms = new Date(end).getTime() - new Date(start).getTime()
      if (Number.isFinite(ms) && ms > 0) durationMin = Math.round(ms / 60000)
    }
    if (durationMin === undefined && w.duration != null) {
      const d = num(w.duration)
      durationMin = d != null ? (d > 1000 ? Math.round(d / 60) : Math.round(d)) : undefined
    }

    const energy = w.activeEnergyBurned || w.activeEnergy
    const distance = w.distance
    const avgHr = w.avgHeartRate?.qty ?? w.averageHeartRate?.qty ?? w.heartRateData?.Avg
    const maxHr = w.maxHeartRate?.qty ?? w.heartRateData?.Max

    if (!bucket[date]) bucket[date] = {}
    const list = (bucket[date].workouts ||= [])
    list.push({
      id: `${w.name || 'workout'}-${start}`,
      type: w.name || 'Workout',
      start,
      end,
      durationMin,
      calories: energy ? toKcal(energy.qty, energy.units) : undefined,
      distanceKm: distance ? toKm(distance.qty, distance.units) : undefined,
      avgHr: num(avgHr) ?? undefined,
      maxHr: num(maxHr) ?? undefined,
    })
  }

  return Object.entries(bucket).map(([date, rec]) => ({ date, ...rec }))
}
