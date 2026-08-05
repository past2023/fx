/**
 * Lightweight asset boundary. Replace the empty maps with asynchronously loaded
 * image/audio resources without changing any gameplay module.
 */
export async function loadAssets() {
  const assets = { images: Object.create(null), sounds: Object.create(null) };
  console.info('[assets] Placeholder asset pack ready; procedural renderers active.');
  return assets;
}

/**
 * Future-facing audio facade used by gameplay events. It is deliberately silent
 * until sound assets are registered in the loader.
 */
export default class AudioManager {
  /** @param {{sounds: Object}} assets */
  constructor(assets) {
    this.sounds = assets?.sounds || Object.create(null);
    this.music = null;
  }

  /** Plays a named one-shot sound when a future asset is available. */
  playSound(name) {
    const sound = this.sounds[name];
    if (sound?.cloneNode) {
      const voice = sound.cloneNode();
      voice.volume = sound.volume ?? 0.7;
      voice.play().catch(() => {});
    }
  }

  /** Starts a named music track when a future asset is available. */
  playMusic(name) {
    const track = this.sounds[name];
    if (!track || this.music === track) return;
    if (this.music?.pause) this.music.pause();
    this.music = track;
    this.music.loop = true;
    this.music.play?.().catch(() => {});
  }

  /** Stops currently active future music. */
  stopMusic() {
    if (this.music?.pause) {
      this.music.pause();
      this.music.currentTime = 0;
    }
    this.music = null;
  }
}
