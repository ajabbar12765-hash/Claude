"""Original produced music bed + SFX for the FreshLeaf ad (synthesized, royalty-free).

144 BPM, half-time feel. Cut points sit on the beat grid used by index.html:
  wipe 2.917 -> drop 3.333 · splash 3.75 · bars 5.417 -> scents every 0.833 from 5.833
  wipe 10.417 -> spaces 10.833 · spray 11.667 · fill 12.5 -> logo impact 13.333 · end 17.0
"""
import numpy as np, wave

SR, DUR, BPM = 44100, 17.0, 144
B = 60 / BPM
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)          # dry stereo bus
ducked = np.zeros(N)                       # music that gets sidechained (mono, widened later)
rev_send = np.zeros(N)

def hz(n): return 440 * 2 ** ((n - 69) / 12)
def idx(s): return int(round(s * SR))
def add(buf, s, x):
    i = idx(s); j = min(N, i + len(x));
    if j > i: buf[i:j] += x[:j - i]
def pan(s, x, p=0.0, send=0.0):
    add(L, s, x * np.sqrt((1 - p) / 2) * 1.414); add(R, s, x * np.sqrt((1 + p) / 2) * 1.414)
    if send: add(rev_send, s, x * send)
def fft_filter(x, lo=0, hi=SR / 2):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi < SR / 2: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def env(n, a, d):
    tt = np.arange(n) / SR
    return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)

# ---------- harmony ----------
CHORDS = [[53, 57, 60, 64, 67], [57, 60, 64, 67, 72], [50, 57, 60, 65, 69], [46, 53, 57, 62, 65]]  # Fmaj9 Am7 Dm9 Bbmaj9
ROOTS = [41, 45, 38, 46]
BAR = 4 * B
def chord_at(s): return int(s // BAR) % 4

# pad: band-limited saw stack, brightness opens over the intro
bright = np.interp(t, [0, 2.9, 3.33, 13.2, 13.33, 17], [1.2, 4.5, 7, 7, 9, 3])
pad = np.zeros(N)
for bi in range(int(DUR / BAR) + 1):
    s0 = bi * BAR; ch = CHORDS[bi % 4]
    a, b = idx(max(0, s0 - .05)), min(N, idx(s0 + BAR + .35))
    tt = t[a:b] - s0
    e = np.clip((tt + .05) / .25, 0, 1) * np.clip((BAR + .35 - tt) / .4, 0, 1)
    for n in ch:
        f = hz(n)
        for det in (-.07, .07):
            for k in range(1, 9):
                w = (1 / k) * np.exp(-(k - 1) / bright[a:b])
                pad[a:b] += e * w * np.sin(2 * np.pi * f * k * (1 + det / 100) * tt + k) * .012
ducked += pad

# electric-piano stabs / arps (FM-ish bell)
def ep(n, dur=1.2, vel=1.0):
    m = int(dur * SR); tt = np.arange(m) / SR; f = hz(n)
    mod = np.sin(2 * np.pi * f * tt) * 1.6 * np.exp(-tt * 6)
    x = np.sin(2 * np.pi * f * tt + mod) * np.exp(-tt * 2.6) + .25 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt * 5)
    x *= (1 + .15 * np.sin(2 * np.pi * 5.5 * tt))
    return x * env(m, .004, 10) * .07 * vel
