// Pronto — Phrase of the Day
// A Scriptable (https://scriptable.app) home-screen widget for the Pronto
// Italian app. Shows today's phrase, tap to open the app.
//
// Setup:
//   1. Install the free "Scriptable" app from the App Store.
//   2. Open it, tap "+", paste this whole file in, name it "Pronto Widget".
//   3. Long-press your home screen → tap "+" → search "Scriptable" → add a
//      Small or Medium widget.
//   4. Long-press the new widget → Edit Widget → set Script to "Pronto
//      Widget" (and Parameter/When Interacting as you like).
//
// If you rename the deployed app or move it to a custom domain, update
// APP_URL below to match.

const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'

async function fetchPhrase() {
  const req = new Request(`${APP_URL}/api/widget-phrase`)
  req.timeoutInterval = 8
  return await req.loadJSON()
}

async function loadIcon() {
  try {
    const req = new Request(`${APP_URL}/pwa-192.png`)
    return await req.loadImage()
  } catch {
    return null
  }
}

function buildWidget(phrase, icon) {
  const widget = new ListWidget()
  widget.url = APP_URL

  const gradient = new LinearGradient()
  gradient.colors = [new Color(ACCENT), new Color('#ffb627')]
  gradient.locations = [0, 1]
  widget.backgroundGradient = gradient

  widget.setPadding(14, 16, 14, 16)

  const header = widget.addStack()
  header.centerAlignContent()
  if (icon) {
    const img = header.addImage(icon)
    img.imageSize = new Size(20, 20)
    img.cornerRadius = 6
    header.addSpacer(6)
  }
  const title = header.addText('PRONTO')
  title.font = Font.heavySystemFont(12)
  title.textColor = Color.white()

  widget.addSpacer(10)

  const italian = widget.addText(phrase?.it || 'Buongiorno!')
  italian.font = Font.boldSystemFont(20)
  italian.textColor = Color.white()
  italian.minimumScaleFactor = 0.6

  widget.addSpacer(4)

  const gloss = widget.addText(phrase?.en || 'Good morning!')
  gloss.font = Font.systemFont(13)
  gloss.textColor = new Color('#ffffff', 0.82)
  gloss.minimumScaleFactor = 0.7

  widget.addSpacer()

  const footer = widget.addText('Tap to practice →')
  footer.font = Font.mediumSystemFont(11)
  footer.textColor = new Color('#ffffff', 0.7)

  return widget
}

let widget
try {
  const [phrase, icon] = await Promise.all([fetchPhrase(), loadIcon()])
  widget = buildWidget(phrase, icon)
} catch {
  widget = buildWidget({ it: 'Ciao!', en: 'Couldn’t reach Pronto — tap to open the app.' }, null)
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
