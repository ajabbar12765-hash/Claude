# Orbit 360 — Spatial Music Player

A Spotify-style, mobile-first music player PWA with true **360° spatial audio**,
rendered binaurally for any stereo headphones (tuned with the Sony WH-CH520 in mind).

## Music sources

- **Full songs** — streams complete tracks from the [Audius](https://audius.org)
  network (free, legal streaming API; strong in electronic, hip-hop, lo-fi, indie).
- **Chart previews** — the iTunes Search catalog covers every mainstream
  artist at preview length. (Licensed catalogs like Spotify's can't legally be
  streamed in full by third-party apps.)
- **Your uploads** — add your own MP3/FLAC/M4A files; stored on-device in
  IndexedDB, played at full quality, always 360°-capable.

## The 360° engine (v2 — "no muffle" architecture)

Modeled on how production spatializers (Apple Spatialize Stereo, Sony's
headphone renderer, Dolby Headphone) actually work:

- **Virtual-speaker rendering** — the stereo mix stays intact; L/R feed two
  HRTF sources with **zero distance rolloff**, so nothing gets quieter or duller.
- **Bass anchor** — below ~115 Hz bypasses the panners (LR4-style crossover);
  spatialized bass only loses punch.
- **Timbre correction** — presence peak + air shelf after the panners repay
  what HRTF filtering takes.
- **Externalization** — short, band-limited room reverb at a low mix.
- **Safety limiter** on the master bus.

Modes: **Studio** (hi-fi virtual speakers ±~30°), **Concert** (wide stage +
elevated delayed rear ambience), **Orbit** (the stereo stage revolves — "8D"
without the muffle). Motion and Depth sliders shape movement and stage size.

Sources that block CORS can't be processed by Web Audio; those tracks
automatically play untouched on a parallel plain audio path (the host is
remembered), and 360° re-arms on the next track.

> Tip: keep OS-level "spatial audio" effects off; the app does its own 3D rendering.

## Run locally

```bash
cd music-360
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies.
