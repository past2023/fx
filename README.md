# Bio-Force: Parasite Dawn

A classic side-scrolling shoot-'em-up inspired by R-Type and Gradius, built with vanilla HTML5 Canvas, CSS, and JavaScript.

## 🎮 How to Play

**No build tools or server required!** Simply open `index.html` in a modern web browser (Chrome or Firefox recommended).

### Controls

- **Arrow Keys / WASD** - Move your ship
- **Z / Space** - Fire weapons
- **X** - Detach or recall the Force Pod
- **F** - Toggle fullscreen

### Objective

Survive through Level 1: "Bio-Force: Parasite Dawn" and defeat the massive Goliath Parasite boss!

## 🎯 Game Features

### Core Mechanics

- **Auto-scrolling gameplay** - The world scrolls from right to left
- **Force Pod System** - Your detachable power pod:
  - **Attached**: Blocks enemy bullets and powers up your weapons
  - **Detached**: Hovers and follows your ship, still blocking bullets
  - **Recall**: Press X again to bring it back
- **Three lives** with 2-second invincibility after death
- **Small hitbox** - Only the center of your ship is vulnerable

### Force Pod Power Levels

Collect green "P" power-ups to upgrade your pod:

1. **Basic** - Single shot
2. **Double** - Two parallel shots
3. **Spread** - Three-way shot spread

### Enemy Types

- **Drones** - Red diamond-shaped enemies that move in sine waves
- **Turrets** - Ceiling and floor-mounted guns that aim at you
- **Swarm** - Fast orange arrow-shaped enemies in groups
- **Mid-Boss** - Large purple worm that weaves vertically
- **Final Boss** - The massive Goliath Parasite with three phases

### Level 1 Sequence

The level progresses through timed waves:

1. **0-10s**: Drones in sine-wave patterns
2. **10-20s**: Ceiling and floor turrets
3. **20-35s**: Swarm enemies + power-up opportunity
4. **35-50s**: Mid-boss (worm)
5. **50-65s**: Calm period, then WARNING alert
6. **65s+**: Final boss fight

### Boss: Goliath Parasite

The massive bio-mechanical boss has three distinct phases:

**Phase 1 (100-70% HP)**
- 3-way spread from central eye
- Claws fire aimed bullets
- Stay behind your Force Pod for safety

**Phase 2 (70-40% HP)**
- Claws detach and orbit independently
- Rotating laser sweep from the eye
- Claws are destructible for bonus points

**Phase 3 (Below 40% HP)**
- Rapid bullet rings
- Faster laser sweeps
- Eye flashes - increased vulnerability
- High damage output, stay mobile!

## 📁 Project Structure

```
fx/
├── index.html       # Entry point
├── style.css        # Fullscreen canvas styling
├── constants.js     # All tunable game parameters
├── input.js         # Keyboard state manager
├── sound.js         # Web Audio API sound effects
├── particles.js     # Particle system and explosions
├── bullet.js        # Player and enemy bullets
├── forcepod.js      # Detachable Force pod mechanics
├── player.js        # Player ship logic
├── enemies.js       # Regular enemy types
├── boss.js          # Goliath Parasite boss
├── background.js    # Parallax starfield and environment
├── hud.js           # Score, lives, boss health bar
├── game.js          # Main game loop and state machine
├── main.js          # Initialization and canvas scaling
└── README.md        # This file
```

## 🎨 Technical Highlights

- **Logical resolution**: 960×540, scaled to fit window (16:9 ratio)
- **Delta-time game loop**: Frame-independent movement using `requestAnimationFrame`
- **Object pooling**: Efficient bullet and particle management
- **Procedural graphics**: All visuals drawn with Canvas API (no image assets)
- **Procedural audio**: Sound effects generated with Web Audio API oscillators
- **Circle collision**: Precise hitbox detection
- **State machine**: MENU → PLAYING → BOSS → STAGE_CLEAR / GAMEOVER
- **Parallax background**: Two-layer starfield + bio-mechanical environment
- **High score persistence**: Saved to localStorage

## 🔧 Future Sprite Replacement

Every renderable object includes a `sprite` property and checks for it before drawing placeholder shapes. The `AssetLoader` stub in `main.js` is ready for loading PNG sprite images.

Example pattern in each entity:
```javascript
render(ctx) {
    // TODO: Replace with sprite image
    if (this.sprite) {
        ctx.drawImage(this.sprite, this.x - this.radius, ...);
        return;
    }
    // Draw placeholder shape...
}
```

## 🎛️ Tuning

All game parameters are in `constants.js`:

- Player speed, fire rate, hitbox size
- Enemy spawn timing and stats
- Bullet speeds and damage
- Particle counts and lifetimes
- Colors and visual effects
- Boss HP and phase thresholds

## 🏆 Scoring

- Drone: 100 points
- Turret: 200 points
- Swarm: 80 points
- Mid-Boss: 2,000 points
- Power-Up: 500 points
- Boss Claw: 500 points
- Goliath Parasite: 10,000 points

High scores are saved automatically in your browser's localStorage.

## 🌟 Tips

1. **Use the Force Pod strategically** - Keep it attached for defense, detach it to block bullets while you dodge
2. **Aim for the boss's eye** - It's the only weak point on the Goliath Parasite
3. **Collect power-ups early** - The spread shot is essential for the boss fight
4. **Stay mobile in Phase 3** - The bullet rings are deadly, use the pod as a shield
5. **Destroy claws in Phase 2** - They deal bonus damage and reduce the boss's attack patterns

## 📝 Credits

Built as a demonstration of vanilla HTML5 Canvas game development with modular architecture.

Inspired by:
- R-Type (Irem, 1987)
- Gradius (Konami, 1985)

Enjoy the game! 🚀
