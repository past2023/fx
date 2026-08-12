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
 * Bright summer-daytime ocean palette.
 *
 * The water ramp runs from `seaFar` (pale sunlit turquoise at the horizon)
 * down to `seaDeep` (rich tropical blue in the foreground) — think Mediterranean
 * midday, not midnight. Foam is pure white so it pops against every blue.
 */
export const COLORS = Object.freeze({
  navy:      '#0d3f6b',
  navyDeep:  '#0a3358',

  // --- ocean ramp (far → near), bright tropical daylight ---
  seaFar:    '#8fe9e0',
  seaMid:    '#3fc9d8',
  seaBase:   '#12a3c9',
  seaDeep:   '#0b7fb5',
  seaAbyss:  '#0a5f96',
  // --- wave crests & foam ---
  crestHi:   '#bdf6f2',
  crest:     '#6fddde',
  foamEdge:  '#e6ffff',
  foam:      '#ffffff',
  foamSoft:  '#d8fbff',

  // --- sky ---
  skyTop:    '#2f9fe0',
  skyMid:    '#7fd4f0',
  skyLow:    '#c9f2ff',
  sun:       '#fff6c8',

  water0:    '#12a3c9',
  water1:    '#3fc9d8',
  water2:    '#8fe9e0',

  // --- gameplay accents (kept punchy so they read on bright water) ---
  cyan:      '#00d9ff',
  cyanDim:   '#0090b0',
  magenta:   '#ff2d9b',
  magentaDim:'#c00070',
  yellow:    '#ffd400',
  orange:    '#ff7a00',
  red:       '#ff2233',
  green:     '#00d95a',
  white:     '#ffffff',
  grey:      '#5b7a91',
  greyDark:  '#2c4a63',
  shadow:    'rgba(0,40,70,0.28)',

  // --- race furniture ---
  buoyRed:   '#ff2233',
  buoyGreen: '#00d95a',
  sand:      '#f2dfa8',
  sandDark:  '#d8bf7f',
  palm:      '#1f8f4a',
  rock:      '#7d8fa0',
  rockLight: '#a8bccc',
});

/** Finite state machine values used by main.js. */
export const STATE = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  FINISHED: 'FINISHED',   // race won — results screen
});

/**
 * Player tuning.
 *
 * Boats don't grip like cars: steering applies a lateral force to a hull that
 * keeps its own momentum, so you slide through turns and have to counter-steer.
 * `gripBase` is how quickly sideways velocity bleeds off — low grip = long
 * drifts. Holding the drift key cuts grip further for deliberate power slides.
 */
export const PLAYER = Object.freeze({
  w: 24,            // collision width  (px in game space)
  h: 40,            // collision height
  accel: 1750,      // px/s^2 lateral thrust from steering
  accelY: 1450,     // px/s^2 fore/aft thrust
  maxSpeedX: 340,   // horizontal terminal velocity
  maxSpeedY: 280,   // vertical terminal velocity

  // --- water momentum ---
  gripBase: 3.4,    // lateral velocity bleed /sec (lower = slidier)
  gripDrift: 0.9,   // grip while drifting (hold SHIFT-equivalent drift key)
  gripBoost: 2.4,   // grip while boosting — fast means loose
  dragY: 5.2,       // fore/aft damping
  driftSteerBoost: 1.45, // extra turn-in authority while drifting
  driftChargeRate: 34,   // boost gauge earned per second of a clean drift
  driftMinSpeed: 90,     // lateral speed needed to count as drifting

  startLives: 3,
  invulnTime: 1.6,  // seconds of i-frames after a hit
  boostMax: 100,
  boostDrain: 38,   // units/sec while boosting
  boostRegen: 17,   // units/sec passive regen
  boostMinToStart: 12,
  bankMax: 2,       // sprite lean frames each direction
});

/**
 * Water currents: large, slow-moving flow fields that push everything
 * floating on them. Mastering them is part of racing the course well.
 */
