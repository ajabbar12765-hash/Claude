const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'

// Volpe's actual body/face — the exact same path data as Mascot.jsx in the
// app (viewBox 200x220), so the widget shows the same character instead of
// a generic emoji standing in for him. These shapes only ever use M/L/Q/Z
// path commands, so a tiny interpreter below can turn them straight into
// Scriptable's native Path API.
const MASCOT_BODY = '#ff5a36'
const MASCOT_CREAM = '#fff3e8'
const MASCOT_SCARF = '#12b5ac'
const MASCOT_BLUSH = '#ff8b6b'
const INK = '#221813'

// Same mood rule as the app's hero card (Home.jsx pickHeroExpression): a
// quiet night face after midnight regardless of anything else, visibly
// unimpressed if today isn't done yet, and a smug "cool" face once a
// streak has survived two full weeks.
function pickExpression(streak, hour, doneToday) {
  if (hour >= 0 && hour < 5) return 'sleepy'
  if (!doneToday) return 'bored'
  if (streak >= 14) return 'cool'
  return streak >= 3 ? 'happy' : 'idle'
}

// The flame badge still scales with the raw streak number regardless of
// mood — a long streak should look substantial even on a "bored" (not
// done yet today) or "sleepy" (small hours) morning.
function flameSizeForStreak(streak) {
  if (streak >= 14) return 32
  if (streak >= 7) return 28
  if (streak >= 3) return 25
  if (streak >= 1) return 22
  return 20
}

// Background mood, mirrored from the app's .hero-card-* CSS variants so
// the widget and the app agree on what each mood looks like.
function gradientColorsForExpression(expr) {
  if (expr === 'sleepy') return ['#2c2a52', '#1c1a3a', '#121026']
  if (expr === 'bored') return ['#a99c93', '#8c8079', '#6f645d']
  if (expr === 'cool') return ['#ffb627', '#ff5a36', '#0c8e87']
  return [ACCENT, '#ffb627']
}

function foxWobble() {
  return Math.floor(Date.now() / (1000 * 60 * 30)) % 2 === 0 ? 0 : 3
}

// Turns one of Mascot.jsx's "d" path strings (M/L/Q/Z only, absolute
// coordinates) into a Scriptable Path, scaled to fit the render size.
function svgPathToPath(d, scale) {
  const path = new Path()
  const commands = d.match(/[MLQZ][^MLQZ]*/gi) || []
  for (const raw of commands) {
    const cmd = raw[0].toUpperCase()
    const nums = raw.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number)
    if (cmd === 'M') path.move(new Point(nums[0] * scale, nums[1] * scale))
    else if (cmd === 'L') path.addLine(new Point(nums[0] * scale, nums[1] * scale))
    else if (cmd === 'Q') path.addQuadCurve(new Point(nums[2] * scale, nums[3] * scale), new Point(nums[0] * scale, nums[1] * scale))
    else if (cmd === 'Z') path.closeSubpath()
  }
  return path
}

