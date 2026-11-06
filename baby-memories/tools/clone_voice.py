"""Narration in the creator's own (cloned) voice with Chatterbox (Resemble AI, MIT licence), offline on CPU.
  /root/cbx/venv/bin/python tools/clone_voice.py <reference recording> [--only s01_hook,...]
Reads script/lines_el.json (with mood cues). Each sentence is spoken in the cloned voice; the mood sets how expressive it is
(Chatterbox "exaggeration") and how measured (cfg weight). Sentences of a line are joined with natural breaths of silence.
Writes voices/<id>.wav (24 kHz mono) and voices/dur.json."""
import os, re, sys, json, subprocess, numpy as np, soundfile as sf
import torch
from chatterbox.tts import ChatterboxTTS
P = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ref_in = sys.argv[1]
only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
torch.manual_seed(int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 7)

# clean reference: mono 24 kHz, trimmed, loudness-evened (phone recordings come in many formats)
ref = os.path.join(P, 'voices', 'reference.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ref_in, '-ac', '1', '-ar', '24000',
                '-af', 'highpass=f=70,afftdn=nf=-25,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18',
                ref], check=True)

M = ChatterboxTTS.from_pretrained(device='cpu')
M.prepare_conditionals(ref, exaggeration=.5)
# American accent: take the speech rhythm/accent prompt from an American reference (Kokoro am_puck reading the same
# words), keep the creator's own timbre (decoder reference) and blend the speaker embedding toward the creator.
accent = sys.argv[sys.argv.index('--accent') + 1] if '--accent' in sys.argv else None
if accent:
    import librosa
    from chatterbox.models.s3tokenizer import S3_SR
    w, _ = librosa.load(accent, sr=S3_SR)
    tok, _ = M.s3gen.tokenizer.forward([w[:M.ENC_COND_LEN]], max_len=M.t3.hp.speech_cond_prompt_len)
    M.conds.t3.cond_prompt_speech_tokens = torch.atleast_2d(tok).to(M.device)
    ve_us = torch.from_numpy(M.ve.embeds_from_wavs([w], sample_rate=S3_SR)).mean(0, keepdim=True)
    mix = float(sys.argv[sys.argv.index('--mix') + 1]) if '--mix' in sys.argv else .35
    M.conds.t3.speaker_emb = (M.conds.t3.speaker_emb * (1 - mix) + ve_us.to(M.device) * mix)

# mood → (exaggeration, cfg_weight, pause before the sentence in seconds)
MOOD = {'excited': (.85, .35, .25), 'amazed': (.8, .35, .3), 'playful': (.75, .4, .25), 'happy': (.75, .4, .3), 'surprised': (.85, .35, .3),
        'impressed': (.7, .4, .3), 'frustrated': (.7, .4, .3), 'curious': (.6, .45, .25), 'intrigued': (.55, .45, .3),
        'mysterious': (.45, .55, .45), 'whispering': (.35, .6, .5), 'dramatic': (.55, .6, .7), 'slowly': (.4, .65, .45),
        'serious': (.4, .55, .45), 'detective': (.5, .55, .4), 'softly': (.35, .55, .45), 'gentle': (.4, .5, .35),
        'thoughtful': (.4, .55, .4), 'storytelling': (.5, .5, .35), 'confident': (.55, .45, .25), 'casual': (.5, .5, .3),
        'wincing': (.55, .5, .3), 'skeptical': (.5, .5, .35), 'reassuring': (.45, .5, .35), 'warm': (.5, .5, .3),
        'heartfelt': (.45, .55, .5), 'neutral': (.5, .5, .3)}
def mood_of(tag):
    t = tag.lower()
    if 'laugh' in t: return 'laugh'
    if 'pause' in t: return 'pause'
    if 'lowers' in t: return 'mysterious'
    for k in MOOD:
        if k in t: return k
    return 'neutral'

SCRIPT = json.load(open(os.path.join(P, 'script/lines_el.json')))
dpath = os.path.join(P, 'voices/dur.json'); dur = json.load(open(dpath)) if os.path.exists(dpath) else {}
for lid, text in SCRIPT.items():
    if only and lid not in only: continue
    parts = re.split(r'\[([^\]]+)\]', text); mood = 'neutral'; sents = []; extra = 0
    chunks = [('neutral', parts[0])] + [(mood_of(parts[i]), parts[i + 1]) for i in range(1, len(parts), 2)]
    for m, seg in chunks:
        if m == 'pause': extra += .4; m = mood
        if m == 'laugh': m = mood
        mood = m
        for s in re.findall(r'[^.?!]+(?:[.?!]+|$)', seg):
            s = s.strip()
            if s: sents.append((m, s, extra)); extra = 0
    # very short sentences ("Okay.", "Deleted.") make the model stumble: join them to a neighbour
    merged = []
    for m, t, ex in sents:
        if merged and (len(t.split()) < 4 or len(merged[-1][1].split()) < 3):
            pm, pt, pe = merged[-1]; merged[-1] = (pm, pt + ' ' + t, pe + ex)
        else: merged.append((m, t, ex))
    sents = merged
    out = []
    for k, (m, s, ex) in enumerate(sents):
        e, cfg, pre = MOOD[m]
        if '--clear' in sys.argv:                       # clearer diction: less exaggeration, more guidance, steadier sampling
            e, cfg = min(e, .62), max(cfg, .5)
        w = M.generate(s, exaggeration=e, cfg_weight=cfg, temperature=.6 if '--clear' in sys.argv else .75)
        y = w.squeeze(0).numpy()
        nz = np.where(np.abs(y) > np.abs(y).max() * .02)[0]
        if len(nz): y = y[max(0, nz[0] - 480): nz[-1] + 1440]
        if m in ('whispering', 'softly'): y = y * (.8 if '--clear' in sys.argv else .6)
        if k: out.append(np.zeros(int((pre + ex) * M.sr), np.float32))
        out.append(y.astype(np.float32))
        print(lid, k, m, s[:50], flush=True)
    y = np.concatenate(out); y = y / (np.abs(y).max() + 1e-9) * .9
    sf.write(os.path.join(P, 'voices', lid + '.wav'), y, M.sr); dur[lid] = round(len(y) / M.sr, 3)
    json.dump(dur, open(dpath, 'w'), indent=1)
print('total', round(sum(dur.values()), 1))
