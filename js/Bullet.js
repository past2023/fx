// File: js/Bullet.js
/**
 * Projectiles for both the player and enemies.
 *
 * A single pooled class covers three kinds:
 *  - 'gun'     straight tracer (player, fast)
 *  - 'enemy'   enemy plasma orb / bomb
 *  - 'missile' player homing missile (steers towards a target)
 */

import { GAME_W, GAME_H, COLORS, WEAPONS, angleDelta, clamp } from '#game/config.js';
import { px, glow } from '#game/Sprite.js';

export class Bullet {
  constructor() { this.dead = true; }

  /**
   * (Re)initialise a projectile.
   * @param {object} o
   * @param {number} o.x @param {number} o.y
   * @param {number} [o.vx] @param {number} [o.vy]
   * @param {'gun'|'enemy'|'missile'|'bomb'} [o.kind]
   * @param {number} [o.damage]
   * @param {string} [o.color]
   * @param {boolean} [o.friendly]
   */
  set(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx ?? 0; this.vy = o.vy ?? -WEAPONS.gunSpeed;
    this.kind = o.kind ?? 'gun';
    this.friendly = o.friendly ?? this.kind !== 'enemy';
    this.damage = o.damage ?? WEAPONS.gunDamage;
    this.color = o.color ?? (this.friendly ? COLORS.cyan : COLORS.red);
    this.life = o.life ?? 3;
    this.target = o.target ?? null;
    this.angle = Math.atan2(this.vy, this.vx);
    this.speed = Math.hypot(this.vx, this.vy) || WEAPONS.missileSpeed;
    this.age = 0;
    this.dead = false;
    this.trailTimer = 0;
    this.pierce = o.pierce ?? 0;

    switch (this.kind) {
      case 'missile': this.w = 8; this.h = 16; break;
      case 'bomb':    this.w = 12; this.h = 12; break;
      case 'enemy':   this.w = 9;  this.h = 9;  break;
      default:        this.w = 5;  this.h = 14; break;
    }
    return this;
  }

  /** @returns {{x:number,y:number,w:number,h:number}} */
  get body() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /**
   * @param {number} dt
   * @param {object} ctxObj shared refs
   * @param {Array} ctxObj.enemies for homing re-targeting
   * @param {import('#game/Particle.js').ParticleSystem} ctxObj.particles
   * @param {number} ctxObj.scroll world scroll speed
   */
  update(dt, { enemies, particles, scroll }) {
    this.age += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    if (this.kind === 'missile') {
      // Re-acquire the nearest live target if ours died.
      if (!this.target || this.target.dead) {
        let best = null, bd = Infinity;
        for (const e of enemies) {
          if (e.dead || e.y < -40) continue;
          const d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
          if (d < bd) { bd = d; best = e; }
        }
        this.target = best;
      }
      if (this.target) {
        const want = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        const turn = WEAPONS.missileTurn * dt * clamp(this.age * 3, 0.2, 1);
        this.angle += clamp(angleDelta(this.angle, want), -turn, turn);
      }
      this.speed = Math.min(this.speed + 320 * dt, WEAPONS.missileSpeed * 1.9);
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;

      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.014;
        particles.smoke(this.x - Math.cos(this.angle) * 8, this.y - Math.sin(this.angle) * 8);
      }
    } else if (this.kind === 'bomb') {
      this.vy += 210 * dt;      // arcing helicopter bomb
      this.angle += dt * 6;
    } else if (this.kind === 'gun') {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.03;
        particles.spawn({
          x: this.x, y: this.y + 6, life: 0.12, size: 3,
          color: this.color, drag: 3, vy: 60,
        });
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Enemy shots drift with the water for a touch of realism.
    if (!this.friendly) this.y += scroll * dt * 0.25;

    const m = 40;
    if (this.x < -m || this.x > GAME_W + m || this.y < -m || this.y > GAME_H + m) this.dead = true;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    switch (this.kind) {
      case 'missile': {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.rotate(this.angle + Math.PI / 2);
        glow(ctx, COLORS.magenta, 10, () => {
          px(ctx, -3, -8, 6, 12, COLORS.magenta);
          px(ctx, -2, -10, 4, 4, COLORS.white);
          px(ctx, -4, 2, 8, 3, COLORS.magentaDim);
          px(ctx, -2, 4, 4, 6, COLORS.yellow);
        });
        ctx.restore();
        break;
      }
      case 'bomb': {
        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.rotate(this.angle);
        px(ctx, -6, -6, 12, 12, COLORS.orange);
        px(ctx, -3, -3, 6, 6, COLORS.yellow);
        ctx.restore();
        break;
      }
      case 'enemy': {
        const p = 1 + Math.sin(this.age * 22) * 0.18;
        glow(ctx, COLORS.red, 8, () => {
          px(ctx, this.x - 5 * p, this.y - 5 * p, 10 * p, 10 * p, COLORS.red);
          px(ctx, this.x - 2, this.y - 2, 4, 4, COLORS.yellow);
        });
        break;
      }
      default: {
        glow(ctx, this.color, 8, () => {
          px(ctx, this.x - 2, this.y - 8, 4, 14, this.color);
          px(ctx, this.x - 1, this.y - 10, 2, 8, COLORS.white);
        });
      }
    }
  }
}

/**
 * Fixed-capacity bullet pool shared by the player and every enemy.
 */
export class BulletPool {
  /** @param {number} [cap] */
  constructor(cap = 320) {
    /** @type {Bullet[]} */
    this.items = Array.from({ length: cap }, () => new Bullet());
    this.cursor = 0;
  }

  /** Spawn (recycling the oldest slot if the pool is saturated). */
  spawn(o) {
    // Prefer a genuinely free slot.
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this.cursor + i) % this.items.length;
      if (this.items[idx].dead) {
        this.cursor = (idx + 1) % this.items.length;
        return this.items[idx].set(o);
      }
    }
    const b = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    return b.set(o);
  }

  /** Live bullets only — handy for collision sweeps. */
  get live() { return this.items.filter((b) => !b.dead); }

  update(dt, shared) { for (const b of this.items) if (!b.dead) b.update(dt, shared); }
  draw(ctx) { for (const b of this.items) if (!b.dead) b.draw(ctx); }
  clear() { for (const b of this.items) b.dead = true; }
}
