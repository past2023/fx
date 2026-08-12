// File: js/Enemy.js
/**
 * Enemy base class plus the four archetypes:
 *   Grunt       — strafing gunboat that sidles left/right and shoots plasma
 *   JetSki      — fragile kamikaze that locks on and rams
 *   Helicopter  — hovers above the lane and drops arcing bombs
 *   Boss        — destroyer ship with high HP, turrets and multi-stage death
 *
 * All enemies share the centre-anchored { x, y, w, h } body contract so
 * Collision.js can treat them uniformly.
 */

import {
  GAME_W, GAME_H, ENEMY, COLORS, PX, rand, randInt, clamp, damp,
} from '#game/config.js';
import {
  SPR_GRUNT, PAL_GRUNT, SPR_JETSKI, PAL_JETSKI, SPR_HELI, PAL_HELI,
  drawMatrix, drawMatrixFlat, px, pxBorder, glow,
} from '#game/Sprite.js';
import { sfx } from '#game/Sound.js';
import { art } from '#game/Assets.js';

/** Shared behaviour: HP, hit flash, death burst, off-screen culling. */
export class Enemy {
  /**
   * @param {number} x @param {number} y
   * @param {object} stats one of the ENEMY entries
   * @param {string} type
   */
  constructor(x, y, stats, type) {
    this.x = x; this.y = y;
    this.w = stats.w; this.h = stats.h;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.score = stats.score;
    this.speed = stats.speed;
    this.fireRate = stats.fireRate;
    this.type = type;
    this.dead = false;
    this.flash = 0;
    this.age = 0;
    this.fireTimer = rand(0.4, 1.6);
    this.hitPushX = 0;
    this.hitPushY = 0;
    this.isBoss = false;
  }

  get body() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  /**
   * Apply damage.
   * @param {number} dmg
   * @param {object} api { particles, addScore, shake }
   * @returns {boolean} true if this hit was lethal
   */
  damage(dmg, api) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.flash = 0.09;
    if (this.hp <= 0) { this.kill(api); return true; }
    sfx.play('hit');
    return false;
  }

  /**
   * Destroy with the full juice package.
   * @param {object} api { particles, shake }
   */
  kill({ particles, shake }) {
    this.dead = true;
    particles.explosion(this.x, this.y);
    particles.splash(this.x, this.y + this.h / 2, 8);
    shake(this.isBoss ? 22 : 6);
    sfx.play(this.isBoss ? 'bigExplode' : 'explode');
  }

  /** Common per-frame housekeeping; subclasses call super.update(). */
  update(dt, api) {
    this.age += dt;
    if (this.flash > 0) this.flash -= dt;
    // Knockback decay from bullet impacts.
    this.hitPushX = damp(this.hitPushX, 0, 10, dt);
    this.hitPushY = damp(this.hitPushY, 0, 10, dt);
    this.x += this.hitPushX * dt;
    this.y += this.hitPushY * dt;
    // Cull once fully below the screen.
    if (this.y > GAME_H + 90) this.dead = true;
  }

  /** Small HP pip bar shown once damaged. */
  drawHealth(ctx, width = this.w) {
    if (this.hp >= this.maxHp || this.dead) return;
    const w = width, h = 3;
    const x = this.x - w / 2, y = this.y - this.h / 2 - 8;
    px(ctx, x, y, w, h, '#000');
    px(ctx, x, y, w * clamp(this.hp / this.maxHp, 0, 1), h, COLORS.green);
  }
}

/* ------------------------------------------------------------------ */
/* Grunt — strafing gunboat                                            */
/* ------------------------------------------------------------------ */
export class Grunt extends Enemy {
  constructor(x, y, level = 0) {
    super(x, y, ENEMY.grunt, 'grunt');
    this.hp = this.maxHp = ENEMY.grunt.hp + Math.floor(level / 2);
    this.strafePhase = rand(0, Math.PI * 2);
    this.strafeAmp = rand(40, 110);
    this.level = level;
  }

