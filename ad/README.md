# FreshLeaf — motion-graphic ad v3 (9:16, 17s)

`index.html` → `freshleaf-ad-9x16.mp4` is the current cut. Earlier cuts are kept: `index-v2-motion.html` / `freshleaf-ad-9x16-v2-motion.mp4` and `index-v1-photo.html` / `freshleaf-ad-9x16-v1-photo.mp4`.

HyperFrames-style composition: scene clips carry `data-start` / `data-duration`; one paused GSAP timeline is registered at `window.__timelines["main"]`. Everything sits on a 144 BPM grid (beat = 0.4167s) so cuts land on the music.

| Movement | Time | Background system |
|---|---|---|
| 01 The promise | 0–3.33 | forest gradient mesh, rotating topographic contours, blurred foreground leaves |
| 02 The essence | 3.33–5.83 | cream sunburst rays, endless ripple rings from the droplet |
| 03 The blends | 5.83–10.83 | six panels, six patterns: sunburst + citrus wheel, stripes, fabric waves, petal mandala, dot grid, spiral; each enters with a different wipe |
| 04 The ritual | 10.83–13.33 | night perspective grid, aurora glow, horizon light |
| 05 Freshleaf | 13.33–17 | spotlight beams, rotating leaf crown, reflective shelf |

- Preview: open `index.html` (loops). Render: `node render.cjs out.mp4` (`COMP=<file>.html` to render another cut).
- Music: `python3 make_music.py` → `assets/music.wav` (original 144 BPM track + synced SFX, ~-14 LUFS).
- Bottle cutouts: `python3 cutout.py <photo> <out.png>` (flood fill + rebuilt cylinder silhouette, no white fringe).
