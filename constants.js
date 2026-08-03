/**
 * constants.js - All tunable game parameters
 * Every magic number lives here for easy balancing.
 */

// -----------------------------------------------------------
// Display / resolution
// -----------------------------------------------------------
const GAME_WIDTH  = 960;
const GAME_HEIGHT = 540;
const MAX_DT      = 1 / 30;          // cap delta to avoid spiral-of-death (seconds)
const TARGET_FPS  = 60;

// -----------------------------------------------------------
// Scrolling
// -----------------------------------------------------------
const SCROLL_SPEED       = 120;      // pixels per second (base world scroll)
const SCROLL_BOSS_SPEED  = 60;       // slower during boss fight
const BOSS_STOP_X        = GAME_WIDTH * 0.65;

// -----------------------------------------------------------
// Player
// -----------------------------------------------------------
const PLAYER_X_RATIO      = 0.18;    // starting X position as fraction of width
const PLAYER_START_Y      = GAME_HEIGHT / 2;
const PLAYER_SPEED        = 280;
const PLAYER_HITBOX       = 6;       // radius of true damage hitbox
const PLAYER_DRAW_RADIUS  = 16;      // visual size (triangle tip-to-center)
const PLAYER_FIRE_RATE    = 0.12;    // seconds between shots
const PLAYER_MAX_LIVES    = 3;
const PLAYER_INVINCIBLE_TIME = 2.0;  // seconds after death

// -----------------------------------------------------------
// Force Pod
// -----------------------------------------------------------
const POD_ATTACH_OFFSET_X   = 40;    // pixels ahead of player when docked
const POD_SPEED             = 320;   // catch-up speed when returning
const POD_LAUNCH_SPEED      = 500;   // initial launch velocity
const POD_DETACH_RANGE      = 220;   // max distance from player before hovering
const POD_RADIUS            = 12;
const POD_HITBOX            = POD_RADIUS;
const POD_FOLLOW_LERP       = 3.5;   // how quickly detached pod trails ship

// -----------------------------------------------------------
// Bullets
// -----------------------------------------------------------
const PLAYER_BULLET_SPEED   = 520;
const PLAYER_BULLET_RADIUS  = 4;
const PLAYER_BULLET_DAMAGE  = 1;
const ENEMY_BULLET_SPEED    = 200;
const ENEMY_BULLET_RADIUS   = 5;

// -----------------------------------------------------------
// Particles
// -----------------------------------------------------------
const MAX_PARTICLES         = 400;
const EXPLOSION_PARTICLES   = 18;
const DEBRIS_LIFETIME       = 0.8;   // seconds

// -----------------------------------------------------------
// Colors
// -----------------------------------------------------------
const COLOR_PLAYER     = '#00e5ff';
const COLOR_PLAYER_DIM = '#005f6b';
const COLOR_POD        = '#ff8c00';
const COLOR_POD_GLOW   = '#ffcc66';
const COLOR_BULLET_PLAYER = '#ffee00';
const COLOR_BULLET_ENEMY  = '#ff3366';
const COLOR_DRONE      = '#cc3333';
const COLOR_TURRET     = '#aa2255';
const COLOR_SWARM      = '#ee5500';
const COLOR_MIDBOSS    = '#9922cc';
const COLOR_BOSS_BODY  = '#3a0055';
const COLOR_BOSS_VEIN  = '#cc0000';
const COLOR_BOSS_EYE   = '#ffff00';
const COLOR_CLAW       = '#666688';
const COLOR_STAR_1     = '#ffffff';
const COLOR_STAR_2     = '#aaaacc';
const COLOR_BIO_LINE   = '#1a3333';
const COLOR_BIO_GRID   = '#0a2222';
const COLOR_HUD_TEXT   = '#ffffff';
const COLOR_HUD_BAR_BG = '#330000';
const COLOR_HUD_BAR    = '#ff0044';
const COLOR_WARNING    = '#ff0000';

// -----------------------------------------------------------
// Enemy timing (seconds from level start)
// -----------------------------------------------------------
const WAVE_1_START = 0;              // drones
const WAVE_2_START = 10;             // turrets
const WAVE_3_START = 20;             // swarm + powerup
const WAVE_4_START = 35;             // mid-boss
const WAVE_5_START = 50;             // calm + warning
const WAVE_6_START = 65;             // boss

