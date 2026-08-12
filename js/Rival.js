// File: js/Rival.js
/**
 * Rival racer boats.
 *
 * Rivals are tracked in *course space* (metres along the route) rather than as
 * free-roaming entities, so positions stay meaningful even while they're off
 * screen. Their screen Y is derived from the gap between their progress and
 * the player's: ahead of you = higher up the screen.
 *
 * They rubber-band gently toward the player so the race stays close, dodge
 * obstacles, and can be knocked around — but they're not shootable targets,
 * they're pace-setters.
 */

import {
  GAME_W, GAME_H, HORIZON, RIVALS, COLORS, clamp, damp, rand, lerp,
} from '#game/config.js';
import { px, glow, drawMatrix, SPR_GRUNT } from '#game/Sprite.js';
import { art } from '#game/Assets.js';

export class Rival {
  /**
   * @param {number} index
   * @param {number} startProgress metres of head start
   */
  constructor(index, startProgress = 0) {
    this.index = index;
    this.name = RIVALS.names[index % RIVALS.names.length];
    this.color = RIVALS.colors[index % RIVALS.colors.length];
    this.progress = startProgress;      // metres along the course
    this.speedBias = RIVALS.baseSpeed + rand(-RIVALS.variance, RIVALS.variance);
    this.x = GAME_W * (0.25 + 0.5 * ((index + 1) / (RIVALS.count + 1)));
    this.laneTarget = this.x;
    this.y = GAME_H * 0.5;
    this.w = 24; this.h = 36;
    this.bob = rand(0, 6);
    this.dead = false;
    this.finished = false;
    this.finishTime = 0;
    this.bank = 0;
    this.stunned = 0;
  }

  get body() { return { x: this.x, y: this.y, w: this.w * 0.7, h: this.h * 0.7 }; }

  /**
   * @param {number} dt
   * @param {object} api
   * @param {number} api.playerProgress metres
   * @param {number} api.baseSpeed player's base scroll speed (px/s)
   * @param {number} api.courseLength total metres
   * @param {Array} api.obstacles
   * @param {import('#game/Particle.js').ParticleSystem} api.particles
   * @param {import('#game/Current.js').CurrentField} [api.current]
   */
  update(dt, api) {
    const { playerProgress, baseSpeed, courseLength, obstacles, particles } = api;
    if (this.stunned > 0) this.stunned -= dt;
    this.bob += dt * 5;

    if (!this.finished) {
      // Rubber-band: trailing rivals speed up, leaders ease off slightly.
      const gap = playerProgress - this.progress;      // +ve = rival behind
      const band = clamp(gap * RIVALS.catchup * 0.01, -0.16, 0.28);
      const speed = this.speedBias * (1 + band) * (this.stunned > 0 ? 0.45 : 1);
      this.progress += (baseSpeed * speed * dt) / 10;   // px → metres
      if (this.progress >= courseLength) {
        this.finished = true;
        this.finishTime = api.raceTime ?? 0;
      }
    }

    // Screen Y from the progress gap (ahead of the player = further up).
    const gapM = this.progress - playerProgress;
    const targetY = clamp(GAME_H * 0.62 - gapM * 2.2, HORIZON - 120, GAME_H + 120);
    this.y = damp(this.y, targetY, 4, dt);

    // Steer around obstacles, then drift back toward the racing line.
    let avoid = 0;
    for (const o of obstacles) {
      if (o.dead || o.kind === 'whirlpool') continue;
      const dy = o.y - this.y;
      if (dy < -40 || dy > 190) continue;
      const dx = this.x - o.x;
      if (Math.abs(dx) < 62) avoid += Math.sign(dx || 1) * (62 - Math.abs(dx)) * 2.4;
    }
    if (Math.abs(avoid) < 1 && Math.random() < 0.01) {
      this.laneTarget = clamp(this.x + rand(-90, 90), 46, GAME_W - 46);
    }
    const want = clamp(this.laneTarget + avoid, 40, GAME_W - 40);
    const prevX = this.x;
    this.x = damp(this.x, want, 2.6, dt);
    this.bank = damp(this.bank, clamp((this.x - prevX) / (dt * 260), -1, 1), 8, dt);

    // Wake — only bother when they're actually visible.
    if (this.y > HORIZON - 20 && this.y < GAME_H + 30) {
      particles.wake(this.x - 6, this.y + this.h / 2, 0.7, COLORS.foamSoft);
      particles.wake(this.x + 6, this.y + this.h / 2, 0.7, COLORS.foamSoft);
    }
  }

  /** Knocked sideways and slowed after a collision. */
  bump(dirX) {
    this.stunned = 0.9;
    this.laneTarget = clamp(this.x + dirX * 70, 40, GAME_W - 40);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (this.y < HORIZON - 40 || this.y > GAME_H + 40) return;
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(this.bob) * 1.5);

    if (art.draw(ctx, 'rival.hull', x, y, { frame: this.bank < -0.3 ? 1 : this.bank > 0.3 ? 2 : 0 })) {
      this.drawTag(ctx, x, y);
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.bank * 0.14);
    // Hull: same silhouette language as the player, different livery.
    px(ctx, -10, -18, 20, 30, this.color);
    px(ctx, -7, -14, 14, 20, '#ffffff');
    px(ctx, -7, -18, 14, 5, '#1b3a4a');
    px(ctx, -4, -22, 8, 6, this.color);
    px(ctx, -10, 8, 20, 5, '#1b3a4a');
    // Engine wash.
    glow(ctx, this.color, 8, () => px(ctx, -5, 12, 10, 6, this.color));
    ctx.restore();

    this.drawTag(ctx, x, y);
  }

  /** Name tag + off-screen indicator arrow. */
  drawTag(ctx, x, y) {
    ctx.save();
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(this.name, x + 1, y - 24);
    ctx.fillStyle = this.color;
    ctx.fillText(this.name, x, y - 25);
    ctx.restore();
  }
}

/**
 * Owns the rival pack and computes race positions.
 */
export class RivalManager {
  constructor() { this.reset(); }

  reset() {
    /** @type {Rival[]} */
    this.rivals = [];
    this.playerPlace = 1;
  }

  /** Line up the pack at the start. */
  start() {
    this.rivals = [];
    for (let i = 0; i < RIVALS.count; i++) {
      this.rivals.push(new Rival(i, rand(4, 26)));
    }
  }

  /**
   * @param {number} dt
   * @param {object} api see Rival.update
   */
  update(dt, api) {
    for (const r of this.rivals) r.update(dt, api);
    // Standings: player included, sorted by progress.
    const all = [{ progress: api.playerProgress, isPlayer: true }, ...this.rivals];
    all.sort((a, b) => b.progress - a.progress);
    this.playerPlace = all.findIndex((e) => e.isPlayer) + 1;
  }

  /** @returns {number} 1-based finishing position of the player. */
  get place() { return this.playerPlace; }

  /** Ordinal string for the HUD ("1ST", "2ND"...). */
  static ordinal(n) {
    return ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH'][n - 1] ?? `${n}TH`;
  }

  draw(ctx) { for (const r of this.rivals) r.draw(ctx); }
}
