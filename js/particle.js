import { GAME } from './constants.js';
import { Pool } from './bullet.js';

class Particle {
  constructor() {
    this.active = false;
    this.x = this.y = 0;
    this.vx = this.vy = 0;
    this.life = this.maxLife = 0;
    this.size = 1;
    this.color = '#fff';
  }

  reset(x, y, vx, vy, life, size, color) {
    this.active = true;
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = this.maxLife = life;
    this.size = size;
    this.color = color;
    return this;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) { this.active = false; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 1 - Math.min(0.95, 1.8 * dt);
    this.vy *= 1 - Math.min(0.95, 1.8 * dt);
  }
}

/**
 * Capped particle pool for engine trails, impacts and large destruction bursts.
 */
export default class ParticleSystem {
  constructor(max = GAME.MAX_PARTICLES) {
    this.pool = new Pool(() => new Particle(), max);
  }

  _spawn(x, y, vx, vy, life, size, color) {
    const particle = this.pool.get();
    return particle?.reset(x, y, vx, vy, life, size, color) || null;
  }

  /** Emits a tiny fading engine plume. */
  trail(x, y, color) {
    const spread = (Math.random() - 0.5) * 12;
    this._spawn(x, y + spread, -45 - Math.random() * 45, spread * 0.6, 0.25 + Math.random() * 0.16, 2 + Math.random() * 2, color);
  }

  /** Emits a compact hit-spark cluster. */
  sparks(x, y, color = '#fff5a5', count = 5) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 120;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.15 + Math.random() * 0.2, 1.5 + Math.random() * 2, color);
    }
  }

  /** Emits a configurable radial destruction burst. */
  explosion(x, y, color = '#ff765f', count = 24, scale = 1) {
    const palette = [color, '#fff3c1', '#ffb347', '#ff5e78'];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (55 + Math.random() * 250) * scale;
      this._spawn(
        x + (Math.random() - 0.5) * 10 * scale,
        y + (Math.random() - 0.5) * 10 * scale,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.35 + Math.random() * 0.65,
        (2 + Math.random() * 4) * scale,
        palette[i % palette.length],
      );
    }
  }

  /** Advances all live particles. */
  update(dt) { for (const particle of this.pool.items) particle.update(dt); }

  /** Draws fading, shrinking particles in one compositing pass. */
  render(ctx) {
    ctx.save();
    for (const particle of this.pool.items) {
      if (!particle.active) continue;
      const ratio = particle.life / particle.maxLife;
      ctx.globalAlpha = Math.max(0, ratio);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, Math.max(0.35, particle.size * ratio), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Clears retained particles when restarting a run. */
  clear() { this.pool.clear(); }
}
