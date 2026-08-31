const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'

const FLAME_SIZE = {
  sleepy: 20,
  idle: 22,
  happy: 25,
  excited: 28,
  ecstatic: 32,
}

function pickExpression(streak, hour, doneToday) {
  if (hour >= 0 && hour < 5) return 'sleepy'
  // Not done yet today: the fox is waiting on you, not celebrating a streak
  // tier it hasn't actually earned yet today — keep it low-key regardless
  // of how long the streak already is, so the widget doesn't look "already
  // happy" when there's still a nudge to make.
  if (!doneToday) return streak >= 1 ? 'idle' : 'sleepy'
  if (streak >= 14) return 'ecstatic'
  if (streak >= 7) return 'excited'
  if (streak >= 3) return 'happy'
  if (streak >= 1) return 'idle'
  return 'sleepy'
}

function foxWobble() {
  return Math.floor(Date.now() / (1000 * 60 * 30)) % 2 === 0 ? 0 : 3
}

async function fetchData() {
  const req = new Request(`${APP_URL}/api/widget-phrase`)
  req.timeoutInterval = 8
  return await req.loadJSON()
}

function buildWidget(data) {
  const streak = data?.streak ?? 0
  const doneToday = !!data?.doneToday
  const hour = new Date().getHours()
  const expr = pickExpression(streak, hour, doneToday)

  const widget = new ListWidget()
  widget.url = APP_URL

  // Two deliberately different moods, not just two colors: done-today
  // reads as a warm, settled reward; not-done reads as a hotter, more
  // saturated "come back" red-orange — the same brand hue pushed toward
  // urgency instead of a jarring, off-brand color swap.
  const gradient = new LinearGradient()
  if (doneToday) {
    gradient.colors = [new Color(ACCENT), new Color('#ffb627')]
  } else {
    gradient.colors = [new Color('#c81e3a'), new Color(ACCENT)]
  }
  gradient.locations = [0, 1]
  widget.backgroundGradient = gradient

  widget.setPadding(14, 16, 14, 16)

  const top = widget.addStack()
  top.centerAlignContent()

  const streakRow = top.addStack()
  streakRow.bottomAlignContent()
  const flame = streakRow.addText('\u{1F525}')
  flame.font = Font.systemFont(FLAME_SIZE[expr] || 22)
  streakRow.addSpacer(4)
  const streakNum = streakRow.addText(`${streak}`)
  streakNum.font = Font.heavySystemFont(32)
  // Dimmed (not absent) when today isn't done yet — a visible gap between
  // "what you have" and "what's confirmed today" without hiding the number.
  streakNum.textColor = doneToday ? Color.white() : new Color('#ffffff', 0.72)

  top.addSpacer()

  const foxCol = top.addStack()
  foxCol.layoutVertically()
  foxCol.addSpacer(foxWobble())
  const fox = foxCol.addText('\u{1F98A}')
  fox.font = Font.systemFont(48)

  widget.addSpacer(6)

  // Small, always-present state label — never rely on color alone to
  // signal done vs. not-done.
  const stateRow = widget.addStack()
  stateRow.centerAlignContent()
  const stateLabel = stateRow.addText(doneToday ? 'OGGI FATTO' : 'MANCA OGGI')
  stateLabel.font = Font.boldSystemFont(11)
  stateLabel.textColor = new Color('#ffffff', 0.85)

  widget.addSpacer(8)

  const pipRow = widget.addStack()
  pipRow.centerAlignContent()
  const filled = Math.min(streak, 7)
  for (let i = 0; i < 7; i++) {
    const pip = pipRow.addStack()
    pip.size = new Size(10, 10)
    pip.cornerRadius = 3
    pip.backgroundColor = i < filled ? Color.white() : new Color('#ffffff', 0.28)
    if (i < 6) pipRow.addSpacer(4)
  }

  widget.addSpacer()

  // Done today: show the phrase of the day, as before — there's nothing
  // left to pull them toward. Not done: replace it with an explicit,
  // action-shaped nudge instead of a passive fact, so the widget is
  // asking for something rather than just reporting.
  const bottomText = doneToday ? data?.it || 'Bravo!' : 'Non perdere la serie →'
  const bottom = widget.addText(bottomText)
  bottom.font = Font.boldSystemFont(21)
  bottom.textColor = Color.white()
  bottom.minimumScaleFactor = 0.6

  return widget
}

let widget
try {
  const data = await fetchData()
  widget = buildWidget(data)
} catch {
  widget = buildWidget({ it: 'Ciao!', streak: 0, doneToday: false })
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
