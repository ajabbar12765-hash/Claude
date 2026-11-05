"""Original score — clockwork minimalism, 96 BPM, A minor / C major. Marimba ostinato + pizzicato + woodblock clock,
one instrument added per suspect, a full stop into silence before "It happens around age seven", a hushed
vibraphone section for "locked, not lost", and a full ensemble that resolves on C for the call to action.
Writes music/score.wav (stereo 48k)."""
import sys, os, json, numpy as np, soundfile as sf
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')); sys.path.insert(0, LIB)
from core.audio import sampler as S
from core.audio.sfx import SR
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))
C = next(e for e in ev['ev'] if e['type'] == 'cues'); DUR = ev['dur']
SEC = C['sections']; VO = C['VO']
S.seed(11)
BPM = 96; B = 60 / BPM; BAR = 4 * B
N = []
def n(t, inst, p, d, v=.7, pan=0., g=1., **kw):
    if 0 <= t < DUR: N.append(dict(t=t, inst=inst, pitch=p, dur=d, vel=v, pan=pan, gain=g, **kw))
def up(p, k): return S.name(S.midi(p) + k)

CH = {'Am': ['A', 'C', 'E'], 'F': ['F', 'A', 'C'], 'C': ['C', 'E', 'G'], 'G': ['G', 'B', 'D'], 'Dm': ['D', 'F', 'A'], 'Em': ['E', 'G', 'B']}
ROOT = {'Am': 'A1', 'F': 'F1', 'C': 'C2', 'G': 'G1', 'Dm': 'D2', 'Em': 'E2'}
PROG = ['Am', 'F', 'C', 'G']
def arp(ch, o=4):
    r = S.midi(CH[ch][0] + str(o)); t3 = S.midi(CH[ch][1] + str(o)); f5 = S.midi(CH[ch][2] + str(o))
    if t3 < r: t3 += 12
    if f5 < r: f5 += 12
    return [r, f5, r + 12, f5, t3 + 12, f5, r + 12, f5]
GRID0 = 0.0
def bars(a, b):                                           # bar start times on the global grid inside [a, b)
    k0 = int(np.ceil((a - GRID0) / BAR - 1e-6)); out = []
    while GRID0 + k0 * BAR < b - .05: out.append((k0, GRID0 + k0 * BAR)); k0 += 1
    return out
def groove(a, b, lvl=1., mar=True, pizz=True, tick=True, shaker=False, glock=False, prog=PROG, mar_o=4):
    for k, t0 in bars(a, b):
        ch = prog[k % len(prog)]
        for i, m in enumerate(arp(ch, mar_o)):
            tt = t0 + i * B / 2
            if mar and tt < b: n(tt, 'marimba', m, .3, (.58 if i % 2 == 0 else .46) * lvl, -.15, .9)
        if pizz:
            n(t0, 'cellos_pizz', up(ROOT[ch], 12), .5, .7 * lvl, .05, 1.0); n(t0, 'contrabass_pizz', ROOT[ch], .5, .65 * lvl, 0, 1.0)
            if t0 + 2 * B < b: n(t0 + 2 * B, 'cellos_pizz', up(ROOT[ch], 19), .4, .55 * lvl, .1, .9)
        for i in range(4):
            tt = t0 + i * B
            if tt >= b: break
            if tick: n(tt, 'woodblock', 'a' if i % 2 == 0 else 'b', None, .32 * lvl, .35, .5)
            if shaker:
                for h in (0, .5): n(tt + h * B, 'shaker', 'down' if h == 0 else 'up', None, .25 * lvl, -.3, .3)
        if glock and k % 2 == 0:
            for j, p in enumerate([CH[ch][2] + '5', CH[ch][0] + '6', CH[ch][1] + '6']):
                n(t0 + (2 + j * .5) * B, 'glockenspiel', p, .4, .42 * lvl, .25, .6)

