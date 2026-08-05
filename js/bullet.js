import { GAME } from './constants.js';

/**
 * Reusable inactive-object store used by every high-frequency entity system.
 */
export class Pool {
  constructor(factory, max) {
    this.factory = factory;
    this.max = max;
    this.items = [];
  }

  /** Activates and returns a reusable object, or null if the cap is reached. */
  get() {
    for (const item of this.items) {
      if (!item.active) {
        item.active = true;
        return item;
      }
    }
    if (this.items.length >= this.max) return null;
    const item = this.factory();
    item.active = true;
    this.items.push(item);
    return item;
  }

  /** Returns an object to the pool. */
  release(item) { if (item) item.active = false; }

  /** Makes all retained objects inactive without allocating replacements. */
  clear() { for (const item of this.items) item.active = false; }
}

class Bullet {
  constructor() {
    this.active = false;
    this.x = this.y = 0;
    this.vx = this.vy = 0;
    this.w = this.h = 8;
    this.damage = 0;
    this.team = 'player';
    this.type = 'blaster';
    this.color = '#ffffff';
    this.life = 3;
  }

  reset(options) {
    Object.assign(this, options);
    this.active = true;
    return this;
  }

  update(dt, width, height) {
    if (!this.active) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    const margin = 90;
    if (this.life <= 0 || this.x < -margin || this.x > width + margin || this.y < -margin || this.y > height + margin) {
      this.active = false;
    }
  }

  getBounds() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  render(ctx) {
    if (this.type === 'laser') {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(this.x - this.w / 2, this.y);
      ctx.lineTo(this.x + this.w / 2, this.y);
      ctx.stroke();
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = '#fff6ff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.team === 'player' ? 12 : 9;
    if (this.type === 'enemyOrb') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    }
    ctx.restore();
  }
}

/**
 * Owns the capped projectile pool and all projectile presentation behavior.
 */
export default class BulletPool {
  constructor(max = GAME.MAX_BULLETS) {
    this.pool = new Pool(() => new Bullet(), max);
  }

  /** Fires a standard moving projectile. */
  fire(options) {
    const bullet = this.pool.get();
    return bullet ? bullet.reset({ life: 3, w: 9, h: 5, type: 'blaster', ...options }) : null;
  }

  /** Refreshes the single laser hitbox instead of allocating every frame. */
  fireLaser(x, y, width, damage, color) {
    let laser = this.pool.items.find((item) => item.active && item.type === 'laser' && item.team === 'player');
    if (!laser) laser = this.pool.get();
    return laser?.reset({
      x: x + width / 2,
      y,
      vx: 0,
      vy: 0,
      w: width,
      h: 13,
      damage,
      team: 'player',
      type: 'laser',
      color,
      life: 0.06,
    }) || null;
  }

  /** Advances active bullets and returns expired objects to their pool. */
  update(dt, width, height) {
    for (const bullet of this.pool.items) bullet.update(dt, width, height);
  }

  /** Draws all active projectiles. */
  render(ctx) {
    for (const bullet of this.pool.items) if (bullet.active) bullet.render(ctx);
  }

  /** Deactivates one projectile after an impact. */
  release(bullet) { this.pool.release(bullet); }

  /** Clears all retained projectiles between sessions. */
  clear() { this.pool.clear(); }
}
