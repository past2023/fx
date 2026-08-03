// Bio-Force: Parasite Dawn - Constants

const CONSTANTS = {
    // Canvas dimensions (logical resolution)
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 540,
    
    // Game speeds
    SCROLL_SPEED: 100, // pixels per second
    PLAYER_SPEED: 300,
    PLAYER_MAX_X: 300, // Player can move horizontally within this range
    PLAYER_MIN_X: 50,
    
    // Force Pod
    POD_SPEED: 400,
    POD_FOLLOW_DELAY: 0.3, // seconds
    POD_OFFSET_ATTACHED: 35, // Distance from player when attached
    
    // Bullets
    PLAYER_BULLET_SPEED: 600,
    ENEMY_BULLET_SPEED: 200,
    BOSS_BULLET_SPEED: 250,
    BULLET_DAMAGE: 1,
    
    // Timers
    PLAYER_INVINCIBILITY_TIME: 2, // seconds after death
    FIRE_RATE: 0.15, // seconds between shots
    POD_TOGGLE_COOLDOWN: 0.3,
    
    // Hitbox sizes
    PLAYER_HITBOX_RADIUS: 4,
    POD_HITBOX_RADIUS: 12,
    BULLET_HITBOX_RADIUS: 5,
    
    // Lives and scoring
    INITIAL_LIVES: 3,
    SCORE_ENEMY_DRONE: 100,
    SCORE_ENEMY_TURRET: 200,
    SCORE_ENEMY_SWARM: 150,
    SCORE_ENEMY_MIDBOSS: 1000,
    SCORE_BOSS: 5000,
    
    // Enemy spawn timings (in seconds)
    WAVE_DRONE_START: 0,
    WAVE_DRONE_END: 10,
    WAVE_TURRET_START: 10,
    WAVE_TURRET_END: 20,
    WAVE_SWARM_START: 20,
    WAVE_SWARM_END: 35,
    WAVE_MIDBOSS_START: 35,
    WAVE_MIDBOSS_END: 50,
    WAVE_CALM_START: 50,
    WAVE_CALM_END: 65,
    BOSS_SPAWN_TIME: 65,
    
    // Boss settings
    BOSS_HP: 100,
    BOSS_ENTER_X: 624, // 65% of screen width
    
    // Colors
    COLOR_PLAYER: '#00FFFF',
    COLOR_POD: '#FF8800',
    COLOR_PLAYER_BULLET: '#FFFF00',
    COLOR_ENEMY_BULLET: '#FF4444',
    COLOR_ENEMY_DRONE: '#FF0000',
    COLOR_ENEMY_TURRET: '#8800FF',
    COLOR_ENEMY_SWARM: '#FF4400',
    COLOR_BOSS: '#440044',
    COLOR_BOSS_VEINS: '#FF0000',
    COLOR_BOSS_EYE: '#FFFF00',
    COLOR_STAR: '#FFFFFF',
    COLOR_BG_ORGANIC: '#004400',
    COLOR_BG_METAL: '#444444',
    
    // Font
    FONT_MAIN: '20px "Courier New", monospace',
    FONT_LARGE: '40px "Courier New", monospace',
    FONT_HUGE: '60px "Courier New", monospace'
};

// Export for use in other modules (when running as module)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}
