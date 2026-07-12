/* ============================================================
 * Orbit 360 — binaural spatial audio engine, v2
 *
 * Architecture modeled on how production spatializers (Apple
 * Spatialize Stereo, Sony's headphone renderer, Dolby Headphone)
 * actually work — tuned for clarity, not effect:
 *
 *  - Virtual-speaker rendering: the stereo mix stays intact; L and
 *    R feed two HRTF sources placed around the head with ZERO
 *    distance rolloff, so nothing gets quieter or duller.
 *  - Bass anchor: everything below ~115 Hz bypasses the panners
 *    (an LR4-style crossover), because spatialized bass just loses
 *    punch — every serious renderer keeps low end centered.
 *  - Timbre correction: HRTF filtering steals presence and air, so
 *    a presence peak + high shelf after the panners pays it back.
 *  - Externalization: a short, band-limited room reverb at a low
 *    mix level pushes the image out of the head without mud.
 *  - Safety limiter on the master so makeup gain can never clip.
 *
 * Modes:
 *  - studio:  hi-fi virtual speakers at ±~30°, still image.
 *  - concert: wide stage (±~48°) + elevated, delayed rear ambience
 *             pair and more room — center-of-the-venue feel.
 *  - orbit:   the whole (still stereo!) stage revolves around the
 *             head — the "8D" mode, now without the muffle.
 * ============================================================ */

class SpatialEngine {
  constructor(audioEl) {
    this.el = audioEl;
    this.ctx = null;
    this.mode = 'off';          // 'off' | 'studio' | 'concert' | 'orbit'
    this.speed = 0.35;          // 0..1 — orbit rate / concert drift
    this.depth = 0.65;          // 0..1 — stage width, room, ambience
    this._t = 0;
    this._raf = 0;
    this._lastFrame = 0;
    this.objects = [];          // positions for the visualizer
    this.corsBroken = false;
    this.onCorsBroken = null;
  }

  /* Build the graph — call from a user gesture. */
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = this.ctx = new AC();

    this.source = ctx.createMediaElementSource(this.el);

    // master → analyser → safety limiter → out
    this.master = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.5;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.master.connect(this.analyser);
    this.analyser.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    // Bypass path (360 off) — bit-transparent apart from the limiter.
    this.directGain = ctx.createGain();
    this.source.connect(this.directGain);
    this.directGain.connect(this.master);

    // Spatial input bus.
    this.spatialIn = ctx.createGain();
    this.spatialIn.gain.value = 0;
    this.source.connect(this.spatialIn);

    const bq = (type, freq, opts = {}) => {
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq;
      if (opts.q != null) f.Q.value = opts.q;
      if (opts.gain != null) f.gain.value = opts.gain;
      return f;
    };

    // ---- bass anchor: LR4-ish lowpass, un-spatialized, keeps punch ----
    const XOVER = 115;
    const lp1 = bq('lowpass', XOVER), lp2 = bq('lowpass', XOVER);
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 1.05;
    this.spatialIn.connect(lp1); lp1.connect(lp2); lp2.connect(this.subGain);
    this.subGain.connect(this.master);

    // ---- main band: everything above the crossover, stereo preserved ----
    const hp1 = bq('highpass', XOVER), hp2 = bq('highpass', XOVER);
    this.bandIn = ctx.createGain();
    this.spatialIn.connect(hp1); hp1.connect(hp2); hp2.connect(this.bandIn);

    const split = ctx.createChannelSplitter(2);
    this.bandIn.connect(split);

    const mkPanner = () => {
      const p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = 1;
      p.rolloffFactor = 0;      // constant loudness anywhere on the sphere
      return p;
    };
    this.pannerL = mkPanner();
    this.pannerR = mkPanner();
    split.connect(this.pannerL, 0);
    split.connect(this.pannerR, 1);

    this.spatialSum = ctx.createGain();
    this.pannerL.connect(this.spatialSum);
    this.pannerR.connect(this.spatialSum);

    // ---- rear ambience pair (concert): delayed, decorrelated, elevated ----
    this.ambGain = ctx.createGain();
    this.ambGain.gain.value = 0;
    this.bandIn.connect(this.ambGain);
    const dL = ctx.createDelay(0.1); dL.delayTime.value = 0.017;
    const dR = ctx.createDelay(0.1); dR.delayTime.value = 0.023;
    this.pannerRearL = mkPanner();
    this.pannerRearR = mkPanner();
    this.ambGain.connect(dL); dL.connect(this.pannerRearL);
    this.ambGain.connect(dR); dR.connect(this.pannerRearR);
    this.pannerRearL.connect(this.spatialSum);
    this.pannerRearR.connect(this.spatialSum);

    // ---- timbre correction + makeup: repay what HRTF filtering takes ----
    const presence = bq('peaking', 2500, { q: 1, gain: 2 });
    const air = bq('highshelf', 6500, { gain: 3.5 });
    this.makeup = ctx.createGain();
    this.makeup.gain.value = 1.25;
    this.spatialSum.connect(presence); presence.connect(air); air.connect(this.makeup);
    this.makeup.connect(this.master);

