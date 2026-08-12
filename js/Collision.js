// File: js/Collision.js
/**
 * Pure collision helpers. No state, no imports, no side effects —
 * every function takes plain objects and returns data.
 *
 * The canonical "body" shape used across the game is centre-anchored:
 *   { x, y, w, h }  where (x,y) is the CENTRE of the box.
 */

/**
 * Axis-aligned bounding-box overlap test for centre-anchored boxes.
 * @param {{x:number,y:number,w:number,h:number}} a
 * @param {{x:number,y:number,w:number,h:number}} b
 * @returns {boolean}
 */
export function aabb(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}

/**
 * Circle overlap test (used for blast radii and whirlpool pull).
 * @returns {boolean}
 */
export function circles(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by, r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Point-inside-box test for centre-anchored boxes.
 * @returns {boolean}
 */
export function pointInBox(px, py, b) {
  return (
    px >= b.x - b.w / 2 && px <= b.x + b.w / 2 &&
    py >= b.y - b.h / 2 && py <= b.y + b.h / 2
  );
}

/**
 * Minimum-translation-vector resolution: pushes `a` out of `b` along the
 * shallowest overlap axis. Mutates nothing; returns the offset to apply.
 * @returns {{x:number,y:number}} push vector for `a`
 */
export function resolve(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const ox = (a.w + b.w) / 2 - Math.abs(dx);
  const oy = (a.h + b.h) / 2 - Math.abs(dy);
  if (ox <= 0 || oy <= 0) return { x: 0, y: 0 };
  if (ox < oy) return { x: Math.sign(dx || 1) * ox, y: 0 };
  return { x: 0, y: Math.sign(dy || 1) * oy };
}

/** Squared distance between two entities (avoids a sqrt in hot loops). */
export function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Nearest live entity to a point, optionally filtered.
 * @param {number} x
 * @param {number} y
 * @param {Array<{x:number,y:number,dead?:boolean}>} list
 * @param {(e:any)=>boolean} [filter]
 * @returns {any|null}
 */
export function nearest(x, y, list, filter) {
  let best = null, bestD = Infinity;
  for (const e of list) {
    if (e.dead) continue;
    if (filter && !filter(e)) continue;
    const dx = e.x - x, dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

/**
 * Generic broad-phase sweep: tests every a×b pair and fires `onHit`.
 * Keeps the per-frame collision wiring in main.js down to one-liners.
 * @param {Array} as
 * @param {Array} bs
 * @param {(a:any,b:any)=>void} onHit
 */
export function sweep(as, bs, onHit) {
  for (let i = 0; i < as.length; i++) {
    const a = as[i];
    if (a.dead) continue;
    for (let j = 0; j < bs.length; j++) {
      const b = bs[j];
      if (b.dead) continue;
      if (aabb(a, b)) {
        onHit(a, b);
        if (a.dead) break;
      }
    }
  }
}
