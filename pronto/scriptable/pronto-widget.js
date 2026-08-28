// Pronto - Phrase of the Day + Streak
// A Scriptable (https://scriptable.app) home-screen widget for the Pronto
// Italian app. Shows Volpe the mascot (with an expression that reflects
// your current streak), your streak count, and today's phrase. Tap to
// open the app.
//
// Setup:
//   1. Install the free "Scriptable" app from the App Store.
//   2. Open it, tap "+", paste this whole file in, name it "Pronto Widget".
//   3. Long-press your home screen -> tap "+" -> search "Scriptable" -> add a
//      Small or Medium widget.
//   4. Long-press the new widget -> Edit Widget -> set Script to "Pronto
//      Widget" (and Parameter/When Interacting as you like).
//
// The streak shown here comes from a small server-side store the app
// itself pushes to whenever your streak changes (see api/streak.js) - it
// needs UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN set in the
// Vercel project's Environment Variables to work; without them the
// widget still works, just always shows a 0-day/sleepy Volpe.
//
// If you rename the deployed app or move it to a custom domain, update
// APP_URL below to match.

const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'

// Volpe's SVG, ported from src/components/Mascot.jsx. Rendered via a
// hidden WebView + snapshot since Scriptable widgets can't draw arbitrary
// SVG directly - this keeps the mascot crisp at any widget size instead
// of shipping a raster asset that goes blurry.
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
  },
}

function mascotSvg(expression) {
  const face = FACES[expression] || FACES.idle
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="132" height="145">
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
  </svg>`
}

async function renderMascotImage(expression) {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=132, initial-scale=1">
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

function buildWidget(data, mascotImage) {
  const widget = new ListWidget()
  widget.url = APP_URL

  const gradient = new LinearGradient()
  gradient.colors = [new Color(ACCENT), new Color('#ffb627')]
  gradient.locations = [0, 1]
  widget.backgroundGradient = gradient

  widget.setPadding(12, 16, 14, 16)

  const top = widget.addStack()
  top.centerAlignContent()

  const textCol = top.addStack()
  textCol.layoutVertically()

  const title = textCol.addText('PRONTO')
  title.font = Font.heavySystemFont(12)
  title.textColor = Color.white()

  textCol.addSpacer(4)

  const streakRow = textCol.addStack()
  streakRow.centerAlignContent()
  const streakText = streakRow.addText(`\u{1F525} ${data?.streak ?? 0} day${data?.streak === 1 ? '' : 's'}`)
  streakText.font = Font.boldSystemFont(14)
  streakText.textColor = Color.white()

  top.addSpacer()

  if (mascotImage) {
    const img = top.addImage(mascotImage)
    img.imageSize = new Size(46, 50)
  }

  widget.addSpacer(10)

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
  let mascotImage = null
  try {
    mascotImage = await renderMascotImage(data?.expression || 'idle')
  } catch {
    // Mascot rendering can fail on some iOS/Scriptable versions - the
    // widget still works fine without it, just no fox portrait.
  }
  widget = buildWidget(data, mascotImage)
} catch {
  widget = buildWidget({ it: 'Ciao!', en: 'Could not reach Pronto - tap to open the app.', streak: 0 }, null)
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
