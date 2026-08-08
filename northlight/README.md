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
| With domain: `30,000` / `65,000` / `155,000` | `.tier-now[data-with]` | What we build |
| Without domain: `25,000` / `60,000` / `150,000` | `.tier-now[data-without]` | What we build |
| Struck standard rates, both sets | `.tier-was` | What we build |
| Domain first year included, ~PKR 3,500/yr to renew after | `.footnote` | What we build |
| "Founding rates for the first ten projects only" | `.footnote` | What we build |
| 10 days / 4 weeks / 6 weeks delivery | `.tiers ul` + `.pane-when` | What we build, Process |
| Two rounds of revisions included | Process pane 02, FAQ | Process, FAQ |
| Client supplies all copy and photos (you do not write) | `.gets`, tiers, FAQ | What you get, What we build, FAQ |
| 50% deposit, 50% on launch | `.footnote`, FAQ | Process, FAQ |
| 30 days of free fixes after launch | Process pane 04, FAQ | Process, FAQ |
| Booking deposit is non-refundable | FAQ | FAQ |
| Up to 50 products on a store build | `.tiers ul` | What we build |
| Ten founding slots | Headline + perks | Waitlist |
| The three site mockups are **example builds, not client work** | `.work-grid` | Selected work |
| "Tested on real mid-range Androids" | `.vs` table | The honest comparison |
| "One designer … the reply comes from the person who'd be doing the work" | `.founder` | Waitlist |
| "Where you are in Pakistan makes no difference to the price" | FAQ | FAQ |

**No contact email is published anywhere on the site.** `hello@northlight.studio`
was a placeholder for a domain nobody owns, so every link that pointed at it now
points at the waitlist form instead. If you buy a domain and set up a mailbox,
put the address back in the footer, the JSON-LD block and `app.js`'s error
message — until then the form is the only way in, and it works.

The "Selected work" section carries a disclosure line saying the three sites are
Northlight's own builds rather than client projects. **Leave that line in place
until real client work replaces the mockups** — showing example builds as if they
were commissioned work is the one thing here that would actually get you caught out.

Prices are set for **local Pakistani clients, starting rates** — deliberately
low to win the first few projects. Raise them once you have two or three
finished sites to point at.

### Changing a price

Every number lives in the markup, as a pair of `data-` attributes — `app.js`
only reads them, so you never touch the JavaScript:

```html
<b class="tier-now" data-with="30,000" data-without="25,000">30,000</b>
<s class="tier-was" data-with="45,000" data-without="40,000">45,000</s>
```

`data-with` is the domain-included price, `data-without` is the price when the
client already owns a domain. Keep the visible text matching `data-with`, since
that's the option the toggle starts on. The gap between the two is currently
**PKR 5,000** across all three tiers: roughly PKR 3,500 for a `.com`/`.pk` first
year plus a little for registering and connecting it.

**Before you sell this:** confirm you can actually buy a domain for a client —
you need a card that works on an international registrar, or a local reseller
account. If you can't, switch the toggle default to "I already have one" and
drop the included option until you can.

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
