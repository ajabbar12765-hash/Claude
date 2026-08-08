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

  // sticky order bar — a second view onto the exact same state, not a
  // second calculation. Every number/link it shows comes from the one
  // `state` object below, so the bar and the builder can never disagree.
  const bar = document.getElementById('orderBar');
  const barText = document.getElementById('orderBarText');
  const barCta = document.getElementById('orderBarCta');
  const barClose = document.getElementById('orderBarClose');
  let dismissed = false;
  let builderInView = true;

  function selectedBox() {
    const input = boxInputs.find(i => i.checked);
    return input ? { tier: input.dataset.tier, price: input.dataset.price, label: input.dataset.label } : null;
  }

  function computeState() {
    const box = selectedBox();
    if (!box) return { box: null, names: [], ready: false };
    const names = flavourInputs.filter(i => i.checked).map(i => i.value);
    return { box, names, ready: names.length >= 2 };
  }

  function waLink(box, names) {
    const digits = String(CONFIG.whatsapp).replace(/\D/g, '');
    if (!digits) return null;
    const msg = `Hi! I'd like to order a ${box.label} with ${names.join(' and ')} (${box.price}).`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  }

  function renderBuilder(state) {
    const { box, names, ready } = state;
    if (!box) {
      hint.textContent = 'Choose a box first.';
      summary.textContent = 'Pick a box and two flavours to see your total.';
      cta.setAttribute('aria-disabled', 'true');
      cta.removeAttribute('href');
      return;
    }
    if (!ready) {
      hint.textContent = `Choose ${2 - names.length} more flavour${names.length === 1 ? '' : 's'}.`;
      summary.innerHTML = `<strong>${box.label}</strong> — ${box.price}. Pick two flavours.`;
      cta.setAttribute('aria-disabled', 'true');
      cta.removeAttribute('href');
      return;
    }
    hint.textContent = 'Ready to order.';
    summary.innerHTML = `<strong>${box.label}</strong> — ${names.join(' + ')} — <strong>${box.price}</strong>`;
    const link = waLink(box, names);
    if (link) {
      cta.href = link;
      cta.target = '_blank';
      cta.rel = 'noopener noreferrer';
      cta.removeAttribute('aria-disabled');
    }
  }

  function renderBar(state) {
    if (!bar) return;
    const { box, names, ready } = state;
    const shouldShow = !!box && !builderInView && !dismissed;
    bar.classList.toggle('is-visible', shouldShow);
    if (!box) return;   // nothing meaningful to render while hidden anyway

    if (!ready) {
      barText.textContent = `${box.label} — choose ${2 - names.length} more flavour${names.length === 1 ? '' : 's'}`;
      barCta.setAttribute('aria-disabled', 'true');
      barCta.removeAttribute('href');
    } else {
      barText.innerHTML = `${box.label} — ${names.join(' + ')} · <strong>${box.price}</strong>`;
      const link = waLink(box, names);
      if (link) {
        barCta.href = link;
        barCta.target = '_blank';
        barCta.rel = 'noopener noreferrer';
        barCta.removeAttribute('aria-disabled');
      }
    }
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

    const state = computeState();
    renderBuilder(state);
    renderBar(state);
  }

  boxInputs.forEach(i => i.addEventListener('change', () => { dismissed = false; update(); }));
  flavourInputs.forEach(i => i.addEventListener('change', () => { dismissed = false; update(); }));

  if (barClose) {
    barClose.addEventListener('click', () => {
      dismissed = true;
      if (bar) bar.classList.remove('is-visible');
    });
  }
  if (barText) {
    barText.addEventListener('click', () => root.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }));
  }

  // the bar only makes sense once you've scrolled meaningfully past the
  // real builder — otherwise it's a duplicate control sitting right on
  // top of the one already on screen. threshold:0 (only fully off-screen)
  // meant the whole builder block — box picker, chips, summary, all of
  // it — had to clear the viewport first, which on a tall device needs
  // far more scrolling than "away" actually feels like. Shrinking the
  // observed root to its top half means the bar shows as soon as the
  // builder has scrolled past the midpoint of the screen instead.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      builderInView = entries[0].isIntersecting;
      renderBar(computeState());
    }, { threshold: 0, rootMargin: '-50% 0px 0px 0px' }).observe(root);
  } else {
    builderInView = false;
  }

  update();
})();

