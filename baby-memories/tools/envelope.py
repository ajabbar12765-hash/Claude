"""Voice loudness envelopes (50 Hz) for the host's mouth → voices/env.json"""
import json, os, numpy as np, soundfile as sf
P = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
o = {}
for l in json.load(open(os.path.join(P, 'script/lines_kokoro.json'))):
    y, sr = sf.read(os.path.join(P, 'voices', l['id'] + '.wav')); h = sr // 50
    e = np.array([np.sqrt(np.mean(y[i * h:(i + 1) * h] ** 2)) for i in range(len(y) // h)]); e = e / (np.percentile(e, 95) + 1e-9)
    o[l['id']] = [round(float(min(1, v)), 2) for v in e]
json.dump(o, open(os.path.join(P, 'voices/env.json'), 'w'))
