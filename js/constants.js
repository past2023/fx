/**
 * Central balancing and presentation values for Starfall's first level.
 * Keep gameplay tuning here so art and gameplay iterations do not touch systems.
 */
export const GAME = Object.freeze({
  WIDTH: 1280,
  HEIGHT: 720,
  MAX_DT: 1 / 20,
  LEVEL_LENGTH: 6000,
  LEVEL_SCROLL_SPEED: 80,
  MAX_ENEMIES: 30,
  MAX_BULLETS: 100,
  MAX_PARTICLES: 300,
  PLAYER_INVINCIBILITY: 1.5,
  POWERUP_CHANCE: 0.15,
  POWERUP_DURATION: 8,
  BOSS_DEATH_DELAY: 3,
});

export const STATES = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  BOSS: 'BOSS',
  VICTORY: 'VICTORY',
  GAME_OVER: 'GAME_OVER',
});

export const SHIPS = Object.freeze([
  { id: 'fighter', name: 'FIGHTER', speed: 300, hp: 100, cooldown: 0.15, color: '#4c9dff', accent: '#b7dcff', description: 'BALANCED / RELIABLE' },
  { id: 'interceptor', name: 'INTERCEPTOR', speed: 450, hp: 70, cooldown: 0.12, color: '#35f2ff', accent: '#c4ffff', description: 'EXTREME VELOCITY' },
  { id: 'tank', name: 'TANK', speed: 180, hp: 150, cooldown: 0.25, color: '#54dc78', accent: '#c6ffcf', description: 'ARMORED / STEADY' },
]);

export const WEAPONS = Object.freeze([
  { id: 'blaster', name: 'BLASTER', damage: 25, cooldownMultiplier: 1, color: '#7edbff', description: '25 DMG · STRAIGHT SHOT' },
  { id: 'spread', name: 'SPREAD', damage: 18, cooldownMultiplier: 1.2, color: '#ffb766', description: '3 × 18 DMG · 15° FAN' },
  { id: 'laser', name: 'LASER', damagePerSecond: 480, heatPerSecond: 42, coolPerSecond: 34, lockout: 1.5, color: '#ff67d8', description: 'CONTINUOUS BEAM · HEAT' },
]);

export const ENEMY_TYPES = Object.freeze({
  scout: { id: 'scout', name: 'SCOUT', hp: 30, speed: 150, points: 100, w: 32, h: 26, color: '#ff4f68' },
  tank: { id: 'tank', name: 'TANK', hp: 80, speed: 80, points: 200, w: 58, h: 54, color: '#9da7ba' },
  drone: { id: 'drone', name: 'DRONE', hp: 20, speed: 250, points: 150, w: 28, h: 22, color: '#ffe85e' },
  heavy: { id: 'heavy', name: 'HEAVY TANK', hp: 200, speed: 60, points: 800, w: 92, h: 80, color: '#8994a8' },
});

export const COLORS = Object.freeze({
  space: '#0a0a1a',
  cyan: '#55eaff',
  magenta: '#ff5ed7',
  danger: '#ff5269',
  health: '#66ef86',
  warning: '#ffd166',
  ink: '#eaf6ff',
  muted: '#8ba0c2',
});

export default GAME;

/** Runtime movement, cadence and combat tuning not intrinsic to a specific hull/type. */
export const TUNING = Object.freeze({
  BACKGROUND: Object.freeze({ FAR_STAR_SPEED: 30, NEAR_STAR_SPEED: 80, NEBULA_SPEED: 6 }),
  PLAYER: Object.freeze({ TRAIL_INTERVAL: 0.045 }),
  WEAPON: Object.freeze({ BLASTER_SPEED: 680, SPREAD_SPEED: 630, PASSIVE_HEAT_COOL: 45 }),
  ENEMY: Object.freeze({ SCOUT_SWAY_SPEED: 4.4, SCOUT_SWAY_AMOUNT: 30, DRONE_JITTER_INTERVAL: 0.5, DRONE_Y_SPEED: 170 }),
  POWERUP: Object.freeze({ DRIFT_SPEED: 48 }),
  BOSS: Object.freeze({
    HP: 1500,
    ENTRY_SPEED: 145,
    AIMED_BULLET_SPEED: 350,
    PHASE_ONE_AIM_INTERVAL: 1.2,
    PHASE_TWO_AIM_INTERVAL: 1.0,
    PHASE_THREE_AIM_INTERVAL: 0.72,
    PHASE_THREE_DRONE_INTERVAL: 1.5,
    DASH_COOLDOWN_MIN: 3.8,
    DASH_COOLDOWN_RANDOM: 1.8,
    DASH_DURATION: 0.56,
    LASER_DAMAGE_PER_FRAME: 15,
    LASER_RANGE: 1700,
  }),
});