// Draws Volpe's full body (tail, paws, body, neckerchief, ears, head,
// muzzle, cheeks, nose) plus a swappable face, and returns the finished
// image. Draw order matches Mascot.jsx exactly.
function drawVolpe(expr, width, height) {
  const scale = width / 200
  const ctx = new DrawContext()
  ctx.size = new Size(width, height)
  ctx.opaque = false
  ctx.respectScreenScale = true

  function fillPath(d, color, opacity) {
    ctx.addPath(svgPathToPath(d, scale))
    ctx.setFillColor(new Color(color, opacity != null ? opacity : 1))
    ctx.fillPath()
  }

  function strokePath(d, color, lineWidth, opacity) {
    ctx.addPath(svgPathToPath(d, scale))
    ctx.setStrokeColor(new Color(color, opacity != null ? opacity : 1))
    ctx.setLineWidth(lineWidth * scale)
    ctx.strokePath()
  }

  function fillEllipse(cx, cy, rx, ry, color, opacity) {
    ctx.setFillColor(new Color(color, opacity != null ? opacity : 1))
    ctx.fillEllipse(new Rect((cx - rx) * scale, (cy - ry) * scale, rx * 2 * scale, ry * 2 * scale))
  }

  function fillRect(x, y, w, h, color, opacity) {
    ctx.setFillColor(new Color(color, opacity != null ? opacity : 1))
    ctx.fillRect(new Rect(x * scale, y * scale, w * scale, h * scale))
  }

  // tail
  fillPath('M148 178 Q194 172 186 122 Q182 92 152 100 Q176 128 150 178 Z', MASCOT_BODY)
  fillPath('M186 122 Q182 96 156 101 Q172 108 172 128 Q172 148 155 168 Z', MASCOT_CREAM, 0.9)

  // paws
  fillEllipse(52, 150, 13, 17, MASCOT_BODY)
  fillEllipse(148, 150, 13, 17, MASCOT_BODY)

  // body
  fillEllipse(100, 168, 60, 44, MASCOT_BODY)
  fillEllipse(100, 184, 34, 20, MASCOT_CREAM)

  // neckerchief
  fillPath('M66 132 L134 132 L100 164 Z', MASCOT_SCARF)
  fillEllipse(100, 136, 7, 7, MASCOT_SCARF)

  // ears
  fillPath('M52 58 L34 2 L92 42 Z', MASCOT_BODY)
  fillPath('M56 52 L46 16 L82 40 Z', MASCOT_CREAM)
  fillPath('M148 58 L166 2 L108 42 Z', MASCOT_BODY)
  fillPath('M144 52 L154 16 L118 40 Z', MASCOT_CREAM)

  // head
  fillEllipse(100, 96, 64, 64, MASCOT_BODY)

  // muzzle
  fillEllipse(100, 112, 36, 27, MASCOT_CREAM)

  // cheeks
  fillEllipse(62, 108, 10, 7, MASCOT_BLUSH, 0.7)
  fillEllipse(138, 108, 10, 7, MASCOT_BLUSH, 0.7)

  // nose
  fillPath('M100 96 L92 104 L108 104 Z', INK)

  // face — same per-expression shapes as Mascot.jsx's FACES table
  if (expr === 'happy') {
    strokePath('M71 88 Q79 80 87 88', INK, 4.5)
    strokePath('M113 88 Q121 80 129 88', INK, 4.5)
    fillPath('M82 110 Q100 132 118 110 Q100 126 82 110 Z', INK)
  } else if (expr === 'sleepy') {
    strokePath('M71 90 L87 90', INK, 4.5)
    strokePath('M113 90 L129 90', INK, 4.5)
    strokePath('M90 114 Q100 118 110 114', INK, 4)
  } else if (expr === 'bored') {
    fillPath('M70 89 Q79 92 88 89 L88 91 Q79 95 70 91 Z', INK)
    fillPath('M112 89 Q121 92 130 89 L130 91 Q121 95 112 91 Z', INK)
    strokePath('M88 116 L112 116', INK, 4)
  } else if (expr === 'cool') {
    fillEllipse(79, 90, 16, 10, '#1a1a1a')
    fillEllipse(121, 90, 16, 10, '#1a1a1a')
    fillRect(95, 86, 10, 4, '#1a1a1a')
    strokePath('M70 85 Q76 82 82 85', '#ffffff', 1.8, 0.55)
    strokePath('M88 114 Q100 120 116 110', INK, 4)
  } else {
    // idle
    fillEllipse(79, 90, 7.5, 7.5, INK)
    fillEllipse(121, 90, 7.5, 7.5, INK)
    fillEllipse(81.5, 87.5, 2.2, 2.2, '#ffffff')
    fillEllipse(123.5, 87.5, 2.2, 2.2, '#ffffff')
    strokePath('M86 112 Q100 122 114 112', INK, 4)
  }

  return ctx.getImage()
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

  const colors = gradientColorsForExpression(expr)
  const gradient = new LinearGradient()
  gradient.colors = colors.map((c) => new Color(c))
  gradient.locations = colors.length === 3 ? [0, 0.55, 1] : [0, 1]
  widget.backgroundGradient = gradient

  widget.setPadding(14, 16, 14, 16)

  const top = widget.addStack()
  top.centerAlignContent()

  const streakRow = top.addStack()
  streakRow.bottomAlignContent()
  const flame = streakRow.addText('\u{1F525}')
  flame.font = Font.systemFont(flameSizeForStreak(streak))
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
  const bodyWidth = 76
  const bodyHeight = Math.round(bodyWidth * 1.1) // matches Mascot.jsx's 200x220 viewBox ratio
  const foxImage = drawVolpe(expr, bodyWidth, bodyHeight)
  const foxWidget = foxCol.addImage(foxImage)
  foxWidget.imageSize = new Size(bodyWidth, bodyHeight)

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
