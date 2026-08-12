// File: js/WeaponSystem.js
/**
 * Owns everything about the player's offence:
 *  - machine-gun cooldown, regenerating ammo and the temporary 3-way spread
 *  - limited homing missiles refilled by red pickups
 *  - muzzle flashes and recoil kick fed back to the caller
 */

import { WEAPONS, COLORS, clamp } from '#game/config.js';
import { nearest } from '#game/Collision.js';
import { sfx } from '#game/Sound.js';

export class WeaponSystem {
  /**
   * @param {import('#game/Bullet.js').BulletPool} bullets
   * @param {import('#game/Particle.js').ParticleSystem} particles
   */
  constructor(bullets, particles) {
    this.bullets = bullets;
    this.particles = particles;
    this.reset();
  }

  /** Restore starting loadout. */
  reset() {
    this.ammo = WEAPONS.ammoMax;
    this.cool = 0;
    this.missiles = WEAPONS.missileMax;
    this.missileCool = 0;
    this.spread = 0;        // seconds of 3-way left
    this.spreadLevel = 0;   // 0 = single, 1 = 3-way, 2 = 5-way (stacked pickups)
    this.regenDelay = 0;
    this.emptyBlip = 0;
    this.flash = 0;         // muzzle flash timer, read by Player draw
  }

  /** @returns {number} spread time remaining, for the HUD */
  get spreadTime() { return this.spread; }

  /**
   * Per-frame update.
   * @param {number} dt
   * @param {object} o
   * @param {import('#game/Player.js').Player} o.player
   * @param {import('#game/Input.js').Input} o.input
   * @param {Array} o.enemies
   * @param {(amount:number)=>void} o.shake screen-shake callback
   */
  update(dt, { player, input, enemies, shake }) {
    this.cool -= dt;
    this.missileCool -= dt;
    this.flash = Math.max(0, this.flash - dt);
    this.emptyBlip -= dt;

    if (this.spread > 0) {
      this.spread -= dt;
      if (this.spread <= 0) { this.spread = 0; this.spreadLevel = 0; }
    }

    // Ammo regenerates fast after a short pause, and trickles even while the
    // trigger is held so sustained fire throttles rather than hard-stopping.
    if (this.regenDelay > 0) {
      this.regenDelay -= dt;
      this.ammo = clamp(this.ammo + WEAPONS.ammoRegenTrickle * dt, 0, WEAPONS.ammoMax);
    } else {
      this.ammo = clamp(this.ammo + WEAPONS.ammoRegen * dt, 0, WEAPONS.ammoMax);
    }

    if (player.dead) return;

    if (input.fire) this.fireGun(player, shake);
    if (input.pressed('special')) this.fireMissile(player, enemies, shake);
  }

  /**
   * Machine gun. Honours cooldown + ammo; widens with spread pickups.
   * @param {import('#game/Player.js').Player} player
   * @param {(n:number)=>void} shake
   */
  fireGun(player, shake) {
    if (this.cool > 0) return;
    if (this.ammo < 1) {
      if (this.emptyBlip <= 0) { sfx.play('empty'); this.emptyBlip = 0.25; }
      return;
    }

    const spreadOn = this.spreadLevel > 0;
    this.cool = spreadOn ? WEAPONS.gunSpreadCooldown : WEAPONS.gunCooldown;
    this.ammo -= 1;
    this.regenDelay = WEAPONS.ammoRegenDelay;
    this.flash = 0.05;

    const { x, y } = player.muzzle;
    const speed = WEAPONS.gunSpeed;
    /** @type {number[]} firing angles in radians (−PI/2 = straight up) */
    let angles = [-Math.PI / 2];
    if (this.spreadLevel === 1) angles = [-Math.PI / 2, -Math.PI / 2 - 0.22, -Math.PI / 2 + 0.22];
    if (this.spreadLevel >= 2) {
      angles = [-Math.PI / 2, -Math.PI / 2 - 0.2, -Math.PI / 2 + 0.2, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42];
    }

    for (const a of angles) {
      // Twin barrels: offset the two centre shots for a chunkier feel.
      const off = angles.length === 1 ? (this._alt ? -6 : 6) : 0;
      this.bullets.spawn({
        x: x + off + Math.cos(a) * 4,
        y: y + Math.sin(a) * 4,
        vx: Math.cos(a) * speed + player.vx * 0.25,
        vy: Math.sin(a) * speed,
        kind: 'gun',
        friendly: true,
        damage: WEAPONS.gunDamage,
        color: spreadOn ? COLORS.yellow : COLORS.cyan,
        life: 1.6,
      });
    }
    this._alt = !this._alt;

    this.particles.spawn({
      x, y: y - 2, life: 0.07, size: 12,
      color: COLORS.white, drag: 0, shrink: true,
    });
    player.vy += 24;                       // recoil nudge
    shake(spreadOn ? 1.6 : 1.0);
    sfx.play(spreadOn ? 'spreadShoot' : 'shoot');
  }

  /**
   * Homing missile at the nearest enemy.
   * @param {import('#game/Player.js').Player} player
   * @param {Array} enemies
   * @param {(n:number)=>void} shake
   */
  fireMissile(player, enemies, shake) {
    if (this.missileCool > 0) return;
    if (this.missiles <= 0) { sfx.play('empty'); return; }
    this.missiles--;
    this.missileCool = WEAPONS.missileCooldown;

    const target = nearest(player.x, player.y, enemies, (e) => e.y > -20);
    const { x, y } = player.muzzle;
    const side = this.missiles % 2 === 0 ? -10 : 10;
    this.bullets.spawn({
      x: x + side, y,
      vx: side * 6, vy: -WEAPONS.missileSpeed * 0.6,
      kind: 'missile',
      friendly: true,
      damage: WEAPONS.missileDamage,
      color: COLORS.magenta,
      life: WEAPONS.missileLife,
      target,
    });
    this.particles.splash(x + side, y, 6);
    shake(4);
    sfx.play('missile');
  }

  /** Blue pickup: grant / extend the spread upgrade. */
  addSpread() {
    this.spreadLevel = Math.min(2, this.spreadLevel + 1);
    this.spread = Math.min(WEAPONS.spreadTime * 1.6, this.spread + WEAPONS.spreadTime);
    this.ammo = WEAPONS.ammoMax;
  }

  /** Red pickup: refill missiles. */
  addMissiles(n = 1) {
    this.missiles = Math.min(WEAPONS.missileMax, this.missiles + n);
  }

  /** Yellow pickup: instant ammo top-up. */
  refillAmmo() { this.ammo = WEAPONS.ammoMax; this.regenDelay = 0; }
}
