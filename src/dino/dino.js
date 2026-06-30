/*
 * Dino Run — a from-scratch take on Chrome's offline T-Rex game.
 *
 * Goals:
 *  - Plays with keyboard on desktop (Space / Up = jump, Down = duck).
 *  - Plays great on iPad / touch: tap to jump, swipe down or press-and-hold
 *    the lower part of the screen to duck. No scrolling/zooming gets in the way.
 *  - Crisp on retina/Hi-DPI iPad screens and responsive to any width.
 *
 * Pure vanilla JS + Canvas — no build step, no dependencies. Open index.html
 * (or deploy the folder as a static site) and it runs.
 */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');

// ---------------------------------------------------------------------------
// World constants. Everything is authored in these "design" units; the canvas
// is scaled to fit the screen, so the game looks identical at any size.
// ---------------------------------------------------------------------------
const WORLD = {
  width: 600,
  height: 150,
  groundY: 127, // y of the ground line
  gravity: 0.6,
  jumpVelocity: -10.5,
  startSpeed: 6,
  maxSpeed: 13,
  acceleration: 0.001, // speed added per ms
};

const COLORS = {
  day: { bg: '#f7f7f7', fg: '#535353', ground: '#535353' },
  night: { bg: '#202124', fg: '#cfcfcf', ground: '#cfcfcf' },
};

// ---------------------------------------------------------------------------
// Hi-DPI + responsive canvas sizing.
// ---------------------------------------------------------------------------
function resize() {
  const wrap = canvas.parentElement;
  const cssWidth = Math.min(wrap.clientWidth - 24, 900);
  const cssHeight = cssWidth * (WORLD.height / WORLD.width);
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  // Map design units (WORLD.width x WORLD.height) onto the device pixels.
  const scale = (cssWidth * dpr) / WORLD.width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));

// ---------------------------------------------------------------------------
// The dino.
// ---------------------------------------------------------------------------
const dino = {
  x: 25,
  y: 0, // top of sprite, set relative to ground each frame
  vy: 0,
  width: 44,
  height: 47,
  duckWidth: 59,
  duckHeight: 30,
  jumping: false,
  ducking: false,
  legFrame: 0,
  legTimer: 0,
  reset() {
    this.vy = 0;
    this.jumping = false;
    this.ducking = false;
    this.y = WORLD.groundY - this.height;
  },
  get hitHeight() {
    return this.ducking ? this.duckHeight : this.height;
  },
  get hitWidth() {
    return this.ducking ? this.duckWidth : this.width;
  },
  get bottom() {
    return WORLD.groundY;
  },
  get top() {
    return this.bottom - this.hitHeight;
  },
  jump() {
    if (!this.jumping) {
      this.vy = WORLD.jumpVelocity;
      this.jumping = true;
      this.ducking = false;
    }
  },
  setDuck(on) {
    if (this.jumping) {
      // Pressing duck mid-air drops you faster (matches Chrome's feel).
      if (on) this.vy += 1.2;
      return;
    }
    this.ducking = on;
  },
  update(dt) {
    if (this.jumping) {
      this.y += this.vy;
      this.vy += WORLD.gravity;
      if (this.y >= WORLD.groundY - this.height) {
        this.y = WORLD.groundY - this.height;
        this.jumping = false;
        this.vy = 0;
      }
    }
    // Running leg animation.
    this.legTimer += dt;
    if (this.legTimer > 90) {
      this.legTimer = 0;
      this.legFrame = this.legFrame === 0 ? 1 : 0;
    }
  },
};

// ---------------------------------------------------------------------------
// Obstacles: cacti (ground) and pterodactyls (birds at varying heights).
// ---------------------------------------------------------------------------
const CACTUS_TYPES = [
  { width: 17, height: 35 },
  { width: 25, height: 50 },
  { width: 34, height: 35 }, // double cactus
  { width: 51, height: 35 }, // triple cactus
];
const BIRD_HEIGHTS = [WORLD.groundY - 30, WORLD.groundY - 50, WORLD.groundY - 75];

let obstacles = [];
let spawnTimer = 0;

