"""Estimate word timings for each voice line (no network ASR available here).
Speech regions are found from the waveform energy; words are spread over the voiced time in proportion to their
length (+ a little for each word boundary), so pauses in the audio land between words.
Writes voices/words.json = {id: [[word, t0, t1], ...]}."""
import sys, json, os, numpy as np, soundfile as sf
P = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
lines = json.load(open(os.path.join(P, 'script/lines_kokoro.json')))
out = {}
for L in lines:
    y, sr = sf.read(os.path.join(P, 'voices', L['id'] + '.wav'))
    if y.ndim > 1: y = y.mean(1)
    hop = int(sr * .01); n = len(y) // hop
    e = np.array([np.sqrt(np.mean(y[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    thr = max(1e-4, np.percentile(e, 95) * .06)
    on = e > thr
    # close tiny gaps (< 60 ms) so only real pauses count as silence
    i = 0
    while i < n:
        if not on[i]:
            j = i
            while j < n and not on[j]: j += 1
            if j - i < 6 and i > 0 and j < n: on[i:j] = True
            i = j
        else: i += 1
    cum = np.cumsum(on) * .01                          # voiced seconds up to frame
    voiced = cum[-1]
    words = L['text'].split()
    wts = np.array([len(w.strip('.,?!:;"')) + 1.2 + (2.5 if w[-1] in '.?!' else 1.2 if w[-1] in ',:;' else 0) for w in words], float)
    # punctuation weight sits at the END of a word, but should map to the pause, not the word: keep it as a tail
    tails = np.array([(2.5 if w[-1] in '.?!' else 1.2 if w[-1] in ',:;' else 0) for w in words], float)
    edges = np.concatenate([[0], np.cumsum(wts)]) / wts.sum() * voiced
    def real(v):                                       # voiced-time → real time
        k = np.searchsorted(cum, v - 1e-9)
        return min(k, n - 1) * .01
    W = []
    for k, w in enumerate(words):
        a = edges[k]; b = edges[k + 1] - tails[k] / wts.sum() * voiced
        W.append([w, round(real(a), 3), round(real(b) + .01, 3)])
    out[L['id']] = W
json.dump(out, open(os.path.join(P, 'voices/words.json'), 'w'))
print({k: v[-1][2] for k, v in out.items()})
