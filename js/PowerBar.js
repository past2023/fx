// File: js/PowerBar.js
/**
 * Gradius-style power-up bar.
 *
 * Collecting tokens advances a cursor along a track of upgrade slots. Pressing
 * ACTIVATE spends the banked tokens on whichever slot the cursor has reached,
 * then resets the cursor to zero.
 *
 * The tactical hook: cheap upgrades are available immediately, but banking
 * tokens for a few more seconds unlocks the strong ones. Cash in early and
 * often, or gamble on reaching SHIELD before the next minefield?
 *
 * State lives here; `UIManager` only reads it, and `main.js` applies effects.
 */

import { POWERBAR, RULES, clamp } from '#game/config.js';
import { sfx } from '#game/Sound.js';

export class PowerBar {
  constructor() { this.reset(); }

  /** Clear all upgrades and banked tokens. */
  reset() {
    this.tokens = 0;
    /** Highest slot index currently affordable (-1 = none). */
    this.cursor = -1;
    this.speedStacks = 0;
    this.fireTime = 0;
    this.turboTime = 0;
    this.flash = 0;          // UI pulse when a token lands
    this.activateFlash = 0;  // UI pulse when a slot is spent
    this.lastActivated = null;
  }

  /** @returns {boolean} true while the FIRE upgrade is running. */
  get fireActive() { return this.fireTime > 0; }
  /** @returns {boolean} true while TURBO (free boost) is running. */
  get turboActive() { return this.turboTime > 0; }
  /** @returns {number} handling multiplier from banked SPEED stacks. */
  get speedMul() { return 1 + this.speedStacks * POWERBAR.speedStep; }

  /** @param {number} dt */
  update(dt) {
    if (this.fireTime > 0) this.fireTime -= dt;
    if (this.turboTime > 0) this.turboTime -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.activateFlash > 0) this.activateFlash -= dt;
    this.cursor = this.affordableIndex();
  }

  /** @returns {number} index of the best slot the current tokens can buy. */
  affordableIndex() {
    let best = -1;
    for (let i = 0; i < POWERBAR.slots.length; i++) {
      if (this.tokens >= POWERBAR.slots[i].cost) best = i;
    }
    return best;
  }

  /**
   * Collect a token (dropped by enemies and found along the course).
   * @param {number} [n]
   */
  addToken(n = 1) {
    const maxCost = POWERBAR.slots[POWERBAR.slots.length - 1].cost;
    this.tokens = clamp(this.tokens + n, 0, maxCost);
    this.flash = 0.3;
    sfx.play('token');
  }

  /**
   * Spend the banked tokens on the currently-lit slot.
   *
   * @param {object} api
   * @param {import('#game/Player.js').Player} api.player
   * @param {import('#game/WeaponSystem.js').WeaponSystem} api.weapons
   * @param {(text:string)=>void} [api.notify]
   * @returns {string|null} the id of the activated slot, or null if none
   */
  activate({ player, weapons, notify }) {
    const i = this.affordableIndex();
    if (i < 0) { sfx.play('empty'); return null; }
    const slot = POWERBAR.slots[i];

    switch (slot.id) {
      case 'speed':
        this.speedStacks = Math.min(POWERBAR.maxSpeedStacks, this.speedStacks + 1);
        notify?.(`SPEED x${this.speedStacks}`);
        break;
      case 'missile':
        weapons.addMissiles(2);
        notify?.('MISSILES +2');
        break;
      case 'fire':
        this.fireTime = POWERBAR.fireTime;
        weapons.addSpread();
        notify?.('FIRE POWER');
        break;
      case 'turbo':
        this.turboTime = POWERBAR.turboTime;
        player.boost = 100;
        notify?.('TURBO!');
        break;
      case 'shield':
        player.giveShield(12);
        notify?.('SHIELD UP');
        break;
    }

    this.tokens = 0;
    this.cursor = -1;
    this.activateFlash = 0.45;
    this.lastActivated = slot.id;
    sfx.play('powerup');
    return slot.id;
  }
}