    // ---- externalization reverb: short, band-limited, low mix ----
    this.revSend = ctx.createGain();
    this.revSend.gain.value = 0;
    const revHP = bq('highpass', 240), revLP = bq('lowpass', 6200);
    const conv = ctx.createConvolver();
    conv.buffer = this._makeImpulse(1.25, 2.6);
    const revReturn = ctx.createGain();
    revReturn.gain.value = 0.8;
    this.bandIn.connect(this.revSend);
    this.revSend.connect(revHP); revHP.connect(revLP); revLP.connect(conv);
    conv.connect(revReturn); revReturn.connect(this.master);

    const L = ctx.listener;
    if (L.forwardX) {
      L.forwardX.value = 0; L.forwardY.value = 0; L.forwardZ.value = -1;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else if (L.setOrientation) {
      L.setOrientation(0, 0, -1, 0, 1, 0);
    }
    return true;
  }

  _makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  _setPos(p, az, el, smooth = 0.05) {
    // az: radians from straight ahead (+ = right); el: radians up. r = 1.
    const x = Math.sin(az) * Math.cos(el);
    const z = -Math.cos(az) * Math.cos(el);
    const y = Math.sin(el);
    const t = this.ctx.currentTime;
    if (p.positionX) {
      p.positionX.setTargetAtTime(x, t, smooth);
      p.positionY.setTargetAtTime(y, t, smooth);
      p.positionZ.setTargetAtTime(z, t, smooth);
    } else {
      p.setPosition(x, y, z);
    }
    return { x, y, z };
  }

  /* Per-mode targets. Depth widens the stage and opens the room. */
  _params() {
    const d = this.depth;
    switch (this.mode) {
      case 'studio':  return { width: (22 + 18 * d) * Math.PI / 180, amb: 0,            rev: 0.06 + 0.06 * d };
      case 'concert': return { width: (34 + 24 * d) * Math.PI / 180, amb: 0.18 + 0.16 * d, rev: 0.12 + 0.09 * d };
      case 'orbit':   return { width: 26 * Math.PI / 180,            amb: 0.10 * d,     rev: 0.09 + 0.07 * d };
      default:        return { width: 0, amb: 0, rev: 0 };
    }
  }

  _applyGains() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = (param, v) => {
      param.cancelScheduledValues(t);
      param.setTargetAtTime(v, t, 0.08);
    };
    const off = this.mode === 'off';
    const p = this._params();
    ramp(this.directGain.gain, off ? 1 : 0);
    ramp(this.spatialIn.gain, off ? 0 : 1);
    ramp(this.ambGain.gain, p.amb);
    ramp(this.revSend.gain, p.rev);
  }

  setMode(mode) {
    if (!this.ctx) return;
    this.mode = mode;
    this._applyGains();
    if (mode === 'off') {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      this.objects = [];
    } else if (!this._raf) {
      this._lastFrame = performance.now();
      this._raf = requestAnimationFrame((ts) => this._frame(ts));
    }
  }

  setSpeed(v) { this.speed = v; }
  setDepth(v) { this.depth = v; this._applyGains(); }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _frame(ts) {
    const dt = Math.min((ts - this._lastFrame) / 1000, 0.1);
    this._lastFrame = ts;
    this._t += dt;

    const { width } = this._params();
    const out = [];
    let azL, azR, el = 0;

    if (this.mode === 'orbit') {
      const ang = this._t * (0.25 + this.speed * 1.15);
      azL = ang - width; azR = ang + width;
      el = Math.sin(this._t * 0.37) * 0.30 * this.depth;
    } else {
      // studio: still; concert: a slow ±3° breathing drift scaled by Motion
      const drift = this.mode === 'concert'
        ? Math.sin(this._t * (0.1 + this.speed * 0.5)) * (3 * Math.PI / 180) * this.speed
        : 0;
      azL = -width + drift; azR = width + drift;
      el = this.mode === 'concert' ? 0.06 : 0;
    }

    const l = this._setPos(this.pannerL, azL, el, 0.04);
    const r = this._setPos(this.pannerR, azR, el, 0.04);
    out.push({ ...l, main: true }, { ...r, main: true });

    if (this.ambGain.gain.value > 0.02) {
      const sway = Math.sin(this._t * 0.22) * 0.10;
      const rl = this._setPos(this.pannerRearL, Math.PI * 0.75 + sway, 0.45, 0.1);
      const rr = this._setPos(this.pannerRearR, -Math.PI * 0.75 + sway, 0.45, 0.1);
      out.push({ ...rl, main: false }, { ...rr, main: false });
    }
    this.objects = out;

    if (this.mode !== 'off') {
      this._raf = requestAnimationFrame((t2) => this._frame(t2));
    }
  }

  /* CORS taint → the graph outputs pure silence; detect and report. */
  checkSilence() {
    if (!this.ctx || this.corsBroken || this.el.paused) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let tries = 0;
    const probe = () => {
      if (this.el.paused || this.corsBroken) return;
      this.analyser.getByteFrequencyData(data);
      if (data.some((v) => v > 0)) return;
      if (++tries < 10) { setTimeout(probe, 250); return; }
      this.corsBroken = true;
      if (this.onCorsBroken) this.onCorsBroken(this);
    };
    setTimeout(probe, 600);
  }

  getLevels(bins = 24) {
    if (!this.ctx) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const out = new Array(bins).fill(0);
    const step = Math.floor(data.length / bins) || 1;
    for (let i = 0; i < bins; i++) {
      let s = 0;
      for (let j = 0; j < step; j++) s += data[i * step + j] || 0;
      out[i] = s / step / 255;
    }
    return out;
  }
}

window.SpatialEngine = SpatialEngine;
