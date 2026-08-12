// File: assets/manifest.js
/**
 * Asset manifest — the complete list of PNGs the game will use *if present*.
 *
 * The game ships with none of these files and runs entirely on procedural
 * pixel art. Drop a PNG at the listed path and it is picked up on the next
 * reload, replacing the generated art for that one key. Everything is
 * optional and independent: you can replace only the player, only the water,
 * or the whole set.
 *
 * `pivot` is [x, y] in SOURCE PIXELS from the top-left of the frame, marking
 * the point that lands on the entity's position. Omit it to use the centre.
 * For boats and aircraft the pivot should be the visual centre of mass.
 *
 * `frames` declares a horizontal animation strip (all frames the same width).
 *
 * Sizes below are the *design* sizes the procedural art uses. A PNG at 2x or
 * 4x those dimensions works too — set `scale` at the call site, or just author
 * at the listed size for a pixel-perfect match.
 *
 * See ASSET_GUIDE.md in this folder for full authoring instructions.
 */

/** @type {import('../js/Assets.js').AssetDef[]} */
export const MANIFEST = [
  /* ---------------- Player ---------------- */
  // 24x40. Pivot = hull centre. Frames: 0 idle, 1 bank left, 2 bank right.
  { key: 'player.hull',    src: 'player/hull.png',    frames: 3 },
  // 16x28 additive thruster plume, anchored at its TOP so it grows downward.
  { key: 'player.thruster', src: 'player/thruster.png', frames: 4, pivot: [8, 0] },
  // 64x64 shield bubble, drawn additively over the hull.
  { key: 'player.shield',  src: 'player/shield.png',  frames: 4 },

  /* ---------------- Enemies ---------------- */
  { key: 'enemy.grunt',      src: 'enemies/grunt.png',      frames: 2 },
  { key: 'enemy.jetski',     src: 'enemies/jetski.png',     frames: 2 },
  { key: 'enemy.helicopter', src: 'enemies/helicopter.png', frames: 2 },
  // Rotor is drawn separately so it can spin independently: 72x8.
  { key: 'enemy.rotor',      src: 'enemies/rotor.png',      frames: 3 },
  // Boss: 132x96 hull. Turrets are baked in; muzzle flashes stay procedural.
  { key: 'enemy.boss',       src: 'enemies/boss.png',       frames: 2 },

  /* ---------------- Projectiles ---------------- */
  { key: 'bullet.gun',     src: 'bullets/gun.png' },        // 5x14
  { key: 'bullet.spread',  src: 'bullets/spread.png' },     // 5x14 (yellow variant)
  { key: 'bullet.missile', src: 'bullets/missile.png',  frames: 2 }, // 8x16, points UP
  { key: 'bullet.enemy',   src: 'bullets/enemy.png',    frames: 2 }, // 10x10
  { key: 'bullet.bomb',    src: 'bullets/bomb.png' },       // 12x12

  /* ---------------- Pickups ---------------- */
  // 22x22 each. Frame strip = the spin cycle (8 frames recommended).
  { key: 'pickup.spread',  src: 'pickups/spread.png',  frames: 8 },
  { key: 'pickup.missile', src: 'pickups/missile.png', frames: 8 },
  { key: 'pickup.ammo',    src: 'pickups/ammo.png',    frames: 8 },
  { key: 'pickup.life',    src: 'pickups/life.png',    frames: 8 },
  { key: 'pickup.shield',  src: 'pickups/shield.png',  frames: 8 },

  /* ---------------- Obstacles & world props ---------------- */
  { key: 'obstacle.mine',      src: 'world/mine.png',      frames: 2 },  // 28x28
  { key: 'obstacle.island',    src: 'world/island.png' },                // 96x74 max
  { key: 'obstacle.whirlpool', src: 'world/whirlpool.png', frames: 8 },  // 132x132
  { key: 'world.buoyRed',      src: 'world/buoy_red.png',   frames: 2 }, // 20x34
  { key: 'world.buoyGreen',    src: 'world/buoy_green.png', frames: 2 },

  /* ---------------- Race furniture ---------------- */
  { key: 'world.gate',     src: 'world/gate.png',     frames: 1 },  // 24x56 pylon
  { key: 'world.survivor', src: 'world/survivor.png', frames: 2 },  // 16x16 swimmer
  { key: 'rival.hull',     src: 'rivals/hull.png',    frames: 3 },  // 24x40, tinted

  /* ---------------- Water (seamless tiles) ----------------
   * These MUST tile seamlessly on both axes. 480px wide matches the play
   * area exactly; height is free (128–256 works well).
   * Supplying `water.deep` switches the whole ocean to the textured path.  */
  { key: 'water.sky',   src: 'water/sky.png' },      // 480x160, not tiled vertically
  { key: 'water.deep',  src: 'water/deep.png' },     // 480x256 base ocean
  { key: 'water.waves', src: 'water/waves.png' },    // 480x192 swells, transparent
  { key: 'water.foam',  src: 'water/foam.png' },     // 480x128 crests, transparent

  /* ---------------- Effects ---------------- */
  // 64x64 per frame; played on kills in place of (or over) the particle burst.
  { key: 'fx.explosion', src: 'fx/explosion.png', frames: 8, fps: 24 },
  { key: 'fx.splash',    src: 'fx/splash.png',    frames: 6, fps: 20 },
  { key: 'fx.muzzle',    src: 'fx/muzzle.png',    frames: 3, fps: 30 },
];

export default MANIFEST;
