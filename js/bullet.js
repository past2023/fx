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
    this.age = 0;
    this.splashRadius = 0;
    this.pierce = 0;
  }

  reset(options) {
    Object.assign(this, {
      life: 3,
      w: 9,
      h: 5,
      vx: 0,
      vy: 0,
      team: 'player',
      damage: 0,
      type: 'blaster',
      color: '#ffffff',
      splashRadius: 0,
      pierce: 0,
      age: 0,
    }, options);
    this.active = true;
    return this;
  }

  update(dt, width, height) {
    if (!this.active) return;
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    const margin = 110;
    if (this.life <= 0 || this.x < -margin || this.x > width + margin || this.y < -margin || this.y > height + margin) {
      this.active = false;
    }
  }

  getBounds() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  render(ctx) {
    if (this.type === 'laser') {
      this._renderLaser(ctx);
      return;
    }
    if (this.type === 'nova') {
      this._renderNova(ctx);
      return;
    }
    if (this.type === 'pulse') {
      this._renderPulse(ctx);
      return;
    }

    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.team === 'player' ? 15 : 10;
    if (this.type === 'enemyOrb') {
      const orb = ctx.createRadialGradient(this.x - 2, this.y - 2, 1, this.x, this.y, this.w / 2 + 2);
      orb.addColorStop(0, '#ffffff');
      orb.addColorStop(0.35, this.color);
      orb.addColorStop(1, 'rgba(255, 80, 160, 0)');
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.w / 2 + 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const tail = ctx.createLinearGradient(this.x - this.w * 1.5, this.y, this.x + this.w / 2, this.y);
      tail.addColorStop(0, 'rgba(255,255,255,0)');
      tail.addColorStop(0.68, this.color);
      tail.addColorStop(1, '#ffffff');
      ctx.fillStyle = tail;
      ctx.fillRect(this.x - this.w * 1.5, this.y - this.h / 2, this.w * 2, this.h);
    }
    ctx.restore();
  }

  _renderPulse(ctx) {
    const flicker = 1 + Math.sin(this.age * 30) * 0.16;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(flicker, flicker);
    ctx.shadowColor = this.color; ctx.shadowBlur = 18; ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-this.w, 0); ctx.lineTo(0, -this.h); ctx.lineTo(this.w, 0); ctx.lineTo(0, this.h); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#efffff';
    ctx.beginPath(); ctx.arc(1, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _renderNova(ctx) {
    const pulse = 1 + Math.sin(this.age * 11) * 0.13;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = this.color; ctx.shadowBlur = 25;
    ctx.strokeStyle = this.color; ctx.globalAlpha = 0.45; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, this.w * 0.78, 0, Math.PI * 2); ctx.stroke();
    const core = ctx.createRadialGradient(-2, -2, 1, 0, 0, this.w / 2);
    core.addColorStop(0, '#ffffff'); core.addColorStop(0.32, '#e1d4ff'); core.addColorStop(1, this.color);
    ctx.globalAlpha = 1; ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _renderLaser(ctx) {
    const left = this.x - this.w / 2;
    const right = this.x + this.w / 2;
    const pulse = 0.78 + Math.sin(this.age * 34) * 0.18;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 30;
    ctx.globalAlpha = 0.18 + pulse * 0.16;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 24;
    ctx.beginPath(); ctx.moveTo(left, this.y); ctx.lineTo(right, this.y); ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 7 + pulse * 2;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(left, this.y); ctx.lineTo(right, this.y); ctx.stroke();
    const core = ctx.createLinearGradient(left, this.y, right, this.y);
    core.addColorStop(0, '#ffe6fa'); core.addColorStop(0.4, '#ffffff'); core.addColorStop(1, '#ffbaf0');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = core;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(left, this.y); ctx.lineTo(right, this.y); ctx.stroke();
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
    return bullet ? bullet.reset(options) : null;
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