  update(dt, api) {
    super.update(dt, api);
    if (this.dead) return;
    this.y += (this.speed + api.scroll * 0.35) * dt;
    this.x += Math.cos(this.age * 1.7 + this.strafePhase) * this.strafeAmp * dt;
    this.x = clamp(this.x, this.w / 2, GAME_W - this.w / 2);

    api.particles.wake(this.x, this.y + this.h / 2, 0.4, COLORS.cyanDim);

    // Grunts only shoot once they're properly on-screen and settled, and the
    // director caps how many may fire at once so dense waves stay readable.
    this.fireTimer -= dt;
    const canFire = this.age > 0.8 && this.y > 100 && this.y < GAME_H * 0.72;
    if (this.fireTimer <= 0 && canFire && api.requestFire?.(this) !== false) {
      this.fireTimer = this.fireRate * rand(0.85, 1.5);
      const p = api.player;
      const a = Math.atan2(p.y - this.y, p.x - this.x) + rand(-0.14, 0.14);
      const sp = 185 + this.level * 6;
      api.bullets.spawn({
        x: this.x, y: this.y + this.h / 2,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        kind: 'enemy', friendly: false, damage: 1, life: 4,
      });
      sfx.play('hit');
    }
  }

  draw(ctx) {
    const s = PX;
    const frame = Math.floor(this.age * 6) % 2;
    if (!art.draw(ctx, 'enemy.grunt', this.x, this.y, { frame })) {
      if (this.flash > 0) drawMatrixFlat(ctx, SPR_GRUNT, this.x, this.y, s, COLORS.white);
      else drawMatrix(ctx, SPR_GRUNT, PAL_GRUNT, this.x, this.y, s);
      // Blinking targeting eye.
      if (Math.floor(this.age * 4) % 2 === 0) {
        glow(ctx, COLORS.red, 6, () => px(ctx, this.x - 2, this.y - 2, 4, 4, COLORS.yellow));
      }
    } else if (this.flash > 0) {
      // Hit flash over PNG art: additive white silhouette.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      art.draw(ctx, 'enemy.grunt', this.x, this.y, { frame, alpha: 0.9 });
      ctx.restore();
    }
    this.drawHealth(ctx);
  }
}

/* ------------------------------------------------------------------ */
/* JetSki — kamikaze rammer                                            */
/* ------------------------------------------------------------------ */
export class JetSki extends Enemy {
  constructor(x, y, level = 0) {
    super(x, y, ENEMY.jetski, 'jetski');
    this.hp = this.maxHp = ENEMY.jetski.hp + Math.floor(level / 3);
    this.lockTimer = rand(0.25, 0.7);
    this.vx = 0;
    this.locked = false;
    this.speed = ENEMY.jetski.speed + level * 6;
  }

  update(dt, api) {
    super.update(dt, api);
    if (this.dead) return;
    // Telegraph phase: line up on the player's X while still high on screen,
    // so the charge is always visible coming and can be dodged or shot.
    if (!this.locked) {
      this.lockTimer -= dt;
      this.vx = damp(this.vx, (api.player.x - this.x) * 2.2, 5, dt);
      if (this.lockTimer <= 0 && this.y > 130) { this.locked = true; sfx.play('ui'); }
      this.y += (this.speed * 0.35 + api.scroll * 0.5) * dt;
    } else {
      this.vx = damp(this.vx, (api.player.x - this.x) * 1.1, 2.2, dt);
      this.y += (this.speed + api.scroll * 0.5) * dt;
    }
    this.x = clamp(this.x + this.vx * dt, this.w / 2, GAME_W - this.w / 2);

    api.particles.wake(this.x, this.y + this.h / 2, this.locked ? 1.2 : 0.5, COLORS.magentaDim);
  }