/* ── 11. flavour finder quiz ───────────────────────────────────────── */
/* 3 binary questions = 8 paths, mapped 1:1 to the 8 flavours already on
   the menu. Every image/blurb/WhatsApp message below is copied verbatim
   from the matching flavour chapter or menu entry — nothing new written
   for this feature, so there's nothing here that could be inaccurate. */
(function quizFinder() {
  const card = document.getElementById('quizCard');
  if (!card) return;

  const panels = [...card.querySelectorAll('.quiz__panel')];
  const dots = [...card.querySelectorAll('.quiz__dots span')];
  const resultImg = document.getElementById('quizResultImg');
  const resultName = document.getElementById('quizResultName');
  const resultDesc = document.getElementById('quizResultDesc');
  const resultCta = document.getElementById('quizResultCta');
  const restartBtn = document.getElementById('quizRestart');

  // index = bit0*4 + bit1*2 + bit2, in the same order the 3 questions ask
  const FLAVOURS = [
    { name: 'Double Chocolate', img: 'assets/cookies/double-chocolate.webp', w: 1057, h: 737,
      desc: 'Danger: overflowing with chocolate and can put you in a chocolate coma.',
      wa: "Hi! I'd like to order the Double Chocolate cookies." },
    { name: 'Nutella', img: 'assets/cookies/nutella.webp', w: 658, h: 394,
      desc: "There's no such thing as too much Nutella in our mouthwatering, decadent Nutella-filled cookie.",
      wa: "Hi! I'd like to order the Nutella cookies." },
    { name: 'Chocolate Chunk', img: 'assets/cookies/chocolate-chunk.webp', w: 732, h: 626,
      desc: 'The ultimate star of the show — our classic cookie made with gooey chocolate chunks.',
      wa: "Hi! I'd like to order the Chocolate Chunk cookies." },
    { name: "Hershey's Chocolate Chip", img: 'assets/cookies/hersheys.webp', w: 1200, h: 1200,
      desc: 'Oozes with divine chocolate that melts in your mouth with every bite.',
      wa: "Hi! I'd like to order the Hershey's Chocolate Chip cookies." },
    { name: 'Red Velvet', img: 'assets/cookies/red-velvet.webp', w: 1381, h: 832,
      desc: 'Filled with white chocolate chunks and topped with creamy white chocolate.',
      wa: "Hi! I'd like to order the Red Velvet cookies." },
    { name: 'Lotus', img: 'assets/cookies/lotus.webp', w: 1200, h: 1200,
      desc: 'Made with Lotus and melted chocolate chunks — heaven for cookie addicts.',
      wa: "Hi! I'd like to order the Lotus cookies." },
    { name: 'Marbled Chocolate Chunk', img: 'assets/cookies/marbled.webp', w: 998, h: 968,
      desc: 'The dreamy duo of our classic and double chocolate chunk cookie, in one.',
      wa: "Hi! I'd like to order the Marbled Chocolate Chunk cookies." },
    { name: 'Oatmeal and Raisins', img: 'assets/cookies/oatmeal-raisin.webp', w: 943, h: 1150,
      desc: 'Packed with the most scrumptious flavours — the answer to your cookie cravings.',
      wa: "Hi! I'd like to order the Oatmeal and Raisin cookies." },
  ];

  let answers = [];

  function showPanel(i) {
    panels.forEach((p, idx) => p.classList.toggle('is-active', idx === i));
    dots.forEach((d, idx) => d.style.background = idx < answers.length ? 'var(--rose-text)' : '');
  }

  function showResult() {
    const index = answers[0] * 4 + answers[1] * 2 + answers[2];
    const f = FLAVOURS[index];
    resultImg.src = f.img;
    resultImg.width = f.w;
    resultImg.height = f.h;
    resultImg.alt = f.name;
    resultName.textContent = f.name;
    resultDesc.textContent = f.desc;
    const digits = String(CONFIG.whatsapp).replace(/\D/g, '');
    if (digits) {
      resultCta.href = `https://wa.me/${digits}?text=${encodeURIComponent(f.wa)}`;
      resultCta.target = '_blank';
      resultCta.rel = 'noopener noreferrer';
    }
    showPanel(3);
  }

  card.addEventListener('click', e => {
    const opt = e.target.closest('.quiz__opt');
    if (opt) {
      answers.push(Number(opt.dataset.bit));
      if (answers.length === 3) showResult();
      else showPanel(answers.length);
      return;
    }
    if (e.target.closest('#quizRestart')) {
      answers = [];
      showPanel(0);
    }
  });
})();
