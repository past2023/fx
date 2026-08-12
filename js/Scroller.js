// File: js/Scroller.js
/**
 * The world: infinite procedural vertical scroll.
 *
 * Responsibilities
 *  - three parallax layers of pixel waves + a sun/skyline gradient band
 *  - neon buoy markers (green right / red left) as racing cues
 *  - obstacle spawning & lifecycle: floating mines, rocky islands, whirlpools
 *  - exposes `scroll` (px/s) which every other system multiplies by dt
 */

import {
  GAME_W, GAME_H, WORLD, COLORS, PX, rand, randInt, clamp, damp, pick,
} from '#game/config.js';
import { SPR_MINE, PAL_MINE, drawMatrix, drawMatrixFlat, px, glow } from '#game/Sprite.js';
import { sfx } from '#game/Sound.js';

/* ------------------------------------------------------------------ */
/* Obstacles                                                           */
/* ------------------------------------------------------------------ */

/** Floating mine: destructible, explodes on contact. */
export class Mine {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 28;
    this.hp = 2;
    this.kind = 'mine';
    this.dead = false;
    this.age = rand(0, 6);
    this.flash = 0;
    this.drift = rand(-18, 18);
  }
  get body() { return { x: this.x, y: this.y, w: this.w - 6, h: this.h - 6 }; }

  update(dt, { scroll, particles }) {
    this.age += dt;
    if (this.flash > 0) this.flash -= dt;
    this.y += scroll * dt;
    this.x += Math.sin(this.age * 0.8) * this.drift * dt;
    if (this.y > GAME_H + 40) this.dead = true;
  }

  /** @returns {boolean} true if destroyed */
  damage(n, { particles, shake }) {
    this.hp -= n;
    this.flash = 0.08;
    if (this.hp <= 0) {
      this.dead = true;
      particles.explosion(this.x, this.y, [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.white]);
      particles.splash(this.x, this.y, 14);
      shake(7);
      sfx.play('explode');
      return true;
    }
    sfx.play('hit');
    return false;
  }

  draw(ctx) {
    const pulse = 0.5 + 0.5 * Math.sin(this.age * 5);
    glow(ctx, COLORS.red, 6 + pulse * 8, () => {
      px(ctx, this.x - 3, this.y - 3, 6, 6, COLORS.red);
    });
    if (this.flash > 0) drawMatrixFlat(ctx, SPR_MINE, this.x, this.y, 3.5, COLORS.white);
    else drawMatrix(ctx, SPR_MINE, PAL_MINE, this.x, this.y, 3.5);
    ctx.globalAlpha = 0.25;
    px(ctx, this.x - 12, this.y + 14, 24, 4, '#000');
    ctx.globalAlpha = 1;
  }
}

/** Rocky island: indestructible, hard collision. */
export class Island {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = randInt(48, 96);
    this.h = randInt(40, 74);
    this.kind = 'island';
    this.dead = false;
    this.age = 0;
    this.solid = true;
    // Pre-baked chunky rock silhouette so it doesn't shimmer.
    this.blocks = [];
    const cols = Math.floor(this.w / 8);
    for (let c = 0; c < cols; c++) {
      const hgt = Math.round((0.35 + Math.random() * 0.65) * this.h);
      this.blocks.push(hgt);
    }
    this.palms = randInt(0, 2);
  }
  get body() { return { x: this.x, y: this.y, w: this.w * 0.82, h: this.h * 0.7 }; }

  update(dt, { scroll }) {
    this.age += dt;
    this.y += scroll * dt;
    if (this.y > GAME_H + 90) this.dead = true;
  }

  draw(ctx) {
    const x0 = this.x - this.w / 2;
    const base = this.y + this.h / 2;
    // Foam ring.
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(this.age * 3);
    px(ctx, x0 - 6, base - 6, this.w + 12, 8, COLORS.foam);
    ctx.globalAlpha = 1;
    // Rock columns.
    for (let c = 0; c < this.blocks.length; c++) {
      const h = this.blocks[c];
      const bx = x0 + c * 8;
      px(ctx, bx, base - h, 8, h, '#2b3350');
      px(ctx, bx, base - h, 8, 4, '#3f4a72');
      if (c % 3 === 0) px(ctx, bx + 2, base - h + 6, 4, 4, '#1b2138');
    }
    // Neon moss highlights.
    for (let c = 1; c < this.blocks.length; c += 4) {
      px(ctx, x0 + c * 8, base - this.blocks[c] - 3, 6, 3, COLORS.green);
    }
  }
}

