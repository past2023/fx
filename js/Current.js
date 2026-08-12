// File: js/Current.js
/**
 * Water current field.
 *
 * A slowly-evolving 2D flow field that pushes everything floating on it. It's
 * cheap (sums of sines rather than real noise) but produces broad, believable
 * swirls that drift across the course, so the water never feels like a static
 * conveyor belt.
 *
 * Gameplay role: currents shove you off your line, especially at speed. Racing
 * well means reading them and steering into them early — environmental mastery
 * rather than random punishment, which is why they're always *visible* (see
 * `drawHints`).
 */

import { GAME_W, GAME_H, HORIZON, CURRENT, COLORS, clamp } from '#game/config.js';

export class CurrentField {
  constructor() {
    this.time = 0;
    this.worldY = 0;      // total scrolled distance, keeps the field coherent
    this.strength = 1;    // scaled per course section
  }

  /** @param {number} dt @param {number} scroll px/s */
  update(dt, scroll) {
    this.time += dt * CURRENT.driftRate;
    this.worldY += scroll * dt;
  }

  /**
   * Sample the flow at a screen position.
   * @param {number} x
   * @param {number} y screen Y (converted to world space internally)
   * @returns {{x:number, y:number}} velocity in px/s
   */
  sample(x, y) {
    const wy = (y + this.worldY) * CURRENT.scale;
    const wx = x * CURRENT.scale;
    const t = this.time;
    // Two octaves of rotated sines ≈ a smooth swirling field.
    const vx =
      Math.sin(wy * 2.1 + t * 1.7) * 0.6 +
      Math.sin(wy * 4.7 - wx * 3.1 + t * 2.3) * 0.3 +
      Math.cos(wx * 1.3 + wy * 1.1 - t) * 0.25;
    const vy =
      Math.cos(wx * 2.6 - t * 1.3) * 0.35 +
      Math.sin(wy * 3.3 + wx * 2.2 + t * 1.1) * 0.2;
    const s = CURRENT.strength * this.strength;
    return { x: vx * s, y: vy * s * 0.35 };
  }

  /**
   * Visual hint streaks so the player can read the flow before it moves them.
   * Drawn under the actors, over the water.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawHints(ctx) {
    if (this.strength <= 0.05) return;
    ctx.save();
    const cols = 6, rows = 9;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * (GAME_W / cols);
        const y = HORIZON + (r + 0.5) * ((GAME_H - HORIZON) / rows);
        const v = this.sample(x, y);
        const mag = Math.hypot(v.x, v.y);
        const a = clamp((mag / (CURRENT.strength * 0.8)) * 0.24, 0, 0.26) * this.strength;
        if (a < 0.03) continue;
        const len = clamp(mag * 0.12, 5, 22);
        const nx = v.x / (mag || 1), ny = v.y / (mag || 1);
        // Phase the dashes along the flow so they appear to move.
        const ph = ((this.time * 60 + r * 23 + c * 11) % 30) / 30;
        const ox = nx * ph * 16, oy = ny * ph * 16;
        ctx.globalAlpha = a * (1 - Math.abs(ph - 0.5) * 1.2);
        ctx.strokeStyle = COLORS.foamEdge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + nx * len, y + oy + ny * len);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
