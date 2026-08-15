/* RALLY — everything the brand needs to set lives in CONFIG. Below it is the
   scroll choreography, which needs no editing. */

const CONFIG = {
  // Where the waitlist form POSTs {email}. Any endpoint that accepts JSON works
  // (Formspree, Klaviyo, a Vercel function). Left empty, the form runs in demo
  // mode: it validates and confirms, and says plainly that nothing was stored.
  waitlistEndpoint: '',

  // Trade / wholesale enquiries. Empty hides the footer link.
  tradeEmail: '',

  // Instagram handle without the @. Empty hides the footer link.
  instagram: '',
};

/* ------------------------------------------------------------ reveals */

const beats = document.querySelectorAll('.beat');
const root = document.documentElement;

// A beat is "in" once a third of it is on screen, and "out" once it has mostly
// left — that pair drives both the content reveal and the dim-back on exit.
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const visible = entry.intersectionRatio;
    entry.target.classList.toggle('in', visible > 0.28);
    entry.target.classList.toggle('out', visible > 0 && visible < 0.28);

    // Carry the active section's accent up to the fixed chrome so the progress
    // bar and wordmark shift colour with the story.
    if (visible > 0.5) {
      const accent = entry.target.style.getPropertyValue('--accent').trim();
      if (accent) root.style.setProperty('--accent', accent);
    }
  });
}, { threshold: [0, 0.28, 0.5, 0.75] });

beats.forEach((beat) => observer.observe(beat));

// First beat is above the fold on load — reveal it without waiting for a scroll.
requestAnimationFrame(() => beats[0]?.classList.add('in'));

/* ----------------------------------------------------------- progress */

const progressBar = document.getElementById('progressBar');
let ticking = false;

function updateProgress() {
  const scrollable = document.body.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  progressBar.style.width = `${Math.min(ratio, 1) * 100}%`;
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(updateProgress);
  }
}, { passive: true });

updateProgress();

/* --------------------------------------------------------- footer links */

const mailLink = document.getElementById('footerMail');
if (CONFIG.tradeEmail) {
  mailLink.href = `mailto:${CONFIG.tradeEmail}`;
} else {
  mailLink.hidden = true;
}

const igLink = document.getElementById('footerIg');
if (CONFIG.instagram) {
  igLink.href = `https://instagram.com/${CONFIG.instagram}`;
  igLink.hidden = false;
}

/* ------------------------------------------------------------- signup */

const form = document.getElementById('signupForm');
const input = document.getElementById('email');
const errorEl = document.getElementById('emailError');
const doneEl = document.getElementById('signupDone');
const submit = form.querySelector('button[type="submit"]');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  input.setAttribute('aria-invalid', 'true');
}

function clearError() {
  errorEl.hidden = true;
  input.removeAttribute('aria-invalid');
}

input.addEventListener('input', clearError);

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = input.value.trim();
  if (!email) return showError('Enter an email address so we know where to write.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('That address looks incomplete — check it and try again.');

  clearError();
  submit.disabled = true;
  submit.textContent = 'Joining…';

  try {
    if (CONFIG.waitlistEndpoint) {
      const response = await fetch(CONFIG.waitlistEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error(`Signup failed: ${response.status}`);
      finish("You're on the list. We'll write once, when RALLY lands in LA.");
    } else {
      // No endpoint wired up yet — confirm the interaction without claiming a
      // signup that did not happen.
      finish('Form works — demo mode, so no address was stored. Connect an endpoint in main.js to go live.');
    }
  } catch (error) {
    console.error(error);
    submit.disabled = false;
    submit.textContent = 'Join';
    showError("That didn't send. Try again in a moment.");
  }
});

function finish(message) {
  form.hidden = true;
  doneEl.textContent = message;
  doneEl.hidden = false;
  doneEl.focus?.();
}
