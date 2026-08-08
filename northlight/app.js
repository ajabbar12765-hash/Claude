/* ============================================================
   Northlight Studio — landing page behaviour
   Vanilla JS, no dependencies.

   ── Waitlist setup ───────────────────────────────────────────
   Paste your form endpoint below and the form starts posting to
   it immediately. Works with Formspree, Getform, Basin, Formcarry,
   a Google Apps Script web app, or your own API — anything that
   accepts a JSON POST.

       WAITLIST_ENDPOINT: 'https://formspree.io/f/xxxxxxxx'

   Leave it empty and the page runs in DEMO MODE: submissions are
   kept in this browser's localStorage only, and a note under the
   form says so. Full instructions in README.md.
   ============================================================ */

const CONFIG = {
  WAITLIST_ENDPOINT: 'https://formspree.io/f/xlgqygjn',
  STORAGE_KEY: 'northlight:waitlist',
  SUCCESS_MESSAGE: "We'll be in touch before we open to everyone else.",
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* ------------------------------------------------------------
   1. reveal each chapter's content as it enters the viewport
   ------------------------------------------------------------ */
const chapters = Array.from(document.querySelectorAll('.chapter'));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
      if (entry.target.id === 'standards') runCounters(entry.target);
    });
  },
  { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
);
chapters.forEach((c) => revealObserver.observe(c));

/* keep a live list of chapters that are on screen, so the scroll
   loop only measures what it has to */
const visible = new Set();
const visibilityObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
  },
  { threshold: 0 }
);
chapters.forEach((c) => visibilityObserver.observe(c));

/* ------------------------------------------------------------
   2. scroll choreography — exit fade, glow drift, parallax,
      progress bar, accent + chrome state
   ------------------------------------------------------------ */
const topbar = document.getElementById('chrome');
const progressBar = document.getElementById('progressBar');
const tickLinks = new Map(
  Array.from(document.querySelectorAll('.ticks-nav a')).map((a) => [a.dataset.tick, a])
);
let ticking = false;
let activeChapter = '';

function onScrollFrame() {
  ticking = false;
  const vh = window.innerHeight;

  /* progress bar */
  const scrollable = document.documentElement.scrollHeight - vh;
  const scrolled = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.width = `${clamp(scrolled, 0, 1) * 100}%`;

  topbar.classList.toggle('is-stuck', window.scrollY > 40);

  let nearest = null;
  let nearestDistance = Infinity;

  visible.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const centerOffset = rect.top + rect.height / 2 - vh / 2;
    const p = clamp(centerOffset / vh, -1.2, 1.2); // 0 = dead centre

    if (Math.abs(centerOffset) < nearestDistance) {
      nearestDistance = Math.abs(centerOffset);
      nearest = section;
    }

    const away = Math.abs(p);

    /* ambient glow breathes with the section */
    section.style.setProperty('--glow-o', (0.35 + (1 - clamp(away, 0, 1)) * 0.65).toFixed(3));
    section.style.setProperty('--glow-s', (1 + away * 0.14).toFixed(3));
    section.style.setProperty('--glow-y', `${(-p * 34).toFixed(1)}px`);

    if (reduceMotion) return;

    /* full-viewport chapters fade + drift as they hand over to the next */
    if (section.hasAttribute('data-snap')) {
      section.style.setProperty('--exit-o', clamp(1 - away * 1.15, 0, 1).toFixed(3));
      section.style.setProperty('--exit-y', `${(p * 34).toFixed(1)}px`);
      section.style.setProperty('--exit-s', (1 - away * 0.05).toFixed(3));
      section.style.setProperty('--back-s', (1 + away * 0.07).toFixed(3));
    }

    /* the object drifts slower than the copy and settles into full size
       as its chapter reaches the middle of the screen */
    section.querySelectorAll('[data-parallax] .scene').forEach((object) => {
      object.style.setProperty('--par', `${(-p * 30).toFixed(1)}px`);
      object.style.setProperty('--obj-s', (1 - away * 0.07).toFixed(3));
      /* the object turns on its axis as its chapter passes through */
      object.style.setProperty('--scroll-ry', `${(p * 15).toFixed(2)}deg`);
    });
  });

  /* chrome + chapter dots pick up the accent of whichever chapter you're on */
  if (nearest && nearest.id !== activeChapter) {
    activeChapter = nearest.id;
    if (nearest.dataset.accent) document.body.dataset.accent = nearest.dataset.accent;
    tickLinks.forEach((link, id) => link.classList.toggle('is-active', id === activeChapter));
  }
}