  draw(ctx) {
    const s = PX * 0.9;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.rotate(clamp(this.vx / 400, -0.5, 0.5));
    const frame = this.locked ? 1 : 0;
    if (!art.draw(ctx, 'enemy.jetski', 0, 0, { frame })) {
      if (this.flash > 0) drawMatrixFlat(ctx, SPR_JETSKI, 0, 0, s, COLORS.white);
      else drawMatrix(ctx, SPR_JETSKI, PAL_JETSKI, 0, 0, s);
    } else if (this.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      art.draw(ctx, 'enemy.jetski', 0, 0, { frame, alpha: 0.9 });
      ctx.restore();
    }
    ctx.restore();
    // Lock-on warning glint.
    if (this.locked && Math.floor(this.age * 10) % 2 === 0) {
      glow(ctx, COLORS.magenta, 8, () => px(ctx, this.x - 1, this.y - this.h / 2 - 6, 2, 4, COLORS.white));
    }
    this.drawHealth(ctx);
  }
}

/* ------------------------------------------------------------------ */
/* Helicopter — hovering bomber                                        */
/* ------------------------------------------------------------------ */
export class Helicopter extends Enemy {
  constructor(x, y, level = 0) {
    super(x, y, ENEMY.helicopter, 'helicopter');
    this.hp = this.maxHp = ENEMY.helicopter.hp + level;
    this.hoverY = rand(120, 300);
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.rotor = 0;
    this.level = level;
  }

  update(dt, api) {
    super.update(dt, api);
    if (this.dead) return;
    this.rotor += dt * 34;
    // Descend to hover height, then sweep sideways.
    if (this.y < this.hoverY) this.y += this.speed * dt;
    else this.y += Math.sin(this.age * 2) * 14 * dt;
    this.x += this.dir * (this.speed * 0.9) * dt;
    if (this.x < this.w / 2 + 6) { this.x = this.w / 2 + 6; this.dir = 1; }
    if (this.x > GAME_W - this.w / 2 - 6) { this.x = GAME_W - this.w / 2 - 6; this.dir = -1; }

    // Lifetime cap so they eventually leave.
    if (this.age > 14) this.y += 120 * dt;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.y >= this.hoverY - 10 && api.requestFire?.(this) !== false) {
      this.fireTimer = this.fireRate * rand(0.9, 1.4);
      api.bullets.spawn({
        x: this.x, y: this.y + this.h / 2,
        vx: this.dir * 30, vy: 90,
        kind: 'bomb', friendly: false, damage: 1, life: 6,
      });
      sfx.play('thud');
    }
  }

  draw(ctx) {
    const s = PX;
    // Rotor blur.
    const frame = Math.floor(this.age * 5) % 2;
    const hasArt = art.has('enemy.helicopter');

    if (!hasArt) {
      const spin = Math.abs(Math.cos(this.rotor));
      const rw = 22 + spin * 26;
      ctx.globalAlpha = 0.55;
      px(ctx, this.x - rw, this.y - this.h / 2 - 8, rw * 2, 3, COLORS.grey);
      ctx.globalAlpha = 1;
      px(ctx, this.x - 2, this.y - this.h / 2 - 10, 4, 8, COLORS.greyDark);
      if (this.flash > 0) drawMatrixFlat(ctx, SPR_HELI, this.x, this.y, s, COLORS.white);
      else drawMatrix(ctx, SPR_HELI, PAL_HELI, this.x, this.y, s);
    } else {
      art.draw(ctx, 'enemy.helicopter', this.x, this.y, { frame });
      // Rotor squashes horizontally to fake the spin.
      const spin = Math.abs(Math.cos(this.rotor));
      art.draw(ctx, 'enemy.rotor', this.x, this.y - this.h / 2 - 8, {
        frame: Math.floor(this.rotor * 3) % 3,
        scale: 1, alpha: 0.6 + spin * 0.4,
      });
      if (this.flash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        art.draw(ctx, 'enemy.helicopter', this.x, this.y, { frame, alpha: 0.9 });
        ctx.restore();
      }
    }

    // Shadow on the water below.
    ctx.globalAlpha = 0.25;
    px(ctx, this.x - 16, this.y + 34, 32, 8, '#000');
    ctx.globalAlpha = 1;
    this.drawHealth(ctx, this.w + 6);
  }
}

