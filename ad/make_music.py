"""Original ambient music bed for the FreshLeaf ad (royalty-free, synthesized)."""
import numpy as np, wave
SR, DUR = 44100, 16.0
t = np.arange(int(SR*DUR))/SR
def hz(n): return 440*2**((n-69)/12)
# Gentle progression: Fmaj9 -> Dm9 -> Bbmaj7 -> Cadd9 (4s each)
chords = [[53,60,64,67,72],[50,57,60,65,69],[46,53,57,62,69],[48,55,62,64,67]]
pad = np.zeros_like(t)
for i,ch in enumerate(chords):
    s,e = i*4.0, i*4.0+5.0
    env = np.clip((t-s)/1.4,0,1)*np.clip((e-t)/1.6,0,1)
    env = np.sin(env*np.pi/2)**2
    for n in ch:
        f=hz(n)
        for det in (-0.12,0.12):
            pad += env*np.sin(2*np.pi*f*(1+det/100)*t + np.sin(2*np.pi*0.2*t))*0.035
        pad += env*np.sin(2*np.pi*f*2*t)*0.006
# soft chimes (bell-like) on scene changes
chime = np.zeros_like(t)
for st,n in [(0.4,84),(3.0,79),(5.6,81),(6.4,84),(7.2,86),(8.0,88),(8.8,86),(9.6,84),(10.6,79),(13.0,84),(13.4,88),(13.8,91)]:
    m = t>=st; tt=t[m]-st; f=hz(n)
    chime[m] += (np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*f*2.76*tt))*np.exp(-tt*2.2)*0.06
# airy noise "mist" swell
rng=np.random.default_rng(7); noise=rng.standard_normal(len(t))
k=np.ones(60)/60; noise=np.convolve(noise,k,'same')
mist = noise*0.05*(0.4+0.6*np.sin(np.pi*t/DUR))
mix = pad+chime+mist
# simple stereo widening via short delay
d=int(0.013*SR); L=mix; R=np.concatenate([np.zeros(d),mix[:-d]])
# reverb-ish tail
for dl,g in [(0.11,0.25),(0.23,0.18),(0.37,0.12)]:
    n=int(dl*SR); L=L+g*np.concatenate([np.zeros(n),R[:-n]]); R=R+g*np.concatenate([np.zeros(n),L[:-n]])
fade=np.clip(t/0.8,0,1)*np.clip((DUR-t)/1.5,0,1)
st=np.stack([L*fade,R*fade],1); st=st/np.abs(st).max()*0.6
with wave.open('assets/music.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes())
print('ok')
