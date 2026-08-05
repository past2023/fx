import { TUNING, WEAPON_LOADOUT } from './constants.js';

/**
 * Controls the in-flight armory: starter guns, burst volleys, explosive plasma,
 * and the heat-managed beam. Q/E changes the active style without losing a run.
 */
export default class WeaponSystem {
  constructor(weapon, loadout = WEAPON_LOADOUT) {
    this.loadout = loadout;
    this.weaponIndex = Math.max(0, loadout.findIndex((item) => item.id === weapon.id));
    this.weapon = loadout[this.weaponIndex];
    this.burstRemaining = 0;
    this.burstTimer = 0;
    this.laserFxTimer = 0;
    this.laserBeamTimer = 0;
    this.laserAudioTimer = 0;
  }

  /** Replaces the active weapon with a menu selection or specific loadout entry. */
  select(weapon) {
    const index = this.loadout.findIndex((item) => item.id === weapon.id);
    this.weaponIndex = index >= 0 ? index : 0;
    this.weapon = this.loadout[this.weaponIndex];
    this.burstRemaining = 0;
    this.burstTimer = 0;
  }

  /** Cycles the full armory and returns the newly armed weapon. */
  cycle(direction) {
    this.weaponIndex = (this.weaponIndex + direction + this.loadout.length) % this.loadout.length;
    this.weapon = this.loadout[this.weaponIndex];
    this.burstRemaining = 0;
    this.burstTimer = 0;
    this.laserFxTimer = 0;
    this.laserBeamTimer = 0;
    this.laserAudioTimer = 0;
    return this.weapon;
  }

  /** Handles cooldown, burst, projectile and continuous-beam fire. */
  update(dt, player, input, bullets, canvasWidth, particles, audio = null) {
    const holdingFire = input.isDown('shoot');
    if (this.weapon.id === 'laser') {
      this._updateLaser(dt, player, holdingFire, bullets, canvasWidth, particles, audio);
      return;
    }

    player.heat = Math.max(0, player.heat - TUNING.WEAPON.PASSIVE_HEAT_COOL * dt);
    if (this.weapon.id === 'pulse' && this.burstRemaining > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this._emitPulse(player, bullets, particles, audio);
        this.burstRemaining -= 1;
        this.burstTimer += this.weapon.burstDelay;
      }
      return;
    }
    if (!holdingFire || player.fireTimer > 0) return;

    const upgrade = player.upgradeTimer > 0;
    const cooldown = player.ship.cooldown * player.cooldownMultiplier * this.weapon.cooldownMultiplier / (upgrade ? 2 : 1);
    player.fireTimer = cooldown;
    if (this.weapon.id === 'spread') this._emitSpread(player, bullets, particles, upgrade, audio);
    else if (this.weapon.id === 'pulse') {
      this.burstRemaining = this.weapon.burstCount;
      this.burstTimer = 0;
    } else if (this.weapon.id === 'nova') this._emitNova(player, bullets, particles, upgrade, audio);
    else this._emitBlaster(player, bullets, particles, upgrade, audio);
  }

  _emitBlaster(player, bullets, particles, upgrade, audio) {
    bullets.fire({
      x: player.x + 24, y: player.y, vx: TUNING.WEAPON.BLASTER_SPEED, vy: 0,
      damage: this.weapon.damage * (upgrade ? 2 : 1), team: 'player', color: this.weapon.color,
      w: 14, h: 6, type: 'blaster',
    });
    particles.muzzle(player.x + 22, player.y, this.weapon.color, 0.8);
    audio?.playSound('blasterFire');
  }

  _emitSpread(player, bullets, particles, upgrade, audio) {
    const damage = this.weapon.damage * (upgrade ? 2 : 1);
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
        type: 'blaster',
      });
    }
    particles.muzzle(player.x + 22, player.y, this.weapon.color, 1.1);
    audio?.playSound('spreadFire');
  }

  _emitPulse(player, bullets, particles, audio) {
    const upgrade = player.upgradeTimer > 0;
    bullets.fire({
      x: player.x + 25, y: player.y + (Math.random() - 0.5) * 5,
      vx: TUNING.WEAPON.PULSE_SPEED, vy: (Math.random() - 0.5) * 35,
      damage: this.weapon.damage * (upgrade ? 2 : 1), team: 'player', color: this.weapon.color,
      w: 8, h: 8, type: 'pulse',
    });
    particles.muzzle(player.x + 21, player.y, this.weapon.color, 0.55);
    audio?.playSound('pulseFire');
  }

  _emitNova(player, bullets, particles, upgrade, audio) {
    bullets.fire({
      x: player.x + 27, y: player.y, vx: TUNING.WEAPON.NOVA_SPEED, vy: 0,
      damage: this.weapon.damage * (upgrade ? 2 : 1), team: 'player', color: this.weapon.color,
      w: 22, h: 22, type: 'nova', splashRadius: this.weapon.splashRadius,
    });
    particles.muzzle(player.x + 22, player.y, this.weapon.color, 1.55);
    audio?.playSound('novaFire');
  }

  _updateLaser(dt, player, holdingFire, bullets, canvasWidth, particles, audio) {
    const upgrade = player.upgradeTimer > 0;
    player.laserLockout = Math.max(0, player.laserLockout - dt);
    this.laserFxTimer = Math.max(0, this.laserFxTimer - dt);
    this.laserBeamTimer = Math.max(0, this.laserBeamTimer - dt);
    this.laserAudioTimer = Math.max(0, this.laserAudioTimer - dt);
    const cooling = this.weapon.coolPerSecond * (upgrade ? 1.3 : 1);
    if (!holdingFire || player.laserLockout > 0) {
      player.heat = Math.max(0, player.heat - cooling * dt);
      return;
    }

    const heatUse = this.weapon.heatPerSecond * (upgrade ? 0.7 : 1);
    player.heat = Math.min(100, player.heat + heatUse * dt);
    const beamWidth = canvasWidth - player.x - 22;
    bullets.fireLaser(player.x + 22, player.y, beamWidth, this.weapon.damagePerSecond * dt * (upgrade ? 2 : 1), this.weapon.color);
    if (this.laserFxTimer <= 0) {
      particles.laserMuzzle(player.x + 22, player.y, this.weapon.color);
      this.laserFxTimer += TUNING.WEAPON.LASER_FX_INTERVAL;
    }
    if (this.laserBeamTimer <= 0) {
      particles.laserBeam(player.x + 22, player.y, beamWidth, this.weapon.color);
      this.laserBeamTimer += TUNING.WEAPON.LASER_BEAM_FLICKER_INTERVAL;
    }
    if (this.laserAudioTimer <= 0) {
      audio?.playSound('laserFire');
      this.laserAudioTimer += 0.1;
    }
    if (player.heat >= 100) player.laserLockout = this.weapon.lockout;
  }

  /** Returns a display-friendly active weapon name. */
  get name() { return this.weapon.name; }
}
