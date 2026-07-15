/*
 * Spatial360Engine — binaural 360° audio engine built on the Web Audio API.
 *
 * Modes:
 *   stereo  — untouched passthrough (plus optional headphone EQ)
 *   orbit   — the whole mix circles the listener's head ("8D" style)
 *   reality — the mix is split into frequency bands, each band rendered as a
 *             virtual object placed on a sphere around the head via HRTF
 *             panning (a software recreation of Sony 360 Reality Audio's
 *             object-on-a-sphere model, playable on any stereo headphones)
 *
 * All spatial paths run through PannerNodes with panningModel:'HRTF' and share
 * a generated small-room reverb for out-of-head externalization.
 */

const BANDS = [
  // [label, hpFreq|null, lpFreq|null, azimuth°, elevation°, dist, driftSpeed, driftSize]
  ['Sub',      null,  110,    0, -18, 1.15, 0.00, 0.00],
  ['Low',       110,  350,  -38,  -6, 1.45, 0.05, 0.18],
  ['Body',      350, 1000,   38,  -6, 1.45, 0.045, 0.18],
  ['Voice',    1000, 3200,    0,  14, 1.25, 0.03, 0.10],
  ['Air L',    3200, 8000, -118,  32, 1.65, 0.06, 0.26],
  ['Air R',    8000, null,  118,  36, 1.65, 0.055, 0.26],
];

const DEG = Math.PI / 180;

export class Spatial360Engine {
  constructor() {
    this.ctx = null;
    this.mode = 'reality';
    this.intensity = 1;     // 0.2 .. 2  (radius / spread scale)
    this.motion = 0.35;     // 0 .. 1    (field rotation / orbit speed)
    this.room = 0.35;       // 0 .. 1    (reverb mix)
    this.hpProfile = true;  // WH-CH520 EQ compensation
    this._angle = 0;        // orbit / field rotation angle (radians)
    this._raf = 0;
    this._lastT = 0;
    this.sources = [];      // live positions for the visualizer [{x,y,z,level}]
    this._attached = false;
  }

