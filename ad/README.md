# FreshLeaf — motion-graphic ad (9:16, 16s)

`index.html` / `freshleaf-ad-9x16.mp4` is the motion-graphic cut (kinetic type, line-art draw-ons, shape wipes, ingredient stickers). The earlier photo-led cut is kept as `index-v1-photo.html` / `freshleaf-ad-9x16-v1-photo.mp4` (render it with `COMP=index-v1-photo.html node render.cjs out.mp4`).

HyperFrames-style composition: `index.html` holds the scene clips (`data-start` / `data-duration`) and one paused GSAP timeline registered at `window.__timelines["main"]`.

- Preview: open `index.html` in a browser (it loops).
- Render: `node render.cjs freshleaf-ad-9x16.mp4` (Playwright + ffmpeg, 1080×1920 @ 30fps, muxes `assets/music.wav`).
- Music: `python3 make_music.py` regenerates the original ambient bed.

Storyboard: 0–3s kinetic hook (leaf draws on, "nature", crossed-out flask) · 3–5.6s droplet splash + 100% counter, synthetics struck out · 5.6–10.6s six colour panels with ingredient stickers · 10.6–13s "One spritz. Every space." with line icons and spray mist · 13–16s logo, tagline, bottles, price, CTA.
