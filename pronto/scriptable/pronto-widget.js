const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'

const FLAME_SIZE = {
  sleepy: 20,
  idle: 22,
  happy: 25,
  excited: 28,
  ecstatic: 32,
}

function pickExpression(streak, hour) {
  if (hour >= 0 && hour < 5) return 'sleepy'
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
  const hour = new Date().getHours()
  const expr = pickExpression(streak, hour)

  const widget = new ListWidget()
  widget.url = APP_URL

  const gradient = new LinearGradient()
  gradient.colors = [new Color(ACCENT), new Color('#ffb627')]
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
  streakNum.textColor = Color.white()

  top.addSpacer()

  const foxCol = top.addStack()
  foxCol.layoutVertically()
  foxCol.addSpacer(foxWobble())
  const fox = foxCol.addText('\u{1F98A}')
  fox.font = Font.systemFont(48)

  widget.addSpacer()

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

  const italian = widget.addText(data?.it || 'Buongiorno!')
  italian.font = Font.boldSystemFont(21)
  italian.textColor = Color.white()
  italian.minimumScaleFactor = 0.6

  return widget
}

let widget
try {
  const data = await fetchData()
  widget = buildWidget(data)
} catch {
  widget = buildWidget({ it: 'Ciao!', streak: 0 })
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
