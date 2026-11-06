"""Word timings for the script from the speech-to-text pass (voices/words_asr.json, from core/tts/asr_check.py).
Whisper may write numbers as digits ("3", "2018"), so its words are matched to the script's words by sequence
alignment; script words without a direct match get times interpolated between their matched neighbours.
Writes voices/words.json = {id: [[script word, t0, t1], ...]} (the format film.js reads)."""
import os, re, json, difflib
P = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
lines = json.load(open(os.path.join(P, 'script/lines.json')))
asr = json.load(open(os.path.join(P, 'voices/words_asr.json')))
dur = json.load(open(os.path.join(P, 'voices/dur.json')))
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
out = {}
for L in lines:
    sw = L['text'].split(); aw = [(w, max(0., a), max(0., b)) for w, a, b in asr[L['id']]]
    sm = difflib.SequenceMatcher(None, [norm(w) for w in sw], [norm(w[0]) for w in aw], autojunk=False)
    T = [None] * len(sw)
    for tag, i0, i1, j0, j1 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i1 - i0): T[i0 + k] = (aw[j0 + k][1], aw[j0 + k][2])
        elif tag == 'replace' and j1 > j0:          # e.g. "three years" ↔ "3 years": spread the heard span over the script words
            a, b = aw[j0][1], aw[j1 - 1][2]
            for k in range(i1 - i0): T[i0 + k] = (a + (b - a) * k / (i1 - i0), a + (b - a) * (k + 1) / (i1 - i0))
    # fill gaps by interpolation
    end = dur[L['id']]
    for i in range(len(sw)):
        if T[i] is None:
            p = next((T[j][1] for j in range(i - 1, -1, -1) if T[j]), 0.)
            nxt = next(((j, T[j][0]) for j in range(i + 1, len(sw)) if T[j]), (len(sw), end))
            n = nxt[0] - i + 1; T[i] = (p + (nxt[1] - p) * 1 / n * .2, p + (nxt[1] - p) * 1 / n)
    # keep times monotonic
    last = 0.
    for i, (a, b) in enumerate(T):
        a = max(a, last); b = max(b, a + .05); T[i] = (a, b); last = a
    out[L['id']] = [[w, round(a, 3), round(b, 3)] for w, (a, b) in zip(sw, T)]
json.dump(out, open(os.path.join(P, 'voices/words.json'), 'w'))
print('aligned', len(out), 'lines')
