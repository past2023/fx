// File: js/Particle.js
/**
 * Chunky pixel particles: explosions, wake trails, sparks, shockwaves
 * and floating score popups. Pooled so long sessions never allocate.
 */

import { COLORS, PX, rand, randInt, pick, clamp } from '#game/config.js';

/** One pooled particle. Reset via `set()` instead of being re-allocated. */
class Particle {
  constructor() { this.dead = true; }

  /**
   * (Re)initialise this particle.
   * @param {object} o particle description
   */
  set(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx ?? 0; this.vy = o.vy ?? 0;
    this.life = o.life ?? 0.6;
    this.maxLife = this.life;
    this.size = o.size ?? PX;
    this.color = o.color ?? COLORS.cyan;
    this.fade = o.fade ?? true;
    this.drag = o.drag ?? 2.2;
    this.gravity = o.gravity ?? 0;
    this.scrolls = o.scrolls ?? false;   // drifts with the water
    this.shrink = o.shrink ?? true;
    this.ring = o.ring ?? false;         // expanding shockwave ring
    this.ringR = o.ringR ?? 0;
    this.ringGrow = o.ringGrow ?? 260;
    this.text = o.text ?? null;          // score popup
    this.dead = false;
    return this;
  }

  /** @param {number} dt @param {number} scroll world scroll speed px/s */
  update(dt, scroll) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    const d = Math.exp(-this.drag * dt);
    this.vx *= d; this.vy *= d;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt + (this.scrolls ? scroll * dt : 0);
    if (this.ring) this.ringR += this.ringGrow * dt;
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const t = clamp(this.life / this.maxLife, 0, 1);
    ctx.globalAlpha = this.fade ? t : 1;

    if (this.text) {
      ctx.fillStyle = this.color;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.text, Math.round(this.x), Math.round(this.y));
      ctx.globalAlpha = 1;
      return;
    }

    if (this.ring) {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(2, 5 * t);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    const s = Math.max(2, this.shrink ? this.size * (0.35 + 0.65 * t) : this.size);
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x - s / 2), Math.round(this.y - s / 2), Math.round(s), Math.round(s));
    ctx.globalAlpha = 1;
  }
}

/** Fixed-capacity particle pool + all the canned effects. */
export class ParticleSystem {
  /** @param {number} [cap] maximum simultaneous particles */
  constructor(cap = 900) {
    /** @type {Particle[]} */
    this.pool = Array.from({ length: cap }, () => new Particle());
    this.cursor = 0;
  }

  /** Grab the next free (or oldest) particle slot. */
  spawn(o) {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    return p.set(o);
  }

  /** Advance every live particle. */
  update(dt, scroll = 0) {
    for (const p of this.pool) if (!p.dead) p.update(dt, scroll);
  }

  /** Render every live particle (additive-ish glow via lighter blend). */
  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.pool) if (!p.dead && !p.text) p.draw(ctx);
    ctx.restore();
    for (const p of this.pool) if (!p.dead && p.text) p.draw(ctx);
  }

  /** Kill everything (state transitions). */
  clear() { for (const p of this.pool) p.dead = true; }

  /* ---------------- canned effects ---------------- */

  /**
   * Classic pixel explosion: 20–30 chunks + a shockwave ring + core flash.
   * @param {number} x @param {number} y
   * @param {string[]} [palette]
   * @param {number} [scale] 1 = normal kill, 2+ = boss
   */
  explosion(x, y, palette = [COLORS.yellow, COLORS.orange, COLORS.red, COLORS.white], scale = 1) {
    const n = randInt(20, 30) * scale;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(60, 300) * scale;
      this.spawn({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.3, 0.85) * scale,
        size: randInt(2, 5) * PX * 0.75 * scale,
        color: pick(palette),
        drag: rand(1.5, 3.5),
      });
    }
    this.spawn({ x, y, life: 0.34 * scale, ring: true, ringR: 4, ringGrow: 300 * scale, color: COLORS.white, size: 0 });
    this.spawn({ x, y, life: 0.12, size: 18 * scale, color: COLORS.white, drag: 0, shrink: true });
  }

  /** Small directional spark burst when a bullet connects. */
  hitSpark(x, y, color = COLORS.cyan, n = 7) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 160);
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.12, 0.3), size: PX * 0.9, color, drag: 4,
      });
    }
  }

  /** Foam wake behind a boat. */
  wake(x, y, intensity = 1, color = COLORS.foam) {
    if (Math.random() > 0.55 * intensity) return;
    this.spawn({
      x: x + rand(-6, 6), y: y + rand(-2, 4),
      vx: rand(-30, 30) * intensity, vy: rand(40, 130) * intensity,
      life: rand(0.25, 0.6), size: randInt(2, 4) * 2,
      color, drag: 1.6, scrolls: true,
    });
  }

  /** Engine flame puff while boosting. */
  boostFlame(x, y) {
    this.spawn({
      x: x + rand(-5, 5), y,
      vx: rand(-40, 40), vy: rand(140, 260),
      life: rand(0.15, 0.35), size: randInt(3, 6) * 2,
      color: pick([COLORS.cyan, COLORS.white, COLORS.magenta]),
      drag: 2.4,
    });
  }

  /** Missile smoke trail. */
  smoke(x, y) {
    this.spawn({
      x: x + rand(-2, 2), y,
      vx: rand(-14, 14), vy: rand(20, 70),
      life: rand(0.25, 0.5), size: randInt(2, 4) * 2,
      color: pick([COLORS.magenta, COLORS.magentaDim, COLORS.white]),
      drag: 2, scrolls: true,
    });
  }

  /** Splash when something heavy hits the water. */
  splash(x, y, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0);
      const sp = rand(60, 190);
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.3, 0.6), size: randInt(2, 4) * 2,
        color: pick([COLORS.foam, COLORS.white, COLORS.cyanDim]),
        gravity: 420, drag: 0.6,
      });
    }
  }

  /** Floating score / combo text. */
  popup(x, y, text, color = COLORS.yellow) {
    this.spawn({ x, y, vy: -46, life: 0.9, text, color, drag: 0.9 });
  }

  /** Pickup sparkle burst. */
  sparkle(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.spawn({
        x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
        life: rand(0.25, 0.5), size: PX, color, drag: 3.4,
      });
    }
    this.spawn({ x, y, life: 0.3, ring: true, ringR: 2, ringGrow: 190, color, size: 0 });
  }
}
