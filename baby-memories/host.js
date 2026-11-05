// The host: a die-cut cartoon sticker-magnet of the creator. Curly dark hair, warm brown skin, plain grey tee.
// Drawn in screen space from a world anchor (bottom centre). Design units: 440 tall at scale 1.
import { clamp, lerp, TAU } from '/core/lib.js';

const SKIN = '#a8714f', SKIN_D = '#8d5b3e', HAIR = '#241913', TEE = '#70747b', TEE_D = '#5c6067', LINE = '#23262c';

// arm: shoulder at (sx,sy), upper angle a1, elbow bend a2 (radians, 0 = straight down), side ±1
function arm(g, sx, sy, a1, a2, side, sleeveOnly) {
  const L1 = 70, L2 = 66;
  const ex = sx + Math.sin(a1) * L1 * side, ey = sy + Math.cos(a1) * L1;
  const a = a1 + a2, hx = ex + Math.sin(a) * L2 * side, hy = ey + Math.cos(a) * L2;
  g.lineCap = 'round'; g.lineJoin = 'round';
  // outline pass
  g.strokeStyle = LINE; g.lineWidth = 40; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
  g.fillStyle = LINE; g.beginPath(); g.arc(hx, hy, 22, 0, TAU); g.fill();
  // forearm skin
  g.strokeStyle = SKIN; g.lineWidth = 30; g.beginPath(); g.moveTo(ex, ey); g.lineTo(hx, hy); g.stroke();
  g.fillStyle = SKIN; g.beginPath(); g.arc(hx, hy, 17, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 4; g.beginPath(); g.arc(hx, hy, 19, 0, TAU); g.stroke();
  // sleeve (upper arm)
  g.strokeStyle = TEE; g.lineWidth = 32; g.beginPath(); g.moveTo(sx, sy); g.lineTo(lerp(sx, ex, .78), lerp(sy, ey, .78)); g.stroke();
  return [hx, hy];
}

const POSES = {      // [left a1, left a2, right a1, right a2]  (a1: 0 = down, + = outward/up; a2 bends the elbow)
  idle: [.2, -1.15, .2, -1.15],
  point: [.2, -1.15, 2.05, -.35],
  shrug: [1.25, -1.9, 1.25, -1.9],
  wave: [.2, -1.15, 2.7, .5],
  think: [.2, -1.15, .5, 2.5],
  both: [1.9, -.3, 1.9, -.3],
  open: [.2, -1.15, .55, 2.15],
  openL: [.55, 2.15, .2, -1.15],
  open2: [.5, 2.0, .5, 2.0],
  chest: [.2, -1.15, .35, -2.25],
  beat: [.3, -1.6, .3, -1.6],
};

// keys: [[t, pose], ...]; talk: 0..1 speech level → blended arm angles with talking motion
export function hostState(keys, t, talk = 0) {
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t) i++;
  const cur = POSES[keys[i][1]], prev = i ? POSES[keys[i - 1][1]] : cur;
  const u = clamp((t - keys[i][0]) / .4), e = u * u * (3 - 2 * u);
  const ang = cur.map((v, k) => lerp(prev[k], v, e));
  if (keys[i][1] === 'wave') ang[3] += Math.sin((t - keys[i][0]) * 9) * .35 * e;
  // always alive: a slow sway, plus beat gestures that follow the voice
  ang[0] += Math.sin(t * 1.3) * .05 + Math.sin(t * 2.3 + 1) * .1 * talk;
  ang[2] += Math.sin(t * 1.1 + 2) * .05 + Math.sin(t * 2.0 + .3) * .12 * talk;
  ang[1] += Math.sin(t * 3.1 + .7) * .28 * talk;
  ang[3] += Math.sin(t * 2.7 + 2.1) * .32 * talk;
  return ang;
}