  /* Lazily create the AudioContext + graph. Must be called from a user gesture. */
  ensure(mediaEl) {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'playback' });
    const ctx = this.ctx;

    this.src = ctx.createMediaElementSource(mediaEl);

    // ---- headphone profile EQ (gentle tuning for Sony WH-CH520) ----
    // The CH520 has a warm low-mid tilt and a slightly forward 3–5 kHz region;
    // this de-emphasizes the boom a touch and restores some air on top.
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf'; this.eqLow.frequency.value = 180; this.eqLow.gain.value = -1.5;
    this.eqPres = ctx.createBiquadFilter();
    this.eqPres.type = 'peaking'; this.eqPres.frequency.value = 4200; this.eqPres.Q.value = 1.1; this.eqPres.gain.value = -1.0;
    this.eqAir = ctx.createBiquadFilter();
    this.eqAir.type = 'highshelf'; this.eqAir.frequency.value = 9500; this.eqAir.gain.value = 1.5;

    this.input = ctx.createGain();
    this.src.connect(this.eqLow).connect(this.eqPres).connect(this.eqAir).connect(this.input);

    // ---- mode buses ----
    this.stereoBus = ctx.createGain();
    this.orbitBus = ctx.createGain();
    this.realityBus = ctx.createGain();
    this.input.connect(this.stereoBus);
    this.input.connect(this.orbitBus);
    this.input.connect(this.realityBus);

    this.spatialMix = ctx.createGain();

    // orbit: whole mix through one HRTF panner
    this.orbitPanner = this._makePanner(0, 0, -1.5);
    this.orbitBus.connect(this.orbitPanner).connect(this.spatialMix);

    // reality: band-split into HRTF-panned virtual objects
    this.bands = BANDS.map(([label, hp, lp, az, el, dist, dSpd, dSize]) => {
      let node = this.realityBus;
      if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; f.Q.value = 0.7; node.connect(f); node = f; }
      else { const g = ctx.createGain(); node.connect(g); node = g; }
      if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.7; node.connect(f); node = f; }
      const panner = this._makePanner(0, 0, -1);
      node.connect(panner).connect(this.spatialMix);
      return { label, panner, az: az * DEG, el: el * DEG, dist, dSpd, dSize, phase: Math.random() * 6.28 };
    });

    // ---- shared reverb for externalization ----
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this._impulse(1.6, 2.8);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = this.room * 0.35;
    this.spatialMix.connect(this.convolver).connect(this.reverbGain);

    // ---- master chain ----
    this.master = ctx.createGain();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 24; this.comp.ratio.value = 3;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;
    this._fft = new Uint8Array(this.analyser.frequencyBinCount);

    this.stereoBus.connect(this.master);
    this.spatialMix.connect(this.master);
    this.reverbGain.connect(this.master);
    this.master.connect(this.comp).connect(this.analyser).connect(ctx.destination);

    this._applyMode(true);
    this.setHeadphoneProfile(this.hpProfile);
    this._attached = true;

    this._lastT = performance.now();
    const tick = (t) => { this._step((t - this._lastT) / 1000); this._lastT = t; this._raf = requestAnimationFrame(tick); };
    this._raf = requestAnimationFrame(tick);
  }

  _makePanner(x, y, z) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 1;
    p.rolloffFactor = 1;
    p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    return p;
  }

  /* Generated stereo impulse response: decorrelated noise with exponential decay. */
  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(seconds * rate);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  setMode(mode) {
    this.mode = mode;
    if (this.ctx) this._applyMode(false);
  }

  _applyMode(instant) {
    const t = this.ctx.currentTime;
    const ramp = (param, v) => {
      param.cancelScheduledValues(t);
      if (instant) param.value = v;
      else { param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(v, t + 0.35); }
    };
    ramp(this.stereoBus.gain, this.mode === 'stereo' ? 1 : 0);
    ramp(this.orbitBus.gain, this.mode === 'orbit' ? 1 : 0);
    // per-band summing needs a little headroom
    ramp(this.realityBus.gain, this.mode === 'reality' ? 1.15 : 0);
    ramp(this.reverbGain.gain, this.mode === 'stereo' ? 0 : this.room * 0.35);
  }

  setIntensity(v) { this.intensity = v; }
  setMotion(v) { this.motion = v; }
  setRoom(v) {
    this.room = v;
    if (this.ctx && this.mode !== 'stereo') {
      this.reverbGain.gain.setTargetAtTime(v * 0.35, this.ctx.currentTime, 0.1);
    }
  }
  setVolume(v) { if (this.master) this.master.gain.setTargetAtTime(v * v, this.ctx.currentTime, 0.03); }

  setHeadphoneProfile(on) {
    this.hpProfile = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.eqLow.gain.setTargetAtTime(on ? -1.5 : 0, t, 0.1);
    this.eqPres.gain.setTargetAtTime(on ? -1.0 : 0, t, 0.1);
    this.eqAir.gain.setTargetAtTime(on ? 1.5 : 0, t, 0.1);
  }

  /* Per-frame position updates for whichever spatial mode is live. */
  _step(dt) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    dt = Math.min(dt, 0.1);
    const t = this.ctx.currentTime;
    const set = (param, v) => param.setTargetAtTime(v, t, 0.045);
    this.sources.length = 0;

    if (this.mode === 'orbit') {
      // 0.02 .. 0.28 revolutions per second
      this._angle += dt * (0.02 + this.motion * 0.26) * 2 * Math.PI;
      const r = 1.5 * this.intensity;
      const x = Math.sin(this._angle) * r;
      const z = -Math.cos(this._angle) * r;
      const y = Math.sin(this._angle * 0.5) * 0.45 * this.intensity;
      set(this.orbitPanner.positionX, x);
      set(this.orbitPanner.positionY, y);
      set(this.orbitPanner.positionZ, z);
      this.sources.push({ x, y, z, label: '♪' });
    } else if (this.mode === 'reality') {
      // slow rotation of the whole object field + per-object drift
      this._angle += dt * (this.motion * 0.10) * 2 * Math.PI;
      for (const b of this.bands) {
        b.phase += dt * b.dSpd * 2 * Math.PI;
        const az = b.az + this._angle + Math.sin(b.phase) * b.dSize;
        const el = b.el + Math.cos(b.phase * 0.8) * b.dSize * 0.5;
        const r = b.dist * this.intensity;
        const x = Math.sin(az) * Math.cos(el) * r;
        const y = Math.sin(el) * r;
        const z = -Math.cos(az) * Math.cos(el) * r;
        set(b.panner.positionX, x);
        set(b.panner.positionY, y);
        set(b.panner.positionZ, z);
        this.sources.push({ x, y, z, label: b.label });
      }
    }
  }

  /* Frequency data for the visualizer (empty array before first play). */
  fft() {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this._fft);
    return this._fft;
  }
}
