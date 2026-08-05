import { WEAPONS, TUNING } from './constants.js';

/**
 * Converts a selected weapon and held fire action into pooled projectiles.
 */
export default class WeaponSystem {
  constructor(weapon) {
    this.weapon = weapon;
  }

  /** Replaces the active weapon with a menu selection. */
  select(weapon) { this.weapon = weapon; }

  /** Handles cooldown weapons and heat-managed continuous laser fire. */
  update(dt, player, input, bullets, canvasWidth) {
    const holdingFire = input.isDown('shoot');
    if (this.weapon.id === 'laser') {
      this._updateLaser(dt, player, holdingFire, bullets, canvasWidth);
      return;
    }

    player.heat = Math.max(0, player.heat - TUNING.WEAPON.PASSIVE_HEAT_COOL * dt);
    if (!holdingFire || player.fireTimer > 0) return;
    const upgrade = player.upgradeTimer > 0;
    const damage = this.weapon.damage * (upgrade ? 2 : 1);
    const cooldown = player.ship.cooldown * this.weapon.cooldownMultiplier / (upgrade ? 2 : 1);
    player.fireTimer = cooldown;

    if (this.weapon.id === 'spread') {
      for (const angle of [-15, 0, 15]) {
        const radians = angle * Math.PI / 180;
        bullets.fire({
          x: player.x + 24,
          y: player.y,
          vx: Math.cos(radians) * TUNING.WEAPON.SPREAD_SPEED,
          vy: Math.sin(radians) * TUNING.WEAPON.SPREAD_SPEED,
          damage,
          team: 'player',
          color: this.weapon.color,
          w: 10,
          h: 5,
        });
      }
    } else {
      bullets.fire({
        x: player.x + 24, y: player.y, vx: TUNING.WEAPON.BLASTER_SPEED, vy: 0, damage,
        team: 'player', color: this.weapon.color, w: 12, h: 5,
      });
    }
  }

  _updateLaser(dt, player, holdingFire, bullets, canvasWidth) {
    const upgrade = player.upgradeTimer > 0;
    player.laserLockout = Math.max(0, player.laserLockout - dt);
    const cooling = this.weapon.coolPerSecond * (upgrade ? 1.3 : 1);
    if (!holdingFire || player.laserLockout > 0) {
      player.heat = Math.max(0, player.heat - cooling * dt);
      return;
    }

    const heatUse = this.weapon.heatPerSecond * (upgrade ? 0.7 : 1);
    player.heat = Math.min(100, player.heat + heatUse * dt);
    bullets.fireLaser(player.x + 22, player.y, canvasWidth - player.x - 22, this.weapon.damagePerSecond * dt * (upgrade ? 2 : 1), this.weapon.color);
    if (player.heat >= 100) player.laserLockout = this.weapon.lockout;
  }

  /** Returns a display-friendly active weapon name. */
  get name() { return this.weapon.name; }
}
