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
    this.kind = 'orb';
    this.drag = 1.8;
    this.grow = 0;
  }

  reset(x, y, vx, vy, life, size, color, options = {}) {
    this.active = true;
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = this.maxLife = life;
    this.size = size;
    this.color = color;
    this.kind = options.kind || 'orb';
    this.drag = options.drag ?? 1.8;
    this.grow = options.grow ?? 0;
    return this;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) { this.active = false; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 1 - Math.min(0.95, this.drag * dt);
    this.vy *= 1 - Math.min(0.95, this.drag * dt);
  }
}

/**
 * Capped particle pool for engine trails, weapon fire, impacts and destruction bursts.
 */
export default class ParticleSystem {
  constructor(max = GAME.MAX_PARTICLES) {
    this.pool = new Pool(() => new Particle(), max);
  }

  _spawn(x, y, vx, vy, life, size, color, options) {
    const particle = this.pool.get();
    return particle?.reset(x, y, vx, vy, life, size, color, options) || null;
  }

  /** Emits a tiny fading engine plume. */
  trail(x, y, color) {
    const spread = (Math.random() - 0.5) * 12;
    this._spawn(x, y + spread, -45 - Math.random() * 45, spread * 0.6, 0.25 + Math.random() * 0.16, 2 + Math.random() * 2, color, { drag: 2.4 });
  }

  /** Adds a bright muzzle bloom and directional ion sparks for a weapon discharge. */
  muzzle(x, y, color, intensity = 1) {
    this._spawn(x, y, -35 * intensity, 0, 0.12, 7 * intensity, '#ffffff', { kind: 'ring', grow: 28 * intensity, drag: 0 });
    for (let i = 0; i < 3; i += 1) {
      const angle = (Math.random() - 0.5) * 0.72;
      const speed = (90 + Math.random() * 110) * intensity;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.12 + Math.random() * 0.09, 2 + Math.random() * 2, color, { kind: 'spark', drag: 3.5 });
    }
  }

  /** Emits thin electrical motes at the laser emitter without creating a full burst. */
  laserMuzzle(x, y, color) {
    for (let i = 0; i < 2; i += 1) {
      const offset = (Math.random() - 0.5) * 13;
      this._spawn(x + Math.random() * 14, y + offset, 45 + Math.random() * 100, offset * 2, 0.1 + Math.random() * 0.08, 1.2 + Math.random() * 1.6, color, { kind: 'spark', drag: 4 });
    }
  }

  /** Emits a compact hit-spark cluster. */
  sparks(x, y, color = '#fff5a5', count = 5) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 120;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.15 + Math.random() * 0.2, 1.5 + Math.random() * 2, color, { kind: 'spark', drag: 3 });
    }
  }

  /** Emits a configurable, layered destruction burst with an expanding shock ring. */
  explosion(x, y, color = '#ff765f', count = 24, scale = 1) {
    this._spawn(x, y, 0, 0, 0.32 + scale * 0.08, 8 * scale, color, { kind: 'ring', grow: 140 * scale, drag: 0 });
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
        { kind: i % 3 === 0 ? 'spark' : 'orb', drag: 1.45 },
      );
    }
  }

  /** A small celebratory flare used when currency is pulled into the ship. */
  coinCollect(x, y) {
    this._spawn(x, y, 0, 0, 0.22, 5, '#ffd34d', { kind: 'ring', grow: 45, drag: 0 });
    this.sparks(x, y, '#fff2a6', 4);
  }

  /** Advances all live particles. */
  update(dt) { for (const particle of this.pool.items) particle.update(dt); }

  /** Draws additive fading particles, sparks and shockwaves in one pass. */
  render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const particle of this.pool.items) {
      if (!particle.active) continue;
      const ratio = particle.life / particle.maxLife;
      ctx.globalAlpha = Math.max(0, ratio);
      ctx.strokeStyle = particle.color;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.kind === 'ring' ? 11 : 7;
      if (particle.kind === 'ring') {
        const radius = particle.size + (1 - ratio) * particle.grow;
        ctx.lineWidth = Math.max(0.7, 2.3 * ratio);
        ctx.beginPath(); ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2); ctx.stroke();
      } else if (particle.kind === 'spark') {
        const length = Math.max(2, particle.size * 3.2 * ratio);
        const magnitude = Math.hypot(particle.vx, particle.vy) || 1;
        ctx.lineWidth = Math.max(0.7, particle.size * ratio * 0.75);
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx / magnitude * length, particle.y - particle.vy / magnitude * length);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, Math.max(0.35, particle.size * ratio), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Clears retained particles when restarting a run. */
  clear() { this.pool.clear(); }
}
