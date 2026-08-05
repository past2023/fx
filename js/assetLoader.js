/**
 * Lightweight asset boundary. Future image/audio files can populate these maps
 * without changing gameplay modules; procedural audio is used until then.
 */
export async function loadAssets() {
  const assets = { images: Object.create(null), sounds: Object.create(null) };
  console.info('[assets] Placeholder asset pack ready; procedural renderers and synth SFX active.');
  return assets;
}

/**
 * Hybrid audio facade. It plays supplied audio assets when available and otherwise
 * generates responsive arcade SFX/music with the browser's native Web Audio API.
 */
export default class AudioManager {
  /** @param {{sounds: Object}} assets */
  constructor(assets) {
    this.sounds = assets?.sounds || Object.create(null);
    this.music = null;
    this.context = null;
    this.master = null;
    this.musicNodes = [];
    this.musicName = '';
    this.lastSound = new Map();
    this.throttles = Object.freeze({
      menuMove: 0.04, blasterFire: 0.055, spreadFire: 0.08, pulseFire: 0.045,
      laserFire: 0.1, enemyHit: 0.05, coin: 0.035, bossHit: 0.06,
    });
  }

  _getContext() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    try {
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.context.destination);
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    } catch (error) {
      console.warn('[audio] Web Audio initialization failed; continuing without synth SFX.', error);
      return null;
    }
  }

  _allow(name, context) {
    const limit = this.throttles[name] || 0;
    const previous = this.lastSound.get(name) || -Infinity;
    if (context.currentTime - previous < limit) return false;
    this.lastSound.set(name, context.currentTime);
    return true;
  }

  _tone(context, frequency, duration, options = {}) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = options.filter ? context.createBiquadFilter() : null;
    const start = context.currentTime;
    const end = start + duration;
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), end);
    if (options.detune) oscillator.detune.value = options.detune;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.08, start + Math.min(.012, duration * .22));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(filter || gain);
    if (filter) {
      filter.type = options.filter.type || 'lowpass';
      filter.frequency.value = options.filter.frequency || 1800;
      filter.Q.value = options.filter.q || 0.8;
      filter.connect(gain);
    }
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(end + .025);
  }

  _noise(context, duration, volume = 0.06, frequency = 1600) {
    const sampleCount = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime;
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 0.7;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer; source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.start(start); source.stop(start + duration + .02);
  }

  _synthSound(name, context) {
    switch (name) {
      case 'menuMove': this._tone(context, 430, .055, { endFrequency: 680, type: 'triangle', volume: .045 }); break;
      case 'launch': this._tone(context, 85, .45, { endFrequency: 520, type: 'sawtooth', volume: .095, filter: { frequency: 1300 } }); this._noise(context, .16, .035, 720); break;
      case 'blasterFire': this._tone(context, 760, .09, { endFrequency: 230, type: 'square', volume: .055, filter: { frequency: 2300 } }); this._noise(context, .035, .018, 3600); break;
      case 'spreadFire': this._tone(context, 510, .12, { endFrequency: 145, type: 'sawtooth', volume: .06, filter: { frequency: 1800 } }); this._noise(context, .06, .024, 2800); break;
      case 'pulseFire': this._tone(context, 980, .065, { endFrequency: 420, type: 'square', volume: .042 }); break;
      case 'novaFire': this._tone(context, 170, .38, { endFrequency: 55, type: 'sine', volume: .105, filter: { frequency: 650 } }); this._noise(context, .12, .036, 520); break;
      case 'laserFire': this._tone(context, 260, .11, { endFrequency: 690, type: 'sawtooth', volume: .028, filter: { frequency: 2400 } }); break;
      case 'enemyHit': this._tone(context, 260, .055, { endFrequency: 120, type: 'triangle', volume: .026 }); break;
      case 'enemyExplosion': this._noise(context, .3, .1, 560); this._tone(context, 120, .24, { endFrequency: 38, type: 'sawtooth', volume: .07, filter: { frequency: 700 } }); break;
      case 'bomb': this._noise(context, .85, .19, 260); this._tone(context, 78, .82, { endFrequency: 16, type: 'sawtooth', volume: .17 }); break;
      case 'bombCollect': this._tone(context, 360, .26, { endFrequency: 1120, type: 'triangle', volume: .075 }); this._tone(context, 720, .18, { endFrequency: 1480, type: 'sine', volume: .035 }); break;
      case 'novaImpact': this._noise(context, .42, .12, 350); this._tone(context, 95, .36, { endFrequency: 32, type: 'sine', volume: .11 }); break;
      case 'bossFire': this._tone(context, 210, .16, { endFrequency: 95, type: 'sawtooth', volume: .065, filter: { frequency: 1100 } }); break;
      case 'bossHit': this._tone(context, 155, .14, { endFrequency: 80, type: 'sawtooth', volume: .06, filter: { frequency: 820 } }); break;
      case 'playerHit': this._noise(context, .16, .08, 1700); this._tone(context, 130, .18, { endFrequency: 70, type: 'square', volume: .05 }); break;
      case 'playerExplosion': this._noise(context, .55, .15, 420); this._tone(context, 90, .5, { endFrequency: 24, type: 'sawtooth', volume: .13 }); break;
      case 'powerup': this._tone(context, 420, .22, { endFrequency: 980, type: 'sine', volume: .07 }); break;
      case 'coin': this._tone(context, 1100, .11, { endFrequency: 1650, type: 'sine', volume: .045 }); break;
      case 'weaponSwitch': this._tone(context, 250, .12, { endFrequency: 760, type: 'triangle', volume: .052 }); break;
      case 'forgeOpen': this._tone(context, 140, .26, { endFrequency: 520, type: 'sine', volume: .055 }); break;
      case 'forgeClose': this._tone(context, 520, .16, { endFrequency: 180, type: 'triangle', volume: .04 }); break;
      case 'upgrade': this._tone(context, 330, .34, { endFrequency: 1280, type: 'sine', volume: .09 }); this._tone(context, 660, .25, { endFrequency: 1520, type: 'triangle', volume: .04 }); break;
      case 'upgradeDenied': this._tone(context, 180, .16, { endFrequency: 90, type: 'square', volume: .045 }); break;
      case 'bossArrival': this._noise(context, .45, .09, 240); this._tone(context, 54, .55, { endFrequency: 42, type: 'sawtooth', volume: .12 }); break;
      case 'bossPhase': this._noise(context, .26, .075, 760); this._tone(context, 220, .26, { endFrequency: 70, type: 'sawtooth', volume: .08 }); break;
      case 'bossExplosion': this._noise(context, .75, .17, 300); this._tone(context, 72, .72, { endFrequency: 18, type: 'sawtooth', volume: .16 }); break;
      case 'victory': this._tone(context, 440, .55, { endFrequency: 1320, type: 'sine', volume: .09 }); break;
      case 'gameOver': this._tone(context, 190, .52, { endFrequency: 35, type: 'triangle', volume: .08 }); break;
      default: this._tone(context, 440, .08, { endFrequency: 310, type: 'sine', volume: .035 });
    }
  }

  /** Unlocks procedural audio from a direct user gesture, satisfying autoplay policies. */
  unlock() { this._getContext(); }

  /** Plays a named one-shot asset or a responsive procedural fallback. */
  playSound(name) {
    const sound = this.sounds[name];
    if (sound?.cloneNode) {
      const voice = sound.cloneNode();
      voice.volume = sound.volume ?? 0.7;
      voice.play().catch(() => {});
      return;
    }
    const context = this._getContext();
    if (!context || !this._allow(name, context)) return;
    this._synthSound(name, context);
  }

  _startSynthMusic(name, context) {
    this._stopSynthMusic();
    const boss = name === 'boss';
    const root = boss ? 49 : 55;
    const oscillator = context.createOscillator();
    const harmony = context.createOscillator();
    const gain = context.createGain();
    const harmonicGain = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    oscillator.type = boss ? 'sawtooth' : 'triangle'; harmony.type = 'sine';
    oscillator.frequency.value = root; harmony.frequency.value = root * (boss ? 1.5 : 1.25);
    gain.gain.value = boss ? .026 : .018; harmonicGain.gain.value = boss ? .012 : .009;
    lfo.frequency.value = boss ? .32 : .16; lfoGain.gain.value = boss ? .018 : .012;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    oscillator.connect(gain); harmony.connect(harmonicGain); gain.connect(this.master); harmonicGain.connect(this.master);
    const now = context.currentTime;
    oscillator.start(now); harmony.start(now); lfo.start(now);
    this.musicNodes = [oscillator, harmony, lfo, gain, harmonicGain, lfoGain];
    this.musicName = name;
  }

  _stopSynthMusic() {
    for (const node of this.musicNodes) if (typeof node.stop === 'function') node.stop();
    this.musicNodes.length = 0;
    this.musicName = '';
  }

  /** Starts a supplied music track or a subtle procedural gameplay bed. */
  playMusic(name) {
    const track = this.sounds[name];
    if (track) {
      if (this.music === track) return;
      if (this.music?.pause) this.music.pause();
      this._stopSynthMusic();
      this.music = track;
      this.music.loop = true;
      this.music.play?.().catch(() => {});
      return;
    }
    const context = this._getContext();
    if (!context || this.musicName === name) return;
    this.music = null;
    this._startSynthMusic(name, context);
  }

  /** Stops supplied music and any generated synth bed. */
  stopMusic() {
    if (this.music?.pause) {
      this.music.pause();
      this.music.currentTime = 0;
    }
    this.music = null;
    this._stopSynthMusic();
  }
}
