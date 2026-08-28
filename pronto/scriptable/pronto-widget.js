const APP_URL = 'https://impara-git-claude-duolingo-l-1a1bd8-ajabbar12765-hashs-projects.vercel.app'
const ACCENT = '#ff5a36'
const CREAM = '#fff3e8'
const BLUSH = '#ff8b6b'
const DARK = '#221813'
const SPARKLE = '#ffb627'

const FACES = {
  happy: {
    eyes: [
      { type: 'stroke', d: 'M71 88 Q79 80 87 88', color: DARK, width: 4.5 },
      { type: 'stroke', d: 'M113 88 Q121 80 129 88', color: DARK, width: 4.5 },
    ],
    mouth: [
      { type: 'path', d: 'M82 110 Q100 132 118 110 Q100 126 82 110 Z', color: DARK },
    ],
  },
  idle: {
    eyes: [
      { type: 'circle', cx: 79, cy: 90, r: 7.5, color: DARK },
      { type: 'circle', cx: 121, cy: 90, r: 7.5, color: DARK },
      { type: 'circle', cx: 81.5, cy: 87.5, r: 2.2, color: '#ffffff' },
      { type: 'circle', cx: 123.5, cy: 87.5, r: 2.2, color: '#ffffff' },
    ],
    mouth: [
      { type: 'stroke', d: 'M86 112 Q100 122 114 112', color: DARK, width: 4 },
    ],
  },
  sleepy: {
    eyes: [
      { type: 'stroke', d: 'M71 90 L87 90', color: DARK, width: 4.5 },
      { type: 'stroke', d: 'M113 90 L129 90', color: DARK, width: 4.5 },
    ],
    mouth: [
      { type: 'stroke', d: 'M90 114 Q100 118 110 114', color: DARK, width: 4 },
    ],
    extras: [
      { type: 'text', text: 'z', x: 136, y: 46, size: 15, color: '#ffffff', opacity: 0.85 },
      { type: 'text', text: 'z', x: 148, y: 34, size: 10, color: '#ffffff', opacity: 0.7 },
    ],
  },
  excited: {
    eyes: [
      { type: 'circle', cx: 79, cy: 88, r: 9, color: DARK },
      { type: 'circle', cx: 121, cy: 88, r: 9, color: DARK },
      { type: 'circle', cx: 82, cy: 84, r: 3, color: '#ffffff' },
      { type: 'circle', cx: 124, cy: 84, r: 3, color: '#ffffff' },
    ],
    mouth: [
      { type: 'ellipse', cx: 100, cy: 115, rx: 13, ry: 11, color: DARK },
      { type: 'ellipse', cx: 100, cy: 112, rx: 7, ry: 4, color: BLUSH },
    ],
    extras: [
      { type: 'stroke', d: 'M60 72 L64 64 L68 72', color: SPARKLE, width: 3 },
      { type: 'stroke', d: 'M132 72 L136 64 L140 72', color: SPARKLE, width: 3 },
    ],
  },
  ecstatic: {
    eyes: [
      { type: 'stroke', d: 'M67 90 Q79 72 91 90', color: DARK, width: 5.5 },
      { type: 'stroke', d: 'M109 90 Q121 72 133 90', color: DARK, width: 5.5 },
    ],
    mouth: [
      { type: 'path', d: 'M78 108 Q100 138 122 108 Q100 132 78 108 Z', color: DARK },
      { type: 'ellipse', cx: 100, cy: 119, rx: 9, ry: 6, color: BLUSH },
    ],
    extras: [
      { type: 'stroke', d: 'M48 66 L53 56 L58 66', color: SPARKLE, width: 3.2 },
      { type: 'stroke', d: 'M142 66 L147 56 L152 66', color: SPARKLE, width: 3.2 },
      { type: 'circle', cx: 34, cy: 94, r: 3.5, color: SPARKLE },
      { type: 'circle', cx: 166, cy: 94, r: 3.5, color: SPARKLE },
    ],
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

function buildPath(d) {
  const t = d.match(/[MLQZ]|-?\d+\.?\d*/g) || []
  const path = new Path()
  let i = 0
  while (i < t.length) {
    const cmd = t[i]
    if (cmd === 'M') {
      path.move(new Point(parseFloat(t[i + 1]), parseFloat(t[i + 2])))
      i += 3
    } else if (cmd === 'L') {
      path.addLine(new Point(parseFloat(t[i + 1]), parseFloat(t[i + 2])))
      i += 3
    } else if (cmd === 'Q') {
      const cx = parseFloat(t[i + 1])
      const cy = parseFloat(t[i + 2])
      const x = parseFloat(t[i + 3])
      const y = parseFloat(t[i + 4])
      path.addQuadCurve(new Point(x, y), new Point(cx, cy))
      i += 5
    } else if (cmd === 'Z') {
      path.closeSubpath()
      i += 1
    } else {
      i += 1
    }
  }
  return path
}

function fillCircle(ctx, cx, cy, r, color) {
  ctx.setFillColor(new Color(color))
  ctx.fillEllipse(new Rect(cx - r, cy - r, r * 2, r * 2))
}

function fillEllipseXY(ctx, cx, cy, rx, ry, color) {
  ctx.setFillColor(new Color(color))
  ctx.fillEllipse(new Rect(cx - rx, cy - ry, rx * 2, ry * 2))
}

function fillPathD(ctx, d, color) {
  ctx.setFillColor(new Color(color))
  ctx.addPath(buildPath(d))
  ctx.fillPath()
}

function strokePathD(ctx, d, color, width) {
  ctx.setStrokeColor(new Color(color))
  ctx.setLineWidth(width)
  ctx.addPath(buildPath(d))
  ctx.strokePath()
}

function drawOps(ctx, ops) {
  for (const op of ops) {
    if (op.type === 'circle') fillCircle(ctx, op.cx, op.cy, op.r, op.color)
    else if (op.type === 'ellipse') fillEllipseXY(ctx, op.cx, op.cy, op.rx, op.ry, op.color)
    else if (op.type === 'path') fillPathD(ctx, op.d, op.color)
    else if (op.type === 'stroke') strokePathD(ctx, op.d, op.color, op.width)
    else if (op.type === 'text') {
      ctx.setFont(Font.boldSystemFont(op.size))
      ctx.setTextColor(new Color(op.color, op.opacity ?? 1))
      ctx.drawText(op.text, new Point(op.x, op.y))
    }
  }
}

function drawMascotImage(expression) {
  const face = FACES[expression] || FACES.idle
  const ctx = new DrawContext()
  ctx.size = new Size(200, 150)
  ctx.opaque = false
  ctx.respectScreenScale = true

  fillPathD(ctx, 'M52 58 L34 2 L92 42 Z', ACCENT)
  fillPathD(ctx, 'M56 52 L46 16 L82 40 Z', CREAM)
  fillPathD(ctx, 'M148 58 L166 2 L108 42 Z', ACCENT)
  fillPathD(ctx, 'M144 52 L154 16 L118 40 Z', CREAM)

  fillCircle(ctx, 100, 96, 64, ACCENT)
  fillEllipseXY(ctx, 100, 112, 36, 27, CREAM)
  fillEllipseXY(ctx, 62, 108, 10, 7, BLUSH)
  fillEllipseXY(ctx, 138, 108, 10, 7, BLUSH)
  fillPathD(ctx, 'M100 96 L92 104 L108 104 Z', DARK)

  drawOps(ctx, face.eyes)
  drawOps(ctx, face.mouth)
  if (face.extras) drawOps(ctx, face.extras)

  return ctx.getImage()
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
    img.imageSize = new Size(64, 48)
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
    mascotImage = drawMascotImage(expr)
  } catch {
  }
  widget = buildWidget(data, mascotImage, hour)
} catch {
  const hour = new Date().getHours()
  let mascotImage = null
  try {
    mascotImage = drawMascotImage('idle')
  } catch {
  }
  widget = buildWidget({ it: 'Ciao!', en: 'Could not reach Pronto - tap to open the app.', streak: 0 }, mascotImage, hour)
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
