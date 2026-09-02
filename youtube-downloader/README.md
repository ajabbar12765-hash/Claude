# Offline Video Grabber

A tiny local web app for saving YouTube videos to your laptop so you can watch them
offline (e.g. on a flight). It runs entirely on your own machine — nothing is
uploaded or hosted publicly. Under the hood it uses [yt-dlp](https://github.com/yt-dlp/yt-dlp),
which is updated constantly to keep working as YouTube changes things (this is
usually why browser extensions and random "download" websites suddenly stop working —
they don't get patched as fast).

Only use this for videos you have the right to download (your own uploads, Creative
Commons/public-domain content, or otherwise permitted personal offline viewing) —
downloading other creators' videos may violate YouTube's Terms of Service.

## Setup (one time, ~2 minutes)

1. Install [Node.js](https://nodejs.org) if you don't already have it.
2. In this folder, run:
   ```bash
   npm install
   ```
   This also downloads the `yt-dlp` binary automatically — no separate install needed.
3. (Optional, recommended) Install `ffmpeg` so you can pick the "Best" quality option,
   which merges separate video+audio streams:
   - macOS: `brew install ffmpeg`
   - Windows: `choco install ffmpeg` (or download from ffmpeg.org)
   - Linux: `sudo apt install ffmpeg`

   Without ffmpeg, use the "Standard" quality option — it still works, just capped
   at whatever resolution YouTube serves as a single combined file (usually up to 720p).

## Run it

```bash
npm start
```

Then open **http://localhost:4321** in your browser.

1. Paste one or more YouTube links into the box (one per line).
2. Pick a quality.
3. Click **Fetch** — each video's title/thumbnail will appear with a **Download** button.
4. Click Download for each one; it saves straight to your normal Downloads folder.

## If a download fails

YouTube occasionally rolls out changes that break `yt-dlp` for a day or two until a
fix ships. To grab the latest version:

```bash
npm install youtube-dl-exec@latest
```

If it's still failing, check the terminal running `npm start` for the error output.
