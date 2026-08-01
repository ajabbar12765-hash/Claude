# Northlight — landing page

A single-page, scroll-driven landing page for a web design studio, with a
waitlist form. Plain HTML, CSS and JavaScript — no build step, no dependencies,
no framework. Open `index.html` in a browser and it runs.

```
northlight/
├── index.html   markup + all copy
├── styles.css   design tokens, layout, the 3D scenes, scroll choreography
├── app.js       scroll animation, pointer tilt, waitlist form
└── README.md
```

## Run it locally

Double-click `index.html`, or serve the folder:

```bash
cd northlight
python3 -m http.server 8000    # then open http://localhost:8000
```

---

## Connect the waitlist (2 minutes)

Out of the box the form runs in **demo mode**: submissions are saved to the
browser's `localStorage` only, and an amber note under the form says so. Nothing
is sent anywhere.

To collect real signups, get a form endpoint and paste it into the top of
`app.js`:

```js
const CONFIG = {
  WAITLIST_ENDPOINT: 'https://formspree.io/f/xxxxxxxx',   // ← paste here
  ...
};
```

The demo note disappears automatically once the endpoint is set.

### Where to get an endpoint

| Service | Free tier | How |
|---|---|---|
| [Formspree](https://formspree.io) | 50 submissions/month | New form → copy the `https://formspree.io/f/…` URL |
| [Getform](https://getform.io) | 50/month | New form → copy the endpoint URL |
| [Basin](https://usebasin.com) | 100/month | New form → copy the endpoint URL |
| [Formcarry](https://formcarry.com) | 100/month | New form → copy the endpoint URL |
| Google Sheets | unlimited | Apps Script → deploy as a Web App (see below) |

The form sends a JSON `POST` with this body, so any of them — or your own API —
will work:

```json
{ "name": "Alex Rivera", "email": "alex@company.com", "project": "landing-page", "submittedAt": "2026-07-31T12:00:00.000Z" }
```

### Google Sheets option

Create a sheet, then **Extensions → Apps Script**, paste this, and deploy it as
a Web App with access set to "Anyone":

```js
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSheet()
    .appendRow([data.submittedAt, data.name, data.email, data.project]);
  return ContentService.createTextOutput('ok');
}
```

Paste the resulting `/exec` URL into `WAITLIST_ENDPOINT`.

### Reading the demo-mode signups

While no endpoint is configured, anything submitted in your own browser is in
`localStorage` under `northlight:waitlist`. In the browser console:

```js
JSON.parse(localStorage.getItem('northlight:waitlist'))
```

---

## ⚠ Numbers and promises you need to confirm

The page now states prices, timelines and terms. They are **placeholders written
to be plausible**, not decisions you've made. Check every one of these before
you send the link to anyone who might hold you to it. All of them are plain text
in `index.html`.

| What it says | Where | Section |
|---|---|---|
| `from £900` / `from £2,400` / `from £4,500` | `.tier-price` | What we build |
| 10 days / 4 weeks / 6 weeks delivery | `.tiers ul` + `.pane-when` | What we build, Process |
| Two rounds of revisions included | Process pane 02, FAQ | Process, FAQ |
| 50% deposit, 50% on launch | `.footnote`, FAQ | Process, FAQ |
| 30 days of free fixes after launch | Process pane 04, FAQ | Process, FAQ |
| "Walk away and keep your deposit" | FAQ | FAQ |
| Up to 50 products on a store build | `.tiers ul` | What we build |
| Ten founding slots | Headline + perks | Waitlist |
| `hello@northlight.studio` | footer | Footer |

The refund line in the FAQ ("you can walk away and keep your deposit") is the
one with real money attached — decide whether you actually want to offer that
before it goes live.

## Editing the page

Everything a non-developer would want to change is in `index.html` as plain
text. A few specifics:

- **Company name** — search for `Northlight` in `index.html` (the wordmark, the
  `<title>`, the footer, and the `hello@northlight.studio` address).
- **Offers, timelines, prices** — the three `.fan-card` blocks in the
  "What we build" section. The `4–6 pages · from 4 weeks` lines are
  `.fan-meta` — change them to whatever you actually offer.
- **The founding-client terms** — the `.perks` list at the bottom of the
  waitlist section, and the "ten slots" headline. These are placeholders for a
  launch offer; set them to terms you're happy to honour.
- **Section accent colours** — each `<section class="chapter">` has a
  `data-accent` of `violet`, `magenta`, `amber`, `cyan` or `emerald`. Swap the
  values to re-order the colour story; the glow, chrome, buttons and icons all
  follow automatically. New accents go in `:root` at the top of `styles.css`.
- **Success message** — `CONFIG.SUCCESS_MESSAGE` in `app.js`.

## Deploying

It's a static folder, so anything works: Netlify or Vercel (drag the folder in),
GitHub Pages, Cloudflare Pages, or any host's `public_html`. No build command,
no output directory.

## Notes on how it's built

- **Scroll choreography** — `IntersectionObserver` reveals each chapter's
  content with a staggered fade-and-rise; a `requestAnimationFrame` loop fades,
  drifts and scales chapters as they hand over to the next, moves the ambient
  glow, and drives the top progress bar.
- **The 3D** — CSS `perspective` and `transform-style: preserve-3d`. The mockups
  are built from divs on separate Z layers, and they lean toward the cursor on
  desktop. No WebGL, no 3D library, no image assets — the page is a few
  kilobytes of text.
- **Accessibility** — full keyboard access with visible focus rings, labelled
  form fields with inline errors, a skip link, 44px+ touch targets, and
  `prefers-reduced-motion` support that turns off the parallax, tilt, float and
  scroll-snap.
- **Anti-spam** — an off-screen honeypot field. Bots that fill it in get the
  success screen and nothing is sent.
