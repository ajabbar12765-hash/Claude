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

/* ── 7. the bite ──────────────────────────────────────────────────── */
/* A circular mask carved out of the cookie image, radius driven by how
   far the chapter has scrolled through the viewport — reads as someone
   taking a bite as you scroll past. CSS mask-image, not a photo composite:
   no stock "mouth" photo would match this shoot's lighting or feel honest
   next to the real product photography. */
(function bite() {
  const section = document.querySelector('.scene--bite');
  const img = document.getElementById('biteImg');
  const crumbs = document.getElementById('crumbs');
  if (!section || !img || !crumbs) return;

  const maxRadius = () => img.getBoundingClientRect().width * 0.42;

  function update() {
    const r = section.getBoundingClientRect();
    const t = clamp(1 - r.top / innerHeight, 0, 1);
    const eased = 1 - Math.pow(1 - t, 2);        // ease-out — the bite lands fast, doesn't linger
    img.style.setProperty('--bite-r', `${(eased * maxRadius()).toFixed(1)}px`);
    crumbs.classList.toggle('is-crumbling', t > 0.55);
  }

  if (reduceMotion) {
    img.style.setProperty('--bite-r', `${(maxRadius() * 0.55).toFixed(1)}px`);
    crumbs.classList.add('is-crumbling');
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