// draw at screen (x, y) = bottom centre; s = scale; st = {mouth, blink, ang, lift, look, bob}
export function drawHost(ctx, x, y, s, st) {
  const lift = st.lift || 0, up = lift * 30 * s;
  ctx.save();
  // soft contact shadow on the board, only noticeable when he slides (lifts) across it
  ctx.save(); ctx.translate(x + (6 + lift * 26) * s, y + (4 + lift * 18) * s); ctx.scale(s, s);
  ctx.filter = `blur(${(12 + lift * 18) * s}px)`; ctx.fillStyle = `rgba(40,35,40,${.10 + lift * .08})`;
  ctx.beginPath(); ctx.ellipse(0, -8, 150, 22, 0, 0, TAU); ctx.fill(); ctx.restore();

  ctx.translate(x, y - up); ctx.scale(s, s); ctx.rotate(st.tilt || 0);
  ctx.translate(0, -(st.bob || 0));
  const g = ctx;
  const [la1, la2, ra1, ra2] = st.ang;
  const raised = la1 > 1 || ra1 > 1;
  const drawArms = () => { arm(g, -100, -128, la1, la2, -1); arm(g, 100, -128, ra1, ra2, 1); };
  // torso: grey tee
  g.fillStyle = TEE; g.strokeStyle = LINE; g.lineWidth = 6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(-122, 0); g.lineTo(-118, -120); g.quadraticCurveTo(-112, -150, -60, -160); g.lineTo(60, -160);
  g.quadraticCurveTo(112, -150, 118, -120); g.lineTo(122, 0); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = TEE_D; g.beginPath(); g.moveTo(-30, -158); g.quadraticCurveTo(0, -125, 30, -158); g.fill();
  // neck
  g.fillStyle = SKIN_D; g.beginPath(); g.roundRect(-30, -195, 60, 50, 14); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 5; g.beginPath(); g.moveTo(-34, -158); g.quadraticCurveTo(0, -128, 34, -158); g.stroke();
  if (!raised) drawArms();
  // ears
  for (const sd of [-1, 1]) { g.fillStyle = SKIN; g.beginPath(); g.ellipse(sd * 104, -280, 22, 30, 0, 0, TAU); g.fill(); g.lineWidth = 5; g.stroke(); }
  // head
  g.fillStyle = SKIN; g.beginPath(); g.ellipse(0, -282, 104, 116, 0, 0, TAU); g.fill(); g.lineWidth = 6; g.stroke();
  // cheeks
  g.fillStyle = 'rgba(200,110,90,.22)'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 58, -240, 22, 13, 0, 0, TAU); g.fill(); }
  // hair: a cap of curls
  g.fillStyle = HAIR;
  g.beginPath(); g.ellipse(0, -340, 112, 72, 0, Math.PI, TAU); g.fill();
  const curls = [[-112, -300, 30], [-102, -340, 36], [-78, -378, 38], [-42, -402, 40], [0, -410, 42], [42, -402, 40], [80, -380, 38], [104, -344, 36], [112, -304, 28],
    [-60, -350, 34], [-20, -365, 34], [22, -365, 34], [62, -350, 34], [-78, -330, 26], [80, -328, 26], [-38, -338, 26], [0, -342, 28], [36, -338, 26]];
  for (const [cx, cy, r] of curls) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); }
  // curl highlights
  g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 4;
  for (const [cx, cy, r] of curls.slice(0, 9)) { g.beginPath(); g.arc(cx, cy, r * .6, 3.6, 4.8); g.stroke(); }
  // eyebrows
  g.strokeStyle = HAIR; g.lineWidth = 10; g.lineCap = 'round';
  const br = st.brow || 0;
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 22, -308 - br * 8); g.quadraticCurveTo(sd * 44, -318 - br * 12, sd * 66, -310 - br * 6); g.stroke(); }
  // eyes (a little sleepy: heavy lids), pupils look toward the content
  const bl = st.blink || 0, lx = (st.look ?? .6) * 5;
  for (const sd of [-1, 1]) {
    const ex = sd * 42, ey = -280;
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, 20, 16 * (1 - bl) + .5, 0, 0, TAU); g.fill();
    if (bl < .8) { g.fillStyle = '#2b1a12'; g.beginPath(); g.arc(ex + lx, ey + 1, 10, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + lx + 3, ey - 3, 3, 0, TAU); g.fill(); }
    // lid
    g.fillStyle = SKIN_D; g.beginPath(); g.ellipse(ex, ey - 2, 23, 19, 0, Math.PI * 1.05, Math.PI * 1.95); g.lineTo(ex + 23, ey - 2 + (16 * bl)); g.lineTo(ex - 23, ey - 2 + 16 * bl); g.closePath();
    g.globalAlpha = .9; g.fill(); g.globalAlpha = 1;
    g.strokeStyle = LINE; g.lineWidth = 4.5; g.beginPath(); g.moveTo(ex - 22, ey - 4 + 14 * bl); g.quadraticCurveTo(ex, ey - 10 + 14 * bl, ex + 22, ey - 4 + 14 * bl); g.stroke();
  }
  // nose
  g.strokeStyle = SKIN_D; g.lineWidth = 5; g.beginPath(); g.moveTo(-4, -262); g.quadraticCurveTo(-14, -238, 2, -232); g.quadraticCurveTo(12, -232, 14, -238); g.stroke();
  // mouth
  const m = clamp(st.mouth || 0);
  if (m < .08) {
    g.strokeStyle = LINE; g.lineWidth = 6; g.beginPath(); g.moveTo(-26, -205); g.quadraticCurveTo(0, -192 + (st.smile ?? 0) * 6, 26, -205); g.stroke();
  } else {
    const h = 6 + m * 24, w = 24 + m * 6;
    g.fillStyle = '#5a1f22'; g.beginPath(); g.moveTo(-w, -208); g.quadraticCurveTo(0, -214, w, -208); g.quadraticCurveTo(w * .6, -208 + h * 1.1, 0, -206 + h); g.quadraticCurveTo(-w * .6, -208 + h * 1.1, -w, -208); g.fill();
    g.fillStyle = '#d06a6a'; g.beginPath(); g.ellipse(0, -206 + h * .7, w * .45, h * .28, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.fillRect(-w * .55, -210, w * 1.1, 4);
    g.strokeStyle = LINE; g.lineWidth = 5; g.beginPath(); g.moveTo(-w, -208); g.quadraticCurveTo(0, -214, w, -208); g.quadraticCurveTo(w * .6, -208 + h * 1.1, 0, -206 + h); g.quadraticCurveTo(-w * .6, -208 + h * 1.1, -w, -208); g.stroke();
  }
  if (raised) drawArms();
  // a glossy magnet glint across the sticker
  g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.ellipse(-60, -360, 40, 16, -.6, 0, TAU); g.fill();
  ctx.restore();
}
