const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'
const SPARKLE = '#ffb627'

const FACES = {
  happy: {
    eyes: `<path d="M71 88 Q79 80 87 88" stroke="#221813" stroke-width="4.5" fill="none" stroke-linecap="round" />
           <path d="M113 88 Q121 80 129 88" stroke="#221813" stroke-width="4.5" fill="none" stroke-linecap="round" />`,
    mouth: `<path d="M82 110 Q100 132 118 110 Q100 126 82 110 Z" fill="#221813" />`,
  },
  idle: {
    eyes: `<circle cx="79" cy="90" r="7.5" fill="#221813" /><circle cx="121" cy="90" r="7.5" fill="#221813" />
           <circle cx="81.5" cy="87.5" r="2.2" fill="#fff" /><circle cx="123.5" cy="87.5" r="2.2" fill="#fff" />`,
    mouth: `<path d="M86 112 Q100 122 114 112" stroke="#221813" stroke-width="4" fill="none" stroke-linecap="round" />`,
  },
  sleepy: {
    eyes: `<path d="M71 90 L87 90" stroke="#221813" stroke-width="4.5" stroke-linecap="round" />
           <path d="M113 90 L129 90" stroke="#221813" stroke-width="4.5" stroke-linecap="round" />`,
    mouth: `<path d="M90 114 Q100 118 110 114" stroke="#221813" stroke-width="4" fill="none" stroke-linecap="round" />`,
    extras: `<text x="138" y="58" font-size="13" fill="#ffffff" font-family="-apple-system" opacity="0.85">z</text>
             <text x="150" y="46" font-size="9" fill="#ffffff" font-family="-apple-system" opacity="0.7">z</text>`,
  },
  excited: {
    eyes: `<circle cx="79" cy="88" r="9" fill="#221813" /><circle cx="121" cy="88" r="9" fill="#221813" />
           <circle cx="82" cy="84" r="3" fill="#fff" /><circle cx="124" cy="84" r="3" fill="#fff" />`,
    mouth: `<ellipse cx="100" cy="115" rx="13" ry="11" fill="#221813" /><ellipse cx="100" cy="112" rx="7" ry="4" fill="#ff8b6b" />`,
    extras: `<path d="M60 72 L64 64 L68 72" stroke="${SPARKLE}" stroke-width="3" fill="none" stroke-linecap="round" />
             <path d="M132 72 L136 64 L140 72" stroke="${SPARKLE}" stroke-width="3" fill="none" stroke-linecap="round" />`,
  },
  ecstatic: {
    eyes: `<path d="M67 90 Q79 72 91 90" stroke="#221813" stroke-width="5.5" fill="none" stroke-linecap="round" />
           <path d="M109 90 Q121 72 133 90" stroke="#221813" stroke-width="5.5" fill="none" stroke-linecap="round" />`,
    mouth: `<path d="M78 108 Q100 138 122 108 Q100 132 78 108 Z" fill="#221813" /><ellipse cx="100" cy="119" rx="9" ry="6" fill="#ff8b6b" />`,
    extras: `<path d="M48 66 L53 56 L58 66" stroke="${SPARKLE}" stroke-width="3.2" fill="none" stroke-linecap="round" />
             <path d="M142 66 L147 56 L152 66" stroke="${SPARKLE}" stroke-width="3.2" fill="none" stroke-linecap="round" />
             <circle cx="34" cy="94" r="3.5" fill="${SPARKLE}" /><circle cx="166" cy="94" r="3.5" fill="${SPARKLE}" />`,
  },
}

function pickExpression(streak, hour) {
  if (hour >= 0 && hour < 5) return 'sleepy'
  if (streak >= 14) return 'ecstatic'
  if (streak >= 7) return 'excited'
  if (streak >= 3) return 'happy'
  if (streak >= 1) return 'idle'
  return 'sleepy'
}

function timeGreeting(hour) {
  const sun = '\u2600'
  const moon = '\u{1F319}'
  if (hour >= 5 && hour < 12) return { text: 'Buongiorno', icon: sun }
  if (hour >= 12 && hour < 17) return { text: 'Buon pomeriggio', icon: sun }
  if (hour >= 17 && hour < 22) return { text: 'Buonasera', icon: moon }
  return { text: 'Buonanotte', icon: moon }
}

