// File: js/config.js
/**
 * Global, immutable game configuration + tiny math helpers.
 * Every other module imports from here so there are no magic numbers
 * scattered around and no mutable globals.
 */

/** Internal render resolution. CSS scales this up with `image-rendering: pixelated`. */
export const GAME_W = 480;
export const GAME_H = 720;

/** 1 "art pixel" = PX screen pixels inside the 480x720 buffer. */
export const PX = 4;

/**
 * Y of the waterline. Everything above is sky/skyline, everything below is
 * ocean. The water depth ramp and wave perspective are both derived from it.
 */
export const HORIZON = 96;

/**
 * Cyberpunk / neon-ocean palette.
 *
 * The water ramp runs from `seaFar` (bright teal at the horizon) down to
 * `seaDeep` (near-black blue at the bottom of the screen). Foam is a warm
 * white so it reads as spray against every blue in the ramp.
 */
export const COLORS = Object.freeze({
  navy:      '#0a0f24',
  navyDeep:  '#060a18',

  // --- ocean ramp (far → near) ---
  seaFar:    '#1a7fa8',
  seaMid:    '#106080',
  seaBase:   '#0a4664',
  seaDeep:   '#06304a',
  seaAbyss:  '#04203a',
  // --- wave crests & foam ---
  crestHi:   '#38b6d8',
  crest:     '#2091b8',
  foamEdge:  '#9fe8ff',
  foam:      '#e8fbff',
  foamSoft:  '#bfeeff',

  water0:    '#0a4664',
  water1:    '#106080',
  water2:    '#1a7fa8',
  cyan:      '#00f0ff',
  cyanDim:   '#0aa6bd',
  magenta:   '#ff00a0',
  magentaDim:'#a30068',
  yellow:    '#ffdd00',
  orange:    '#ff8a00',
  red:       '#ff2e4d',
  green:     '#3dff7a',
  white:     '#eaffff',
  grey:      '#6a7ba8',
  greyDark:  '#33406b',
  shadow:    'rgba(0,0,0,0.35)',
});

/** Finite state machine values used by main.js. */
export const STATE = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
});

/** Player tuning: water-like inertia, boost economy, i-frames. */
export const PLAYER = Object.freeze({
  w: 24,            // collision width  (px in game space)
  h: 40,            // collision height
  accel: 1500,      // px/s^2 input acceleration
  maxSpeedX: 300,   // horizontal terminal velocity
  maxSpeedY: 260,   // vertical terminal velocity
  drag: 6.5,        // velocity damping per second (water friction)
  startLives: 3,
  invulnTime: 1.6,  // seconds of i-frames after a hit
  boostMax: 100,
  boostDrain: 42,   // units/sec while boosting
  boostRegen: 22,   // units/sec while not boosting
  boostMinToStart: 12,
  bankMax: 2,       // sprite lean frames each direction
});

/** World scroll + parallax speeds. */
export const WORLD = Object.freeze({
  baseScroll: 150,   // px/s at neutral throttle
  boostScroll: 340,  // px/s while boosting
  slowScroll: 78,    // px/s inside a whirlpool
  scrollLerp: 3.2,   // how fast actual scroll chases target
  parallax: [0.28, 0.55, 1.0], // far → near wave layers
});

/** Weapon tuning (see WeaponSystem.js). */
export const WEAPONS = Object.freeze({
  gunCooldown: 0.085,
  gunSpreadCooldown: 0.105,
  gunDamage: 1,
  gunSpeed: 620,
  ammoMax: 85,
  ammoRegen: 30,     // rounds/sec regenerated after the firing delay
  ammoRegenTrickle: 8, // rounds/sec granted even while holding fire
  ammoRegenDelay: 0.35,
  spreadTime: 12,    // seconds a blue pickup lasts
  missileMax: 3,
  missileCooldown: 0.55,
  missileDamage: 6,
  missileSpeed: 300,
  missileTurn: 4.2,  // radians/sec homing agility
  missileLife: 4.5,
});

/** Enemy archetype stats. */
export const ENEMY = Object.freeze({
  grunt:      { w: 24, h: 30, hp: 3,  score: 100, speed: 70,  fireRate: 1.5 },
  jetski:     { w: 18, h: 22, hp: 2,  score: 150, speed: 210, fireRate: 0 },
  helicopter: { w: 34, h: 26, hp: 5,  score: 250, speed: 95,  fireRate: 1.9 },
  boss:       { w: 132, h: 96, hp: 120, score: 5000, speed: 60, fireRate: 0.55 },
});

/** Scoring, combo windows and wave pacing. */
export const RULES = Object.freeze({
  comboWindow: 2.0,           // seconds to chain a kill
  comboSteps: [1, 2, 4, 8, 16],
  waveInterval: 30,           // seconds per wave
  bossEvery: 4,               // every Nth wave is a boss
  hiScoreKey: 'neonwake.hiscore.v1',
});

/** Screen-shake presets used all over for juice. */
export const SHAKE = Object.freeze({
  tiny: 2, small: 4, medium: 7, large: 12, huge: 20,
});

/* ------------------------------------------------------------------ */
/* Math helpers — pure functions, safe to import anywhere.             */
/* ------------------------------------------------------------------ */

/** @returns {number} v clamped to [min,max] */
export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Linear interpolation. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing toward `b`. */
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

/** Random float in [min,max). */
export const rand = (min, max) => min + Math.random() * (max - min);

/** Random integer in [min,max]. */
export const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

/** Random element of an array. */
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/** Snap a value to the pixel grid so everything stays crunchy. */
export const snap = (v, size = PX) => Math.round(v / size) * size;

/** Shortest signed angle difference between two radians. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
