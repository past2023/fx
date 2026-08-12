# NEON WAKE — Asset Creation Guide

How to replace every piece of in-game artwork with your own PNGs.

The game ships with **no image files** — all art is generated at runtime from
pixel matrices. This guide explains how to override any of it. The system is
**fully opt-in and incremental**: drop in one PNG and only that one thing
changes; everything else keeps using the built-in art. Nothing breaks if a file
is missing, misnamed, or corrupt.

> **The GUI is deliberately excluded.** The HUD, menus, banners, gauges, score
> and all text stay vector-drawn (`fillText` / `fillRect`) so they remain crisp
> at any resolution and can be re-coloured or re-laid-out in code. There are no
> asset keys for UI elements.

---

## 1. Quick start

1. Create the folder for the asset you want to replace, e.g. `assets/player/`.
2. Save your PNG at the exact path from the table below, e.g.
   `assets/player/hull.png`.
3. Reload the page. That's it — no config, no build step.

Check the browser console. On load you'll see:

```
[NEON WAKE] art pack: 3/30 textures loaded.
```

Toggle the whole art pack on/off at runtime from the console:

```js
__art.setEnabled(false);   // force procedural art
__art.setEnabled(true);    // back to your PNGs
__art.failed;              // Set of keys that failed to load
```

---

## 2. Golden rules

| Rule | Why |
| --- | --- |
| **Transparent background** (32-bit RGBA PNG) | Sprites composite over the ocean. Never bake in a background colour. |
| **Author at the listed size** | Sizes match the collision boxes. A different size still works but will look mis-scaled against hitboxes. |
| **2x / 4x is fine** | Author at a multiple of the listed size and pass `scale` (see §7). Keep it an *integer* multiple to stay pixel-crisp. |
| **No anti-aliasing** | The canvas uses `image-rendering: pixelated`. Soft edges turn to mush. Use hard-edged pencil tools, and export with nearest-neighbour. |
| **Point "forward" = UP** | The player, bullets and missiles all travel up the screen. Enemies face *down* toward the player. |
| **Centre the subject** | Unless you set a `pivot`, the image centre lands on the entity position. |
| **Animation strips are horizontal** | All frames in one row, left to right, each exactly the same width. |

### Palette

Matching the built-in palette keeps everything cohesive:

| Role | Hex |
| --- | --- |
| Deep navy (bg) | `#0a0f24` |
| Ocean far / mid / base | `#1a7fa8` / `#106080` / `#0a4664` |
| Ocean deep / abyss | `#06304a` / `#04203a` |
| Wave crest | `#38b6d8` / `#2091b8` |
| Foam white | `#e8fbff` / `#bfeeff` |
| Cyan (player, friendly) | `#00f0ff` |
| Magenta (missiles, accents) | `#ff00a0` |
| Yellow (spread, warnings) | `#ffdd00` |
| Red (enemies, danger) | `#ff2e4d` |
| Green (pickups, OK) | `#3dff7a` |

---

## 3. Complete asset table

All paths are relative to `assets/`. **Every entry is optional.**
`Frames` = number of animation frames in the horizontal strip; total image
width must be `frame width × frames`.

### Player — `assets/player/`

| File | Frame size | Frames | Notes |
| --- | --- | --- | --- |
| `hull.png` | 24 × 40 | 3 | Bow points **up**. Frame 0 = level, 1 = banking left, 2 = banking right. |
| `thruster.png` | 16 × 28 | 4 | Boost plume. **Pivot is the top edge** (`[8, 0]`) so it grows downward from the stern. Additive/bright colours work best. |
| `shield.png` | 64 × 64 | 4 | Bubble drawn over the hull when the shield pickup is active. Keep the centre mostly transparent. |

### Enemies — `assets/enemies/`