function spawnObstacle(speed, score) {
  // Birds only appear once you've earned some distance.
  const allowBird = score > 350 && Math.random() < 0.25;
  if (allowBird) {
    const y = BIRD_HEIGHTS[Math.floor(Math.random() * BIRD_HEIGHTS.length)];
    obstacles.push({
      kind: 'bird',
      x: WORLD.width + 20,
      y,
      width: 42,
      height: 30,
      wing: 0,
      wingTimer: 0,
    });
  } else {
    const t = CACTUS_TYPES[Math.floor(Math.random() * CACTUS_TYPES.length)];
    obstacles.push({
      kind: 'cactus',
      x: WORLD.width + 20,
      y: WORLD.groundY - t.height,
      width: t.width,
      height: t.height,
    });
  }
  // Gap until next spawn scales inversely with speed so it stays fair.
  const base = 700 + Math.random() * 500;
  spawnTimer = base * (WORLD.startSpeed / speed);
}

// ---------------------------------------------------------------------------
// Clouds (decorative parallax).
// ---------------------------------------------------------------------------
let clouds = [];
function spawnCloud() {
  clouds.push({
    x: WORLD.width + 10,
    y: 15 + Math.random() * 45,
    width: 46,
  });
}

// ---------------------------------------------------------------------------
// Game state.
// ---------------------------------------------------------------------------
const HIGH_SCORE_KEY = 'dinoRunHighScore';
const state = {
  running: false,
  over: false,
  started: false,
  speed: WORLD.startSpeed,
  distance: 0,
  score: 0,
  high: Number(localStorage.getItem(HIGH_SCORE_KEY) || 0),
  night: false,
  nightTimer: 0,
  groundOffset: 0,
  flash: 0, // restart blink guard
};

function reset() {
  obstacles = [];
  clouds = [];
  spawnTimer = 600;
  state.speed = WORLD.startSpeed;
  state.distance = 0;
  state.score = 0;
  state.night = false;
  state.nightTimer = 0;
  state.groundOffset = 0;
  state.over = false;
  dino.reset();
}

function start() {
  reset();
  state.running = true;
  state.started = true;
  if (hint) hint.classList.add('hidden');
}

function gameOver() {
  state.running = false;
  state.over = true;
  if (state.score > state.high) {
    state.high = state.score;
    localStorage.setItem(HIGH_SCORE_KEY, String(state.high));
  }
  state.flash = 0;
}

// ---------------------------------------------------------------------------
// Input — shared by keyboard and touch.
// ---------------------------------------------------------------------------
function pressJump() {
  if (state.over) {
    // Small guard so the same tap that ended the game doesn't instantly restart.
    if (state.flash > 250) start();
    return;
  }
  if (!state.started || !state.running) {
    start();
    return;
  }
  dino.jump();
}

function setDuck(on) {
  if (!state.running) return;
  dino.setDuck(on);
}

// Keyboard
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
    e.preventDefault();
    pressJump();
  } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
    e.preventDefault();
    setDuck(true);
  }
});
window.addEventListener('keyup', (e) => {
  if (['ArrowDown', 'KeyS'].includes(e.code)) {
    e.preventDefault();
    setDuck(false);
  }
});

// Touch (iPad / iPhone / touch laptops).
// Tap = jump. Swipe down, or press-and-hold the lower portion, = duck.
let touchStartY = 0;
let touchStartX = 0;
let touchIsDuck = false;
const DUCK_SWIPE_THRESHOLD = 24; // px of downward movement to count as a duck