# intro arpeggio (8ths) then groove arps on off-beats
for i in range(int(DUR / (B / 2))):
    s = i * B / 2
    if s > 16.2: break
    ch = CHORDS[chord_at(s)]
    if s < 3.3:
        n = ch[[0, 2, 4, 3, 1, 3, 4, 2][i % 8]] + 12
        x = ep(n, 1.0, .55 + .35 * (s / 3.3)); pan(s, x, [-.4, .4][i % 2], .5)
    elif 13.3 > s and i % 4 == 3:
        n = ch[(i // 4) % 5] + 12
        pan(s, ep(n, .8, .55), [-.5, .5][(i // 4) % 2], .45)
# chord stabs on each scent change + at the end card
for s in [5.833 + k * 2 * B for k in range(6)] + [13.333]:
    for n in CHORDS[chord_at(s)][1:]:
        pan(s, ep(n + 12, 1.4, .8), 0, .5)

# bass: sub + a little grit, half-time pattern
def bass(n, dur):
    m = int(dur * SR); tt = np.arange(m) / SR; f = hz(n)
    x = np.sin(2 * np.pi * f * tt) + .18 * np.sin(2 * np.pi * 2 * f * tt) + .06 * np.sin(2 * np.pi * 3 * f * tt)
    return x * np.minimum(1, tt / .008) * np.minimum(1, (dur - tt) / .04).clip(0) * .22
for bi in range(int(DUR / BAR) + 1):
    s0 = bi * BAR; r = ROOTS[bi % 4]
    for off, d, oct_ in [(0, 1.4 * B, 0), (1.5 * B, .45 * B, 12), (2.5 * B, 1.3 * B, 0)]:
        s = s0 + off
        if 3.33 <= s < 13.2 or 13.33 <= s < 16.2:
            add(ducked, s, bass(r + oct_, d))

# ---------- drums ----------
def kick():
    m = int(.45 * SR); tt = np.arange(m) / SR
    ph = 2 * np.pi * np.cumsum(48 + 110 * np.exp(-tt * 28)) / SR
    return (np.sin(ph) * np.exp(-tt * 7) + .3 * rng.standard_normal(m) * np.exp(-tt * 300)) * .55
def clap():
    m = int(.35 * SR); x = np.zeros(m); nz = fft_filter(rng.standard_normal(m), 900, 5000)
    for k, o in enumerate([0, .011, .022]):
        i = int(o * SR); e = np.exp(-np.arange(m - i) / SR * (60 if k < 2 else 14))
        x[i:] += nz[: m - i] * e
    return x * .22
def hat(open_=False):
    m = int((.18 if open_ else .05) * SR)
    return fft_filter(rng.standard_normal(m), 7000) * np.exp(-np.arange(m) / SR * (18 if open_ else 70)) * .09
KICK, CLAP = kick(), clap()
kick_times = []
for bi in range(int(DUR / BAR) + 1):
    s0 = bi * BAR
    for off in (0, 2.5 * B):
        s = s0 + off
        if 3.33 <= s < 12.5 or 13.33 <= s < 16.0: pan(s, KICK); kick_times.append(s)
    s = s0 + 2 * B
    if 3.33 <= s < 12.5 or 13.33 <= s < 16.0: pan(s, CLAP, 0, .35)
for i in range(int(DUR / (B / 2))):
    s = i * B / 2
    if 3.33 <= s < 12.5 or 13.33 <= s < 16.2:
        sw = .025 if i % 2 else 0
        pan(s + sw, hat(i % 4 == 2), .3 if i % 2 else -.2)
# snare fill into the end card
for k in range(8):
    s = 12.5 + k * B / 4
    pan(s, CLAP * (.35 + .09 * k), 0, .3)

# sidechain on music bus
sc = np.ones(N)
for s in kick_times:
    i = idx(s); m = min(N - i, int(.32 * SR)); tt = np.arange(m) / SR
    sc[i:i + m] = np.minimum(sc[i:i + m], 1 - .55 * np.exp(-tt / .09))
ducked *= sc
d = int(.012 * SR)
L += ducked; R += np.concatenate([np.zeros(d), ducked[:-d]])
rev_send += ducked * .35

# ---------- sound design ----------
def noise(dur): return rng.standard_normal(int(dur * SR))
def whoosh(dur=.55, lo=300, hi=6000):
    m = int(dur * SR); tt = np.arange(m) / SR
    a = fft_filter(noise(dur), lo, 1800); b = fft_filter(noise(dur), 1800, hi)
    p = tt / dur
    e = np.sin(np.pi * p) ** 1.5
    return (a * (1 - p) + b * p) * e * .22
for s in (2.917, 5.417, 10.417):
    w = whoosh(.48); m = len(w); p = np.linspace(-.8, .8, m)
    add(L, s, w * np.sqrt((1 - p) / 2) * 1.4); add(R, s, w * np.sqrt((1 + p) / 2) * 1.4); add(rev_send, s, w * .3)
# riser into the drop
m = idx(3.333 - 1.6); rz = noise(1.6); tt = np.arange(len(rz)) / SR
riser = fft_filter(rz, 1200) * (tt / 1.6) ** 2 * .16
riser += np.sin(2 * np.pi * np.cumsum(220 + 900 * (tt / 1.6) ** 2) / SR) * (tt / 1.6) ** 2 * .05
pan(1.733, riser, 0, .4)
# reverse swell into the logo
rz = noise(.9); tt = np.arange(len(rz)) / SR
pan(13.333 - .9, fft_filter(rz, 2500) * (tt / .9) ** 3 * .22, 0, .3)
# impacts (drop + logo)
def impact(level):
    m = int(1.6 * SR); tt = np.arange(m) / SR
    sub = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 2.2)
    crack = fft_filter(rng.standard_normal(m), 80, 2500) * np.exp(-tt * 14)
    return (sub * .6 + crack * .25) * level
pan(3.333, impact(.8), 0, .5)
pan(13.333, impact(1.0), 0, .7)
# droplet "plip" + water ripple
def plip():
    m = int(.3 * SR); tt = np.arange(m) / SR
    return np.sin(2 * np.pi * np.cumsum(1500 * np.exp(-tt * 22) + 420) / SR) * np.exp(-tt * 16) * .2
pan(3.75, plip(), .1, .8); pan(3.86, plip() * .5, -.3, .8)
# pops on every scent change + icon draws
def pop(f=1700):
    m = int(.08 * SR); tt = np.arange(m) / SR
    return np.sin(2 * np.pi * f * tt * (1 - tt * 4)) * np.exp(-tt * 60) * .12
for k in range(6): pan(5.833 + k * 2 * B, pop(1500 + 120 * k), [-.4, .4][k % 2], .3)
for k, s in enumerate((11.25, 11.46, 11.67)): pan(s, pop(1200 + 200 * k) * .8, (k - 1) * .5, .3)
# spray mist "tssss"
sp = fft_filter(noise(.7), 4500); tt = np.arange(len(sp)) / SR
pan(11.667, sp * np.minimum(1, tt / .02) * np.exp(-tt * 4) * .2, -.5, .4)
pan(11.85, sp * np.minimum(1, tt / .02) * np.exp(-tt * 5) * .12, -.6, .4)
# shine sparkle on the CTA
for k in range(5): pan(15.1 + k * .06, ep(96 + [0, 4, 7, 12, 16][k], .6, .5), -.5 + k * .25, .6)

# ---------- reverb (FFT convolution with a synthetic hall IR) ----------
irn = int(2.2 * SR); tt = np.arange(irn) / SR
ir = fft_filter(rng.standard_normal(irn), 150, 7000) * np.exp(-tt / .55)
ir[: int(.012 * SR)] = 0
def conv(x, h):
    n = len(x) + len(h); F = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(h, F), F)[: len(x)]
wetL = conv(rev_send, ir) * .045; wetR = conv(np.roll(rev_send, 300), ir[::-1].copy()[::-1]) * .045
L += wetL; R += wetR

# ---------- master ----------
fade = np.clip((DUR - t) / .9, 0, 1) * np.clip(t / .05, 0, 1)
st = np.stack([L, R], 1) * fade[:, None]
st = fft_filter(st[:, 0], 28)[:, None] * [1, 0] + fft_filter(st[:, 1], 28)[:, None] * [0, 1]
st = st / np.percentile(np.abs(st), 99.95) * .8
st = np.tanh(st * 1.25) / np.tanh(1.25) * .74
with wave.open('assets/music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())
print('ok', DUR)
