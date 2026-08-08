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

   Geometry, matched to what a real bitten cookie actually looks like:
   the cookie is a centred disc, so the bite is a second circle whose
   CENTRE SITS ON THAT DISC'S RIM — it tears a chunk out of the edge and
   leaves a concave arc. (Earlier attempts put the hole in the middle of
   the photo, which is why it read as "a circle appeared", and used a
   stacked-cookie photo that had no round rim to bite in the first place.)
   The rim is scalloped by only ±8% so it reads as tooth marks; bigger
   deviation turns it into a flower, not a bite. ── */
(function heroBite() {
  const section = document.querySelector('.scene--hero');
  const img = document.getElementById('heroBiteImg');
  const shadow = document.getElementById('heroBiteShadow');
  const dust = document.getElementById('heroBiteDust');
  const crumbsHost = document.getElementById('heroBiteCrumbs');
  if (!section || !img || !shadow || !dust || !crumbsHost) return;

  const CR = 0.5;                      // cookie radius, as a fraction of the square image
  const ANGLE = 22 * Math.PI / 180;    // down-and-right, like the reference photo
  const DIST = 0.94;                   // bite centre distance from cookie centre, × CR
  const MAX = 0.62;                    // final bite radius, × CR
  const STEPS = 30;

  // ±8% scalloping: three rounded tooth marks with a finer ripple on top
  const lobe = t => 1 + 0.075 * Math.cos(3 * t + 0.6) + 0.028 * Math.cos(7 * t + 2.1);

  // deterministic scatter so crumbs land in the same place every load
  const rnd = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };

  const CRUMBS = 16;
  const crumbEls = [];
  for (let i = 0; i < CRUMBS; i++) {
    const s = document.createElement('span');
    crumbsHost.appendChild(s);
    crumbEls.push(s);
  }

  function biteCentre(w, h) {
    return { x: w * (0.5 + Math.cos(ANGLE) * DIST * CR), y: h * (0.5 + Math.sin(ANGLE) * DIST * CR) };
  }

  function clipFor(w, h, r) {
    const c = biteCentre(w, h);
    const pts = [];
    for (let i = 0; i < STEPS; i++) {
      const t = (i / STEPS) * Math.PI * 2;
      const rr = r * lobe(t);
      pts.push(`${(c.x + Math.cos(t) * rr).toFixed(1)},${(c.y + Math.sin(t) * rr).toFixed(1)}`);
    }
    const outer = `M0,0 L${w},0 L${w},${h} L0,${h} Z`;
    const inner = `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(' ')} Z`;
    return `path(evenodd, "${outer} ${inner}")`;
  }

  // one canvas of fine specks, painted once — this is what gives the
  // "countless crumbs" look without animating hundreds of DOM nodes
  let painted = 0;
  function paintDust(size) {
    if (painted === size) return;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const shades = ['#EACB9E', '#DDA96E', '#B98A55', '#8B5A3C', '#6E4327'];
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.pow(Math.random(), 0.75) * (size / 2);
      const s = 0.5 + Math.random() * 1.9;
      ctx.fillStyle = shades[(Math.random() * shades.length) | 0];
      ctx.globalAlpha = 0.3 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.ellipse(size / 2 + Math.cos(a) * d, size / 2 + Math.sin(a) * d,
                  s, s * (0.55 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    dust.style.backgroundImage = `url(${cv.toDataURL()})`;
    dust.style.backgroundSize = '100% 100%';
    dust.style.width = dust.style.height = `${size}px`;
    painted = size;
  }

  // crumbs sit OUTSIDE the cookie's rim, fanned around the bite — on the
  // page background, exactly where they fall in the reference photo
  function placeCrumbs(w, h, r) {
    crumbEls.forEach((el, i) => {
      const spread = (rnd(i) - 0.42) * 1.5;                 // fan either side of the bite
      const a = ANGLE + spread;
      const d = CR * (1.04 + rnd(i + 90) * 0.42);           // just past the rim, outward
      const size = 2.5 + rnd(i + 40) * 4.5;
      el.style.left = `${(w * (0.5 + Math.cos(a) * d)).toFixed(1)}px`;
      el.style.top = `${(h * (0.5 + Math.sin(a) * d)).toFixed(1)}px`;
      el.style.width = `${size.toFixed(1)}px`;
      el.style.height = `${(size * (0.6 + rnd(i + 7) * 0.5)).toFixed(1)}px`;
      el.style.background = ['#EACB9E', '#DDA96E', '#B98A55', '#8B5A3C'][i % 4];
      el.style.transitionDelay = `${(rnd(i + 3) * 0.25).toFixed(2)}s`;
      el.classList.add('is-in');
    });
  }

  function apply(w, h, r, t) {
    const c = biteCentre(w, h);
    img.style.clipPath = r < 1 ? 'none' : clipFor(w, h, r);
    shadow.style.setProperty('--hb-x', `${(c.x / w * 100).toFixed(1)}%`);
    shadow.style.setProperty('--hb-y', `${(c.y / h * 100).toFixed(1)}%`);
    shadow.style.setProperty('--hb-r', `${r.toFixed(1)}px`);

    if (t > 0.35) {
      const size = Math.round(w * CR * 1.5);
      paintDust(size);
      // sits just beyond the bite, drifting away from the cookie
      const da = ANGLE + 0.18, dd = CR * 1.16;
      dust.style.left = `${(w * (0.5 + Math.cos(da) * dd) - size / 2).toFixed(1)}px`;
      dust.style.top = `${(h * (0.5 + Math.sin(da) * dd) - size / 2).toFixed(1)}px`;
      dust.classList.add('is-visible');
    }
    if (t > 0.45) placeCrumbs(w, h, r);
  }

  let settled = false;
  function update() {
    const rect = section.getBoundingClientRect();
    // once the hero is fully past, the bite is finished — stop rebuilding a
    // 30-point path on every scroll frame for the rest of the page
    if (rect.bottom < 0) { settled = true; return; }
    if (settled) settled = false;
    // Completes within the first flick of scroll (~18% of a viewport). The
    // hero cookie sits high on the page, so a longer travel would finish the
    // bite only after the cookie had already scrolled out of sight — the
    // payoff has to land while it's still fully visible.
    const travel = Math.max(120, innerHeight * 0.18);
    const t = clamp(-rect.top / travel, 0, 1);
    const w = img.clientWidth, h = img.clientHeight;
    if (!w || !h) return;
    const eased = 1 - Math.pow(1 - t, 2);
    apply(w, h, eased * MAX * CR * w, t);
  }

  if (reduceMotion) {
    const w = img.clientWidth || img.width, h = img.clientHeight || img.height;
    apply(w, h, MAX * CR * w, 1);
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
