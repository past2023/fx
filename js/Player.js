// File: js/Player.js
/**
 * The player's hydrofoil speedboat: 8-directional movement with water-like
 * inertia, a boost gauge that drives the world scroll speed, i-frames after
 * damage, banking sprite lean, wake foam and shield/upgrade visuals.
 */

import {
  GAME_W, GAME_H, PLAYER, PX, COLORS, clamp, damp, lerp, rand,
} from '#game/config.js';
import {
  SPR_PLAYER, PAL_PLAYER, PAL_PLAYER_HIT, drawMatrix, drawMatrixFlat, glow, px,
} from '#game/Sprite.js';
import { sfx } from '#game/Sound.js';
import { art } from '#game/Assets.js';

export class Player {
  /**
   * @param {import('#game/Particle.js').ParticleSystem} particles
   */
  constructor(particles) {
    this.particles = particles;
    this.reset();
  }

  /** Full reset for a new run. */
  reset() {
    this.x = GAME_W / 2;
    this.y = GAME_H - 140;
    this.vx = 0;
    this.vy = 0;
    this.w = PLAYER.w;
    this.h = PLAYER.h;
    this.lives = PLAYER.startLives;
    this.boost = PLAYER.boostMax;
    this.boosting = false;
    this.invuln = 0;
    this.bank = 0;           // -1..1 visual lean
    this.bob = 0;            // idle bobbing phase
    this.dead = false;
    this.shield = 0;         // seconds of shield left (from rare pickup)
    this.slowFactor = 1;     // set by whirlpools each frame
    this.hitFlash = 0;
    this.throttle = 0;       // 0..1 smoothed boost visual
    this.drifting = false;
    this.driftTime = 0;      // seconds held in a clean drift
  }

  /**
   * Centre-anchored *core* hitbox. Classic shmup fairness: the collision box
   * is much smaller than the sprite, so near-misses graze the hull instead of
   * killing you. Roughly the cockpit area.
   */
  get body() {
    return { x: this.x, y: this.y + 2, w: this.w * 0.42, h: this.h * 0.38 };
  }

  /** Muzzle position for the weapon system. */
  get muzzle() { return { x: this.x, y: this.y - this.h / 2 - 2 }; }

  /**
   * @param {number} dt
   * @param {import('#game/Input.js').Input} input
   * @returns {{boosting:boolean}}
   */
  /**
   * @param {number} dt
   * @param {import('#game/Input.js').Input} input
   * @param {object} [env]
   * @param {{x:number,y:number}} [env.current] water current push (px/s)
   * @param {number} [env.speedMul] handling multiplier from SPEED upgrades
   * @param {boolean} [env.freeBoost] TURBO power-up: boost without draining
   * @returns {{boosting:boolean, drifting:boolean}}
   */
  update(dt, input, env = {}) {
    this.bob += dt * 5;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shield > 0) this.shield -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    const handling = env.speedMul ?? 1;
    const ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    // --- Boost economy: hold UP to burn gauge for scroll speed ---
    const freeBoost = !!env.freeBoost;
    const wantBoost = input.up && (freeBoost || this.boost > 1);
    if (wantBoost && (this.boosting || freeBoost || this.boost > PLAYER.boostMinToStart)) {
      if (!this.boosting) sfx.play('boost');
      this.boosting = true;
      if (!freeBoost) {
        this.boost = clamp(this.boost - PLAYER.boostDrain * dt, 0, PLAYER.boostMax);
        if (this.boost <= 0) this.boosting = false;
      }
    } else {
      this.boosting = false;
      const regen = input.down ? PLAYER.boostRegen * 1.5 : PLAYER.boostRegen;
      this.boost = clamp(this.boost + regen * dt, 0, PLAYER.boostMax);
    }
    this.throttle = damp(this.throttle, this.boosting ? 1 : 0, 8, dt);

    /* ---------------- Water momentum & drift ----------------
     * A boat's hull keeps its momentum: steering adds lateral thrust, but the
     * sideways velocity only bleeds off at `grip`. Holding DRIFT slashes grip
     * and adds turn-in, so you can kick the stern out through a turn and slide
     * around buoys — and a held, clean drift pays back boost.                */
    const wantDrift = input.drift && Math.abs(this.vx) > 30;
    this.drifting = wantDrift;

