// File: js/PowerUp.js
/**
 * Floating pickup cubes.
 *
 *   blue   → 3-way spread upgrade (temporary)
 *   red    → +1 homing missile
 *   yellow → instant ammo refill
 *   green  → +1 life (rare)
 *   white  → shield bubble (rare)
 *
 * Cubes bob, spin (via a squash animation), pulse a glow and drift with
 * the scroll. Late in their life they blink to warn of expiry.
 */

import { GAME_H, COLORS, rand, clamp } from '#game/config.js';
import { px, pxBorder, glow } from '#game/Sprite.js';
import { sfx } from '#game/Sound.js';
import { art } from '#game/Assets.js';

/** Type table: colour, HUD label and the effect applied on collection. */
const TYPES = {
  spread:  { color: COLORS.cyan,    label: 'SPREAD',  glyph: 'W', art: 'pickup.spread' },
  missile: { color: COLORS.red,     label: 'MISSILE', glyph: 'M', art: 'pickup.missile' },
  ammo:    { color: COLORS.yellow,  label: 'AMMO',    glyph: 'A', art: 'pickup.ammo' },
  life:    { color: COLORS.green,   label: '1UP',     glyph: '+', art: 'pickup.life' },
  shield:  { color: COLORS.white,   label: 'SHIELD',  glyph: 'S', art: 'pickup.shield' },
};

export class PowerUp {
  /**
   * @param {number} x @param {number} y
   * @param {keyof TYPES} type
   */
  constructor(x, y, type = 'spread') {
    this.x = x; this.y = y;
    this.type = type;
    this.def = TYPES[type] ?? TYPES.spread;
    this.w = 22; this.h = 22;
    this.age = 0;
    this.life = 12;
    this.dead = false;
    this.vx = rand(-14, 14);
    this.magnet = false;
  }

  get body() { return { x: this.x, y: this.y, w: this.w + 6, h: this.h + 6 }; }

  /**
   * @param {number} dt
   * @param {object} api { scroll, player, particles }
   */
  update(dt, { scroll, player, particles }) {
    this.age += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    // Gentle drift + bob, plus magnet pull when the player is close.
    const dx = player.x - this.x, dy = player.y - this.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 110 * 110 && !player.dead) {
      this.magnet = true;
      const d = Math.sqrt(d2) || 1;
      const pull = 420 * (1 - d / 110);
      this.x += (dx / d) * pull * dt;
      this.y += (dy / d) * pull * dt;
    } else {
      this.magnet = false;
      this.x += this.vx * dt;
      this.y += (scroll * 0.85) * dt + Math.sin(this.age * 3) * 8 * dt;
    }

    if (Math.random() < 0.25) {
      particles.spawn({
        x: this.x + rand(-10, 10), y: this.y + rand(-10, 10),
        vy: rand(-20, -6), life: rand(0.2, 0.45), size: 3,
        color: this.def.color, drag: 2,
      });
    }

    if (this.y > GAME_H + 40) this.dead = true;
  }

  /**
   * Apply the effect to the run.
   * @param {object} api { player, weapons, particles, addScore, hud }
   */
  collect({ player, weapons, particles, addScore, notify }) {
    this.dead = true;
    particles.sparkle(this.x, this.y, this.def.color);
    sfx.play('pickup');
    switch (this.type) {
      case 'spread':  weapons.addSpread(); break;
      case 'missile': weapons.addMissiles(1); break;
      case 'ammo':    weapons.refillAmmo(); break;
      case 'life':    player.lives = Math.min(9, player.lives + 1); break;
      case 'shield':  player.giveShield(9); break;
    }
    addScore(50, this.x, this.y, false);
    notify?.(this.def.label);
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const blink = this.life < 3 && Math.floor(this.life * 8) % 2 === 0;
    if (blink) return;

    const bob = Math.sin(this.age * 4) * 3;
    const squash = Math.abs(Math.cos(this.age * 3));       // fake 3D spin
    const w = clamp(this.w * (0.35 + squash * 0.65), 6, this.w);
    const cx = Math.round(this.x), cy = Math.round(this.y + bob);
    const c = this.def.color;

    // PNG path: an 8-frame spin strip replaces the procedural squash cube.
    if (art.has(this.def.art)) {
      const frame = Math.floor(this.age * 10) % 8;
      art.draw(ctx, this.def.art, cx, cy, { frame });
      if (this.magnet) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = c;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 18 + Math.sin(this.age * 12) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      return;
    }

    glow(ctx, c, 12 + Math.sin(this.age * 6) * 4, () => {
      px(ctx, cx - w / 2, cy - this.h / 2, w, this.h, c);
    });
    px(ctx, cx - w / 2, cy - this.h / 2, w, this.h, '#0b1330');
    pxBorder(ctx, cx - w / 2, cy - this.h / 2, w, this.h, c, 2);

    if (w > 12) {
      ctx.fillStyle = c;
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.def.glyph, cx, cy + 1);
      ctx.textBaseline = 'alphabetic';
    }

    if (this.magnet) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = c;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 + Math.sin(this.age * 12) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Weighted random drop for a destroyed enemy.
 * @param {object} state current run state used to bias drops
 * @returns {keyof TYPES}
 */
export function rollDropType({ missiles = 3, lives = 3, spreadActive = false } = {}) {
  const bag = [];
  bag.push(...Array(spreadActive ? 2 : 5).fill('spread'));
  bag.push(...Array(missiles >= 3 ? 2 : 5).fill('missile'));
  bag.push(...Array(3).fill('ammo'));
  bag.push('shield');
  if (lives < 3) bag.push('life');
  return bag[(Math.random() * bag.length) | 0];
}