export const CURRENT = Object.freeze({
  strength: 118,    // max px/s of lateral push
  scale: 0.0032,    // spatial frequency of the flow field
  driftRate: 0.22,  // how fast the field itself evolves
  playerFactor: 1.0,
  enemyFactor: 0.55,
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

/** Scoring, combo windows and pacing. */
export const RULES = Object.freeze({
  comboWindow: 2.0,           // seconds to chain a kill
  comboSteps: [1, 2, 4, 8, 16],
  waveInterval: 30,           // seconds per wave (endless fallback)
  bossEvery: 4,
  hiScoreKey: 'neonwake.hiscore.v2',
  rescueScore: 500,           // points per survivor picked up
  rescueBonusAll: 2000,       // bonus for clearing a whole rescue zone
  checkpointScore: 750,
  placeBonus: [6000, 3000, 1500, 500], // 1st..4th at the finish
});

/**
 * Gradius-style power-up bar.
 *
 * Tokens advance a cursor along this track; pressing the ACTIVATE key spends
 * the cursor on whatever slot it currently sits on, then resets to 0. Banking
 * tokens for a later, stronger slot is the core tactical decision.
 */
export const POWERBAR = Object.freeze({
  slots: [
    { id: 'speed',   label: 'SPEED',   cost: 1, color: '#00d9ff' },
    { id: 'missile', label: 'MISSILE', cost: 2, color: '#ff2d9b' },
    { id: 'fire',    label: 'FIRE',    cost: 3, color: '#ffd400' },
    { id: 'turbo',   label: 'TURBO',   cost: 4, color: '#ff7a00' },
    { id: 'shield',  label: 'SHIELD',  cost: 5, color: '#ffffff' },
  ],
  maxSpeedStacks: 4,
  fireTime: 16,        // seconds of upgraded guns
  turboTime: 9,        // seconds of infinite boost
  speedStep: 0.1,      // +10% handling per SPEED stack
});

/** Rescue mechanic: swimmers to pick up in marked zones. */
export const RESCUE = Object.freeze({
  radius: 26,          // pickup radius (generous — it should feel good)
  driftSpeed: 16,
  waveHeight: 5,
  perZone: [3, 6],     // min/max survivors in a zone
  panicTime: 14,       // seconds before a survivor drifts off (visual warning)
});

/**
 * Course definition. The race is point-to-point through themed sections,
 * ending with the boss. `len` is in metres of scrolled distance.
 */
export const COURSE = Object.freeze({
  sections: [
    { id: 'start',    len: 320,  label: 'HARBOUR START',   enemies: 0.35, mines: 0.2, rescue: false, gates: true },
    { id: 'reef',     len: 420,  label: 'CORAL REEF',      enemies: 0.5,  mines: 0.6, rescue: false, gates: true },
    { id: 'rescue1',  len: 300,  label: 'RESCUE ZONE',     enemies: 0.25, mines: 0.15, rescue: true, gates: false },
    { id: 'gauntlet', len: 460,  label: 'PATROL GAUNTLET', enemies: 1.0,  mines: 0.5, rescue: false, gates: true },
    { id: 'straits',  len: 380,  label: 'NARROW STRAITS',  enemies: 0.55, mines: 0.9, rescue: false, gates: true },
    { id: 'rescue2',  len: 320,  label: 'SURVIVORS AHEAD', enemies: 0.4,  mines: 0.2, rescue: true, gates: false },
    { id: 'final',    len: 440,  label: 'OPEN SEA SPRINT', enemies: 1.15, mines: 0.7, rescue: false, gates: true },
    { id: 'boss',     len: 0,    label: 'FINAL BOSS',      enemies: 0,    mines: 0,   rescue: false, gates: false },
  ],
});

/** Rival racers. */
export const RIVALS = Object.freeze({
  count: 3,
  baseSpeed: 0.94,     // fraction of the player's base scroll they average
  variance: 0.1,
  catchup: 0.16,       // rubber-banding strength
  names: ['VIPER', 'ORCA', 'KESTREL'],
  colors: ['#ff7a00', '#b06bff', '#00d95a'],
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
