/**
 * Central balancing and presentation values for Starfall's first level.
 * Keep gameplay tuning here so art and gameplay iterations do not touch systems.
 */
export const GAME = Object.freeze({
  WIDTH: 1280,
  HEIGHT: 720,
  MAX_DT: 1 / 20,
  LEVEL_LENGTH: 10000,
  LEVEL_SCROLL_SPEED: 80,
  MAX_ENEMIES: 50,
  MAX_BULLETS: 150,
  MAX_PARTICLES: 300,
  MAX_COINS: 80,
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

/** Starter options shown in the hangar before a run. */
export const WEAPONS = Object.freeze([
  { id: 'blaster', name: 'BLASTER', damage: 25, cooldownMultiplier: 1, color: '#7edbff', description: '25 DMG · STRAIGHT SHOT' },
  { id: 'spread', name: 'SPREAD', damage: 18, cooldownMultiplier: 1.2, color: '#ffb766', description: '3 × 18 DMG · 15° FAN' },
  { id: 'laser', name: 'LASER', damagePerSecond: 480, heatPerSecond: 42, coolPerSecond: 34, lockout: 1.5, color: '#ff67d8', description: 'CONTINUOUS BEAM · HEAT' },
]);

/** Full in-flight armory; Q/E can cycle every combat style at any time. */
export const WEAPON_LOADOUT = Object.freeze([
  ...WEAPONS,
  { id: 'pulse', name: 'PULSE BURST', damage: 16, cooldownMultiplier: 1.32, color: '#79ffb0', description: '3-SHOT VOLLEY · HIGH CADENCE', burstCount: 3, burstDelay: 0.065 },
  { id: 'nova', name: 'NOVA CANNON', damage: 58, cooldownMultiplier: 2.15, color: '#b78cff', description: 'HEAVY PLASMA · AREA IMPACT', splashRadius: 62 },
]);

export const ENEMY_TYPES = Object.freeze({
  scout: { id: 'scout', name: 'SCOUT', hp: 30, speed: 150, points: 100, coins: 2, w: 32, h: 26, color: '#ff4f68' },
  tank: { id: 'tank', name: 'TANK', hp: 80, speed: 80, points: 200, coins: 4, w: 58, h: 54, color: '#9da7ba' },
  drone: { id: 'drone', name: 'DRONE', hp: 20, speed: 250, points: 150, coins: 2, w: 28, h: 22, color: '#ffe85e' },
  heavy: { id: 'heavy', name: 'HEAVY TANK', hp: 200, speed: 60, points: 800, coins: 12, w: 92, h: 80, color: '#8994a8' },
});

export const ECONOMY = Object.freeze({
  STORAGE_KEY: 'starfall-hangar-v2',
  LEGACY_STORAGE_KEY: 'starfall-hangar-v1',
  MAX_MODULE_LEVEL: 4,
  BOSS_COIN_REWARD: 30,
});

/** Modular ship improvements available both in the hangar and at the in-run Field Forge. */
export const SHIP_UPGRADES = Object.freeze([
  Object.freeze({ id: 'hull', name: 'HULL PLATING', shortName: 'HULL', icon: '⬡', color: '#64e7a0', bonus: 0.12, label: '+12% MAX HULL', baseCost: 18, costStep: 16 }),
  Object.freeze({ id: 'engine', name: 'THRUSTER MATRIX', shortName: 'ENGINES', icon: '➤', color: '#66d8ff', bonus: 0.06, label: '+6% THRUST', baseCost: 16, costStep: 17 }),
  Object.freeze({ id: 'fire', name: 'FIRE CONTROL', shortName: 'FIRE CTRL', icon: '✦', color: '#ffb86b', bonus: 0.07, label: '-7% WEAPON CYCLE', baseCost: 20, costStep: 18 }),
]);

export const COLORS = Object.freeze({
  space: '#0a0a1a',
  cyan: '#55eaff',
  magenta: '#ff5ed7',
  danger: '#ff5269',
  health: '#66ef86',
  warning: '#ffd166',
  coin: '#ffd34d',
  ink: '#eaf6ff',
  muted: '#8ba0c2',
});

/** Runtime movement, cadence and combat tuning not intrinsic to a specific hull/type. */
export const TUNING = Object.freeze({
  BACKGROUND: Object.freeze({
    FAR_STAR_SPEED: 26,
    NEAR_STAR_SPEED: 92,
    MID_STAR_SPEED: 190,
    FOREGROUND_STREAK_SPEED: 470,
    NEBULA_SPEED: 6,
  }),
  PLAYER: Object.freeze({ TRAIL_INTERVAL: 0.045 }),
  WEAPON: Object.freeze({
    BLASTER_SPEED: 680,
    SPREAD_SPEED: 630,
    PULSE_SPEED: 780,
    NOVA_SPEED: 380,
    PASSIVE_HEAT_COOL: 45,
    LASER_FX_INTERVAL: 0.045,
    LASER_BEAM_FLICKER_INTERVAL: 0.075,
  }),
  ENEMY: Object.freeze({ SCOUT_SWAY_SPEED: 4.4, SCOUT_SWAY_AMOUNT: 30, DRONE_JITTER_INTERVAL: 0.5, DRONE_Y_SPEED: 170 }),
  POWERUP: Object.freeze({ DRIFT_SPEED: 48 }),
  COIN: Object.freeze({ DRIFT_SPEED: 64, MAGNET_RANGE: 185, MAGNET_ACCELERATION: 6.5, VALUE: 1 }),
  BOSS: Object.freeze({
    HP: 3000,
    SCALE: 1.16,
    ENTRY_SPEED: 145,
    AIMED_BULLET_SPEED: 430,
    PHASE_ONE_AIM_INTERVAL: 1.0,
    PHASE_TWO_AIM_INTERVAL: 0.76,
    PHASE_THREE_AIM_INTERVAL: 0.48,
    PHASE_THREE_DRONE_INTERVAL: 1.0,
    DASH_COOLDOWN_MIN: 2.7,
    DASH_COOLDOWN_RANDOM: 1.25,
    DASH_DURATION: 0.72,
    LASER_DAMAGE_PER_FRAME: 20,
    LASER_RANGE: 1700,
  }),
});

export default GAME;