function mascotSvg(expression) {
  const face = FACES[expression] || FACES.idle
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="140" height="154">
    <path d="M148 178 Q194 172 186 122 Q182 92 152 100 Q176 128 150 178 Z" fill="${ACCENT}" />
    <path d="M186 122 Q182 96 156 101 Q172 108 172 128 Q172 148 155 168 Z" fill="#fff3e8" opacity="0.9" />
    <ellipse cx="52" cy="150" rx="13" ry="17" fill="${ACCENT}" />
    <ellipse cx="148" cy="150" rx="13" ry="17" fill="${ACCENT}" />
    <ellipse cx="100" cy="168" rx="60" ry="44" fill="${ACCENT}" />
    <ellipse cx="100" cy="184" rx="34" ry="20" fill="#fff3e8" />
    <path d="M66 132 L134 132 L100 164 Z" fill="#12b5ac" />
    <circle cx="100" cy="136" r="7" fill="#12b5ac" />
    <path d="M52 58 L34 2 L92 42 Z" fill="${ACCENT}" />
    <path d="M56 52 L46 16 L82 40 Z" fill="#fff3e8" />
    <path d="M148 58 L166 2 L108 42 Z" fill="${ACCENT}" />
    <path d="M144 52 L154 16 L118 40 Z" fill="#fff3e8" />
    <circle cx="100" cy="96" r="64" fill="${ACCENT}" />
    <ellipse cx="100" cy="112" rx="36" ry="27" fill="#fff3e8" />
    <ellipse cx="62" cy="108" rx="10" ry="7" fill="#ff8b6b" opacity="0.7" />
    <ellipse cx="138" cy="108" rx="10" ry="7" fill="#ff8b6b" opacity="0.7" />
    <path d="M100 96 L92 104 L108 104 Z" fill="#221813" />
    ${face.eyes}
    ${face.mouth}
    ${face.extras || ''}
  </svg>`
}

async function renderMascotImage(expression) {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=140, initial-scale=1">
    <style>html,body{margin:0;padding:0;background:transparent;}</style></head>
    <body>${mascotSvg(expression)}</body></html>`
  const wv = new WebView()
  await wv.loadHTML(html)
  return await wv.snapshot()
}

async function fetchData() {
  const req = new Request(`${APP_URL}/api/widget-phrase`)
  req.timeoutInterval = 8
  return await req.loadJSON()
}

function buildWidget(data, mascotImage, hour) {
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

  leftCol.addSpacer(6)

  const streakRow = leftCol.addStack()
  streakRow.bottomAlignContent()
  const flame = streakRow.addText('\u{1F525}')
  flame.font = Font.systemFont(24)
  streakRow.addSpacer(4)
  const streakNum = streakRow.addText(`${data?.streak ?? 0}`)
  streakNum.font = Font.heavySystemFont(36)
  streakNum.textColor = Color.white()
  streakRow.addSpacer(4)
  const streakLabel = streakRow.addText(`day${data?.streak === 1 ? '' : 's'}`)
  streakLabel.font = Font.semiboldSystemFont(13)
  streakLabel.textColor = new Color('#ffffff', 0.85)

  top.addSpacer()

  if (mascotImage) {
    const img = top.addImage(mascotImage)
    img.imageSize = new Size(56, 62)
  }

  widget.addSpacer(10)

  const greet = timeGreeting(hour)
  const greetRow = widget.addStack()
  greetRow.centerAlignContent()
  const greetIcon = greetRow.addText(greet.icon)
  greetIcon.font = Font.systemFont(11)
  greetRow.addSpacer(4)
  const greetText = greetRow.addText(greet.text)
  greetText.font = Font.semiboldSystemFont(11)
  greetText.textColor = new Color('#ffffff', 0.75)

  widget.addSpacer(3)

  const italian = widget.addText(data?.it || 'Buongiorno!')
  italian.font = Font.boldSystemFont(19)
  italian.textColor = Color.white()
  italian.minimumScaleFactor = 0.6

  widget.addSpacer(4)

  const gloss = widget.addText(data?.en || 'Good morning!')
  gloss.font = Font.systemFont(13)
  gloss.textColor = new Color('#ffffff', 0.82)
  gloss.minimumScaleFactor = 0.7

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
  const expr = pickExpression(data?.streak ?? 0, hour)
  let mascotImage = null
  try {
    mascotImage = await renderMascotImage(expr)
  } catch {
  }
  widget = buildWidget(data, mascotImage, hour)
} catch {
  const hour = new Date().getHours()
  widget = buildWidget({ it: 'Ciao!', en: 'Could not reach Pronto - tap to open the app.', streak: 0 }, null, hour)
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
