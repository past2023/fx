import { GAME, SHIP_UPGRADES, TUNING } from './constants.js';

/**
 * Player ship state, movement, survivability, live modular upgrades and procedural fallback drawing.
 */
export default class Player {
  constructor(ship, upgrades = {}) {
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
    this.configure(ship, upgrades);
  }

  /** Applies a selected hull and its persistent module levels to a fresh player ship. */
  configure(ship, upgrades = {}) {
    this.ship = ship;
    this._applyUpgradeStats(upgrades);
    this.hp = this.maxHp;
  }

  _applyUpgradeStats(upgrades) {
    const legacyLevel = typeof upgrades === 'number' ? upgrades : 0;
    this.upgrades = Object.fromEntries(SHIP_UPGRADES.map((module) => [module.id, Math.max(0, Number(upgrades?.[module.id] ?? legacyLevel) || 0)]));
    const hullLevel = this.upgrades.hull;
    const engineLevel = this.upgrades.engine;
    const fireLevel = this.upgrades.fire;
    const hullBonus = SHIP_UPGRADES.find((module) => module.id === 'hull').bonus;
    const engineBonus = SHIP_UPGRADES.find((module) => module.id === 'engine').bonus;
    const fireBonus = SHIP_UPGRADES.find((module) => module.id === 'fire').bonus;
    this.upgradeLevel = hullLevel + engineLevel + fireLevel;
    this.maxHp = Math.round(this.ship.hp * (1 + hullBonus * hullLevel));
    this.speed = Math.round(this.ship.speed * (1 + engineBonus * engineLevel));
    this.cooldownMultiplier = Math.max(0.55, 1 - fireBonus * fireLevel);
  }

  /** Applies a Field Forge purchase immediately while preserving current combat damage. */
  applyUpgrades(upgrades) {
    const oldMaxHp = this.maxHp;
    const oldHp = this.hp;
    this._applyUpgradeStats(upgrades);
    this.hp = Math.min(this.maxHp, oldHp + Math.max(0, this.maxHp - oldMaxHp));
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

  /** Draws a sprite when supplied, otherwise a detailed neon hull with live-upgrade accents. */
  render(ctx, assets) {
    if (!this.alive || (this.invincibility > 0 && Math.floor(this.invincibility * 12) % 2 === 0)) return;
    const sprite = assets?.images?.[this.ship.id];
    if (sprite) {
      ctx.drawImage(sprite, this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    const enginePulse = 0.72 + Math.sin(performance.now() * 0.018) * 0.18;
    ctx.shadowColor = this.ship.color;
    ctx.shadowBlur = 18;
    const flame = ctx.createLinearGradient(-44, 0, -13, 0);
    flame.addColorStop(0, 'rgba(90, 230, 255, 0)');
    flame.addColorStop(0.6, this.ship.color);
    flame.addColorStop(1, '#ffffff');
    ctx.fillStyle = flame;
    ctx.globalAlpha = enginePulse;
    ctx.beginPath(); ctx.moveTo(-39, 0); ctx.lineTo(-14, -7); ctx.lineTo(-17, 0); ctx.lineTo(-14, 7); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    const gradient = ctx.createLinearGradient(-22, 0, 22, 0);
    gradient.addColorStop(0, '#111a3b');
    gradient.addColorStop(0.42, '#263d75');
    gradient.addColorStop(0.72, this.ship.color);
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
    ctx.strokeStyle = 'rgba(236, 255, 255, .7)';
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.fillStyle = '#efffff';
    ctx.shadowColor = this.ship.accent; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(5, 0, 4, 0, Math.PI * 2); ctx.fill();

    if (this.upgradeLevel > 0) {
      ctx.shadowBlur = 0;
      for (let index = 0; index < Math.min(6, this.upgradeLevel); index += 1) {
        ctx.fillStyle = index < this.upgrades.hull ? '#64e7a0' : index < this.upgrades.hull + this.upgrades.engine ? '#66d8ff' : '#ffb86b';
        ctx.fillRect(-12 + index * 4, 13, 2, 2);
      }
    }
    ctx.restore();
  }
}
