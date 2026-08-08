/* ══════════════════════════════════════════════════════════════════════
   Baked and Batched — site behaviour

   ┌────────────────────────────────────────────────────────────────┐
   │  EDIT THIS BLOCK AND NOTHING ELSE.                             │
   │  Everything the client needs to change lives in CONFIG below.  │
   └────────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════ */

const CONFIG = {
  // WhatsApp number in full international format, digits only, no + or spaces.
  // Pakistan example: 0300 1234567  ->  '923001234567'
  whatsapp: '923212008851',           // +92 321 2008851

  // Instagram handle without the @. Leave '' to hide the Instagram buttons.
  instagram: '',                      // ←  STILL NEEDED. Leave '' to hide the Instagram buttons.

  // Shown in the "How to order" paragraph and the footer.
  city: 'Karachi',                    // delivery city / area
  lead: '48 hours’ notice',           // ←  how much notice an order needs
};

/* ═══════════════ nothing below here needs editing ══════════════════ */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ── 1. apply config ──────────────────────────────────────────────── */
(function applyConfig() {
  // WhatsApp CTAs
  const digits = String(CONFIG.whatsapp).replace(/\D/g, '');
  document.querySelectorAll('[data-wa]').forEach(el => {
    if (digits) {
      el.setAttribute('href', `https://wa.me/${digits}?text=${encodeURIComponent(el.dataset.wa)}`);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    } else {
      el.setAttribute('aria-disabled', 'true');
      el.style.opacity = '.55';
      el.style.pointerEvents = 'none';
    }
  });
  if (!digits) console.warn('[Baked and Batched] CONFIG.whatsapp is empty — order buttons are inactive.');

  // Instagram
  const ig = String(CONFIG.instagram).replace(/^@/, '').trim();
  [['igLink', 'igLabel'], ['igLink2', 'igLabel2']].forEach(([linkId, labelId]) => {
    const link = document.getElementById(linkId);
    const label = document.getElementById(labelId);
    if (!link) return;
    if (ig) {
      link.href = `https://instagram.com/${ig}`;
      if (label) label.textContent = `@${ig}`;
    } else {
      link.remove();
    }
  });

  // Text tokens
  document.querySelectorAll('[data-cfg]').forEach(el => {
    const v = CONFIG[el.dataset.cfg];
    if (v) el.textContent = v;
  });

  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();

/* ── 2. sticky top bar ────────────────────────────────────────────── */
const topbar = document.getElementById('topbar');
const onStick = () => topbar.classList.toggle('is-stuck', window.scrollY > 40);
onStick();

/* ── 3. mobile menu ───────────────────────────────────────────────── */
(function mobileNav() {
  const burger = document.getElementById('burger');
  const list = document.getElementById('navList');
  if (!burger || !list) return;

  const setOpen = open => {
    list.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  list.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  addEventListener('resize', () => { if (innerWidth > 900) setOpen(false); });
})();

/* ── 4. reveal on enter ───────────────────────────────────────────── */
(function reveals() {
  const items = document.querySelectorAll('.reveal');

  // stagger index is scoped per parent, not global — each group of
  // siblings (a menu list, a box grid, a FAQ list…) cascades from its
  // own start instead of inheriting a huge delay from earlier sections
  const seen = new Map();
  items.forEach(el => {
    const parent = el.parentElement;
    const i = seen.get(parent) || 0;
    el.style.setProperty('--reveal-i', Math.min(i, 5));
    seen.set(parent, i + 1);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      obs.unobserve(entry.target);            // reveal once, then stop watching
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  items.forEach(el => io.observe(el));
})();

/* ── 5. scroll choreography ───────────────────────────────────────── */
(function choreography() {
  if (reduceMotion) return;

  const parallax = [...document.querySelectorAll('[data-par]')];
  const scenes = [...document.querySelectorAll('.scene--flavour')].map(section => ({
    section,
    name: section.querySelector('[data-fx="name"]'),
    shot: section.querySelector('[data-fx="shot"]'),
  }));

  let ticking = false;

  function frame() {
    ticking = false;
    const vh = innerHeight;

    // Depth layers — background slower than scroll, foreground faster.
    // Progress is measured against the parent chapter, not the viewport centre,
    // so every layer sits at its authored position when its chapter is at rest.
    for (const el of parallax) {
      const host = el.closest('.scene') || el.parentElement;
      const hr = host.getBoundingClientRect();
      if (hr.bottom < -200 || hr.top > vh + 200) continue;
      const progress = -hr.top / vh;                       // 0 = chapter aligned to top
      const y = clamp(progress * parseFloat(el.dataset.par) * 140, -170, 170);
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }

    // each flavour chapter rises in, holds, then drifts out
    for (const { section, name, shot } of scenes) {
      const r = section.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;

      const t = r.top / vh;                       // 1 = below fold, 0 = aligned, -1 = past
      const enter = easeOut(clamp(1 - t, 0, 1));
      const exit = clamp(-t, 0, 1);

      if (shot) {
        const scale = 0.86 + 0.14 * enter - 0.10 * exit;
        const y = (1 - enter) * 70 - exit * 55;
        shot.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        shot.style.opacity = (enter * (1 - exit * 0.85)).toFixed(3);
      }
      if (name) {
        const scale = 0.92 + 0.08 * enter;
        const y = -50 + (1 - enter) * 34 - exit * 96;   // drifts opposite the cookie
        name.style.transform = `translate(-50%, ${y.toFixed(2)}%) scale(${scale.toFixed(3)})`;
      }
    }
  }

  function request() {
    onStick();
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  addEventListener('load', request);
  request();
})();

// keep the sticky bar working even when choreography is disabled
if (reduceMotion) addEventListener('scroll', onStick, { passive: true });

/* ── 6. pointer-reactive tilt ─────────────────────────────────────── */
/* A cookie tilts in 3D toward the cursor, like it's a real object catching
   light — the depth cue a flat product photo can't give on its own. Applied
   to the <img> inside each cookie wrapper, never the wrapper itself, so it
   composes cleanly with the wrapper's own scroll-driven transform instead
   of one overwriting the other. Skipped on touch devices (no cursor to react
   to) and under prefers-reduced-motion. */
(function tilt() {
  if (reduceMotion || matchMedia('(hover: none)').matches) return;

  const targets = [...document.querySelectorAll('.hero__cookie img, [data-fx="shot"] img')];
  if (!targets.length) return;

  let px = innerWidth / 2, py = innerHeight / 2;
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; }, { passive: true });

  const state = targets.map(() => ({ rx: 0, ry: 0 }));

  function frame() {
    targets.forEach((img, i) => {
      const r = img.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight + 50) return;   // offscreen, skip the work
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const targetRy = clamp(((px - cx) / innerWidth) * 16, -8, 8);
      const targetRx = clamp((-(py - cy) / innerHeight) * 16, -8, 8);
      const s = state[i];
      s.rx += (targetRx - s.rx) * 0.07;
      s.ry += (targetRy - s.ry) * 0.07;
      img.style.transform = `perspective(900px) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg)`;
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ── 8. first-load intro ──────────────────────────────────────────── */
/* A brief branded moment before the hero appears — skipped entirely under
   reduced motion, and only ever played once per browser session so repeat
   visits (or scrolling back to #top) never re-trigger it. */
(function intro() {
  const el = document.getElementById('intro');
  if (!el) return;

  let seen = false;
  try { seen = sessionStorage.getItem('bnb-intro-seen') === '1'; } catch (e) { /* storage blocked — just skip */ }

  if (reduceMotion || seen) {
    el.remove();
    return;
  }
  try { sessionStorage.setItem('bnb-intro-seen', '1'); } catch (e) { /* ignore */ }

  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => el.classList.add('is-ready'));
  setTimeout(() => {
    el.classList.add('is-done');
    document.body.style.overflow = '';
    setTimeout(() => el.remove(), 500);
  }, 750);
})();

/* ── 9. build-your-box calculator ─────────────────────────────────── */
/* Real prices and flavours pulled from the menu above — nothing invented.
   Picking a box filters the flavour chips to that tier, caps the pick at
   two, and turns the total + WhatsApp message into one pre-filled link. */
(function boxBuilder() {
  const root = document.getElementById('builder');
  if (!root) return;

  const boxInputs = [...root.querySelectorAll('input[name="builderBox"]')];
  const chipLabels = [...root.querySelectorAll('.builder__chip')];
  const flavourInputs = chipLabels.map(l => l.querySelector('input'));
  const hint = document.getElementById('builderHint');
  const summary = document.getElementById('builderSummary');
  const cta = document.getElementById('builderCta');

  function selectedBox() {
    const input = boxInputs.find(i => i.checked);
    return input ? { tier: input.dataset.tier, price: input.dataset.price, label: input.dataset.label } : null;
  }

  function update() {
    const box = selectedBox();

    chipLabels.forEach((label, i) => {
      const matches = !!box && label.dataset.tier === box.tier;
      label.classList.toggle('is-hidden', !matches);
      if (!matches) flavourInputs[i].checked = false;
    });

    const checkedCount = flavourInputs.filter(i => i.checked).length;
    flavourInputs.forEach((input, i) => {
      if (chipLabels[i].classList.contains('is-hidden')) return;
      input.disabled = !input.checked && checkedCount >= 2;
    });

    if (!box) {
      hint.textContent = 'Choose a box first.';
      summary.textContent = 'Pick a box and two flavours to see your total.';
      cta.setAttribute('aria-disabled', 'true');
      cta.removeAttribute('href');
      return;
    }

    const names = flavourInputs.filter(i => i.checked).map(i => i.value);
    if (names.length < 2) {
      hint.textContent = `Choose ${2 - names.length} more flavour${names.length === 1 ? '' : 's'}.`;
      summary.innerHTML = `<strong>${box.label}</strong> — ${box.price}. Pick two flavours.`;
      cta.setAttribute('aria-disabled', 'true');
      cta.removeAttribute('href');
      return;
    }

    hint.textContent = 'Ready to order.';
    summary.innerHTML = `<strong>${box.label}</strong> — ${names.join(' + ')} — <strong>${box.price}</strong>`;
    const digits = String(CONFIG.whatsapp).replace(/\D/g, '');
    const msg = `Hi! I'd like to order a ${box.label} with ${names.join(' and ')} (${box.price}).`;
    if (digits) {
      cta.href = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
      cta.removeAttribute('aria-disabled');
    }
  }

  boxInputs.forEach(i => i.addEventListener('change', update));
  flavourInputs.forEach(i => i.addEventListener('change', update));
  update();
})();

/* ── 10. hero bite ═══════════════════════════════════════════════════
   SELF-CONTAINED — to remove, delete this whole function, the
   ".herobite__*" CSS block in styles.css, and the three ".herobite__*"
   elements inside .hero__cookie--c in index.html. Nothing else on the
   page reads any of this.

   Uses clip-path: path(evenodd, "<outer rect> <inner hole>") instead of
   the mask-image circle-layering tried before: a single jagged polygon
   (16 points at hand-tuned angle/radius, not a circle) subtracted from
   the image's own rectangle, anchored at the cookie's actual upper-right
   rim rather than floating over the middle of the surface — a bite
   removes material from the edge, it doesn't punch a hole in the centre.
   Growing every point outward together (not stacking separate shapes)
   is what keeps the edge looking torn instead of "a circle appeared". ── */
(function heroBite() {
  const section = document.querySelector('.scene--hero');
  const img = document.getElementById('heroBiteImg');
  const shadow = document.getElementById('heroBiteShadow');
  const dust = document.getElementById('heroBiteDust');
  const crumbsHost = document.getElementById('heroBiteCrumbs');
  if (!section || !img || !shadow || !dust || !crumbsHost) return;

  // [angle in degrees, radius as a fraction of the current bite radius]
  // radius alternates deep/shallow around the circle — a real bite tears
  // unevenly, it doesn't leave a smooth curve
  const POINTS = [
    [0, .95], [22.5, .55], [45, .9], [67.5, .7], [90, 1], [112.5, .6], [135, .85], [157.5, .5],
    [180, .8], [202.5, .95], [225, .65], [247.5, .88], [270, .58], [292.5, .82], [315, .7], [337.5, .92],
  ];
  const ANCHOR_X = 0.84, ANCHOR_Y = 0.16;   // the cookie's own upper-right rim, not its middle

  const crumbs = [];
  for (let i = 0; i < 14; i++) {
    const span = document.createElement('span');
    crumbsHost.appendChild(span);
    crumbs.push(span);
  }

  function clipPathAt(iw, ih, ax, ay, cr) {
    const pts = POINTS.map(([a, f]) => {
      const rad = a * Math.PI / 180;
      return `${(ax + Math.cos(rad) * cr * f).toFixed(1)},${(ay + Math.sin(rad) * cr * f).toFixed(1)}`;
    });
    const outer = `M0,0 L${iw},0 L${iw},${ih} L0,${ih} Z`;
    const inner = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')} Z`;
    return `path(evenodd, "${outer} ${inner}")`;
  }

  // painted once per load (not per frame) — a static speckle field reads
  // as "countless crumbs" without animating hundreds of DOM nodes
  let dustPainted = false;
  function paintDust(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const shades = ['#EACB9E', '#E0B583', '#DDA96E', '#8B5A3C', '#C98B6C'];
    for (let i = 0; i < 600; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.pow(Math.random(), 0.6) * (size / 2);
      const x = size / 2 + Math.cos(a) * d;
      const y = size / 2 + Math.sin(a) * d;
      ctx.fillStyle = shades[(Math.random() * shades.length) | 0];
      ctx.globalAlpha = 0.35 + Math.random() * 0.5;
      const s = 0.8 + Math.random() * 2;
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * (0.6 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    dust.style.backgroundImage = `url(${canvas.toDataURL()})`;
    dust.style.backgroundSize = '100% 100%';
    dust.style.width = dust.style.height = `${size}px`;
    dustPainted = true;
  }

  function placeCrumbs(ax, ay, maxR) {
    crumbs.forEach((span, i) => {
      const [a, f] = POINTS[i % POINTS.length];
      const rad = a * Math.PI / 180;
      const dist = maxR * f * (1.08 + (i % 3) * 0.06);
      const size = 4 + (i % 4) * 1.6;
      span.style.left = `${(ax + Math.cos(rad) * dist).toFixed(1)}px`;
      span.style.top = `${(ay + Math.sin(rad) * dist).toFixed(1)}px`;
      span.style.width = `${size}px`;
      span.style.height = `${(size * 0.85).toFixed(1)}px`;
      span.style.background = i % 2 ? '#8B5A3C' : '#DDA96E';
      span.classList.add('is-in');
    });
  }

  function update() {
    const r = section.getBoundingClientRect();
    // t=0 while the hero sits at rest (r.top===0 on load); rises to 1 as the
    // hero scrolls up and out — "as you scroll past", not "already bitten"
    const t = clamp(-r.top / (r.height * 0.6), 0, 1);
    const iw = img.clientWidth, ih = img.clientHeight;
    if (!iw || !ih) return;

    const eased = 1 - Math.pow(1 - t, 2);
    const maxR = iw * 0.48;
    const cr = eased * maxR;
    const ax = iw * ANCHOR_X, ay = ih * ANCHOR_Y;

    img.style.clipPath = cr < 1 ? 'none' : clipPathAt(iw, ih, ax, ay, cr);
    shadow.style.setProperty('--hb-x', `${(ax / iw * 100).toFixed(1)}%`);
    shadow.style.setProperty('--hb-y', `${(ay / ih * 100).toFixed(1)}%`);
    shadow.style.setProperty('--hb-r', `${cr.toFixed(1)}px`);

    if (t > 0.3) {
      if (!dustPainted) paintDust(Math.round(maxR * 2.4));
      dust.style.left = `${(ax - dust.clientWidth / 2).toFixed(1)}px`;
      dust.style.top = `${(ay - dust.clientHeight / 2).toFixed(1)}px`;
      dust.classList.add('is-visible');
    }
    if (t > 0.45) placeCrumbs(ax, ay, maxR);
  }

  if (reduceMotion) {
    const iw = img.clientWidth || img.width, ih = img.clientHeight || img.height;
    const maxR = iw * 0.48, cr = maxR * 0.62;
    const ax = iw * ANCHOR_X, ay = ih * ANCHOR_Y;
    img.style.clipPath = clipPathAt(iw, ih, ax, ay, cr);
    shadow.style.setProperty('--hb-x', `${(ANCHOR_X * 100).toFixed(1)}%`);
    shadow.style.setProperty('--hb-y', `${(ANCHOR_Y * 100).toFixed(1)}%`);
    shadow.style.setProperty('--hb-r', `${cr.toFixed(1)}px`);
    paintDust(Math.round(maxR * 2.4));
    dust.style.left = `${(ax - dust.clientWidth / 2).toFixed(1)}px`;
    dust.style.top = `${(ay - dust.clientHeight / 2).toFixed(1)}px`;
    dust.classList.add('is-visible');
    placeCrumbs(ax, ay, maxR);
    return;
  }

  let ticking = false;
  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  addEventListener('load', request);
  request();
})();
