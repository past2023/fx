// File: js/Sound.js
/**
 * Web Audio SFX — 100% procedurally generated, zero asset files.
 * Exported as a singleton so any module can just `sfx.play('shoot')`.
 *
 * The AudioContext is created lazily on the first user gesture, which is
 * what browsers require for autoplay policy compliance.
 */

import { clamp } from '#game/config.js';

class SoundEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.5;
    this._musicTimer = 0;
    this._step = 0;
    this._musicOn = false;
  }

  /** Create/resume the AudioContext. Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      // Gentle limiter so stacked explosions don't clip.
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 12;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** @returns {boolean} new muted state */
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    return this.muted;
  }

  /* --------------------- low-level voices --------------------- */

  /**
   * A single oscillator blip with an exponential decay envelope.
   * @param {object} o
   */
  tone({ freq = 440, freq2 = null, type = 'square', dur = 0.12, gain = 0.2, delay = 0, sweepType = 'exp' }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freq2 !== null) {
      if (sweepType === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(Math.max(20, freq2), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered white-noise burst — explosions, splashes, hits. */
  noise({ dur = 0.3, gain = 0.25, from = 1800, to = 120, q = 1.2, delay = 0, type = 'lowpass' }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(from, t0);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t0);
  }

  /* --------------------- named SFX --------------------- */

  /**
   * Play a named effect.
   * @param {string} name
   * @param {number} [v] variation parameter (e.g. combo tier)
   */
  play(name, v = 0) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'shoot':
        this.tone({ freq: 900, freq2: 320, type: 'square', dur: 0.06, gain: 0.055 });
        this.noise({ dur: 0.05, gain: 0.035, from: 3200, to: 800 });
        break;
      case 'spreadShoot':
        this.tone({ freq: 1150, freq2: 380, type: 'square', dur: 0.07, gain: 0.05 });
        this.tone({ freq: 700, freq2: 260, type: 'sawtooth', dur: 0.07, gain: 0.03 });
        break;
      case 'missile':
        this.tone({ freq: 180, freq2: 900, type: 'sawtooth', dur: 0.35, gain: 0.12 });
        this.noise({ dur: 0.4, gain: 0.12, from: 500, to: 3000, type: 'bandpass', q: 2 });
        break;
      case 'hit':
        this.tone({ freq: 420, freq2: 180, type: 'square', dur: 0.05, gain: 0.05 });
        break;
      case 'explode':
        this.noise({ dur: 0.5, gain: 0.3, from: 1400, to: 70 });
        this.tone({ freq: 140, freq2: 40, type: 'triangle', dur: 0.45, gain: 0.18 });
        break;
      case 'bigExplode':
        this.noise({ dur: 1.1, gain: 0.42, from: 900, to: 40 });
        this.tone({ freq: 90, freq2: 28, type: 'sawtooth', dur: 0.9, gain: 0.26 });
        for (let i = 0; i < 5; i++) {
          this.noise({ dur: 0.4, gain: 0.2, from: 1200, to: 60, delay: 0.12 * i + Math.random() * 0.08 });
        }
        break;
      case 'playerHit':
        this.tone({ freq: 300, freq2: 60, type: 'sawtooth', dur: 0.5, gain: 0.25 });
        this.noise({ dur: 0.5, gain: 0.28, from: 900, to: 60 });
        break;
      case 'pickup': {
        const base = 620;
        this.tone({ freq: base, dur: 0.07, gain: 0.13, type: 'square' });
        this.tone({ freq: base * 1.5, dur: 0.07, gain: 0.12, type: 'square', delay: 0.07 });
        this.tone({ freq: base * 2, dur: 0.12, gain: 0.11, type: 'square', delay: 0.14 });
        break;
      }
      case 'combo': {
        const tier = clamp(v, 0, 5);
        this.tone({ freq: 520 * Math.pow(1.26, tier), dur: 0.1, gain: 0.11, type: 'triangle' });
        this.tone({ freq: 780 * Math.pow(1.26, tier), dur: 0.12, gain: 0.09, type: 'triangle', delay: 0.05 });
        break;
      }
      case 'boost':
        this.noise({ dur: 0.28, gain: 0.11, from: 300, to: 2200, type: 'bandpass', q: 1.6 });
        break;
      case 'wave':
        [0, 0.12, 0.24].forEach((d, i) =>
          this.tone({ freq: 330 * (i + 1), dur: 0.18, gain: 0.11, type: 'square', delay: d }));
        break;
      case 'bossWarn':
        this.tone({ freq: 120, freq2: 240, type: 'sawtooth', dur: 0.6, gain: 0.18, sweepType: 'lin' });
        this.tone({ freq: 90, freq2: 180, type: 'square', dur: 0.6, gain: 0.1, delay: 0.7, sweepType: 'lin' });
        break;
      case 'gameOver':
        [660, 520, 400, 300, 190].forEach((f, i) =>
          this.tone({ freq: f, freq2: f * 0.72, dur: 0.3, gain: 0.16, type: 'square', delay: i * 0.17 }));
        break;
      case 'start':
        [440, 660, 880, 1320].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.11, gain: 0.14, type: 'square', delay: i * 0.07 }));
        break;
      case 'token':
        this.tone({ freq: 1200, dur: 0.05, gain: 0.08, type: 'square' });
        this.tone({ freq: 1800, dur: 0.06, gain: 0.06, type: 'square', delay: 0.04 });
        break;
      case 'powerup':
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.1, gain: 0.13, type: 'square', delay: i * 0.05 }));
        break;
      case 'rescue':
        [784, 988, 1175].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.13, gain: 0.12, type: 'triangle', delay: i * 0.06 }));
        this.noise({ dur: 0.2, gain: 0.06, from: 2400, to: 900, type: 'bandpass', q: 1.2 });
        break;
      case 'checkpoint':
        this.tone({ freq: 880, dur: 0.08, gain: 0.11, type: 'square' });
        this.tone({ freq: 1320, dur: 0.12, gain: 0.1, type: 'square', delay: 0.07 });
        break;
      case 'victory':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.22, gain: 0.15, type: 'square', delay: i * 0.16 }));
        break;
      case 'ui':
        this.tone({ freq: 880, dur: 0.05, gain: 0.08, type: 'square' });
        break;
      case 'thud':
        this.tone({ freq: 200, freq2: 50, type: 'triangle', dur: 0.2, gain: 0.16 });
        this.noise({ dur: 0.2, gain: 0.12, from: 700, to: 80 });
        break;
      case 'splash':
        this.noise({ dur: 0.35, gain: 0.14, from: 2600, to: 400, type: 'bandpass', q: 0.8 });
        break;
      case 'empty':
        this.tone({ freq: 150, dur: 0.05, gain: 0.05, type: 'square' });
        break;
      default: break;
    }
  }

  /* --------------------- background pulse --------------------- */

  /** Enable/disable the driving bass sequence. */
  setMusic(on) { this._musicOn = on; this._step = 0; this._musicTimer = 0; }

  /**
   * Advance the 8-step arpeggiated bassline. Called from the game loop.
   * @param {number} dt
   * @param {number} [intensity] 0..1 — rises with wave number
   */
  updateMusic(dt, intensity = 0) {
    if (!this._musicOn || !this.ctx || this.muted) return;
    const bpm = 128 + intensity * 34;
    const stepDur = 60 / bpm / 2;
    this._musicTimer -= dt;
    if (this._musicTimer > 0) return;
    this._musicTimer += stepDur;

    const root = [55, 55, 62, 49][(this._step >> 3) & 3];
    const patt = [1, 0, 1, 1, 0, 1, 0, 1];
    const s = this._step & 7;
    if (patt[s]) {
      this.tone({ freq: root * (s === 6 ? 1.5 : 1), type: 'sawtooth', dur: stepDur * 0.9, gain: 0.055 + intensity * 0.02 });
    }
    if (s % 4 === 0) this.noise({ dur: 0.08, gain: 0.05, from: 220, to: 60 });        // kick
    if (s % 4 === 2) this.noise({ dur: 0.05, gain: 0.03, from: 6000, to: 3000, type: 'highpass' }); // hat
    if (intensity > 0.35 && (s === 3 || s === 7)) {
      this.tone({ freq: root * 4, type: 'square', dur: stepDur * 0.5, gain: 0.03 });
    }
    this._step++;
  }
}

/** Singleton sound engine. */
export const sfx = new SoundEngine();
