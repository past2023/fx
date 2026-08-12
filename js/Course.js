// File: js/Course.js
/**
 * Course director.
 *
 * Turns the flat `COURSE.sections` table into a paced, point-to-point race:
 * tracks how far along the route the player is, announces each themed section,
 * emits checkpoint gates, and tells `main.js` what should be spawning right
 * now (enemy pressure, mine density, rescue zones).
 *
 * Keeping all of this in one place means pacing can be retuned from the config
 * table without touching spawn logic.
 */

import { GAME_W, COURSE, COLORS, clamp, rand } from '#game/config.js';
import { px, glow } from '#game/Sprite.js';
import { art } from '#game/Assets.js';

/** A checkpoint gate: two pylons you drive between for a time/score bonus. */
export class Gate {
  /** @param {number} y @param {number} index */
  constructor(y, index) {
    this.y = y;
    this.index = index;
    this.x = GAME_W / 2 + rand(-70, 70);
    this.width = rand(150, 210);
    this.dead = false;
    this.passed = false;
    this.age = 0;
    this.flash = 0;
  }

  update(dt, { scroll }) {
    this.age += dt;
    if (this.flash > 0) this.flash -= dt;
    this.y += scroll * dt;
    if (this.y > 820) this.dead = true;
  }

  /**
   * @param {import('#game/Player.js').Player} player
   * @returns {boolean} true on the frame it is cleared
   */
  check(player) {
    if (this.passed || this.dead) return false;
    if (player.y < this.y) return false;      // not reached yet
    this.passed = true;
    this.flash = 0.5;
    const half = this.width / 2;
    const inside = Math.abs(player.x - this.x) < half;
    return inside;
  }

  draw(ctx) {
    const half = this.width / 2;
    const y = Math.round(this.y);
    const lit = this.flash > 0;
    const col = this.passed ? (lit ? COLORS.white : COLORS.green) : COLORS.yellow;

    // Connecting line across the gate mouth.
    ctx.save();
    ctx.globalAlpha = this.passed ? 0.25 : 0.45 + Math.sin(this.age * 5) * 0.15;
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(this.x - half), y - 1, this.width, 3);
    ctx.restore();

    for (const side of [-1, 1]) {
      const px0 = Math.round(this.x + side * half);
      if (art.draw(ctx, 'world.gate', px0, y, { flipX: side > 0 })) continue;
      // Pylon: floating buoy tower.
      glow(ctx, col, lit ? 20 : 10, () => {
        px(ctx, px0 - 6, y - 30, 12, 34, col);
      });
      px(ctx, px0 - 8, y - 4, 16, 12, '#ffffff');
      px(ctx, px0 - 8, y + 4, 16, 5, col);
      px(ctx, px0 - 3, y - 40, 6, 12, '#ffffff');
      glow(ctx, col, 14, () => px(ctx, px0 - 4, y - 46, 8, 8, col));
    }
  }
}

export class Course {
  constructor() { this.reset(); }

  reset() {
    this.sectionIndex = 0;
    this.sectionProgress = 0;    // metres into the current section
    this.progress = 0;           // metres along the whole course
    /** @type {Gate[]} */
    this.gates = [];
    this.gateTimer = 3.2;
    this.gateCount = 0;
    this.gatesHit = 0;
    this.finished = false;
    this.bossTriggered = false;
    this.pendingRescue = false;
    this.announced = -1;
  }

  /** @returns {object} the active section definition. */
  get section() {
    return COURSE.sections[Math.min(this.sectionIndex, COURSE.sections.length - 1)];
  }

  /** @returns {number} total race length in metres (excluding the boss). */
  get totalLength() {
    return COURSE.sections.reduce((a, s) => a + s.len, 0);
  }

  /** @returns {number} 0..1 completion of the whole route. */
  get fraction() { return clamp(this.progress / this.totalLength, 0, 1); }

  /** @returns {boolean} true once the route is done and the boss should spawn. */
  get atBoss() { return this.section.id === 'boss'; }

  /**
   * Advance the course.
   * @param {number} dt
   * @param {number} scroll px/s
   * @param {object} cb callbacks
   * @param {(s:object)=>void} cb.onSection new section entered
   * @param {(count:number)=>void} cb.onRescueZone start a rescue zone
   * @param {()=>void} cb.onBoss route complete
   * @returns {Gate[]} gates cleared this frame (for scoring)
   */
  update(dt, scroll, cb = {}) {
    const metres = (scroll * dt) / 10;
    if (!this.atBoss) {
      this.progress += metres;
      this.sectionProgress += metres;
    }

    // Section transitions.
    const sec = this.section;
    if (!this.atBoss && this.sectionProgress >= sec.len) {
      this.sectionProgress -= sec.len;
      this.sectionIndex++;
      const next = this.section;
      cb.onSection?.(next);
      if (next.rescue) cb.onRescueZone?.(Math.round(rand(...[3, 6])));
      if (next.id === 'boss' && !this.bossTriggered) {
        this.bossTriggered = true;
        cb.onBoss?.();
      }
    }

    // Checkpoint gates through gated sections.
    if (sec.gates && !this.atBoss) {
      this.gateTimer -= dt;
      if (this.gateTimer <= 0) {
        this.gateTimer = rand(4.5, 7.0);
        this.gates.push(new Gate(-60, this.gateCount++));
      }
    }
    for (const g of this.gates) if (!g.dead) g.update(dt, { scroll });
    this.gates = this.gates.filter((g) => !g.dead);

    return this.gates;
  }

  /**
   * Test the player against unpassed gates.
   * @param {import('#game/Player.js').Player} player
   * @returns {{hit:boolean, missed:boolean, gate:Gate}|null}
   */
  checkGates(player) {
    for (const g of this.gates) {
      if (g.passed || g.dead) continue;
      if (player.y < g.y) continue;
      const ok = g.check(player);
      if (ok) this.gatesHit++;
      return { hit: ok, missed: !ok, gate: g };
    }
    return null;
  }

  draw(ctx) { for (const g of this.gates) if (!g.dead) g.draw(ctx); }
}