| File | Frame size | Frames | Notes |
| --- | --- | --- | --- |
| `grunt.png` | 24 × 30 | 2 | Gunboat, faces **down**. 2-frame idle bob. |
| `jetski.png` | 18 × 22 | 2 | Frame 0 = cruising, **frame 1 = locked on / charging** (make this one visibly aggressive — it's the player's warning). |
| `helicopter.png` | 34 × 26 | 2 | Body only, no rotor. |
| `rotor.png` | 72 × 8 | 3 | Drawn separately above the body and faded by spin speed. |
| `boss.png` | 132 × 96 | 2 | Destroyer. Frame 0 = normal, frame 1 = final phase (add damage/fire). Warning lights stay procedural on top. |

### Projectiles — `assets/bullets/`

| File | Frame size | Frames | Notes |
| --- | --- | --- | --- |
| `gun.png` | 5 × 14 | 1 | Player tracer, points up. |
| `spread.png` | 5 × 14 | 1 | Yellow variant used while the spread upgrade is active. |
| `missile.png` | 8 × 16 | 2 | **Must point UP** — it's rotated to face travel direction. |
| `enemy.png` | 10 × 10 | 2 | Hostile plasma orb. Radial (rotation-independent). |
| `bomb.png` | 12 × 12 | 1 | Helicopter bomb; tumbles as it falls. |

### Pickups — `assets/pickups/`

All 22 × 22, **8 frames** — a full spin cycle (the built-in art fakes a
rotating cube; a real 8-frame spin looks great here).

`spread.png` (cyan/blue) · `missile.png` (red) · `ammo.png` (yellow) ·
`life.png` (green) · `shield.png` (white)

### World & obstacles — `assets/world/`

| File | Frame size | Frames | Notes |
| --- | --- | --- | --- |
| `mine.png` | 28 × 28 | 2 | Floating mine; frames alternate with the warning pulse. |
| `island.png` | 96 × 74 | 1 | Rocky island. Include its own foam ring — the procedural one is skipped. Sizes vary in game, so design it to scale. |
| `whirlpool.png` | 132 × 132 | 8 | Also rotated in code, so a subtle 8-frame churn is enough. |
| `buoy_red.png` | 20 × 34 | 2 | Left-lane marker. |
| `buoy_green.png` | 20 × 34 | 2 | Right-lane marker. |
| `gate.png` | 24 × 56 | 1 | Checkpoint pylon. Draw the **left-hand** pylon only — the right-hand one is the same image drawn with `flipX`, so keep it asymmetric-friendly. The glowing line strung between the two pylons is drawn in code, at the sprite's vertical centre. |
| `survivor.png` | 16 × 16 | 2 | Swimmer in the water, seen from above. Frame 0 = floating, **frame 1 = arm raised / waving** (this is the "I'm here" tell, so make it read at a glance). The foam ring and the panic flash are drawn in code around it. |

### Rivals — `assets/rivals/`

| File | Frame size | Frames | Notes |
| --- | --- | --- | --- |
| `hull.png` | 24 × 40 | 3 | The AI racers' boat, bow points **up**. Same frame convention as the player: 0 = level, 1 = banking left, 2 = banking right. All three rivals share this one sprite; their identity comes from the name tag and wake colour drawn in code, so keep the hull **fairly neutral in colour** or it will fight the per-rival tint. |

### Water — `assets/water/` ⚠️ special

These are **seamlessly tiling textures**, not sprites.

| File | Size | Notes |
| --- | --- | --- |
| `sky.png` | 480 × 160 | Above the horizon. Not tiled vertically. |
| `deep.png` | 480 × 256 | Base ocean colour. **Opaque.** |
| `waves.png` | 480 × 192 | Swell layer. **Transparent** — only the wave shapes. |
| `foam.png` | 480 × 128 | Whitecaps. **Transparent**, mostly empty. |

**Important:** supplying `deep.png` switches the *entire* ocean to the textured
path, disabling the procedural depth ramp, swells, crests and sun glitter. For
a complete look, provide all four. Each layer scrolls at its own parallax
speed (`deep` slowest, `foam` fastest), so:

- Each texture **must tile seamlessly top-to-bottom** (the top edge has to meet
  the bottom edge exactly), and horizontally at 480px.
- Bake the depth gradient into `deep.png` if you want one — but note the tile
  repeats, so a strong gradient will visibly band. A subtle one works better.

### Effects — `assets/fx/`

| File | Frame size | Frames | Notes |
| --- | --- | --- | --- |
| `explosion.png` | 64 × 64 | 8 | Played on kills. The particle burst still fires underneath. |
| `splash.png` | 64 × 64 | 6 | Water impact. |
| `muzzle.png` | 32 × 32 | 3 | Gun flash. |

---

## 4. Making a seamless water tile

1. Work at 480 × 256 (or 480 × 128 for foam).
2. Draw your waves, keeping the top ~24px and bottom ~24px sparse.
3. Offset vertically by half the height (GIMP: *Layer → Transform → Offset*,
   `y = height/2`, wrap; Photoshop: *Filter → Other → Offset*, "Wrap Around";
   Aseprite: *Edit → Shift*).
4. The seam is now in the middle — paint over it until it disappears.
5. Offset back (or don't; it's seamless either way).
6. Repeat horizontally with `x = 240`.

Test: place two copies stacked vertically and look for a visible line.

---

## 5. Recommended tools

- **Aseprite** — the standard for pixel art; native frame strips
  (*File → Export Sprite Sheet → horizontal strip*).
- **LibreSprite** — free Aseprite fork.
- **Piskel** (free, browser) — exports horizontal strips directly.
- **GIMP / Photoshop** — disable anti-aliasing on every tool; export
  *without* interpolation.

Whatever you use: **export nearest-neighbour, never bicubic.**

---

## 6. Adding a brand-new asset key

To add art for something not in the list:

1. Add an entry to `assets/manifest.js`:

   ```js
   { key: 'enemy.submarine', src: 'enemies/submarine.png', frames: 4 },
   ```

2. Draw it at the call site, falling back to procedural art:

   ```js
   import { art } from '#game/Assets.js';

   if (!art.draw(ctx, 'enemy.submarine', this.x, this.y, { frame })) {
     // ...existing fillRect drawing code...
   }
   ```

`art.draw()` returns `false` when there's no image, which is what makes the
fallback pattern a one-liner everywhere in the codebase.

---

## 7. `art.draw()` options

```js
art.draw(ctx, key, centreX, centreY, {
  scale: 1,      // 1 = native size. Use 0.5 if you authored at 2x.
  rot: 0,        // radians; rotates about the pivot
  flipX: false,  // mirror horizontally
  alpha: 1,      // multiplied with the current globalAlpha
  frame: 0,      // frame index into a horizontal strip
});
```

Set a custom `pivot: [x, y]` in the manifest (in **source pixels from the
top-left**) when the anchor shouldn't be the image centre — as `thruster.png`
does to grow downward from the stern.

---

## 8. Troubleshooting

| Symptom | Cause |
| --- | --- |
| Nothing changes after adding a PNG | Path/filename mismatch, or the browser cached the old 404. Hard-reload (Ctrl+Shift+R) and check `__art.failed`. |
| Sprite is huge or tiny | Authored at a different size than the table. Use `scale`, or resize. |
| Sprite looks blurry | Exported with anti-aliasing/interpolation. Re-export nearest-neighbour. |
| Sprite is offset from its hitbox | Subject isn't centred in the frame — add padding or set a `pivot`. |
| Animation jitters | Frames aren't all exactly the same width, or `frames` in the manifest is wrong. |
| Water shows a repeating seam | The tile isn't seamless — see §4. |
| Ocean lost its waves | You added `deep.png` only. Supply `waves.png` + `foam.png`, or remove `deep.png`. |
| Everything is procedural again | `__art.setEnabled(false)` was called, or the page is on `file://` (see the README — you need a local server). |
