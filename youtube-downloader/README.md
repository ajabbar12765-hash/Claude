# Offline Video Grabber

A small web app for saving YouTube videos so you can watch them offline (e.g. on a
flight). Under the hood it uses [yt-dlp](https://github.com/yt-dlp/yt-dlp), which is
updated constantly to keep working as YouTube changes things (this is usually why
browser extensions and random "download" websites suddenly stop working — they don't
get patched as fast).

Only use this for videos you have the right to download (your own uploads, Creative
Commons/public-domain content, or otherwise permitted personal offline viewing) —
downloading other creators' videos may violate YouTube's Terms of Service.

**Important, and inherent to how downloading works, not specific to this app:**
fetching a video always requires an internet connection, to reach YouTube — that step
can't be made to work offline. Do it before you board. Once a file is saved to your
device, watching it needs no connection at all.

There are two ways to run this, depending on what device you're using.

## Option A — on a laptop/desktop you control

1. Install [Node.js](https://nodejs.org) if you don't have it.
2. In this folder, run `npm install` (also fetches the `yt-dlp` binary automatically).
3. (Recommended) Install `ffmpeg` so the "Best" and "Audio" quality options work:
   - macOS: `brew install ffmpeg`
   - Windows: `choco install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

   Without it, only "Standard" quality works (a single combined stream, usually capped
   around 720p).
4. Run `npm start`, then open **http://localhost:4321**.

## Option B — from an iPad/phone (or any device without Node)

iPads can't run this server directly, so instead it runs on a free cloud host and you
just open it in Safari like any website. This uses [Render](https://render.com)'s free
tier, which doesn't require a credit card. Everything below can be done from Safari on
the iPad itself — no computer needed.

1. Make sure this repo is on GitHub (it already is, if you're reading this there).
2. Go to **render.com**, sign up (GitHub login is easiest), no card required.
3. Click **New +** → **Web Service** → connect your GitHub account → pick this repo.
4. Set:
   - **Root Directory**: `youtube-downloader`
   - **Runtime**: Docker (it'll auto-detect the `Dockerfile` in this folder)
   - **Instance Type**: Free
5. Under **Environment Variables**, add one:
   - `ACCESS_KEY` = a password you make up (e.g. `letmein-flight2026`)

   This matters: without it, anyone who finds your `.onrender.com` URL could use your
   downloader. With it set, the app shows a lock screen asking for this key before
   doing anything.
6. Click **Create Web Service**. First build takes a few minutes (installs ffmpeg +
   yt-dlp + node deps).
7. Once it says "Live", open the given URL (looks like `https://your-app.onrender.com`)
   in Safari, enter the access key you chose, and use it exactly like the local version.
8. Optional but nice: tap the Share icon in Safari → **Add to Home Screen**. It'll
   behave like a real app (its own icon, no address bar) and the interface loads
   instantly even on bad WiFi, since the app shell is cached (only the actual
   fetch/download calls need a live connection).

**Free-tier quirk:** Render's free web services fall asleep after 15 minutes of no
traffic. The first request after that takes 30-60 seconds to wake back up — normal,
not broken. Just wait for it once.

## Using it (either option)

1. Paste one or more YouTube links into the box (one per line).
2. Pick a quality — it defaults to "Best" if ffmpeg is available on the server, or
   "Standard" if not (the app detects this automatically).
3. Click **Fetch** — each video's title/thumbnail appears with a **Download** button.
4. Tap/click Download for each one. On a computer it saves to your Downloads folder;
   on iPad, Safari's download manager saves it into the **Files** app (look for the
   downward-arrow icon in Safari's toolbar after tapping Download).

## If a download fails

YouTube occasionally rolls out changes that break `yt-dlp` for a day or two until a
fix ships.

- **Local (Option A):** `npm install youtube-dl-exec@latest`, or reinstall via
  `pip install --upgrade yt-dlp` if you have a system yt-dlp on your PATH (this app
  prefers a system-installed yt-dlp over the bundled one — see `server.js`).
- **Render (Option B):** trigger a **Manual Deploy** from the Render dashboard — the
  Dockerfile always installs the latest yt-dlp from pip at build time.

If it's still failing, check the server logs (your terminal for Option A, the "Logs"
tab in the Render dashboard for Option B) for the actual error.
