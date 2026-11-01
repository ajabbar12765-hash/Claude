"""Bottle cutout from white-background product shots.
Flood-fills the white background from the border, then rebuilds the cylinder
silhouette on label rows (where light label art touches the bottle edge) by
interpolating the left/right edges measured on the black glass above and the
black base below. Edges are eroded slightly to remove the white fringe."""
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(int)
H, W = a.shape[:2]
light = (a.min(axis=2) > 222) & ((a.max(axis=2) - a.min(axis=2)) < 28)
bg = np.zeros_like(light); bg[0] = light[0]; bg[-1] = light[-1]; bg[:, 0] = light[:, 0]; bg[:, -1] = light[:, -1]
while True:
    d = bg.copy(); d[1:] |= bg[:-1]; d[:-1] |= bg[1:]; d[:, 1:] |= bg[:, :-1]; d[:, :-1] |= bg[:, 1:]; d &= light
    if (d == bg).all(): break
    bg = d
fg0 = ~bg
dark = a.max(axis=2) < 95
ys = np.where(fg0.any(axis=1))[0]; top, bot = ys[0], ys[-1]
# base width from black base rows
base = [np.where(dark[y])[0] for y in range(bot - int(.05 * (bot - top)), bot - 3)]
Lb = np.median([b[0] for b in base if len(b)]); Rb = np.median([b[-1] for b in base if len(b)])
r0 = next(y for y in range(int(top + .25 * (bot - top)), bot)
          if (lambda xs: len(xs) and xs[-1] - xs[0] >= .9 * (Rb - Lb))(np.where(dark[y])[0]))
rows, Ls, Rs = [], [], []
for y in range(r0, bot + 1):
    xs = np.where(fg0[y])[0]
    if not len(xs): continue
    L0, R0 = xs[0], xs[-1]
    ok = dark[y, L0:R0 + 1].mean() > .75 and abs((R0 - L0) - (Rb - Lb)) < .05 * (Rb - Lb) and a[y, L0 + 2].max() < 150 and a[y, R0 - 2].max() < 150
    if ok: rows.append(y); Ls.append(L0); Rs.append(R0)
rows = np.array(rows)
fg = fg0.copy()
# body: fill between interpolated edges, except near the rounded bottom where flood is reliable
last_label = bot - int(.04 * (bot - top))
for y in range(r0, last_label):
    L = np.interp(y, rows, Ls); R = np.interp(y, rows, Rs)
    fg[y, :] = False
    fg[y, int(np.ceil(L)):int(np.floor(R)) + 1] = True
# remove anything flood kept below the bottle outside the base span (shadows / plinth)
for y in range(last_label, bot + 1):
    fg[y, :int(Lb) - 2] = False; fg[y, int(Rb) + 3:] = False
mask = Image.fromarray(np.where(fg, 255, 0).astype(np.uint8))
mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.1))
out = im.convert('RGBA'); out.putalpha(mask)
out = out.crop(mask.getbbox()); out.save(dst); print(dst, out.size, 'reliable rows', len(rows))
