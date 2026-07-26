# Daily Vocab 📚

A small, self-contained app that gives you **one advanced English word every day**
and lets you set **practice goals** — e.g. "use this word every day for 3 days" —
and track your streak until the word is really yours.

Built as a **Progressive Web App (PWA)**: no build step, no accounts, no server.
Everything runs in the browser and your progress is saved on your device. Install
it to your phone's home screen and it behaves like a normal app, including daily
reminder notifications.

## Features

- **Word of the day** — a curated list of ~100 everyday-advanced words (e.g.
  *pragmatic, meticulous, nuance, cogent*). The word changes automatically every
  day and cycles through the whole list.
- **Rich word card** — pronunciation, part of speech, definition, an example
  sentence, synonyms, and a memory tip.
- **Practice goals** — the feature you asked for: set a goal to *use a word every
  day for N days* (3 / 5 / 7 / 14). Check in each day you use it, watch the
  progress bar and streak fill, and get a "mastered" badge when you finish.
- **History** — every word you've seen, tap to review.
- **Pronounce** — hear the word read aloud (device text-to-speech).
- **Daily reminders** — opt-in notifications so the app "messages you" each day.
- **Works offline** and installs to your home screen.

## How to run it

It's just static files. Any of these work:

**Quickest (local):**
```bash
cd daily-vocab
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

**On your phone (recommended):** host the `daily-vocab/` folder anywhere that
serves static files over HTTPS (GitHub Pages, Netlify, Vercel, Cloudflare Pages),
open the URL on your phone, then **Add to Home Screen**. Notifications and offline
support require HTTPS (or `localhost`), which is a browser rule for PWAs.

## About the daily "message"

Getting a true daily push message with **no server** has real browser limits, so
here's exactly what this app does and doesn't do:

- **Installed on Android / Chrome:** uses the *Periodic Background Sync* API to
  show a "Word of the day" notification roughly once a day. This is the closest
  to a normal app notification without any backend.
- **iPhone:** iOS only allows web notifications for apps added to the Home Screen,
  and background scheduling is restricted. You'll reliably get a notification when
  you open the app; scheduled background reminders are best-effort.
- **Turning it on:** tap the 🔔 in the top-right and allow notifications.

If you'd like *guaranteed* daily delivery (a real push or email every morning
regardless of the device), that needs a tiny always-on backend — e.g. a scheduled
job that sends an email or web-push. I can add that on top of this app if you want;
just say the word and I'll wire it up.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell / layout |
| `app.css` | Styles (dark, mobile-first) |
| `app.js` | All logic and state (localStorage) |
| `words.js` | The curated word list — edit to add your own words |
| `sw.js` | Service worker: offline cache + daily notification |
| `manifest.webmanifest` | PWA metadata for installing to home screen |
| `icons/` | App icons |

## Adding your own words

Open `words.js` and add entries to the list following the same shape:

```js
{ word: "...", ipa: "/.../", pos: "adjective", definition: "...",
  example: "...", synonyms: ["...", "..."], tip: "..." }
```
