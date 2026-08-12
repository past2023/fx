// File: js/Sprite.js
/**
 * Tiny pixel-art renderer.
 *
 * Sprites are authored as arrays of strings ("pixel matrices"); each
 * character maps to a palette colour, and `.` / ' ' means transparent.
 * Everything is drawn with `fillRect` at an integer scale, so the art
 * stays perfectly crunchy at any canvas size.
 *
 * (Helper module shared by Player, Enemy, PowerUp and Scroller.)
 */

import { COLORS } from '#game/config.js';

/**
 * Draw a pixel matrix centred on (cx, cy).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} rows matrix rows, all the same length
 * @param {Record<string,string>} pal char → CSS colour
 * @param {number} cx centre X in game px
 * @param {number} cy centre Y in game px
 * @param {number} [scale] screen px per art px
 * @param {boolean} [flipX]
 */
export function drawMatrix(ctx, rows, pal, cx, cy, scale = 4, flipX = false) {
  const h = rows.length;
  const w = rows[0].length;
  const x0 = Math.round(cx - (w * scale) / 2);
  const y0 = Math.round(cy - (h * scale) / 2);
  for (let r = 0; r < h; r++) {
    const row = rows[r];
    for (let c = 0; c < w; c++) {
      const ch = row[flipX ? w - 1 - c : c];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x0 + c * scale, y0 + r * scale, scale, scale);
    }
  }
}

/**
 * Draw a matrix tinted a single flat colour (hit-flash / silhouette).
 */
export function drawMatrixFlat(ctx, rows, cx, cy, scale, color, flipX = false) {
  const h = rows.length, w = rows[0].length;
  const x0 = Math.round(cx - (w * scale) / 2);
  const y0 = Math.round(cy - (h * scale) / 2);
  ctx.fillStyle = color;
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const ch = rows[r][flipX ? w - 1 - c : c];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillRect(x0 + c * scale, y0 + r * scale, scale, scale);
    }
  }
}

/**
 * Neon glow pass: renders `fn` several times with increasing blur under
 * a `lighter` composite. Used sparingly (it is the most expensive call).
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} color
 * @param {number} blur
 * @param {() => void} fn
 */
export function glow(ctx, color, blur, fn) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.globalCompositeOperation = 'lighter';
  fn();
  ctx.restore();
}

/** Filled rect snapped to whole pixels. */
export function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Hollow rect (1px border) snapped to whole pixels. */
export function pxBorder(ctx, x, y, w, h, color, t = 2) {
  ctx.fillStyle = color;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  ctx.fillRect(x, y, w, t);
  ctx.fillRect(x, y + h - t, w, t);
  ctx.fillRect(x, y, t, h);
  ctx.fillRect(x + w - t, y, t, h);
}

/* ------------------------------------------------------------------ */
/* Shared sprite matrices                                              */
/* ------------------------------------------------------------------ */

/** Player hydrofoil — 6 wide x 10 tall, as specified. */
export const SPR_PLAYER = [
  '..CC..',
  '..CC..',
  '.CWWC.',
  '.CWWC.',
  'MCWWCM',
  'MCWWCM',
  'MMWWMM',
  '.MWWM.',
  '.EYYE.',
  '..EE..',
];

export const PAL_PLAYER = {
  C: COLORS.cyan,
  W: COLORS.white,
  M: COLORS.magenta,
  Y: COLORS.yellow,
  E: COLORS.orange,
};

/** Player palette while invulnerable (ghosted). */
export const PAL_PLAYER_HIT = {
  C: COLORS.white, W: COLORS.white, M: COLORS.white, Y: COLORS.white, E: COLORS.white,
};

/** Grunt boat — points downward (towards the player). */
export const SPR_GRUNT = [
  '.RR..RR.',
  'RGGRRGGR',
  'RGGGGGGR',
  '.GGWWGG.',
  '.GGWWGG.',
  '..GGGG..',
  '..RRRR..',
  '...RR...',
];

export const PAL_GRUNT = {
  R: COLORS.red,
  G: '#7a2440',
  W: COLORS.yellow,
};

/** Jet ski — small, fast, rams the player. */
export const SPR_JETSKI = [
  '..MM..',
  '.MWWM.',
  'MMWWMM',
  '.MWWM.',
  '..MM..',
  '.YY.YY',
];

export const PAL_JETSKI = {
  M: COLORS.magenta,
  W: '#ffd0ee',
  Y: COLORS.yellow,
};

/** Helicopter body (rotor is drawn procedurally). */
export const SPR_HELI = [
  '...GG...',
  '..GGGG..',
  '.GGWWGG.',
  'GGGWWGGG',
  'GGGGGGGG',
  '.GGGGGG.',
  '..G..G..',
  '.YY..YY.',
];

export const PAL_HELI = {
  G: '#2f7d5b',
  W: COLORS.cyan,
  Y: COLORS.yellow,
};

/** Floating mine. */
export const SPR_MINE = [
  '..R..R..',
  '.RRRRRR.',
  'RRKKKKRR',
  '.RKKKKR.',
  '.RKKKKR.',
  'RRKKKKRR',
  '.RRRRRR.',
  '..R..R..',
];

export const PAL_MINE = {
  R: COLORS.red,
  K: '#3a1020',
};
