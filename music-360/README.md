# Orbit 360 — Spatial Music Player

A Spotify-style, mobile-first music player PWA with true **360° spatial audio**,
rendered binaurally for any stereo headphones (tuned with the Sony WH-CH520 in mind).

## What it does

- **Full catalog search** — search any artist, song, or album via the iTunes
  Search API and play high-quality track previews. (Licensed catalogs like
  Spotify's can't legally be streamed in full by third-party apps.)
- **360° audio engine** (Web Audio API, HRTF binaural rendering):
  - **Sphere mode** — emulates Sony 360 Reality Audio's object model: the
    track is split into frequency-band "objects" (sub, body, voice, air,
    ambience) placed on a sphere around your head, with gentle motion and a
    synthesized room reverb for out-of-head externalization.
  - **Orbit mode** — the whole mix slowly circles your head ("8D audio").
  - Motion and Depth controls, live spatial-object visualizer, frequency ring.
- **Spotify-style UI** — home with genre chips and featured mixes, search,
  liked songs library, recently played, full-screen now-playing sheet,
  mini-player, lock-screen controls (Media Session API).
- **Installable PWA** — open the URL on your phone → "Add to Home Screen".

## Why not real Sony 360 Reality Audio?

Sony 360RA is a licensed format (MPEG-H) available only inside partner apps.
This app implements the same *idea* — audio objects on a sphere rendered
binaurally over ordinary stereo headphones — using the browser's HRTF engine,
which is precisely what any headphone (including the WH-CH520) receives anyway:
a two-channel binaural signal.

> Tip: keep OS-level "spatial audio" effects off; the app does its own 3D rendering.

## Run locally

Any static server works:

```bash
cd music-360
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies.
