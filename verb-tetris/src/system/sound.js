// ============================================================================
//  SYSTEM / SOUND (Efectos de sonido con Web Audio API)
//  ----------------------------------------------------------------------------
//  Genera todos los efectos de sonido (acierto, error, moneda, subida de nivel,
//  misión cumplida, clic) sin usar archivos externos: se sintetizan con
//  osciladores de la Web Audio API. Dispone de un botón de silencio (mute).
// ============================================================================

class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Crea el contexto de audio la primera vez que se usa (requiere gesto del
  // usuario, por eso se llama tras un clic).
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(m) {
    this.muted = !!m;
  }

  isMuted() {
    return this.muted;
  }

  // Tono base
  tone(freq, duration, type = 'sine', volume = 0.2, when = 0) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + when;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // Acierto: arpegio ascendente alegre
  correct() {
    this.tone(523, 0.12, 'triangle', 0.25);
    this.tone(659, 0.12, 'triangle', 0.25, 0.09);
    this.tone(784, 0.2, 'triangle', 0.28, 0.18);
  }

  // Bono por combo
  combo() {
    this.tone(523, 0.1, 'square', 0.15);
    this.tone(659, 0.1, 'square', 0.15, 0.07);
    this.tone(784, 0.1, 'square', 0.15, 0.14);
    this.tone(1046, 0.25, 'square', 0.2, 0.21);
  }

  // Error: zumbido grave
  wrong() {
    this.tone(180, 0.3, 'sawtooth', 0.22);
    this.tone(130, 0.35, 'sawtooth', 0.18, 0.05);
  }

  // Moneda
  coin() {
    this.tone(988, 0.08, 'sine', 0.2);
    this.tone(1319, 0.18, 'sine', 0.22, 0.07);
  }

  // Subida de nivel
  levelUp() {
    this.tone(440, 0.12, 'triangle', 0.25);
    this.tone(554, 0.12, 'triangle', 0.25, 0.1);
    this.tone(659, 0.12, 'triangle', 0.25, 0.2);
    this.tone(880, 0.3, 'triangle', 0.28, 0.3);
  }

  // Rotación / movimiento
  move() {
    this.tone(300, 0.04, 'square', 0.06);
  }

  // Bloqueo de pieza
  lock() {
    this.tone(200, 0.08, 'triangle', 0.12);
  }

  // Misión cumplida: fanfarria
  missionComplete() {
    this.tone(523, 0.15, 'triangle', 0.3);
    this.tone(659, 0.15, 'triangle', 0.3, 0.12);
    this.tone(784, 0.15, 'triangle', 0.3, 0.24);
    this.tone(1046, 0.4, 'triangle', 0.32, 0.36);
    this.tone(1319, 0.5, 'triangle', 0.3, 0.42);
  }

  // Fin de partida
  gameOver() {
    this.tone(330, 0.2, 'sawtooth', 0.2);
    this.tone(262, 0.2, 'sawtooth', 0.2, 0.2);
    this.tone(196, 0.4, 'sawtooth', 0.22, 0.4);
  }

  // Compra en la tienda
  buy() {
    this.tone(660, 0.1, 'sine', 0.2);
    this.tone(880, 0.15, 'sine', 0.2, 0.08);
    this.tone(1100, 0.2, 'sine', 0.2, 0.16);
  }

  // Clic genérico
  click() {
    this.tone(600, 0.05, 'triangle', 0.12);
  }
}

export const sound = new Sound();
