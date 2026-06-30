# Dino Run 🦕

A standalone, iPad-friendly remake of Chrome's offline T-Rex dinosaur game.
Pure HTML + CSS + vanilla JS on a `<canvas>` — **no build step and no
dependencies**. This folder is completely independent of the rest of the repo.

## Play locally

Just open `index.html` in a browser. (Or serve the folder with any static
server, e.g. `npx serve` or `python3 -m http.server`.)

## Controls

| Action | Desktop            | iPad / touch                              |
| ------ | ------------------ | ----------------------------------------- |
| Jump   | Space / ↑ / W      | Tap anywhere                              |
| Duck   | ↓ / S (hold)       | Swipe down, or press-and-hold lower area   |
| Start / restart | Space / tap | Tap                                       |

High score is saved in `localStorage`.

## Deploy to Vercel

This is a static site, so Vercel deploys it with **zero configuration**.

**Option A — deploy just this folder (recommended):**

```bash
cd dino
vercel        # follow the prompts; framework preset = "Other"
```

**Option B — deploy from the Vercel dashboard:**

1. Import the GitHub repo.
2. Set **Root Directory** to `dino`.
3. Framework preset: **Other**. Leave Build Command empty and Output
   Directory as the default (the root). Deploy.

No build command or output directory is required — Vercel serves
`index.html` directly.
