# FreshLeaf — HyperFrames ad v4 (9:16, 17s)

`index.html` is a HyperFrames composition (root `data-composition-id="main"`, timed `.clip` scenes, one paused GSAP timeline on `window.__timelines["main"]`, music as an `<audio>` clip). It passes `hyperframes check` (0 errors, 73/73 WCAG AA text checks) and is rendered with `hyperframes render`.

```bash
npm i -D hyperframes                     # official CLI (HeyGen)
npx hyperframes check .                  # lint + runtime + layout + contrast
npx hyperframes snapshot . --at 4,8,12   # still frames
npx hyperframes render . -o freshleaf-ad-9x16.mp4 --quality delivery
```
(In this container the CLI needs `HYPERFRAMES_BROWSER_PATH` pointing at a chrome-headless-shell binary.)

| Movement | Time | Scene |
|---|---|---|
| 01 The promise | 0–3.33 | forest canopy frame at three depths, light shafts, drawn leaf, kinetic type |
| 02 The essence | 3.33–5.83 | cream eucalyptus/lavender frame, droplet splash + ripples, 100% counter, struck-out synthetics |
| 03 The blends | 5.83–10.83 | six arched product sets: bottle on a podium, its own ingredients floating and piled at the foot; each wipes in with a different shape |
| 04 The ritual | 10.83–13.33 | dusk room, arched window, plants; Fresh Linen sprays to the right from its nozzle (the side it faces) toward Home / Car / Workspace |
| 05 Freshleaf | 13.33–17 | spotlight beams, canopy, all six bottles on one podium, price + CTA |

- Music: `python3 make_music.py` → `assets/music.wav` (original 144 BPM track, SFX synced to cuts, ~-14 LUFS).
- Bottle cutouts: `python3 cutout.py <photo> <out.png>`.
- Earlier cuts live in `archive/` (HTML kept as `.html.txt` so HyperFrames sees a single root composition).