/* ------------------------------------------------------------------ */
/* Boss — destroyer ship                                               */
/* ------------------------------------------------------------------ */
export class Boss extends Enemy {
  /** @param {number} level wave index, scales HP and aggression */
  constructor(level = 0) {
    super(GAME_W / 2, -120, ENEMY.boss, 'boss');
    this.isBoss = true;
    this.hp = this.maxHp = ENEMY.boss.hp + level * 45;
    this.score = ENEMY.boss.score + level * 1200;
    this.phase = 0;
    this.entering = true;
    this.dir = 1;
    this.burst = 0;
    this.burstTimer = 0;
    this.level = level;
    this.deathTimer = 0;
    this.dying = false;
  }

  /** Boss dies in stages: chain explosions, then a huge final blast. */
  damage(dmg, api) {
    if (this.dying || this.dead) return false;
    this.hp -= dmg;
    this.flash = 0.07;
    api.particles.hitSpark(
      this.x + rand(-this.w / 2, this.w / 2),
      this.y + rand(-this.h / 2, this.h / 2),
      COLORS.yellow, 4,
    );
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = 1.5;
      sfx.play('bossWarn');
      return true; // score is awarded immediately for responsiveness
    }
    if (this.hp < this.maxHp * 0.5 && this.phase === 0) { this.phase = 1; sfx.play('bossWarn'); }
    if (this.hp < this.maxHp * 0.22 && this.phase === 1) { this.phase = 2; sfx.play('bossWarn'); }
    return false;
  }

  update(dt, api) {
    this.age += dt;
    if (this.flash > 0) this.flash -= dt;

    if (this.dying) {
      this.deathTimer -= dt;
      this.y += 12 * dt;
      // Rolling secondary explosions while it sinks.
      if (Math.random() < 0.5) {
        api.particles.explosion(
          this.x + rand(-this.w / 2, this.w / 2),
          this.y + rand(-this.h / 2, this.h / 2),
          [COLORS.yellow, COLORS.orange, COLORS.red, COLORS.white], 1,
        );
        api.shake(6);
        sfx.play('explode');
      }
      if (this.deathTimer <= 0) {
        this.dead = true;
        api.particles.explosion(this.x, this.y, [COLORS.white, COLORS.yellow, COLORS.cyan, COLORS.magenta], 3);
        api.particles.splash(this.x, this.y + 30, 40);
        api.shake(24);
        sfx.play('bigExplode');
      }
      return;
    }

    // Entrance.
    if (this.entering) {
      this.y += 60 * dt;
      if (this.y >= 150) { this.entering = false; }
      return;
    }

    // Patrol sideways, faster in later phases.
    const sp = this.speed * (1 + this.phase * 0.45);
    this.x += this.dir * sp * dt;
    if (this.x < this.w / 2 + 10) { this.x = this.w / 2 + 10; this.dir = 1; }
    if (this.x > GAME_W - this.w / 2 - 10) { this.x = GAME_W - this.w / 2 - 10; this.dir = -1; }
    this.y = 150 + Math.sin(this.age * 1.2) * 12;

    // Weapons: aimed twin turrets + radial bursts in later phases.
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = ENEMY.boss.fireRate / (1 + this.phase * 0.5);
      const p = api.player;
      for (const off of [-this.w / 2 + 16, this.w / 2 - 16]) {
        const a = Math.atan2(p.y - this.y, p.x - (this.x + off)) + rand(-0.06, 0.06);
        api.bullets.spawn({
          x: this.x + off, y: this.y + this.h / 2 - 6,
          vx: Math.cos(a) * 240, vy: Math.sin(a) * 240,
          kind: 'enemy', friendly: false, damage: 1, life: 5,
        });
      }
      sfx.play('hit');
    }

    if (this.phase >= 1) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstTimer = this.phase >= 2 ? 2.1 : 3.2;
        const n = this.phase >= 2 ? 14 : 9;
        for (let i = 0; i < n; i++) {
          const a = (Math.PI / (n - 1)) * i;
          api.bullets.spawn({
            x: this.x, y: this.y + this.h / 2,
            vx: Math.cos(a) * 165, vy: Math.sin(a) * 165,
            kind: 'enemy', friendly: false, damage: 1, life: 6,
          });
        }
        api.shake(4);
        sfx.play('thud');
      }
    }

    // Smoke as it takes damage.
    if (this.hp < this.maxHp * 0.55 && Math.random() < 0.4) {
      api.particles.spawn({
        x: this.x + rand(-40, 40), y: this.y + rand(-20, 10),
        vx: rand(-16, 16), vy: rand(-30, -6),
        life: rand(0.5, 1.1), size: randInt(3, 6) * 2,
        color: Math.random() < 0.5 ? '#555' : COLORS.orange, drag: 1,
      });
    }
  }

  draw(ctx) {
    const flash = this.flash > 0;
    // PNG boss art replaces the blocky hull; muzzle flashes and warning
    // lights stay procedural so they keep animating with the phase logic.
    if (art.draw(ctx, 'enemy.boss', this.x, this.y, { frame: this.phase >= 2 ? 1 : 0 })) {
      if (flash) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        art.draw(ctx, 'enemy.boss', this.x, this.y, { frame: this.phase >= 2 ? 1 : 0, alpha: 0.85 });
        ctx.restore();
      }
      const lit2 = Math.floor(this.age * (4 + this.phase * 3)) % 2 === 0;
      if (lit2) {
        glow(ctx, COLORS.red, 8, () => {
          px(ctx, this.x - this.w / 2 + 12, this.y - this.h / 2 + 12, 6, 6, COLORS.red);
          px(ctx, this.x + this.w / 2 - 18, this.y - this.h / 2 + 12, 6, 6, COLORS.red);
        });
      }
      return;
    }

    const hw = this.w / 2, hh = this.h / 2;
    const x = Math.round(this.x - hw), y = Math.round(this.y - hh);
    const hull = flash ? COLORS.white : '#2a3560';
    const deck = flash ? COLORS.white : '#3c4a80';
    const trim = flash ? COLORS.white : COLORS.magenta;

    // Hull silhouette (blocky destroyer).
    px(ctx, x + 8, y + 20, this.w - 16, this.h - 30, hull);
    px(ctx, x, y + 34, this.w, this.h - 52, hull);
    px(ctx, x + 20, y + 8, this.w - 40, 22, deck);
    px(ctx, x + 46, y, this.w - 92, 14, deck);
    // Bridge windows.
    px(ctx, x + 52, y + 4, this.w - 104, 5, flash ? COLORS.white : COLORS.cyan);
    // Neon trim strips.
    px(ctx, x + 4, y + 40, this.w - 8, 3, trim);
    px(ctx, x + 4, y + this.h - 22, this.w - 8, 3, trim);
    // Turrets.
    for (const off of [-hw + 16, hw - 16]) {
      const tx = Math.round(this.x + off);
      px(ctx, tx - 8, y + 26, 16, 16, flash ? COLORS.white : '#1d2547');
      px(ctx, tx - 3, y + 38, 6, 14, flash ? COLORS.white : COLORS.grey);
      if (this.fireTimer < 0.12) {
        glow(ctx, COLORS.yellow, 10, () => px(ctx, tx - 4, y + 50, 8, 8, COLORS.yellow));
      }
    }
    // Phase warning lights.
    const lit = Math.floor(this.age * (4 + this.phase * 3)) % 2 === 0;
    if (lit) {
      glow(ctx, COLORS.red, 8, () => {
        px(ctx, x + 12, y + 12, 6, 6, COLORS.red);
        px(ctx, x + this.w - 18, y + 12, 6, 6, COLORS.red);
      });
    }
    // Bow wake.
    px(ctx, x + 10, y + this.h - 6, this.w - 20, 4, COLORS.foam);
  }
}

/**
 * Factory helper used by the wave spawner.
 * @param {'grunt'|'jetski'|'helicopter'} type
 * @param {number} x @param {number} y @param {number} level
 * @returns {Enemy}
 */
export function createEnemy(type, x, y, level = 0) {
  switch (type) {
    case 'jetski': return new JetSki(x, y, level);
    case 'helicopter': return new Helicopter(x, y, level);
    default: return new Grunt(x, y, level);
  }
}