    const grip = wantDrift ? PLAYER.gripDrift
      : this.boosting ? PLAYER.gripBoost
        : PLAYER.gripBase;

    const steer = PLAYER.accel * (wantDrift ? PLAYER.driftSteerBoost : 1) * handling;
    this.vx += ax * steer * dt;
    this.vy += ay * PLAYER.accelY * handling * dt;

    // Lateral grip: exponential bleed toward zero (frame-rate independent).
    if (ax === 0 || wantDrift) this.vx *= Math.exp(-grip * dt);
    if (ay === 0) this.vy *= Math.exp(-PLAYER.dragY * dt);

    this.vx = clamp(this.vx, -PLAYER.maxSpeedX * handling, PLAYER.maxSpeedX * handling);
    this.vy = clamp(this.vy, -PLAYER.maxSpeedY * handling, PLAYER.maxSpeedY * handling);

    // Drift scoring: a sustained, fast slide charges the boost gauge.
    const lateral = Math.abs(this.vx);
    if (wantDrift && lateral > PLAYER.driftMinSpeed) {
      this.driftTime += dt;
      this.boost = clamp(this.boost + PLAYER.driftChargeRate * dt, 0, PLAYER.boostMax);
      // Spray kicked out sideways from the sliding hull.
      const side = Math.sign(this.vx);
      this.particles.wake(this.x - side * 10, this.y + 6, 1.5);
      if (Math.random() < 0.5) {
        this.particles.spawn({
          x: this.x - side * 12, y: this.y + rand(-6, 10),
          vx: -side * rand(40, 130), vy: rand(20, 90),
          life: rand(0.2, 0.5), size: 4, color: COLORS.foam, drag: 2, scrolls: true,
        });
      }
    } else {
      this.driftTime = 0;
    }

    // --- Water current pushes the hull around ---
    const cur = env.current;
    const slow = this.slowFactor;
    if (cur) { this.x += cur.x * dt; this.y += cur.y * dt; }

    this.x += this.vx * dt * slow;
    this.y += this.vy * dt * slow;

    // --- Bounds: bounce softly off the screen edges ---
    const mx = this.w / 2 + 2;
    if (this.x < mx) { this.x = mx; this.vx = Math.abs(this.vx) * 0.35; }
    if (this.x > GAME_W - mx) { this.x = GAME_W - mx; this.vx = -Math.abs(this.vx) * 0.35; }
    // Keep the boat inside the playfield, clear of the HUD bars.
    const topLimit = 78, botLimit = GAME_H - 92;
    if (this.y < topLimit) { this.y = topLimit; this.vy = Math.abs(this.vy) * 0.35; }
    if (this.y > botLimit) { this.y = botLimit; this.vy = -Math.abs(this.vy) * 0.35; }

    // --- Visual banking: exaggerated while drifting (the stern kicks out) ---
    const targetBank = clamp(this.vx / PLAYER.maxSpeedX, -1, 1) * (wantDrift ? 1.5 : 1);
    this.bank = damp(this.bank, clamp(targetBank, -1.5, 1.5), 9, dt);

    // --- Wake + exhaust particles ---
    const stern = this.y + this.h / 2 - 4;
    this.particles.wake(this.x - 7, stern, 0.7 + this.throttle * 0.8);
    this.particles.wake(this.x + 7, stern, 0.7 + this.throttle * 0.8);
    if (this.boosting) {
      this.particles.boostFlame(this.x, stern + 4);
      this.particles.boostFlame(this.x, stern + 4);
    }

