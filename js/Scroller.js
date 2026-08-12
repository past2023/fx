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
  GAME_W, GAME_H, HORIZON, WORLD, COLORS, PX, rand, randInt, clamp, damp, pick,
} from '#game/config.js';
import { SPR_MINE, PAL_MINE, drawMatrix, drawMatrixFlat, px, glow } from '#game/Sprite.js';
import { art } from '#game/Assets.js';
import { sfx } from '#game/Sound.js';


/**
 * Cheap deterministic hash → [0,1). Used for stable procedural scatter that
 * scrolls with the water instead of flickering every frame.
 * @param {number} n
 * @returns {number}
 */
function hash(n) {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * '#rrggbb' → [r,g,b].
 * @param {string} hex
 * @returns {number[]}
 */
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/**
 * Blend two rgb triplets into a CSS colour string.
 * @param {number[]} a @param {number[]} b @param {number} t
 * @returns {string}
 */
function mixRgb(a, b, t) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

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
    if (!art.draw(ctx, 'obstacle.mine', this.x, this.y, { frame: pulse > 0.5 ? 1 : 0 })) {
      if (this.flash > 0) drawMatrixFlat(ctx, SPR_MINE, this.x, this.y, 3.5, COLORS.white);
      else drawMatrix(ctx, SPR_MINE, PAL_MINE, this.x, this.y, 3.5);
    }
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
    if (art.draw(ctx, 'obstacle.island', this.x, this.y)) return;
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
      px(ctx, bx, base - h, 8, h, COLORS.rock);
      px(ctx, bx, base - h, 8, 4, COLORS.rockLight);
      if (c % 3 === 0) px(ctx, bx + 2, base - h + 6, 4, 4, '#5d6f80');
    }
    // Neon moss highlights.
    for (let c = 1; c < this.blocks.length; c += 4) {
      px(ctx, x0 + c * 8, base - this.blocks[c] - 3, 6, 3, COLORS.palm);
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
    if (art.draw(ctx, 'obstacle.whirlpool', this.x, this.y, {
      frame: Math.floor(this.age * 12) % 8, rot: this.age * 0.6,
    })) return;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) {
      const rr = this.r * (1 - i * 0.2);
      const rot = this.age * (1.2 + i * 0.5);
      ctx.strokeStyle = i % 2 ? COLORS.crest : COLORS.foamSoft;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rr, rot, rot + Math.PI * 1.35);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.85;
    px(ctx, -4, -4, 8, 8, COLORS.seaAbyss);
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
  update(dt, { boosting, player, difficulty = 0, spawnObstacles = true, mineBias = 0.5 }) {
    this.mineBias = mineBias;
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
    // `mineBias` comes from the course section: reefs and straits are mined
    // heavily, harbour and rescue zones barely at all.
    const mineChance = clamp(0.25 + (this.mineBias ?? 0.5) * 0.55, 0.1, 0.85);
    if (roll < mineChance) {
      // Mines sometimes come in small clusters.
      const n = Math.random() < 0.35 ? randInt(2, 3) : 1;
      for (let i = 0; i < n; i++) {
        this.obstacles.push(new Mine(clamp(x + i * 40 - (n - 1) * 20, 40, GAME_W - 40), -40 - i * 12));
      }
    } else if (roll < mineChance + (1 - mineChance) * 0.6) {
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

  /**
   * Water + parallax waves. Drawn before everything else.
   *
   * Layering, back to front:
   *   1. depth ramp      — banded ocean-blue gradient, teal far → dark near
   *   2. sky + skyline   — sunset band and the neon city on the horizon
   *   3. sun glitter      — reflected highlight column on the water
   *   4. swell layers     — 3 parallax rows of rolling wave bodies
   *   5. foam crests      — white caps riding the nearest swells
   *   6. speed streaks    — velocity cue while boosting
   *
   * If `ART.water` textures are supplied, tiled PNG layers replace steps
   * 1/4/5 automatically (see assets/ASSET_GUIDE.md).
   */
  drawBackground(ctx) {
    // If a full water texture set is loaded, use the image pipeline instead.
    if (art.hasWater()) { this.drawBackgroundTextured(ctx); return; }

    /* 1. Depth ramp -------------------------------------------------- */
    this.drawDepthRamp(ctx);

    /* 2. Sky + skyline ------------------------------------------------ */
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 8);
    g.addColorStop(0, COLORS.skyTop);
    g.addColorStop(0.55, COLORS.skyMid);
    g.addColorStop(0.9, COLORS.skyLow);
    g.addColorStop(1, COLORS.seaFar);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME_W, HORIZON + 8);
    this.drawClouds(ctx);
    this.drawSkyline(ctx);

    /* 3. Sun glitter on the water ------------------------------------ */
    this.drawGlitter(ctx);

    /* 4. Swell layers ------------------------------------------------- */
    this.drawSwells(ctx);

    /* 5. Foam crests --------------------------------------------------- */
    this.drawCrests(ctx);

    /* 6. Speed streaks ------------------------------------------------- */
    const spd = clamp((this.scroll - WORLD.baseScroll) / (WORLD.boostScroll - WORLD.baseScroll), 0, 1);
    if (spd > 0.05) {
      ctx.globalAlpha = 0.1 + spd * 0.2;
      ctx.fillStyle = COLORS.foamSoft;
      for (let i = 0; i < 22; i++) {
        const x = ((i * 97 + this.waveSeedOffset * 13) % GAME_W);
        const y = ((i * 251 + this.distance * 1.6) % (GAME_H + 200)) - 100;
        if (y < HORIZON) continue;
        ctx.fillRect(Math.round(x), Math.round(y), 2, 20 + spd * 44);
      }
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Banded ocean depth gradient. Bright teal at the horizon fading to a deep
   * blue at the player, drawn as discrete bands to stay pixel-art honest.
   */
  drawDepthRamp(ctx) {
    ctx.fillStyle = COLORS.seaAbyss;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Band colours are identical every frame, so build them once.
    if (!this._rampBands) {
      const stops = [COLORS.seaFar, COLORS.seaMid, COLORS.seaBase, COLORS.seaDeep, COLORS.seaAbyss]
        .map(hexToRgb);
      const bands = 40;
      this._rampBands = [];
      for (let i = 0; i < bands; i++) {
        const t = i / (bands - 1);
        // Ease so the bright water near the horizon holds a little longer.
        const e = Math.pow(t, 0.8) * (stops.length - 1);
        const idx = Math.min(stops.length - 2, Math.floor(e));
        this._rampBands.push(mixRgb(stops[idx], stops[idx + 1], e - idx));
      }
    }

    // The ramp never changes, so bake it into an offscreen canvas once and
    // blit it as a single drawImage each frame.
    if (!this._rampCanvas && typeof document !== 'undefined' && document.createElement) {
      const top = HORIZON;
      const bands = this._rampBands;
      const bandH = Math.ceil((GAME_H - top) / bands.length);
      const c = document.createElement('canvas');
      c.width = GAME_W; c.height = GAME_H;
      const cx = c.getContext('2d');
      cx.fillStyle = COLORS.seaAbyss;
      cx.fillRect(0, 0, GAME_W, GAME_H);
      for (let i = 0; i < bands.length; i++) {
        cx.fillStyle = bands[i];
        cx.fillRect(0, Math.round(top + i * bandH), GAME_W, bandH + 1);
      }
      this._rampCanvas = c;
    }
    if (this._rampCanvas) { ctx.drawImage(this._rampCanvas, 0, 0); return; }

    // Fallback (no DOM, e.g. headless tests): draw the bands directly.
    const top = HORIZON;
    const bands = this._rampBands;
    const bandH = Math.ceil((GAME_H - top) / bands.length);
    for (let i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i];
      ctx.fillRect(0, Math.round(top + i * bandH), GAME_W, bandH + 1);
    }
  }

  /**
   * Shimmering sun reflection. Scattered specular dashes concentrated in a
   * soft column under the sun — deliberately irregular so it never reads as
   * a road or a repeating pattern.
   */
  drawGlitter(ctx) {
    const cx = GAME_W * 0.5 + Math.sin(this.distance * 0.0006) * 50;
    ctx.save();
    // Warm midday sunlight on the water rather than a cold moon-path.
    ctx.fillStyle = COLORS.sun;
    // Deterministic hash keyed on a scrolling row index, so specks drift with
    // the water instead of flickering in place.
    const rowH = 7;
    const scrollRows = Math.floor(this.distance / rowH);
    const rows = Math.ceil((GAME_H - HORIZON) / rowH);
    for (let r = 0; r < rows; r++) {
      const y = HORIZON + r * rowH + (this.distance % rowH);
      if (y < HORIZON || y > GAME_H) continue;
      const depth = (y - HORIZON) / (GAME_H - HORIZON);
      const id = r + scrollRows;
      const spread = 30 + depth * 210;
      const count = 2 + (hash(id * 3.7) * 3 | 0);
      for (let k = 0; k < count; k++) {
        const h1 = hash(id * 12.9 + k * 78.2);
        const h2 = hash(id * 4.1 + k * 33.7);
        // Bias specks toward the column centre (h1 pushed through a cube).
        const t = (h1 * 2 - 1);
        const x = cx + t * Math.abs(t) * spread;
        const a = (0.5 - depth * 0.34) * (0.35 + h2 * 0.65);
        if (a <= 0.03) continue;
        const w = Math.max(2, (3 + h2 * 9) * (1 - depth * 0.45));
        ctx.globalAlpha = a;
        ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /**
   * Three parallax layers of rolling swells. Each swell is a shallow arc of
   * pixels: a darker trough body with a lighter top edge, so the ocean reads
   * as moving water volume rather than flat stripes.
   */
  drawSwells(ctx) {
    const layers = [
      { step: 78, amp: 10, body: COLORS.seaDeep, lip: COLORS.seaBase, alpha: 0.55, len: 90,  h: 6, wl: 150 },
      { step: 62, amp: 13, body: COLORS.seaBase, lip: COLORS.crest,   alpha: 0.6,  len: 120, h: 8, wl: 190 },
      { step: 50, amp: 17, body: COLORS.seaMid,  lip: COLORS.crestHi, alpha: 0.65, len: 160, h: 10, wl: 240 },
    ];

    for (let l = 0; l < layers.length; l++) {
      const L = layers[l];
      const off = ((this.layers[l] % L.step) + L.step) % L.step;
      const rowIndex = Math.floor(this.layers[l] / L.step);
      for (let i = -1; (HORIZON - L.step + off + i * L.step) < GAME_H + L.step; i++) {
        const baseY = HORIZON - L.step + off + i * L.step;
        if (baseY < HORIZON - L.step) continue;
        const depth = clamp((baseY - HORIZON) / (GAME_H - HORIZON), 0, 1);
        if (depth < -0.1) continue;
        // Perspective: waves are small and tight near the horizon.
        const persp = 0.22 + depth * 0.78;
        const id = rowIndex - i + l * 101;
        // Each swell is a run of segments following a sine, so it reads as a
        // continuous rolling crest rather than a dotted line.
        const runs = 1 + (hash(id * 5.3) * 2 | 0);
        for (let r = 0; r < runs; r++) {
          const h1 = hash(id * 9.1 + r * 41.7);
          const runW = (L.len * (0.5 + h1)) * persp;
          const startX = -60 + hash(id * 2.7 + r * 17.3) * (GAME_W + 120);
          const phase = hash(id * 7.7 + r * 3.1) * Math.PI * 2;
          const amp = L.amp * persp;
          const hh = Math.max(2, Math.round(L.h * persp));
          const seg = Math.max(3, Math.round(7 * persp));
          for (let x = startX; x < startX + runW; x += seg) {
            if (x < -seg || x > GAME_W) continue;
            const u = (x - startX) / runW;                 // 0..1 along the crest
            // Taper the ends so crests fade in/out instead of cutting off.
            const taper = Math.sin(clamp(u, 0, 1) * Math.PI);
            if (taper < 0.12) continue;
            const yy = baseY + Math.sin(phase + (x / L.wl) * Math.PI * 2) * amp;
            const bh = Math.max(2, Math.round(hh * taper));
            ctx.globalAlpha = L.alpha * taper;
            ctx.fillStyle = L.body;
            ctx.fillRect(Math.round(x), Math.round(yy), seg + 1, bh);
            // Bright lip sits on the leading (upper) edge of the swell.
            ctx.globalAlpha = L.alpha * taper * 0.95;
            ctx.fillStyle = L.lip;
            ctx.fillRect(Math.round(x), Math.round(yy) - 1, seg + 1, Math.max(1, Math.round(bh * 0.45)));
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /**
   * White foam caps. Sparse near the horizon, chunkier near the player, and
   * noticeably more frequent at speed — the sea "whips up" when you boost.
   */
  drawCrests(ctx) {
    const spd = clamp((this.scroll - WORLD.baseScroll) / (WORLD.boostScroll - WORLD.baseScroll), 0, 1);
    const step = 54;
    const off = ((this.layers[2] % step) + step) % step;
    const rowIndex = Math.floor(this.layers[2] / step);
    const wl = 240;

    ctx.save();
    for (let i = -1; (HORIZON - step + off + i * step) < GAME_H + step; i++) {
      const baseY = HORIZON - step + off + i * step;
      if (baseY < HORIZON - 6) continue;
      const depth = clamp((baseY - HORIZON) / (GAME_H - HORIZON), 0, 1);
      const persp = 0.25 + depth * 0.75;
      const id = rowIndex - i;

      // A couple of whitecaps per row; more of them the faster you go.
      const caps = 1 + (hash(id * 6.1) * 3 | 0) + (spd > 0.4 ? 1 : 0);
      for (let c = 0; c < caps; c++) {
        const h1 = hash(id * 15.7 + c * 61.3);
        const h2 = hash(id * 23.9 + c * 12.1);
        if (h2 < 0.34 - spd * 0.22 - depth * 0.12) continue;

        const capW = (26 + h1 * 54) * persp;
        const startX = -40 + h1 * (GAME_W + 80);
        const phase = hash(id * 3.3 + c * 8.9) * Math.PI * 2;
        const amp = 17 * persp;
        const seg = Math.max(3, Math.round(6 * persp));
        const thick = Math.max(2, Math.round(5 * persp));

        for (let x = startX; x < startX + capW; x += seg) {
          if (x < -seg || x > GAME_W) continue;
          const u = (x - startX) / capW;
          const taper = Math.sin(clamp(u, 0, 1) * Math.PI);
          if (taper < 0.15) continue;
          const yy = baseY + Math.sin(phase + (x / wl) * Math.PI * 2) * amp;
          const a = (0.45 + depth * 0.5) * taper;

          // Soft under-foam, bright core, and a spray wisp trailing behind.
          ctx.globalAlpha = a * 0.55;
          ctx.fillStyle = COLORS.foamSoft;
          ctx.fillRect(Math.round(x), Math.round(yy), seg + 1, thick + 1);
          ctx.globalAlpha = a;
          ctx.fillStyle = COLORS.foam;
          ctx.fillRect(Math.round(x), Math.round(yy) - 1, seg + 1, Math.max(1, thick - 1));
          if (taper > 0.55 && hash(id * 31.1 + x) > 0.55) {
            ctx.globalAlpha = a * 0.4;
            ctx.fillStyle = COLORS.foamEdge;
            ctx.fillRect(Math.round(x), Math.round(yy) + thick + 1, Math.max(2, seg - 1), 2);
          }
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /**
   * Texture-driven variant of `drawBackground`, used automatically once
   * water PNGs are registered. Tiles each layer vertically with its own
   * parallax offset.
   */
  drawBackgroundTextured(ctx) {
    const sky = art.get('water.sky');
    if (sky) ctx.drawImage(sky, 0, 0, GAME_W, HORIZON + 8);
    else { this.drawDepthRamp(ctx); }

    const deep = art.get('water.deep');
    if (deep) art.tileY(ctx, deep, this.layers[0], HORIZON, GAME_H);
    else this.drawDepthRamp(ctx);

    this.drawSkyline(ctx);

    const mid = art.get('water.waves');
    if (mid) art.tileY(ctx, mid, this.layers[1], HORIZON, GAME_H, 0.85);
    const foam = art.get('water.foam');
    if (foam) art.tileY(ctx, foam, this.layers[2], HORIZON, GAME_H, 0.9);
  }

  /** Simple procedural skyline on the horizon. */
  /** Fluffy pixel clouds drifting slowly across the summer sky. */
  drawClouds(ctx) {
    const drift = this.distance * 0.012;
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const seed = hash(i * 3.77);
      const seed2 = hash(i * 9.13);
      const x = ((i * 92 + seed * 60 - drift) % (GAME_W + 160)) - 80;
      const y = 8 + seed2 * 48;
      const w = 30 + seed * 46;
      const h = 8 + seed2 * 7;
      ctx.globalAlpha = 0.55 + seed2 * 0.35;
      // Chunky 3-lump cloud, pixel-art style.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x), Math.round(y + h * 0.4), Math.round(w), Math.round(h));
      ctx.fillRect(Math.round(x + w * 0.2), Math.round(y), Math.round(w * 0.45), Math.round(h));
      ctx.fillRect(Math.round(x + w * 0.55), Math.round(y + h * 0.15), Math.round(w * 0.3), Math.round(h * 0.8));
      // Soft underside shading.
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = COLORS.skyLow;
      ctx.fillRect(Math.round(x), Math.round(y + h * 1.2), Math.round(w), 3);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /**
   * Sunny tropical coastline on the horizon: green headlands, sandy beaches
   * and the occasional white resort block — the daytime replacement for the
   * old neon skyline.
   */
  drawSkyline(ctx) {
    const scrollX = (this.distance * 0.02) % 120;

    for (let i = -1; i < 11; i++) {
      const bx = i * 56 - scrollX;
      const seed = hash(i * 12.9898);
      const seed2 = hash(i * 4.213);

      if (seed > 0.62) {
        // Green island hill.
        const bh = 20 + seed2 * 30;
        ctx.fillStyle = '#2f9e5c';
        ctx.fillRect(Math.round(bx + 4), Math.round(HORIZON - bh), 48, bh);
        ctx.fillStyle = '#3fbf70';
        ctx.fillRect(Math.round(bx + 4), Math.round(HORIZON - bh), 48, 5);
        ctx.fillStyle = '#25804a';
        ctx.fillRect(Math.round(bx + 4), Math.round(HORIZON - 8), 48, 8);
        // Beach strip at the waterline.
        ctx.fillStyle = COLORS.sand;
        ctx.fillRect(Math.round(bx), Math.round(HORIZON - 4), 56, 4);
      } else if (seed > 0.34) {
        // Low white resort block.
        const bh = 12 + seed2 * 20;
        ctx.fillStyle = '#f4f7f8';
        ctx.fillRect(Math.round(bx + 10), Math.round(HORIZON - bh), 34, bh);
        ctx.fillStyle = '#d9e4e8';
        ctx.fillRect(Math.round(bx + 10), Math.round(HORIZON - bh), 34, 3);
        // Windows.
        ctx.fillStyle = '#8fd0e8';
        for (let w = 0; w < 3; w++) {
          const wy = HORIZON - bh + 6 + w * 8;
          if (wy > HORIZON - 5) break;
          ctx.fillRect(Math.round(bx + 14), Math.round(wy), 5, 4);
          ctx.fillRect(Math.round(bx + 30), Math.round(wy), 5, 4);
        }
        ctx.fillStyle = COLORS.sand;
        ctx.fillRect(Math.round(bx), Math.round(HORIZON - 4), 56, 4);
      } else {
        // Open sandy beach with a palm or two.
        ctx.fillStyle = COLORS.sand;
        ctx.fillRect(Math.round(bx), Math.round(HORIZON - 6), 56, 6);
        if (seed2 > 0.45) {
          const tx = Math.round(bx + 18 + seed2 * 16);
          ctx.fillStyle = '#8a6b3a';
          ctx.fillRect(tx, HORIZON - 20, 3, 14);
          ctx.fillStyle = COLORS.palm;
          ctx.fillRect(tx - 7, HORIZON - 23, 17, 4);
          ctx.fillRect(tx - 4, HORIZON - 26, 11, 3);
        }
      }
    }

    // Bright surf line where the sea meets the land.
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = COLORS.foam;
    ctx.fillRect(0, HORIZON - 2, GAME_W, 3);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COLORS.crestHi;
    ctx.fillRect(0, HORIZON + 1, GAME_W, 2);
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
      const bkey = b.side ? 'world.buoyGreen' : 'world.buoyRed';
      if (art.draw(ctx, bkey, x, y, { frame: Math.floor(this.distance * 0.05 + b.y) % 2 })) continue;
      px(ctx, x - 7, y - 2, 14, 14, '#ffffff');
      px(ctx, x - 5, y, 10, 10, c);
      px(ctx, x - 2, y - 14, 4, 14, '#f0f4f6');
      glow(ctx, c, 12, () => px(ctx, x - 4, y - 18, 8, 8, c));
    }
  }

  /** Obstacles — drawn between the water and the actors. */
  drawObstacles(ctx) {
    for (const o of this.obstacles) if (!o.dead) o.draw(ctx);
  }
}