canvas.addEventListener(
  'touchstart',
  (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartY = t.clientY;
    touchStartX = t.clientX;
    touchIsDuck = false;

    // Holding the lower third of the canvas means "duck".
    const relY = (t.clientY - rect.top) / rect.height;
    if (state.running && relY > 0.6) {
      touchIsDuck = true;
      setDuck(true);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartY;
    if (state.running && dy > DUCK_SWIPE_THRESHOLD && !dino.jumping) {
      touchIsDuck = true;
      setDuck(true);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  (e) => {
    e.preventDefault();
    if (touchIsDuck) {
      setDuck(false);
      touchIsDuck = false;
      return;
    }
    const t = e.changedTouches[0];
    const dy = t.clientY - touchStartY;
    const dx = Math.abs(t.clientX - touchStartX);
    // A short, mostly-stationary touch is a tap → jump.
    if (dy < DUCK_SWIPE_THRESHOLD || dx > Math.abs(dy)) {
      pressJump();
    } else {
      setDuck(false);
    }
  },
  { passive: false }
);
canvas.addEventListener('touchcancel', () => {
  setDuck(false);
  touchIsDuck = false;
});

// Mouse (desktop click also works).
canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  pressJump();
});

// Prevent iOS double-tap-to-zoom on the whole page.
document.addEventListener('gesturestart', (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false }
);

// ---------------------------------------------------------------------------
// Collision (axis-aligned, with a little inset so it feels fair).
// ---------------------------------------------------------------------------
function hits(o) {
  const pad = 4;
  const dx = dino.x + pad;
  const dy = dino.top + pad;
  const dw = dino.hitWidth - pad * 2;
  const dh = dino.hitHeight - pad * 2;
  return (
    dx < o.x + o.width - pad &&
    dx + dw > o.x + pad &&
    dy < o.y + o.height - pad &&
    dy + dh > o.y + pad
  );
}

// ---------------------------------------------------------------------------
// Update loop.
// ---------------------------------------------------------------------------
function update(dt) {
  if (!state.running) return;

  state.speed = Math.min(WORLD.maxSpeed, state.speed + WORLD.acceleration * dt);
  const move = state.speed * (dt / 16.67);

  state.distance += move;
  state.score = Math.floor(state.distance / 6);

  dino.update(dt);

  // Day/night cycle every ~700 points.
  state.nightTimer += dt;
  if (state.score > 0 && state.score % 700 < 3 && state.nightTimer > 2000) {
    state.night = !state.night;
    state.nightTimer = 0;
  }

  // Ground scroll.
  state.groundOffset = (state.groundOffset + move) % WORLD.width;

  // Spawn / move obstacles.
  spawnTimer -= dt;
  if (spawnTimer <= 0) spawnObstacle(state.speed, state.score);
  for (const o of obstacles) {
    o.x -= move;
    if (o.kind === 'bird') {
      o.wingTimer += dt;
      if (o.wingTimer > 150) {
        o.wingTimer = 0;
        o.wing = o.wing === 0 ? 1 : 0;
      }
    }
    if (hits(o)) gameOver();
  }
  obstacles = obstacles.filter((o) => o.x + o.width > -10);

  // Clouds.
  if (clouds.length === 0 || clouds[clouds.length - 1].x < WORLD.width - 150) {
    if (Math.random() < 0.01) spawnCloud();
  }
  for (const c of clouds) c.x -= move * 0.4;
  clouds = clouds.filter((c) => c.x + c.width > -10);
}

// ---------------------------------------------------------------------------
// Rendering. Simple blocky shapes that read as the classic sprites.
// ---------------------------------------------------------------------------
function px(x, y, w, h) {
  ctx.fillRect(x, y, w, h);
}

function drawDino(fg) {
  ctx.fillStyle = fg;
  const x = dino.x;

  if (dino.ducking) {
    const y = WORLD.groundY - dino.duckHeight;
    // Body (long, low)
    px(x, y + 8, 50, 14);
    // Head
    px(x + 40, y + 2, 19, 14);
    // Eye (cut-out)
    ctx.fillStyle = state.night ? COLORS.night.bg : COLORS.day.bg;
    px(x + 52, y + 5, 3, 3);
    ctx.fillStyle = fg;
    // Legs
    if (dino.legFrame === 0) {
      px(x + 12, y + 22, 7, 8);
      px(x + 28, y + 22, 7, 4);
    } else {
      px(x + 12, y + 22, 7, 4);
      px(x + 28, y + 22, 7, 8);
    }
    return;
  }

  const y = WORLD.groundY - dino.height;
  // Tail
  px(x, y + 18, 12, 8);
  // Body
  px(x + 6, y + 14, 22, 20);
  // Neck + head
  px(x + 22, y, 22, 22);
  // Snout
  px(x + 40, y + 6, 8, 8);
  // Eye (cut-out)
  ctx.fillStyle = state.night ? COLORS.night.bg : COLORS.day.bg;
  px(x + 36, y + 4, 4, 4);
  ctx.fillStyle = fg;
  // Little arm
  px(x + 28, y + 22, 6, 4);

  // Legs (animate only while on the ground)
  if (dino.jumping) {
    px(x + 10, y + 34, 7, 10);
    px(x + 22, y + 34, 7, 10);
  } else if (dino.legFrame === 0) {
    px(x + 10, y + 34, 7, 13);
    px(x + 22, y + 34, 7, 8);
  } else {
    px(x + 10, y + 34, 7, 8);
    px(x + 22, y + 34, 7, 13);
  }
}

function drawCactus(o, fg) {
  ctx.fillStyle = fg;
  if (o.width <= 17) {
    px(o.x + 5, o.y, 6, o.height);
    px(o.x, o.y + 10, 5, 4);
    px(o.x + 11, o.y + 6, 5, 4);
  } else if (o.width <= 25) {
    px(o.x + 9, o.y, 7, o.height);
    px(o.x + 2, o.y + 14, 7, 5);
    px(o.x + 16, o.y + 8, 7, 5);
  } else {
    // double / triple — draw repeated stalks
    const stalks = o.width <= 34 ? 2 : 3;
    const gap = o.width / stalks;
    for (let i = 0; i < stalks; i++) {
      const sx = o.x + i * gap;
      px(sx + 4, o.y, 6, o.height);
      px(sx, o.y + 12, 4, 4);
      px(sx + 10, o.y + 7, 4, 4);
    }
  }
}

function drawBird(o, fg) {
  ctx.fillStyle = fg;
  // Body
  px(o.x + 14, o.y + 12, 22, 6);
  // Head + beak
  px(o.x + 34, o.y + 10, 8, 6);
  px(o.x + 40, o.y + 13, 4, 3);
  // Wings flap
  if (o.wing === 0) {
    px(o.x + 10, o.y, 18, 12); // up
  } else {
    px(o.x + 10, o.y + 16, 18, 12); // down
  }
}

function drawCloud(c, fg) {
  ctx.fillStyle = fg;
  px(c.x + 8, c.y, 30, 6);
  px(c.x, c.y + 4, 46, 6);
  px(c.x + 12, c.y - 4, 18, 4);
}

function drawGround(fg) {
  ctx.fillStyle = fg;
  const y = WORLD.groundY;
  // Base line spanning two tiles for seamless scroll.
  for (let i = -1; i <= 1; i++) {
    const base = i * WORLD.width - state.groundOffset;
    px(base, y, WORLD.width, 2);
    // sparse bumps
    for (let b = 0; b < WORLD.width; b += 33) {
      px(base + b + ((b * 7) % 13), y + 4, 4, 2);
    }
  }
}

function drawText(fg) {
  ctx.fillStyle = fg;
  ctx.font = '14px "Courier New", monospace';
  ctx.textAlign = 'right';
  const score = String(state.score).padStart(5, '0');
  if (state.high > 0) {
    ctx.fillText('HI ' + String(state.high).padStart(5, '0') + '  ' + score, WORLD.width - 8, 20);
  } else {
    ctx.fillText(score, WORLD.width - 8, 20);
  }
  ctx.textAlign = 'left';
}

function drawCenter(fg, lines) {
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(lines[0], WORLD.width / 2, WORLD.height / 2 - 6);
  if (lines[1]) {
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(lines[1], WORLD.width / 2, WORLD.height / 2 + 16);
  }
  ctx.textAlign = 'left';
}

function render() {
  const theme = state.night ? COLORS.night : COLORS.day;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  for (const c of clouds) drawCloud(c, state.night ? '#5f6368' : '#cdcdcd');
  drawGround(theme.ground);
  for (const o of obstacles) {
    if (o.kind === 'cactus') drawCactus(o, theme.fg);
    else drawBird(o, theme.fg);
  }
  drawDino(theme.fg);
  drawText(theme.fg);

  if (!state.started) {
    drawDino(theme.fg);
    drawCenter(theme.fg, ['PRESS SPACE / TAP TO START', 'Tap = jump · Swipe down / hold = duck']);
  } else if (state.over) {
    drawCenter(theme.fg, ['G A M E   O V E R', 'Tap or press Space to restart']);
  }
}

// ---------------------------------------------------------------------------
// Main loop.
// ---------------------------------------------------------------------------
let last = performance.now();
function loop(now) {
  let dt = now - last;
  last = now;
  if (dt > 50) dt = 50; // clamp after tab switches / hitches

  if (state.over) state.flash += dt;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------
resize();
dino.reset();
render();
requestAnimationFrame(loop);
