// File: js/Rescue.js
/**
 * People rescue.
 *
 * Rescue zones scatter survivors in the water. Driving over one picks them up
 * — but they bob with the current and the swell, so collecting a whole group
 * means slowing down and reading the water instead of flooring it. That
 * tension (race clock vs. rescue points) is the point of the mechanic.
 */

import { GAME_H, RESCUE, RULES, COLORS, rand, clamp } from '#game/config.js';
import { px, glow } from '#game/Sprite.js';
import { art } from '#game/Assets.js';
import { sfx } from '#game/Sound.js';

/** A single person in the water, waving to be picked up. */
export class Survivor {
  /** @param {number} x @param {number} y */
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = RESCUE.radius; this.h = RESCUE.radius;
    this.age = rand(0, 6);
    this.dead = false;
    this.saved = false;
    this.bobPhase = rand(0, Math.PI * 2);
    this.driftX = rand(-1, 1) * RESCUE.driftSpeed;
    this.waveArm = 0;
  }

  /** Generous circular-ish pickup box. */
  get body() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /**
   * @param {number} dt
   * @param {object} api { scroll, current, particles }
   */
  update(dt, { scroll, current, particles }) {
    this.age += dt;
    this.waveArm = Math.sin(this.age * 6);
    const c = current ? current.sample(this.x, this.y) : { x: 0, y: 0 };
    this.x += (this.driftX + c.x * 0.6) * dt;
    this.y += scroll * dt + c.y * 0.4 * dt;
    if (this.y > GAME_H + 40) this.dead = true;

    // Occasional splash so they read as alive in the water.
    if (Math.random() < 0.02) {
      particles?.spawn({
        x: this.x + rand(-6, 6), y: this.y + 6,
        vy: rand(-30, -8), life: rand(0.2, 0.4), size: 3,
        color: COLORS.foam, drag: 2, scrolls: true,
      });
    }
  }

  /**
   * Pick this survivor up.
   * @param {object} api { particles, addScore, notify }
   */
  rescue({ particles, addScore, notify }) {
    if (this.saved) return;
    this.saved = true;
    this.dead = true;
    particles.sparkle(this.x, this.y, COLORS.green);
    particles.popup(this.x, this.y - 14, 'SAVED!', COLORS.green);
    addScore?.(RULES.rescueScore, this.x, this.y);
    sfx.play('rescue');
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const bob = Math.sin(this.age * 2.5 + this.bobPhase) * RESCUE.waveHeight;
    const x = Math.round(this.x), y = Math.round(this.y + bob);

    if (art.draw(ctx, 'world.survivor', x, y, { frame: this.waveArm > 0 ? 1 : 0 })) return;

    // Foam ring around them in the water.
    ctx.globalAlpha = 0.5;
    px(ctx, x - 11, y + 6, 22, 3, COLORS.foam);
    ctx.globalAlpha = 1;

    // Life ring, head, and a waving arm.
    glow(ctx, COLORS.yellow, 8, () => {
      px(ctx, x - 9, y - 1, 18, 7, COLORS.orange);
      px(ctx, x - 6, y, 12, 4, COLORS.white);
    });
    px(ctx, x - 3, y - 8, 6, 6, '#f0c090');          // head
    px(ctx, x - 2, y - 7, 4, 2, '#3a2a1a');          // hair
    const armY = y - 12 + (this.waveArm > 0 ? -2 : 2);
    px(ctx, x + (this.waveArm > 0 ? 4 : -7), armY, 3, 7, '#f0c090');

    // "Help!" blink so they're visible at speed.
    if (Math.floor(this.age * 3) % 2 === 0) {
      glow(ctx, COLORS.green, 10, () => px(ctx, x - 2, y - 20, 4, 4, COLORS.green));
    }
  }
}

/**
 * Manages survivors and the zone banner/progress.
 */
export class RescueManager {
  /** @param {import('#game/Particle.js').ParticleSystem} particles */
  constructor(particles) {
    this.particles = particles;
    this.reset();
  }

  reset() {
    /** @type {Survivor[]} */
    this.survivors = [];
    this.saved = 0;
    this.lost = 0;
    this.zoneActive = false;
    this.zoneTotal = 0;
    this.zoneSaved = 0;
  }

  /** @returns {boolean} any survivor currently on screen. */
  get active() { return this.survivors.length > 0; }

  /**
   * Begin a rescue zone: spawn a scattered group above the screen.
   * @param {number} count
   */
  spawnZone(count) {
    this.zoneActive = true;
    this.zoneTotal = count;
    this.zoneSaved = 0;
    for (let i = 0; i < count; i++) {
      this.survivors.push(new Survivor(rand(50, 430), -60 - i * rand(90, 170)));
    }
  }

  /**
   * @param {number} dt
   * @param {object} api { scroll, current, particles }
   */
  update(dt, api) {
    for (const s of this.survivors) if (!s.dead) s.update(dt, api);
    // Anyone who scrolls past is counted as lost.
    for (const s of this.survivors) {
      if (s.dead && !s.saved) { this.lost++; }
    }
    this.survivors = this.survivors.filter((s) => !s.dead);
    if (this.zoneActive && this.survivors.length === 0) this.zoneActive = false;
  }

  /**
   * Test the player against every survivor.
   * @param {import('#game/Player.js').Player} player
   * @param {object} api { addScore, notify }
   * @returns {number} how many were rescued this frame
   */
  checkPickups(player, api) {
    if (player.dead) return 0;
    let n = 0;
    for (const s of this.survivors) {
      if (s.dead) continue;
      const dx = s.x - player.x, dy = s.y - player.y;
      if (dx * dx + dy * dy < (RESCUE.radius + 14) ** 2) {
        s.rescue({ particles: this.particles, ...api });
        this.saved++;
        this.zoneSaved++;
        n++;
      }
    }
    return n;
  }

  draw(ctx) { for (const s of this.survivors) if (!s.dead) s.draw(ctx); }
}