function requestFrame() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(onScrollFrame);
}

window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', requestFrame);
onScrollFrame();

/* ------------------------------------------------------------
   3. pointer tilt — the scenes lean toward the cursor
   ------------------------------------------------------------ */
if (!reduceMotion && window.matchMedia('(hover: hover) and (min-width: 900px)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const base = el.classList.contains('scene') ? { rx: 6, ry: -14 } : { rx: 0, ry: 0 };

    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--rx', `${(base.rx - y * 10).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(base.ry + x * 14).toFixed(2)}deg`);
      el.style.setProperty('--tilt-rx', `${(-y * 6).toFixed(2)}deg`);
      el.style.setProperty('--tilt-ry', `${(x * 8).toFixed(2)}deg`);
    });

    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', `${base.rx}deg`);
      el.style.setProperty('--ry', `${base.ry}deg`);
      el.style.setProperty('--tilt-rx', '0deg');
      el.style.setProperty('--tilt-ry', '0deg');
    });
  });
}

/* ------------------------------------------------------------
   4. count-up for the standards gauge
   ------------------------------------------------------------ */
function runCounters(scope) {
  scope.querySelectorAll('[data-count]').forEach((node) => {
    const target = Number(node.dataset.count) || 0;
    if (reduceMotion) {
      node.textContent = String(target);
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ------------------------------------------------------------
   5. waitlist form
   ------------------------------------------------------------ */
const form = document.getElementById('waitlistForm');
const success = document.getElementById('wlSuccess');
const successMsg = document.getElementById('wlSuccessMsg');
const submitBtn = document.getElementById('wlSubmit');
const emailInput = document.getElementById('wl-email');
const emailError = document.getElementById('wl-email-error');
const demoNote = document.getElementById('demoNote');
const againBtn = document.getElementById('wlAgain');

const demoMode = !CONFIG.WAITLIST_ENDPOINT;
if (demoMode) demoNote.hidden = false;

/* a general error line for network/server failures */
const formError = document.createElement('p');
formError.className = 'error';
formError.setAttribute('role', 'alert');
formError.hidden = true;
submitBtn.insertAdjacentElement('afterend', formError);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setEmailError(message) {
  if (message) {
    emailError.textContent = message;
    emailError.hidden = false;
    emailInput.setAttribute('aria-invalid', 'true');
  } else {
    emailError.textContent = '';
    emailError.hidden = true;
    emailInput.removeAttribute('aria-invalid');
  }
}

/* clear the error as soon as they start fixing it */
emailInput.addEventListener('input', () => {
  if (emailInput.getAttribute('aria-invalid') === 'true' && EMAIL_RE.test(emailInput.value.trim())) {
    setEmailError('');
  }
});

function saveLocally(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
    existing.push(entry);
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(existing));
    return existing.length;
  } catch (err) {
    return null;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.hidden = true;

  const email = emailInput.value.trim();
  if (!email) return setEmailError('We need an email to add you to the list.');
  if (!EMAIL_RE.test(email)) return setEmailError("That doesn't look like a complete email address.");
  setEmailError('');

  /* honeypot — only bots fill this in. Pretend it worked. */
  if (form.company.value) {
    showSuccess();
    return;
  }

  const entry = {
    name: form.name.value.trim(),
    email,
    project: form.project.value,
    submittedAt: new Date().toISOString(),
  };

  submitBtn.disabled = true;
  submitBtn.classList.add('is-loading');

  try {
    if (demoMode) {
      saveLocally(entry);
      await new Promise((resolve) => setTimeout(resolve, 450)); // let the spinner read as real
      showSuccess();
    } else {
      const response = await fetch(CONFIG.WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      showSuccess();
    }
  } catch (err) {
    formError.textContent =
      "We couldn't add you just now — that's on us, not you. Give it a moment and try again.";
    formError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('is-loading');
  }
});

function showSuccess() {
  successMsg.textContent = CONFIG.SUCCESS_MESSAGE;
  form.hidden = true;
  success.hidden = false;
  success.focus?.();
}

againBtn.addEventListener('click', () => {
  form.reset();
  setEmailError('');
  formError.hidden = true;
  success.hidden = true;
  form.hidden = false;
  emailInput.focus();
});

/* ------------------------------------------------------------
   6. odds and ends
   ------------------------------------------------------------ */
document.getElementById('year').textContent = String(new Date().getFullYear());

/* smooth-scroll the in-page links even when the browser won't */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const id = link.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  });
});
