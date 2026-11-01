# FreshLeaf — "Nature's Essence" ad (9:16, 16s)

HyperFrames-style composition: `index.html` holds the scene clips (`data-start` / `data-duration`) and one paused GSAP timeline registered at `window.__timelines["main"]`.

- Preview: open `index.html` in a browser (it loops).
- Render: `node render.cjs freshleaf-ad-9x16.mp4` (Playwright + ffmpeg, 1080×1920 @ 30fps, muxes `assets/music.wav`).
- Music: `python3 make_music.py` regenerates the original ambient bed.

Storyboard: 0–3s hook · 3–5.6s "100% essential oils" · 5.6–10.6s six scents with their oils · 10.6–13s benefits · 13–16s logo, tagline, price, CTA.
