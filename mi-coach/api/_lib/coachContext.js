// Turns a computeSummary() payload into a compact text block for the LLM
// prompt, so we send a handful of numbers instead of raw daily records.

function fmt(n, digits = 0) {
  return typeof n === 'number' ? n.toFixed(digits) : 'n/a'
}

export function buildDataContext(summary) {
  if (!summary || summary.daysLogged === 0) {
    return 'The user has not imported any Mi Fitness / Smart Band data yet. Encourage them to connect their data via the Import tab, and answer generally in the meantime.'
  }

  const t = summary.today
  const lines = []
  lines.push(`Data logged: ${summary.daysLogged} day(s), from ${summary.firstDate} to ${summary.lastDate}.`)
  lines.push(`Current logging streak: ${summary.streak} day(s) with step data.`)

  if (t) {
    lines.push(
      `Today (${summary.todayDate}): steps=${t.steps ?? 'n/a'}, active calories=${fmt(t.activeCalories)}, distance=${fmt(t.distanceKm, 2)}km, avg HR=${t.avgHr ?? 'n/a'}bpm, resting HR=${t.restingHr ?? 'n/a'}bpm, SpO2=${fmt(t.spo2Avg, 1)}%, stress=${t.stressAvg ?? 'n/a'}, sleep=${t.sleep?.totalMin ? (t.sleep.totalMin / 60).toFixed(1) + 'h' : 'n/a'}.`
    )
  } else {
    lines.push('No data logged yet for today.')
  }

  const tr = summary.trend
  lines.push(
    `Recent averages vs prior period: steps ${fmt(tr.steps.avg)} (${fmt(tr.steps.deltaPct)}% change), active calories ${fmt(tr.activeCalories.avg)}, avg HR ${fmt(tr.avgHr.avg)}bpm, sleep ${tr.sleepTotalMin.avg ? (tr.sleepTotalMin.avg / 60).toFixed(1) + 'h' : 'n/a'}, stress ${fmt(tr.stressAvg.avg, 1)}.`
  )

  if (summary.latest.restingHr) lines.push(`Latest resting HR: ${summary.latest.restingHr.value}bpm (${summary.latest.restingHr.date}).`)
  if (summary.latest.weightKg) lines.push(`Latest weight: ${fmt(summary.latest.weightKg.value, 1)}kg (${summary.latest.weightKg.date}).`)
  if (summary.latest.spo2Avg) lines.push(`Latest SpO2: ${fmt(summary.latest.spo2Avg.value, 1)}% (${summary.latest.spo2Avg.date}).`)

  if (summary.recentWorkouts?.length) {
    const w = summary.recentWorkouts.slice(0, 5)
      .map((x) => `${x.type} on ${x.start.slice(0, 10)} (${x.durationMin ?? '?'}min, ${x.calories ? Math.round(x.calories) + 'kcal' : 'no cal data'})`)
      .join('; ')
    lines.push(`Recent workouts: ${w}.`)
  }

  return lines.join('\n')
}

export const COACH_SYSTEM_PROMPT = `You are Mi Coach, an encouraging, knowledgeable AI fitness and health coach embedded in a personal dashboard for a Xiaomi Smart Band 9 / Mi Fitness user.

Rules:
- Base your answers on the user's actual data given below when relevant. Reference specific numbers when it strengthens the advice.
- Be concise and practical: prioritize 1-3 concrete, actionable suggestions over generic platitudes.
- You are not a doctor. For anything that sounds like a medical concern (chest pain, very low SpO2, irregular heart readings, injury), clearly recommend consulting a healthcare professional rather than diagnosing.
- If the data shows an encouraging trend, acknowledge it before suggesting improvements.
- Keep replies conversational and skimmable — short paragraphs or a tight bullet list, not walls of text.`
