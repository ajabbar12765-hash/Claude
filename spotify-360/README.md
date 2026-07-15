# Orbit 360 — Spatial Music 🎧

A Spotify-style music player with **true 360° spatial audio**, built for stereo
Bluetooth headphones like the **Sony WH-CH520**. No accounts, no keys, no build
step — a single static web app (installable as a PWA).

## Run it

Any static file server works:

```bash
npx serve spotify-360
# or
python3 -m http.server 8080 --directory spotify-360
```

Then open the printed URL, connect your headphones over normal Bluetooth, and
press play. On a phone, use the browser menu → *Add to Home Screen* to install
it as an app.

## What you get

- **Spotify-style UI** — home feed with charts and curated sections, instant
  search over Apple's public song catalog (essentially the same songs as
  Spotify), liked songs, recently played, and a full player bar.
- **Three audio modes** (open the **360° Studio** panel):
  - **Stereo** — untouched passthrough.
  - **Orbit** — the whole mix glides around your head ("8D audio").
  - **360 Reality** — the mix is split into frequency bands, each rendered as a
    virtual object placed on a sphere around your head with HRTF binaural
    panning + externalization reverb. This is a software recreation of the
    object-on-a-sphere model Sony 360 Reality Audio uses.
- **Immersion / Motion / Room** sliders and a live visualization of the sound
  objects circling your head.
- **WH-CH520 headphone profile** — a gentle EQ tuned for that model's drivers
  (toggleable).
- **Local files** — drag in your own MP3/FLAC/M4A for **full-length** 360°
  playback. Files never leave your device.
- Media Session integration (lock-screen controls + artwork), keyboard
  shortcuts (space, ←/→, `n`/`p`, `m` to cycle modes), offline app shell.

## Why previews for catalog songs?

Spotify (and every major label licensor) doesn't permit raw audio access
through any public API, so catalog songs stream Apple's high-quality
30-second previews — legal, free, and no login. Your own files play in full.

## How the 360° engine works

`js/engine.js` builds this Web Audio graph:

```
media element ─ WH-CH520 EQ ─┬─ stereo bus ────────────────────────┐
                             ├─ orbit bus ── HRTF panner ──┐       │
                             └─ reality bus ─ 6 band splits ┤       ├─ master ─ compressor ─ analyser ─ out
                                  (sub/low/body/voice/air)  │       │
                                  each → HRTF panner ───────┴─ reverb (externalization)
```

Band objects sit at fixed points on the sphere (bass low in front, voice
slightly above center, "air" bands high and behind) and drift gently; the whole
field can also rotate. Positions update every frame with
`setTargetAtTime` for click-free motion.

> Works on **any** stereo headphones — HRTF binaural rendering is exactly how
> Sony's own app delivers 360 Reality Audio to non-spatial headphones.