const WARNING_DURATION = 5;          // how long "WARNING" text shows
const BOSS_ENTER_TIME  = 2;          // seconds for boss to slide in

// -----------------------------------------------------------
// Enemy stats
// -----------------------------------------------------------
const DRONE_HP           = 1;
const DRONE_SCORE        = 100;
const DRONE_FIRE_RATE    = 1.8;
const DRONE_AMPLITUDE    = 60;
const DRONE_FREQ         = 2.0;

const TURRET_HP          = 3;
const TURRET_SCORE       = 200;
const TURRET_FIRE_RATE   = 1.4;

const SWARM_HP           = 1;
const SWARM_SCORE        = 80;
const SWARM_SPEED        = 240;

const MIDBOSS_HP         = 25;
const MIDBOSS_SCORE      = 2000;

const BOSS_HP            = 120;
const BOSS_SCORE         = 10000;

const POWERUP_SCORE      = 500;

// -----------------------------------------------------------
// Object pool sizes
// -----------------------------------------------------------
const POOL_BULLETS_PLAYER  = 30;
const POOL_BULLETS_ENEMY   = 120;
const POOL_ENEMIES         = 40;
const POOL_POWERUPS        = 5;

// -----------------------------------------------------------
// Sound
// -----------------------------------------------------------
const SFX_VOLUME_MASTER = 0.35;

// -----------------------------------------------------------
// High-score storage key
// -----------------------------------------------------------
const HS_KEY = 'bioforce_highscore_v1';

// -----------------------------------------------------------
// Expose as frozen namespace (read-only)
// -----------------------------------------------------------
window.GAME_CONSTANTS = Object.freeze({
    GAME_WIDTH, GAME_HEIGHT, MAX_DT, TARGET_FPS,
    SCROLL_SPEED, SCROLL_BOSS_SPEED, BOSS_STOP_X,
    PLAYER_X_RATIO, PLAYER_START_Y, PLAYER_SPEED,
    PLAYER_HITBOX, PLAYER_DRAW_RADIUS, PLAYER_FIRE_RATE,
    PLAYER_MAX_LIVES, PLAYER_INVINCIBLE_TIME,
    POD_ATTACH_OFFSET_X, POD_SPEED, POD_LAUNCH_SPEED,
    POD_DETACH_RANGE, POD_RADIUS, POD_HITBOX, POD_FOLLOW_LERP,
    PLAYER_BULLET_SPEED, PLAYER_BULLET_RADIUS, PLAYER_BULLET_DAMAGE,
    ENEMY_BULLET_SPEED, ENEMY_BULLET_RADIUS,
    MAX_PARTICLES, EXPLOSION_PARTICLES, DEBRIS_LIFETIME,
    COLOR_PLAYER, COLOR_PLAYER_DIM, COLOR_POD, COLOR_POD_GLOW,
    COLOR_BULLET_PLAYER, COLOR_BULLET_ENEMY,
    COLOR_DRONE, COLOR_TURRET, COLOR_SWARM, COLOR_MIDBOSS,
    COLOR_BOSS_BODY, COLOR_BOSS_VEIN, COLOR_BOSS_EYE, COLOR_CLAW,
    COLOR_STAR_1, COLOR_STAR_2, COLOR_BIO_LINE, COLOR_BIO_GRID,
    COLOR_HUD_TEXT, COLOR_HUD_BAR_BG, COLOR_HUD_BAR, COLOR_WARNING,
    WAVE_1_START, WAVE_2_START, WAVE_3_START,
    WAVE_4_START, WAVE_5_START, WAVE_6_START,
    WARNING_DURATION, BOSS_ENTER_TIME,
    DRONE_HP, DRONE_SCORE, DRONE_FIRE_RATE, DRONE_AMPLITUDE, DRONE_FREQ,
    TURRET_HP, TURRET_SCORE, TURRET_FIRE_RATE,
    SWARM_HP, SWARM_SCORE, SWARM_SPEED,
    MIDBOSS_HP, MIDBOSS_SCORE,
    BOSS_HP, BOSS_SCORE, POWERUP_SCORE,
    POOL_BULLETS_PLAYER, POOL_BULLETS_ENEMY,
    POOL_ENEMIES, POOL_POWERUPS,
    SFX_VOLUME_MASTER,
    HS_KEY
});
