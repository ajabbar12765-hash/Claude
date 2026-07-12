/* ============================================================
 * Orbit 360 — binaural spatial audio engine
 *
 * Renders ordinary stereo tracks as 3D sound over any stereo
 * headphones using Web Audio HRTF panning, in the spirit of
 * Sony 360 Reality Audio's object-on-a-sphere model:
 *
 *  - "sphere" mode splits the signal into frequency-band
 *    "objects" (sub / body / voice / air / ambience) that sit at
 *    fixed points on a sphere around the listener and drift
 *    gently, plus a short pre-delayed rear ambience object and a
 *    synthesized room reverb for out-of-head externalization.
 *  - "orbit" mode sends the whole mix on a slow 3D orbit
 *    around the head (classic "8D audio").
 * ============================================================ */

class SpatialEngine {
  constructor(audioEl) {
    this.el = audioEl;
    this.ctx = null;
    this.mode = 'off';          // 'off' | 'sphere' | 'orbit'
    this.speed = 0.35;          // 0..1 motion speed
    this.depth = 0.65;          // 0..1 spatial depth / radius
    this._t = 0;                // animation clock (radians-ish)
    this._raf = 0;
    this._lastFrame = 0;
    this.objects = [];          // active spatial objects for the visualizer
    this.corsBroken = false;    // true when the source taints the graph
    this._silenceChecked = false;
    this.onCorsBroken = null;   // callback(engine)
  }

  /* Lazily build the graph — must be called from a user gesture. */
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();

    this.source = this.ctx.createMediaElementSource(this.el);

    this.master = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Direct (non-spatial) path, used when 360 is off.
    this.directGain = this.ctx.createGain();
    this.source.connect(this.directGain);
    this.directGain.connect(this.master);

    // Spatial input bus (fed to whichever mode is active).
    this.spatialIn = this.ctx.createGain();
    this.spatialIn.gain.value = 0;
    this.source.connect(this.spatialIn);

