/* RALLY — everything the brand needs to set lives in CONFIG. Below it is the
   scroll choreography, which needs no editing. See README §2. */

const CONFIG = {
  // --- Email capture -------------------------------------------------------
  // Fill in ONE of these. Klaviyo wins if both are set.
  //
  // Klaviyo: companyId is the public API key (site ID) from
  // Settings → API keys; listId from Audience → Lists.
  klaviyo:   { companyId: '', listId: '' },
  // Mailchimp: the embedded form's action URL (Audience → Signup forms →
  // Embedded form), which ends in /subscribe/post.
  mailchimp: { actionUrl: '' },

  // --- Analytics -----------------------------------------------------------
  // Left empty, no tracker loads at all — no stray requests, no cookie banner
  // needed for a page that collects nothing.
  ga4MeasurementId: '',    // e.g. 'G-XXXXXXXXXX'
  metaPixelId:      '',    // e.g. '123456789012345'

  // --- Where to buy --------------------------------------------------------
  // Empty array keeps the "stockists at launch" line. Add entries and the list
  // renders in their place.
  stockists: [
    // { name: 'Erewhon', area: 'Silver Lake, LA' },
  ],
  buyOnlineUrl: '',        // Shopify / Amazon listing; empty hides the button
  wholesaleUrl: '',        // wholesale form or mailto:; empty hides the button

  // --- Footer --------------------------------------------------------------
  tradeEmail: '',          // empty hides the link
  instagram:  '',          // handle without the @; empty hides the link
};

/* ------------------------------------------------------------ reveals */

const beats = document.querySelectorAll('.beat');
const counter = document.getElementById('counter');
const root = document.documentElement;

// A beat is "in" once a third of it is on screen and "out" once it has mostly
// left — that pair drives both the content reveal and the dim-back on exit.
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const visible = entry.intersectionRatio;
    entry.target.classList.toggle('in', visible > 0.28);
    entry.target.classList.toggle('out', visible > 0 && visible < 0.28);

    // Carry the active beat's accent up to the fixed chrome, and advance the
    // chapter counter with it.
    if (visible > 0.5) {
      const accent = entry.target.style.getPropertyValue('--accent').trim();
      if (accent) root.style.setProperty('--accent', accent);
      const index = [...beats].indexOf(entry.target) + 1;
      counter.firstChild.textContent = String(index).padStart(2, '0');
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

/* ---------------------------------------------------------- analytics */

function loadScript(src, attrs = {}) {
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.head.appendChild(el);
  return el;
}

if (CONFIG.ga4MeasurementId) {
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${CONFIG.ga4MeasurementId}`);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', CONFIG.ga4MeasurementId);
}

if (CONFIG.metaPixelId) {
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
  (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', CONFIG.metaPixelId);
  window.fbq('track', 'PageView');
}

// One helper so a signup reports to whichever trackers happen to be configured.
function trackSignup() {
  window.gtag?.('event', 'sign_up', { method: 'waitlist' });
  window.fbq?.('track', 'Lead');
}

/* -------------------------------------------------------- where to buy */

const stockistList = document.getElementById('stockistList');
const stockistIntro = document.getElementById('stockistIntro');

if (CONFIG.stockists.length) {
  stockistList.innerHTML = CONFIG.stockists
    .map(({ name, area }) => `<li><strong>${name}</strong><span>${area}</span></li>`)
    .join('');
  stockistList.hidden = false;
  stockistIntro.textContent = 'Cold and on the shelf at:';
}

const buyActions = document.getElementById('buyActions');
const buyPrimary = document.getElementById('buyPrimary');
const buySecondary = document.getElementById('buySecondary');

if (CONFIG.buyOnlineUrl) buyPrimary.href = CONFIG.buyOnlineUrl; else buyPrimary.hidden = true;
if (CONFIG.wholesaleUrl) buySecondary.href = CONFIG.wholesaleUrl; else buySecondary.hidden = true;
if (CONFIG.buyOnlineUrl || CONFIG.wholesaleUrl) buyActions.hidden = false;

/* --------------------------------------------------------- footer links */

const mailLink = document.getElementById('footerMail');
if (CONFIG.tradeEmail) {
  mailLink.href = `mailto:${CONFIG.tradeEmail}`;
  mailLink.hidden = false;
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

async function subscribe(email) {
  const { companyId, listId } = CONFIG.klaviyo;

  if (companyId && listId) {
    const response = await fetch(`https://a.klaviyo.com/client/subscriptions/?company_id=${companyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', revision: '2024-10-15' },
      body: JSON.stringify({
        data: {
          type: 'subscription',
          attributes: { profile: { data: { type: 'profile', attributes: { email } } } },
          relationships: { list: { data: { type: 'list', id: listId } } },
        },
      }),
    });
    if (!response.ok) throw new Error(`Klaviyo responded ${response.status}`);
    return 'live';
  }

  if (CONFIG.mailchimp.actionUrl) {
    // Mailchimp's embedded endpoint does not send CORS headers, so the post goes
    // out no-cors: it succeeds, but the response is opaque and cannot be read.
    const body = new URLSearchParams({ EMAIL: email });
    await fetch(CONFIG.mailchimp.actionUrl, { method: 'POST', mode: 'no-cors', body });
    return 'live';
  }

  return 'demo';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = input.value.trim();
  if (!email) return showError('Enter an email address so we know where to write.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('That address looks incomplete — check it and try again.');

  clearError();
  submit.disabled = true;
  submit.textContent = 'Joining…';

  try {
    const mode = await subscribe(email);
    if (mode === 'live') {
      trackSignup();
      finish("You're on the list. We'll write once, when RALLY lands in LA.");
    } else {
      // No provider wired up yet — confirm the interaction without claiming a
      // signup that did not happen.
      finish('Form works — demo mode, so no address was stored. Add a Klaviyo or Mailchimp key in main.js to go live.');
    }
  } catch (error) {
    console.error(error);
    submit.disabled = false;
    submit.textContent = 'Join the list';
    showError("That didn't send. Try again in a moment.");
  }
});

function finish(message) {
  form.hidden = true;
  doneEl.textContent = message;
  doneEl.hidden = false;
  doneEl.focus();
}