    this.slowFactor = 1; // consumed each frame; whirlpools re-apply it
    return { boosting: this.boosting, drifting: wantDrift };
  }

  /**
   * Take a hit. Honours shield and i-frames.
   * @param {() => void} [onDeath] called when the last life is lost
   * @returns {boolean} true if damage was actually applied
   */
  hit(onDeath) {
    if (this.invuln > 0 || this.dead) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.invuln = 0.8;
      this.hitFlash = 0.2;
      this.particles.sparkle(this.x, this.y, COLORS.cyan);
      sfx.play('hit');
      return false;
    }
    this.lives--;
    this.invuln = PLAYER.invulnTime;
    this.hitFlash = 0.3;
    this.vy += 120;
    this.particles.explosion(this.x, this.y, [COLORS.cyan, COLORS.white, COLORS.magenta], 1);
    sfx.play('playerHit');
    if (this.lives <= 0) {
      this.dead = true;
      this.particles.explosion(this.x, this.y, [COLORS.yellow, COLORS.orange, COLORS.red, COLORS.white], 2);
      onDeath?.();
    }
    return true;
  }

  /** Grant a temporary shield (rare pickup). */
  giveShield(seconds = 8) { this.shield = Math.max(this.shield, seconds); }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    if (this.dead) return;

    // Blink during i-frames.
    const blink = this.invuln > 0 && Math.floor(this.invuln * 18) % 2 === 0;
    const bobY = Math.sin(this.bob) * 1.5;
    const scale = PX;
    const cx = Math.round(this.x);
    const cy = Math.round(this.y + bobY);

    // Hull shadow on the water.
    ctx.globalAlpha = 0.3;
    px(ctx, cx - 12, cy + 14, 24, 6, '#000');
    ctx.globalAlpha = 1;

    if (blink) { ctx.globalAlpha = 0.35; }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.bank * 0.16);

    // Boost thruster plume behind the hull.
    if (this.throttle > 0.02) {
      const len = 10 + this.throttle * 26 + Math.sin(this.bob * 4) * 4;
      const frame = Math.floor(this.bob * 12) % 4;
      if (!art.draw(ctx, 'player.thruster', 0, this.h / 2 - 4, {
        frame, alpha: clamp(this.throttle * 1.2, 0, 1),
      })) {
        glow(ctx, COLORS.cyan, 12, () => {
          px(ctx, -4, this.h / 2 - 4, 8, len, COLORS.cyan);
          px(ctx, -2, this.h / 2 - 4, 4, len * 1.25, COLORS.white);
        });
      }
    }

    // Hull — PNG art when available, procedural matrix otherwise.
    // Frame 0 = level, 1 = banking left, 2 = banking right.
    const frame = this.bank < -0.35 ? 1 : this.bank > 0.35 ? 2 : 0;
    if (!art.draw(ctx, 'player.hull', 0, 0, { frame, alpha: this.hitFlash > 0 ? 0.6 : 1 })) {
      if (this.hitFlash > 0) {
        drawMatrixFlat(ctx, SPR_PLAYER, 0, 0, scale, COLORS.white);
      } else {
        drawMatrix(ctx, SPR_PLAYER, this.invuln > 0 ? PAL_PLAYER_HIT : PAL_PLAYER, 0, 0, scale);
      }

      // Hydrofoil struts that flex with the bank (procedural art only).
      const foil = this.bank * 3;
      px(ctx, -14, 6 + foil, 6, 3, COLORS.cyanDim);
      px(ctx, 8, 6 - foil, 6, 3, COLORS.cyanDim);
    }

    ctx.restore();
    ctx.globalAlpha = 1;

    // Shield bubble.
    if (this.shield > 0) {
      const a = this.shield < 2 ? (Math.floor(this.shield * 10) % 2 ? 0.25 : 0.6) : 0.5;
      const sf = Math.floor(this.bob * 6) % 4;
      if (!art.draw(ctx, 'player.shield', cx, cy, { frame: sf, alpha: a })) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 28 + Math.sin(this.bob * 2) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Menu/demo idle render (used by the attract screen). */
  drawDemo(ctx, x, y, t) {
    const saveX = this.x, saveY = this.y, saveBank = this.bank, saveBob = this.bob;
    this.x = x; this.y = y; this.bank = Math.sin(t * 1.4) * 0.7; this.bob = t * 5;
    this.draw(ctx);
    this.x = saveX; this.y = saveY; this.bank = saveBank; this.bob = saveBob;
  }
}