/** Whirlpool: no damage, but drags and slows the player. */
export class Whirlpool {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.r = randInt(42, 66);
    this.w = this.r * 2; this.h = this.r * 2;
    this.kind = 'whirlpool';
    this.dead = false;
    this.age = rand(0, 10);
  }
  get body() { return { x: this.x, y: this.y, w: this.r * 1.1, h: this.r * 1.1 }; }

  update(dt, { scroll, player, particles }) {
    this.age += dt;
    this.y += scroll * 0.92 * dt;
    if (this.y > GAME_H + 100) this.dead = true;

    // Pull + slow the player when inside the radius.
    if (!player.dead) {
      const dx = this.x - player.x, dy = this.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < this.r) {
        const f = 1 - d / this.r;
        const tangential = Math.atan2(dy, dx) + Math.PI / 2;
        player.vx += (dx / (d || 1)) * 130 * f * dt + Math.cos(tangential) * 220 * f * dt;
        player.vy += (dy / (d || 1)) * 130 * f * dt + Math.sin(tangential) * 220 * f * dt;
        player.slowFactor = Math.min(player.slowFactor, 0.55);
      }
    }

    if (Math.random() < 0.5) {
      const a = rand(0, Math.PI * 2);
      const rr = this.r * rand(0.35, 1);
      particles.spawn({
        x: this.x + Math.cos(a) * rr, y: this.y + Math.sin(a) * rr,
        vx: Math.cos(a + Math.PI / 2) * 60, vy: Math.sin(a + Math.PI / 2) * 60,
        life: rand(0.3, 0.7), size: 3, color: COLORS.cyanDim, drag: 1, scrolls: true,
      });
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) {
      const rr = this.r * (1 - i * 0.2);
      const rot = this.age * (1.2 + i * 0.5);
      ctx.strokeStyle = i % 2 ? COLORS.cyanDim : '#1b4a6b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rr, rot, rot + Math.PI * 1.35);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.85;
    px(ctx, -4, -4, 8, 8, '#06101f');
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------------ */
/* Scroller                                                            */
/* ------------------------------------------------------------------ */

export class Scroller {
  /** @param {import('#game/Particle.js').ParticleSystem} particles */
  constructor(particles) {
    this.particles = particles;
    this.reset();
  }

  reset() {
    this.scroll = WORLD.baseScroll;
    this.targetScroll = WORLD.baseScroll;
    this.distance = 0;
    /** @type {Array<Mine|Island|Whirlpool>} */
    this.obstacles = [];
    /** @type {Array<{x:number,y:number,side:number}>} */
    this.buoys = [];
    this.buoyTimer = 0;
    this.obstacleTimer = 2.5;
    this.layers = WORLD.parallax.map(() => 0);
    this.waveSeedOffset = rand(0, 1000);
    this.difficulty = 0;
    // Pre-fill a couple of buoy pairs so the first screen isn't empty.
    for (let i = 0; i < 6; i++) this.buoys.push({ y: -i * 130, x: 0, side: i % 2 });
  }

  /** Distance travelled, in metres, for the HUD. */
  get metres() { return Math.floor(this.distance / 10); }

  /**
   * @param {number} dt
   * @param {object} o
   * @param {boolean} o.boosting
   * @param {import('#game/Player.js').Player} o.player
   * @param {number} o.difficulty 0..1 pacing scalar
   * @param {boolean} [o.spawnObstacles]
   */
  update(dt, { boosting, player, difficulty = 0, spawnObstacles = true }) {
    this.difficulty = difficulty;
    this.targetScroll = boosting ? WORLD.boostScroll : WORLD.baseScroll;
    this.targetScroll *= (1 + difficulty * 0.25) * (player?.slowFactor ?? 1);
    this.scroll = damp(this.scroll, this.targetScroll, WORLD.scrollLerp, dt);
    this.distance += this.scroll * dt;

    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i] = (this.layers[i] + this.scroll * WORLD.parallax[i] * dt) % 64;
    }

    // --- Buoys ---
    this.buoyTimer -= dt;
    if (this.buoyTimer <= 0) {
      this.buoyTimer = 130 / Math.max(60, this.scroll);
      const side = (this.buoys.length % 2);
      this.buoys.push({ y: -20, x: 0, side });
    }
    for (const b of this.buoys) b.y += this.scroll * dt;
    this.buoys = this.buoys.filter((b) => b.y < GAME_H + 40);

    // --- Obstacles ---
    if (spawnObstacles) {
      this.obstacleTimer -= dt;
      if (this.obstacleTimer <= 0) {
        this.obstacleTimer = rand(1.6, 3.2) / (1 + difficulty * 0.7);
        this.spawnObstacle();
      }
    }
    const api = { scroll: this.scroll, player, particles: this.particles };
    for (const o of this.obstacles) if (!o.dead) o.update(dt, api);
    this.obstacles = this.obstacles.filter((o) => !o.dead);
  }

  /** Spawn one random obstacle above the screen, avoiding the buoy lanes. */
  spawnObstacle() {
    const roll = Math.random();
    const x = rand(60, GAME_W - 60);
    if (roll < 0.5) {
      // Mines sometimes come in small clusters.
      const n = Math.random() < 0.35 ? randInt(2, 3) : 1;
      for (let i = 0; i < n; i++) {
        this.obstacles.push(new Mine(clamp(x + i * 40 - (n - 1) * 20, 40, GAME_W - 40), -40 - i * 12));
      }
    } else if (roll < 0.8) {
      this.obstacles.push(new Island(clamp(x, 70, GAME_W - 70), -70));
    } else {
      this.obstacles.push(new Whirlpool(clamp(x, 80, GAME_W - 80), -80));
    }
  }

  /** Remove every obstacle (used when a boss arrives). */
  clearObstacles(particles) {
    for (const o of this.obstacles) {
      if (particles && o.kind === 'mine') particles.explosion(o.x, o.y);
      o.dead = true;
    }
    this.obstacles.length = 0;
  }

  /* ---------------- rendering ---------------- */

  /** Water + parallax waves. Drawn before everything else. */
  drawBackground(ctx) {
    // Base gradient (cheap: three bands, no createLinearGradient churn).
    ctx.fillStyle = COLORS.navyDeep;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = COLORS.water0;
    ctx.fillRect(0, 90, GAME_W, GAME_H - 90);

    // Horizon glow band.
    const g = ctx.createLinearGradient(0, 0, 0, 150);
    g.addColorStop(0, '#1a0f3a');
    g.addColorStop(0.55, '#3a1160');
    g.addColorStop(1, COLORS.water0);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_W, 150);

    // Distant neon skyline.
    this.drawSkyline(ctx);

    // Parallax wave layers: rows of dashes sliding at different speeds.
    const layerColors = ['#12204a', '#173066', COLORS.cyanDim];
    for (let l = 0; l < 3; l++) {
      const off = this.layers[l];
      const step = 64 - l * 12;
      const alpha = 0.25 + l * 0.16;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = layerColors[l];
      const size = 2 + l;
      for (let y = -step + (off % step); y < GAME_H; y += step) {
        if (y < 96) continue;
        const phase = (y * 0.09 + this.distance * 0.004 * (l + 1) + this.waveSeedOffset);
        for (let x = -20; x < GAME_W + 20; x += 26 + l * 6) {
          const wob = Math.sin(phase + x * 0.05) * (6 + l * 5);
          ctx.fillRect(Math.round(x + wob), Math.round(y), 14 + l * 5, size);
        }
      }
    }
    ctx.globalAlpha = 1;

    // Moving speed streaks while fast (sells velocity).
    const spd = clamp((this.scroll - WORLD.baseScroll) / (WORLD.boostScroll - WORLD.baseScroll), 0, 1);
    if (spd > 0.05) {
      ctx.globalAlpha = 0.13 + spd * 0.22;
      ctx.fillStyle = COLORS.foam;
      for (let i = 0; i < 22; i++) {
        const x = ((i * 97 + this.waveSeedOffset * 13) % GAME_W);
        const y = ((i * 251 + this.distance * 1.6) % (GAME_H + 200)) - 100;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 24 + spd * 46);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Simple procedural skyline on the horizon. */
  drawSkyline(ctx) {
    const scrollX = (this.distance * 0.02) % 120;
    ctx.fillStyle = '#0d0a24';
    for (let i = -1; i < 10; i++) {
      const bx = i * 56 - scrollX;
      const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const bh = 24 + seed * 52;
      ctx.fillRect(Math.round(bx), Math.round(96 - bh), 40, bh);
    }
    // Window lights.
    ctx.fillStyle = COLORS.magenta;
    ctx.globalAlpha = 0.7;
    for (let i = -1; i < 10; i++) {
      const bx = i * 56 - scrollX;
      const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const bh = 24 + seed * 52;
      for (let w = 0; w < 4; w++) {
        const wy = 96 - bh + 8 + w * 12;
        if (wy > 92) break;
        if ((i + w) % 3 === 0) ctx.fillRect(Math.round(bx + 8 + (w % 2) * 18), Math.round(wy), 6, 4);
      }
    }
    ctx.globalAlpha = 1;
    // Water line.
    ctx.fillStyle = COLORS.cyanDim;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 94, GAME_W, 2);
    ctx.globalAlpha = 1;
  }

  /** Buoy markers — drawn under the entities. */
  drawBuoys(ctx) {
    for (const b of this.buoys) {
      const x = b.side ? GAME_W - 26 : 26;
      const c = b.side ? COLORS.green : COLORS.red;
      const bob = Math.sin((b.y + this.distance) * 0.02) * 3;
      const y = Math.round(b.y + bob);
      ctx.globalAlpha = 0.35;
      px(ctx, x - 10, y + 10, 20, 5, '#000');
      ctx.globalAlpha = 1;
      px(ctx, x - 7, y - 2, 14, 14, '#1b2545');
      px(ctx, x - 5, y, 10, 10, c);
      px(ctx, x - 2, y - 14, 4, 14, COLORS.grey);
      glow(ctx, c, 12, () => px(ctx, x - 4, y - 18, 8, 8, c));
    }
  }

  /** Obstacles — drawn between the water and the actors. */
  drawObstacles(ctx) {
    for (const o of this.obstacles) if (!o.dead) o.draw(ctx);
  }
}
