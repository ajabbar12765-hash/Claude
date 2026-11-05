"""Expressive narration with the offline Kokoro voice (no ElevenLabs).
Reads script/lines_el.json (the script with emotion cues like [excited], [whispering]), splits each line at its cues,
voices every piece separately with its own speed, then shifts its pitch and loudness (ffmpeg rubberband) and joins the
pieces with pauses that fit the mood. Writes voices/<id>.wav (24 kHz mono) and voices/dur.json.
  python tools/expressive_tts.py            (run with the library's .venv python)"""
import os, re, sys, json, subprocess, numpy as np, soundfile as sf
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
P = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
from kokoro_onnx import Kokoro
K = Kokoro(os.path.join(LIB, 'core/tts/kokoro-v1.0.onnx'), os.path.join(LIB, 'core/tts/voices-v1.0.bin'))
VOICE, SR = 'am_puck', 24000

# mood → (speed, pitch in semitones, gain, pause before (s), exclaim)
MOOD = {
    'curious': (.86, 1.2, 1.0, .10, False), 'mysterious': (.72, -1.8, .8, .25, False), 'amazed': (.82, 2.2, 1.05, .15, True),
    'whispering': (.74, -.8, .5, .35, False), 'dramatic': (.68, -2.4, 1.1, .55, False), 'excited': (.97, 2.6, 1.1, .12, True),
    'confident': (.88, .5, 1.05, .05, False), 'storytelling': (.82, 0, .95, .18, False), 'playful': (.94, 2.2, 1.05, .12, True),
    'impressed': (.84, 1.6, 1.0, .15, True), 'serious': (.76, -1.6, .95, .3, False), 'intrigued': (.82, .8, .95, .1, False),
    'slowly': (.62, -.6, 1.0, .3, False), 'detective': (.78, -2.6, 1.05, .25, False), 'frustrated': (.92, 1.2, 1.05, .15, True),
    'casual': (.9, 0, .95, .1, False), 'happy': (.92, 2.8, 1.05, .2, True), 'wincing': (.84, -1.2, .95, .25, False),
    'gentle': (.8, -.6, .85, .2, False), 'thoughtful': (.76, -1.0, .9, .2, False), 'softly': (.76, -1.2, .72, .3, False),
    'surprised': (.92, 3.0, 1.1, .2, True), 'skeptical': (.8, -.8, .95, .2, False), 'reassuring': (.82, .6, .95, .2, False),
    'warm': (.82, .6, 1.0, .1, False), 'heartfelt': (.74, -.6, .9, .35, False), 'neutral': (.84, 0, 1.0, .1, False),
}
def mood_of(tag):
    t = tag.lower()
    if 'laugh' in t: return 'laugh'
    for k in MOOD:
        if k in t: return k
    if 'lowers' in t: return 'mysterious'
    if 'pause' in t: return 'pause'
    if 'laugh' in t: return 'laugh'
    return 'neutral'

def pitch(y, st, gain):
    if abs(st) < .05: return y * gain
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'rubberband=pitch={2 ** (st / 12):.4f}:formant=preserved',
                          '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-'], input=y.astype(np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32) * gain

def trim(a):
    nz = np.where(np.abs(a) > np.abs(a).max() * .02)[0]
    return a[max(0, nz[0] - int(.02 * SR)): nz[-1] + int(.06 * SR)] if len(nz) else a

def whisper(y):                                   # breathier: lose some low end, add a little air
    from scipy.signal import butter, sosfilt
    hp = sosfilt(butter(2, 500, 'hp', fs=SR, output='sos'), y)
    air = sosfilt(butter(2, [2500, 7000], 'bp', fs=SR, output='sos'), np.random.default_rng(3).standard_normal(len(y))) * np.abs(y).mean() * .6
    return hp * .9 + air

SCRIPT = json.load(open(os.path.join(P, 'script/lines_el.json')))
dur = {}
for lid, text in SCRIPT.items():
    parts = re.split(r'\[([^\]]+)\]', text)          # ['', tag, text, tag, text, ...]
    mood = 'neutral'; segs = []; extra = 0
    if parts[0].strip(): segs.append(('neutral', parts[0].strip(), 0))
    for i in range(1, len(parts), 2):
        m = mood_of(parts[i]); say = parts[i + 1].strip()
        if m == 'pause': extra += .45; continue
        if m == 'laugh': m = mood                     # keep the previous mood; no fake laugh
        mood = m
        if say: segs.append((m, say, extra)); extra = 0
    out = []
    for k, (m, say, ex) in enumerate(segs):
        sp, st, g, pre, excl = MOOD[m]
        t = say
        if excl: t = re.sub(r'\.(\s|$)', r'!\1', t)  # exclamation changes the voice's intonation
        a, sr = K.create(t, voice=VOICE, speed=sp, lang='en-us')
        a = trim(a)
        if m == 'whispering': a = whisper(a)
        a = pitch(a, st, g)
        gap = (pre if k else 0) + ex + (.12 if k else 0)
        out.append(np.zeros(int(gap * SR), np.float32)); out.append(a.astype(np.float32))
    y = np.concatenate(out)
    y = y / (np.abs(y).max() + 1e-9) * .9
    sf.write(os.path.join(P, 'voices', lid + '.wav'), y, SR); dur[lid] = round(len(y) / SR, 3)
    print(lid, dur[lid], [s[0] for s in segs])
json.dump(dur, open(os.path.join(P, 'voices/dur.json'), 'w'), indent=1)
print('total', round(sum(dur.values()), 1))
