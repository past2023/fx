import { GAME, TUNING } from './constants.js';

/**
 * Player ship state, movement, survivability and procedural fallback drawing.
 */
export default class Player {
  constructor(ship) {
    this.configure(ship);
    this.x = 160;
    this.y = 360;
    this.w = 42;
    this.h = 34;
    this.fireTimer = 0;
    this.invincibility = 0;
    this.upgradeTimer = 0;
    this.heat = 0;
    this.laserLockout = 0;
    this.trailTimer = 0;
    this.alive = true;
  }

  /** Applies a selected hull to a fresh player ship. */
  configure(ship) {
    this.ship = ship;
    this.maxHp = ship.hp;
    this.hp = ship.hp;
    this.speed = ship.speed;
  }

  /** Places the player safely in the playable field. */
  place(width, height) {
    this.x = Math.min(width * 0.18, width - 50);
    this.y = height * 0.5;
  }

  /** Updates movement, timers and engine-trail cadence. */
  update(dt, input, width, height, particles) {
    if (!this.alive) return;
    let dx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    let dy = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    this.x = Math.max(this.w / 2, Math.min(width - this.w / 2, this.x + dx * this.speed * dt));
    this.y = Math.max(this.h / 2, Math.min(height - this.h / 2, this.y + dy * this.speed * dt));
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.invincibility = Math.max(0, this.invincibility - dt);
    this.upgradeTimer = Math.max(0, this.upgradeTimer - dt);
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer += TUNING.PLAYER.TRAIL_INTERVAL;
      particles.trail(this.x - this.w * 0.48, this.y, this.ship.color);
    }
  }

  /** Applies damage only when post-hit invulnerability has elapsed. */
  takeDamage(amount) {
    if (!this.alive || this.invincibility > 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibility = GAME.PLAYER_INVINCIBILITY;
    if (this.hp <= 0) this.alive = false;
    return true;
  }

  /** Restores hull integrity without exceeding the selected ship's maximum. */
  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }

  /** Enables or refreshes the timed weapon overcharge. */
  activateUpgrade() { this.upgradeTimer = Math.max(this.upgradeTimer, GAME.POWERUP_DURATION); }

  /** Returns the hull's axis-aligned collision bounds. */
  getBounds() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  /** Draws a sprite when supplied, otherwise a crisp neon hull polygon. */
  render(ctx, assets) {
    if (!this.alive || (this.invincibility > 0 && Math.floor(this.invincibility * 12) % 2 === 0)) return;
    const sprite = assets?.images?.[this.ship.id];
    if (sprite) {
      ctx.drawImage(sprite, this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = this.ship.color;
    ctx.shadowBlur = 15;
    const gradient = ctx.createLinearGradient(-22, 0, 22, 0);
    gradient.addColorStop(0, '#15234c');
    gradient.addColorStop(0.62, this.ship.color);
    gradient.addColorStop(1, this.ship.accent);
    ctx.fillStyle = gradient;
    ctx.strokeStyle = this.ship.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (this.ship.id === 'tank') {
      ctx.moveTo(-22, 0); ctx.lineTo(-12, -17); ctx.lineTo(13, -17); ctx.lineTo(23, 0);
      ctx.lineTo(13, 17); ctx.lineTo(-12, 17); ctx.closePath();
    } else if (this.ship.id === 'interceptor') {
      ctx.moveTo(-23, 0); ctx.lineTo(-8, -8); ctx.lineTo(4, -18); ctx.lineTo(24, 0);
      ctx.lineTo(4, 18); ctx.lineTo(-8, 8); ctx.closePath();
    } else {
      ctx.moveTo(-22, 0); ctx.lineTo(-7, -15); ctx.lineTo(24, 0); ctx.lineTo(-7, 15); ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#efffff';
    ctx.beginPath();
    ctx.arc(5, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
