const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'

const MOOD_ACCENTS = {
  sleepy: ['\u{1F4A4}', ''],
  idle: ['', '\u2728'],
  happy: ['\u2728', '\u{1F31F}'],
  excited: ['\u{1F525}', '\u2728'],
  ecstatic: ['\u{1F389}', '\u{1F31F}'],
}

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

function moodAccent(expression) {
  const options = MOOD_ACCENTS[expression] || ['']
  const idx = Math.floor(Date.now() / (1000 * 60 * 30)) % options.length
  return options[idx]
}

function foxWobble() {
  return Math.floor(Date.now() / (1000 * 60 * 30)) % 2 === 0 ? 0 : 3
}

function timeGreeting(hour) {
  const sun = '\u2600'
  const moon = '\u{1F319}'
  if (hour >= 5 && hour < 12) return { text: 'Buongiorno', icon: sun }
  if (hour >= 12 && hour < 17) return { text: 'Buon pomeriggio', icon: sun }
  if (hour >= 17 && hour < 22) return { text: 'Buonasera', icon: moon }
  return { text: 'Buonanotte', icon: moon }
}

async function fetchData() {
  const req = new Request(`${APP_URL}/api/widget-phrase`)
  req.timeoutInterval = 8
  return await req.loadJSON()
}

function buildWidget(data, hour) {
  const streak = data?.streak ?? 0
  const expr = pickExpression(streak, hour)

  const widget = new ListWidget()
  widget.url = APP_URL

  const gradient = new LinearGradient()
  gradient.colors = [new Color(ACCENT), new Color('#ffb627')]
  gradient.locations = [0, 1]
  widget.backgroundGradient = gradient

  widget.setPadding(12, 16, 12, 16)

  const top = widget.addStack()
  top.centerAlignContent()

  const leftCol = top.addStack()
  leftCol.layoutVertically()

  const title = leftCol.addText('PRONTO')
  title.font = Font.heavySystemFont(11)
  title.textColor = new Color('#ffffff', 0.85)

  leftCol.addSpacer(5)

  const streakRow = leftCol.addStack()
  streakRow.bottomAlignContent()
  const flame = streakRow.addText('\u{1F525}')
  flame.font = Font.systemFont(FLAME_SIZE[expr] || 22)
  streakRow.addSpacer(4)
  const streakNum = streakRow.addText(`${streak}`)
  streakNum.font = Font.heavySystemFont(32)
  streakNum.textColor = Color.white()
  streakRow.addSpacer(4)
  const streakLabel = streakRow.addText(`day${streak === 1 ? '' : 's'}`)
  streakLabel.font = Font.semiboldSystemFont(13)
  streakLabel.textColor = new Color('#ffffff', 0.85)

  const accent = moodAccent(expr)
  if (accent) {
    leftCol.addSpacer(2)
    const accentText = leftCol.addText(accent)
    accentText.font = Font.systemFont(14)
  }

  top.addSpacer()

  const foxCol = top.addStack()
  foxCol.layoutVertically()
  foxCol.addSpacer(foxWobble())
  const fox = foxCol.addText('\u{1F98A}')
  fox.font = Font.systemFont(46)

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

  const greet = timeGreeting(hour)
  const greetRow = widget.addStack()
  greetRow.centerAlignContent()
  const greetIcon = greetRow.addText(greet.icon)
  greetIcon.font = Font.systemFont(11)
  greetRow.addSpacer(4)
  const greetText = greetRow.addText(greet.text)
  greetText.font = Font.semiboldSystemFont(11)
  greetText.textColor = new Color('#ffffff', 0.75)

  widget.addSpacer(4)

  const italian = widget.addText(data?.it || 'Buongiorno!')
  italian.font = Font.boldSystemFont(18)
  italian.textColor = Color.white()
  italian.minimumScaleFactor = 0.6

  widget.addSpacer(3)

  const gloss = widget.addText(data?.en || 'Good morning!')
  gloss.font = Font.systemFont(12)
  gloss.textColor = new Color('#ffffff', 0.82)
  gloss.minimumScaleFactor = 0.6

  widget.addSpacer()

  const footer = widget.addText('Tap to practice ->')
  footer.font = Font.mediumSystemFont(11)
  footer.textColor = new Color('#ffffff', 0.7)

  return widget
}

let widget
try {
  const data = await fetchData()
  const hour = new Date().getHours()
  widget = buildWidget(data, hour)
} catch {
  const hour = new Date().getHours()
  widget = buildWidget({ it: 'Ciao!', en: 'Could not reach Pronto - tap to open the app.', streak: 0 }, hour)
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
