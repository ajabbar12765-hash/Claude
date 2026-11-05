"""Switch the narration to the ElevenLabs takes in voices_el/*.mp3:
decode → mono 24 kHz WAV in voices/<id>.wav, trim leading/trailing silence, write voices/dur.json.
Then run tools/align.py and tools/envelope.py so the board, subtitles and the host's mouth follow the new voice."""
import os, json, subprocess, numpy as np, soundfile as sf
P = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
lines = json.load(open(os.path.join(P, 'script/lines.json')))
dur = {}
for L in lines:
    src = os.path.join(P, 'voices_el', L['id'] + '.mp3'); dst = os.path.join(P, 'voices', L['id'] + '.wav')
    if not os.path.exists(src): raise SystemExit(f'missing {src}')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '24000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).copy()
    h = 240; e = np.array([np.sqrt(np.mean(y[i:i + h] ** 2)) for i in range(0, len(y) - h, h)])
    on = np.where(e > max(1e-4, e.max() * .02))[0]
    a, b = max(0, on[0] * h - 1200), min(len(y), (on[-1] + 1) * h + 2400)
    y = y[a:b]
    sf.write(dst, y, 24000); dur[L['id']] = round(len(y) / 24000, 3)
json.dump(dur, open(os.path.join(P, 'voices/dur.json'), 'w'), indent=1)
print(dur, round(sum(dur.values()), 1))