    // Room reverb for externalization (synthesized IR, low mix).
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._makeImpulse(1.6, 2.8);
    this.reverbSend = this.ctx.createGain();
    this.reverbSend.gain.value = 0;
    this.spatialIn.connect(this.reverbSend);
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.master);

    this._buildOrbit();
    this._buildSphere();

    const L = this.ctx.listener;
    if (L.forwardX) {
      L.forwardX.value = 0; L.forwardY.value = 0; L.forwardZ.value = -1;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else if (L.setOrientation) {
      L.setOrientation(0, 0, -1, 0, 1, 0);
    }
    return true;
  }

  _panner() {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 1;
    p.rolloffFactor = 0.9;
    return p;
  }

  _setPos(p, x, y, z, smooth = 0.05) {
    const t = this.ctx.currentTime;
    if (p.positionX) {
      p.positionX.setTargetAtTime(x, t, smooth);
      p.positionY.setTargetAtTime(y, t, smooth);
      p.positionZ.setTargetAtTime(z, t, smooth);
    } else {
      p.setPosition(x, y, z);
    }
  }

  /* -------- orbit mode: whole mix circles the head -------- */
  _buildOrbit() {
    this.orbitGain = this.ctx.createGain();
    this.orbitGain.gain.value = 0;
    this.orbitPanner = this._panner();
    this.spatialIn.connect(this.orbitGain);
    this.orbitGain.connect(this.orbitPanner);
    this.orbitPanner.connect(this.master);
  }

  /* -------- sphere mode: frequency-band objects on a sphere -------- */
  _buildSphere() {
    this.sphereGain = this.ctx.createGain();
    this.sphereGain.gain.value = 0;
    this.spatialIn.connect(this.sphereGain);

    const mk = (filters, gain, base) => {
      let node = this.sphereGain;
      for (const f of filters) { node.connect(f); node = f; }
      const g = this.ctx.createGain();
      g.gain.value = gain;
      const p = this._panner();
      node.connect(g); g.connect(p); p.connect(this.master);
      return { panner: p, base, phase: Math.random() * Math.PI * 2 };
    };
    const bq = (type, freq, q = 0.8) => {
      const f = this.ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      return f;
    };

    // Objects: [filters], gain, base position {az (rad, 0 = front), el (-1..1), r}
    this.sphereObjects = [
      // Sub bass — anchored front-center, barely moves (keeps punch).
      { ...mk([bq('lowpass', 130)], 1.15, { az: 0, el: -0.25, r: 1.1 }), drift: 0.06, label: 'sub' },
      // Body (drums / bass guitar) — behind the listener.
      { ...mk([bq('highpass', 130), bq('lowpass', 500)], 1.1, { az: Math.PI, el: -0.1, r: 1.9 }), drift: 0.5, label: 'body' },
      // Voice (mids) — front, slightly raised.
      { ...mk([bq('highpass', 500), bq('lowpass', 2800)], 1.05, { az: 0, el: 0.15, r: 1.6 }), drift: 0.35, label: 'voice' },
      // Air left / right — high frequencies above the shoulders, counter-drifting.
      { ...mk([bq('highpass', 2800)], 0.85, { az: -Math.PI / 2.4, el: 0.55, r: 1.8 }), drift: 1.0, label: 'airL' },
      { ...mk([bq('highpass', 2800)], 0.85, { az: Math.PI / 2.4, el: 0.55, r: 1.8 }), drift: -1.0, label: 'airR' },
    ];

    // Rear ambience: short pre-delay behind the head → envelopment.
    const delay = this.ctx.createDelay(0.1);
    delay.delayTime.value = 0.019;
    const ag = this.ctx.createGain();
    ag.gain.value = 0.32;
    const ap = this._panner();
    this.sphereGain.connect(delay); delay.connect(ag); ag.connect(ap); ap.connect(this.master);
    this.sphereObjects.push({ panner: ap, base: { az: Math.PI, el: 0.4, r: 2.6 }, phase: 1.3, drift: 0.22, label: 'amb' });
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

  /* -------- mode switching (click-free via gain ramps) -------- */
  setMode(mode) {
    if (!this.ctx) return;
    this.mode = mode;
    const t = this.ctx.currentTime;
    const ramp = (g, v) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(v, t, 0.08);
    };
    ramp(this.directGain, mode === 'off' ? 1 : 0);
    ramp(this.spatialIn, mode === 'off' ? 0 : 1);
    ramp(this.orbitGain, mode === 'orbit' ? 1 : 0);
    ramp(this.sphereGain, mode === 'sphere' ? 1 : 0);
    ramp(this.reverbSend, mode === 'off' ? 0 : 0.14 + this.depth * 0.1);

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
  setDepth(v) {
    this.depth = v;
    if (this.ctx && this.mode !== 'off') {
      this.reverbSend.gain.setTargetAtTime(0.14 + v * 0.1, this.ctx.currentTime, 0.1);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  /* -------- animation: move objects, expose positions for the visualizer -------- */
  _frame(ts) {
    const dt = Math.min((ts - this._lastFrame) / 1000, 0.1);
    this._lastFrame = ts;
    this._t += dt * (0.15 + this.speed * 1.1);

    const out = [];
    if (this.mode === 'orbit') {
      const r = 1.2 + this.depth * 1.8;
      const az = this._t;                       // full revolutions around the head
      const el = Math.sin(this._t * 0.43) * 0.5 * this.depth;
      const x = Math.sin(az) * r * Math.cos(el);
      const z = -Math.cos(az) * r * Math.cos(el);
      const y = Math.sin(el) * r;
      this._setPos(this.orbitPanner, x, y, z, 0.03);
      out.push({ x, z, y, main: true });
    } else if (this.mode === 'sphere') {
      for (const o of this.sphereObjects) {
        const wobble = Math.sin(this._t * 0.7 * Math.abs(o.drift) + o.phase) * 0.45 * Math.sign(o.drift || 1);
        const az = o.base.az + wobble * this.depth;
        const el = o.base.el + Math.sin(this._t * 0.5 + o.phase) * 0.12 * this.depth;
        const r = o.base.r * (0.75 + this.depth * 0.5);
        const x = Math.sin(az) * r * Math.cos(el);
        const z = -Math.cos(az) * r * Math.cos(el);
        const y = el * r;
        this._setPos(o.panner, x, y, z, 0.08);
        out.push({ x, z, y, main: o.label === 'voice' });
      }
    }
    this.objects = out;

    if (this.mode !== 'off') {
      this._raf = requestAnimationFrame((t2) => this._frame(t2));
    }
  }

  /* -------- CORS taint detection --------
   * If a media source doesn't send CORS headers the graph runs but
   * outputs pure silence. Detect that shortly after playback starts
   * so the app can fall back to plain playback. */
  checkSilence() {
    if (!this.ctx || this.corsBroken || this.el.paused) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let tries = 0;
    const probe = () => {
      if (this.el.paused || this.corsBroken) return;
      this.analyser.getByteFrequencyData(data);
      const alive = data.some((v) => v > 0);
      if (alive) return;                        // audio flowing — all good
      if (++tries < 10) { setTimeout(probe, 250); return; }
      this.corsBroken = true;
      if (this.onCorsBroken) this.onCorsBroken(this);
    };
    setTimeout(probe, 600);
  }

  /* Frequency data for the visualizer ring. */
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
