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
  constructor(max = GAME.MAX_PARTICLES, quality = 1) {
    this.pool = new Pool(() => new Particle(), max);
    this.quality = Math.max(.3, Math.min(1, quality));
  }

  /** Adjusts emission density without changing gameplay or collision behavior. */
  setQuality(quality) { this.quality = Math.max(.3, Math.min(1, quality)); }

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
    this._spawn(x, y, -35 * intensity, 0, 0.13, 7 * intensity, color, { kind: 'ring', grow: 34 * intensity, drag: 0 });
    this._spawn(x, y, 45 * intensity, 0, 0.11, 11 * intensity, '#ffffff', { kind: 'flare', drag: 4 });
    for (let i = 0, count = Math.max(2, Math.round(5 * this.quality)); i < count; i += 1) {
      const angle = (Math.random() - 0.5) * 0.94;
      const speed = (100 + Math.random() * 150) * intensity;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.12 + Math.random() * 0.1, 1.6 + Math.random() * 2.4, color, { kind: 'spark', drag: 3.6 });
    }
  }

  /** Emits thin electrical motes at the laser emitter without creating a full burst. */
  laserMuzzle(x, y, color) {
    this._spawn(x, y, 0, 0, 0.14, 6, color, { kind: 'ring', grow: 25, drag: 0 });
    this._spawn(x, y, 68, 0, 0.1, 9, '#ffffff', { kind: 'flare', drag: 5 });
    for (let i = 0, count = Math.max(2, Math.round(4 * this.quality)); i < count; i += 1) {
      const offset = (Math.random() - 0.5) * 16;
      this._spawn(x + Math.random() * 18, y + offset, 55 + Math.random() * 145, offset * 2, 0.1 + Math.random() * 0.08, 1.1 + Math.random() * 1.8, color, { kind: 'spark', drag: 4 });
    }
  }

  /** Places intermittent ion fragments along a sustained beam for a living energy effect. */
  laserBeam(x, y, width, color) {
    for (let index = 0, count = Math.max(1, Math.round(3 * this.quality)); index < count; index += 1) {
      const beamX = x + 20 + Math.random() * Math.max(20, width - 30);
      const offset = (Math.random() - 0.5) * 11;
      this._spawn(beamX, y + offset, 35 + Math.random() * 90, (Math.random() - .5) * 25, .075 + Math.random() * .055, 1 + Math.random() * 1.7, color, { kind: 'spark', drag: 5 });
    }
  }

  /** Emits a compact hit-spark cluster. */
  sparks(x, y, color = '#fff5a5', count = 5) {
    const emitCount = Math.max(1, Math.round(count * this.quality));
    for (let i = 0; i < emitCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 120;
      this._spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.15 + Math.random() * 0.2, 1.5 + Math.random() * 2, color, { kind: 'spark', drag: 3 });
    }
  }

  /** Emits a configurable, layered destruction burst with an expanding shock ring. */
  explosion(x, y, color = '#ff765f', count = 24, scale = 1) {
    this._spawn(x, y, 0, 0, 0.32 + scale * 0.08, 8 * scale, color, { kind: 'ring', grow: 140 * scale, drag: 0 });
    const palette = [color, '#fff3c1', '#ffb347', '#ff5e78'];
    const emitCount = Math.max(1, Math.round(count * this.quality));
    for (let i = 0; i < emitCount; i += 1) {
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

  /** A fiery pickup flare for a recovered full-blast charge. */
  bombCollect(x, y) {
    this._spawn(x, y, 0, 0, .3, 8, '#ff9a5b', { kind: 'ring', grow: 68, drag: 0 });
    this._spawn(x, y, 0, 0, .16, 15, '#fff2d0', { kind: 'flare', drag: 4 });
    this.sparks(x, y, '#ffd36d', 8);
  }

  /** Emits layered screen-scale shockwaves and a fiery core for the emergency Void Bomb. */
  bombBlast(x, y) {
    this._spawn(x, y, 0, 0, .55, 16, '#fff0bd', { kind: 'ring', grow: 330, drag: 0 });
    this._spawn(x, y, 0, 0, .72, 24, '#ff9b5a', { kind: 'ring', grow: 720, drag: 0 });
    this._spawn(x, y, 0, 0, .92, 34, '#ff5a5f', { kind: 'ring', grow: 1160, drag: 0 });
    this._spawn(x, y, 0, 0, .3, 38, '#ffffff', { kind: 'flare', drag: 3 });
    this.explosion(x, y, '#ff825c', 54, 1.65);
  }

  /** Advances all live particles. */
  update(dt) { for (const particle of this.pool.items) particle.update(dt); }

  /** Draws additive fading particles, sparks and shockwaves in one pass. */
  render(ctx, lowFX = false) {
    ctx.save();
    ctx.globalCompositeOperation = lowFX ? 'source-over' : 'lighter';
    let renderIndex = 0;
    for (const particle of this.pool.items) {
      if (!particle.active) continue;
      renderIndex += 1;
      if (lowFX && particle.kind === 'orb' && renderIndex % 2 === 0) continue;
      const ratio = particle.life / particle.maxLife;
      ctx.globalAlpha = Math.max(0, ratio);
      ctx.strokeStyle = particle.color;
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = lowFX ? 0 : particle.kind === 'ring' ? 11 : 7;
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
      } else if (particle.kind === 'flare') {
        const radius = Math.max(1, particle.size * (0.45 + ratio * 0.65));
        if (lowFX) {
          ctx.fillStyle = particle.color;
          ctx.beginPath(); ctx.arc(particle.x, particle.y, radius * .55, 0, Math.PI * 2); ctx.fill();
        } else {
          const flare = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius);
          flare.addColorStop(0, '#ffffff');
          flare.addColorStop(.3, particle.color);
          flare.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = flare;
          ctx.beginPath(); ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2); ctx.fill();
        }
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