s = lambda i: SEC[i][0]; e = lambda i: SEC[i][1]
# 0 → title: the clock alone, a pickup into the title
for i, tt in enumerate(np.arange(.6, s('s02_title') - .3, B)): n(tt, 'woodblock', 'a' if i % 2 == 0 else 'b', None, .26, .3, .5)
n(s('s01_hook') + .2, 'vibraphone', 'A3', 6, .3, -.2, .5); n(s('s01_hook') + .2, 'vibraphone', 'E4', 6, .28, .2, .5)
n(s('s01_hook') + 9, 'vibraphone', 'F3', 6, .28, -.2, .5); n(s('s01_hook') + 9, 'vibraphone', 'C4', 6, .26, .2, .5)
t_title = s('s02_title')
for i, p in enumerate(['A4', 'C5', 'E5', 'A5']): n(t_title - .55 + i * .14, 'glockenspiel', p, .4, .5 + .06 * i, .25, .7)
n(t_title, 'sus_cymbal', 'cresc', None, .3, 0, .3)
# title → kick test
GRID0 = t_title
groove(t_title, s('s04_name'), .85, pizz=False)
groove(s('s03_babies'), s('s04_name') - .1, .9)
# three suspects: a lift
groove(s('s04_name'), s('s05_hippo'), 1.0, glock=True)
# one instrument per suspect
groove(s('s05_hippo') - .5, s('s06_words'), .9)
groove(s('s06_words') - .5, s('s07_me'), .9, shaker=True)
groove(s('s07_me') - .5, s('s08_seven'), .95, shaker=True, glock=True)
# the big forgetting: groove, then a full stop into silence, then the reveal hit
rv = C['revealT']; stop = rv - C['split']['gap'] - .1
groove(s('s08_seven') - .5, stop, .9, shaker=True, prog=['Am', 'Dm', 'Em', 'Am'])
n(rv, 'timpani', 'A2', 2.5, .75, 0, .8); n(rv, 'contrabass_pizz', 'A1', 1, .9, 0, 1.1)
for p in ['A3', 'C4', 'E4']: n(rv, 'vibraphone', p, 3, .45, 0, .6)
n(rv + .05, 'glockenspiel', 'E6', 1.5, .55, .3, .7)
groove(rv + 2.5, e('s08_seven') + 1, .55, mar=True, pizz=False, tick=False, prog=['Am'])
# locked, not lost: hushed vibraphone + soft marimba
for k, t0 in bars(s('s09_locked') - 1, s('s10_fake')):
    ch = ['Am', 'F', 'Am', 'F'][k % 4]
    for p in [CH[ch][0] + '3', CH[ch][2] + '3', CH[ch][1] + '4']: n(t0, 'vibraphone', p, BAR * .95, .3, 0, .55)
    for i, m in enumerate(arp(ch, 4)[::2]): n(t0 + i * B, 'marimba', m, .3, .35, -.2, .7)
n(s('s09_locked') + 20.5, 'glockenspiel', 'C6', 1.2, .5, .3, .7); n(s('s09_locked') + 20.5, 'glockenspiel', 'E6', 1.2, .45, .3, .7)
# fake memories: playful pizzicato
groove(s('s10_fake') - .5, s('s11_end'), .8, mar=False, pizz=True, tick=True, glock=True, prog=['Dm', 'G', 'C', 'Am'])
for k, t0 in bars(s('s10_fake') - .5, s('s11_end')):
    for i in (0, 1.5, 3): n(t0 + i * B, 'violins_pizz' if 'violins_pizz' in S.instruments() else 'cellos_pizz', ['D5', 'F5', 'A5', 'G5'][(k + int(i)) % 4], .2, .4, .3, .6)
# finale: full ensemble, resolve on C at the call to action
groove(s('s11_end') - .5, e('s11_end') - 2, 1.05, shaker=True, glock=True, prog=['F', 'G', 'Am', 'C'])
L = e('s11_end') - 2.0
n(L, 'timpani', 'C3', 3, .6, 0, .7)
for p in ['C2', 'G2', 'C3', 'E3', 'G3', 'C4', 'E4', 'G4', 'C5']: n(L, 'harp', p, 5, .55, 0, .6)
for p in ['C4', 'E4', 'G4']: n(L, 'vibraphone', p, 5, .45, 0, .6)
n(L + .1, 'glockenspiel', 'G6', 2, .5, .3, .6); n(L + .1, 'glockenspiel', 'C7', 2, .45, .3, .6)
for i, m in enumerate(arp('C') + arp('C')[:4]): n(L + 1.5 + i * B / 2, 'marimba', m, .3, .3 * (1 - i / 14), -.2, .7)

N.sort(key=lambda x: x['t'])
mix = S.render(N, dur=DUR + 1, master=False)
mix = S.room(mix, size=.42, mix=.16)
os.makedirs(os.path.join(HERE, 'music'), exist_ok=True)
sf.write(os.path.join(HERE, 'music/score.wav'), mix.astype(np.float32), SR)
print('notes', len(N), 'peak', float(np.abs(mix).max()))
open(os.path.join(HERE, 'music/credits.txt'), 'w').write('\n'.join(S.credits(sorted({x['inst'] for x in N}))))
