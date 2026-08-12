# NEON WAKE — Hydrofoil Assault

A 2D top-down, vertical-scrolling futuristic speedboat racing shooter in a
cyberpunk pixel-art style. Vanilla JavaScript, native ES Modules, HTML5 Canvas.

**No build tools. No bundlers. No libraries. No external assets or fonts.**
Every sprite, particle and UI element is drawn at runtime with `fillRect` and
`fillText`.

---

## Running it

ES modules are subject to CORS, so the browser will refuse to load them from
`file://`. Serve the folder over HTTP:

```bash
# Python (any 3.x)
python3 -m http.server 8000
# then open http://localhost:8000
```

```bash
# Node alternative
npx serve .
```

Or use the **VS Code "Live Server"** extension → *Open with Live Server*.

If you do open `index.html` directly, the page detects it and shows
instructions instead of failing silently.

Tested against Chrome / Edge / Firefox (any modern browser with import-map
support — Chrome 89+, Firefox 108+, Safari 16.4+).

---

## Controls

| Input | Action |
| --- | --- |
| `←` `→` `↑` `↓` / `WASD` | Steer (8-directional, with water inertia) |
| `↑` / `W` **held** | **Boost** — burns the boost gauge, speeds up the world |
| `Space` | Machine guns (regenerating ammo) |
| `Shift` | Homing missile (max 3) |
| `P` / `Esc` | Pause &nbsp;·&nbsp; `Esc` on the results screen returns to the title |
| `M` | Mute |

---

## Gameplay

- **Boost economy** — holding up drains the gauge and accelerates the scroll;
  it refills when you ease off (faster if you throttle down). The sea visibly
  whips up — more whitecaps and speed streaks — the faster you go.
- **Weapons** — machine guns fire continuously and the ammo bar refills
  automatically; blue `W` pickups grant a temporary 3-way (and, stacked, 5-way)
  spread. `Shift` launches homing missiles that re-acquire a new target if
  theirs dies, and deal splash damage.
- **Pickups** — blue = spread, red = missile, yellow = ammo, green = 1UP,
  white = shield. They magnetise toward you when you get close.
- **Enemies** — Grunt gunboats strafe and shoot aimed plasma; Jet Skis line up
  and then charge to ram; Helicopters hover and drop arcing bombs.
- **Hazards** — floating mines (destructible, and they damage enemies too),
  rocky islands (solid — you bounce off) and whirlpools (they drag and slow you
  but deal no damage).
- **Waves** — a new wave every 30 seconds, *or* immediately when you clear the
  current one (which pays a clear bonus). Every 4th wave is a **Destroyer boss**
  with three escalating attack phases and a staged, explosive death.
- **Combos** — chain kills within 2 seconds to climb x2 → x4 → x8 → x16.
  Taking damage breaks the chain.
- **High score** persists in `localStorage`.

### Fairness details worth knowing

- The player's collision box is a small **core hitbox** (~40% of the sprite), so
  near-misses graze the hull rather than killing you.
- A central **fire-rate governor** caps how many aimed enemy shots may be fired
  per second, so dense waves stay readable instead of becoming a bullet wall.
- Jet Skis only commit to their charge while still high on screen, so the
  attack is always telegraphed.

---

## Architecture

```
/
├── index.html            entry point + <script type="importmap"> ("#game/" → "./js/")
├── css/
│   └── style.css         page styling, canvas centring, aspect-ratio box, CRT vignette
├── assets/
│   ├── ASSET_GUIDE.md    how to author replacement PNGs (sizes, pivots, tiling)
│   └── manifest.js       optional PNG list — every entry falls back to pixel art
└── js/
    ├── main.js           game loop, delta time, state machine, wave director,
    │                     scoring/combo economy, central collision dispatch
    ├── config.js         all constants (sizes, palette, physics, tuning) + math helpers
    ├── Input.js          keyboard singleton — held state + per-frame edge presses
    ├── Player.js         speedboat: inertia, boost, i-frames, banking, wake
    ├── Enemy.js          Enemy base + Grunt, JetSki, Helicopter, Boss
    ├── Bullet.js         pooled projectiles (tracer / plasma / bomb / homing missile)
    ├── WeaponSystem.js   cooldowns, ammo regen, spread upgrades, missile logic
    ├── Particle.js       pooled pixel particles: explosions, wake, sparks, popups
    ├── PowerUp.js        pickup cubes + weighted drop table
    ├── Scroller.js       parallax waves, skyline, buoys, obstacle spawning
    ├── Collision.js      pure AABB / circle / MTV helpers (no state, no imports)
    ├── UIManager.js      HUD, banners, boss bar, menu / pause / game-over, CRT pass
    ├── Sprite.js         pixel-matrix renderer + shared sprite data
    ├── Assets.js         PNG registry — swaps generated art for images
    └── Sound.js          Web Audio SFX + bass sequencer, fully procedural
```

**Design notes**

- Rendering is a fixed **480×720** buffer scaled by CSS with
  `image-rendering: pixelated`, so the art stays crisp at any window size.
- `Collision.js` is completely pure — it takes plain `{x, y, w, h}`
  centre-anchored boxes and returns data; `main.js` owns all the dispatch.
- `Input` and `sfx` are exported **singletons**; everything else is instantiated
  by `Game` and passed down explicitly. There are no mutable globals.
- Bullets and particles use **fixed-capacity pools**, so a long session doesn't
  allocate or trigger GC hitches.
- Audio is created lazily on the first key press to satisfy browser autoplay
  policy, and is entirely synthesised (oscillators + filtered noise).

### Juice

Pixel explosions with shockwave rings, trauma-based screen shake, hit-stop
freeze frames on kills, additive neon glow, full-screen flashes, floating score
popups, a rolling score counter, banked steering, boost plumes, foam wakes,
and a CRT scanline + rolling-refresh-band overlay.

---

## Tuning

Nearly everything interesting lives in `js/config.js` — `PLAYER`, `WORLD`,
`WEAPONS`, `ENEMY`, `RULES` and the `COLORS` palette. The wave composition
table is at the top of `js/main.js`.

---

## Replacing the artwork with PNGs

Every graphic in the game — player, enemies, bullets, pickups, obstacles, the
water itself — can be replaced with your own PNGs **without touching any
gameplay code**. The HUD/GUI is intentionally excluded and stays vector-drawn.

```
assets/
├── ASSET_GUIDE.md   ← full spec: sizes, pivots, frame strips, seamless tiling
├── manifest.js      ← the list of overridable keys
├── player/  enemies/  bullets/  pickups/  world/  water/  fx/
```

Drop a correctly-named PNG into the matching folder and reload — that sprite is
now yours. Anything you *don't* provide keeps using the built-in procedural
pixel art, so a partial art pack is perfectly valid. Missing or broken files
are non-fatal by design.

Read **[`assets/ASSET_GUIDE.md`](assets/ASSET_GUIDE.md)** for exact frame
sizes, pivots, animation-strip layout, the palette, and how to make the water
textures tile seamlessly.

Debug helpers in the browser console:

```js
__art.setEnabled(false);  // force procedural art, ignoring PNGs
__art.failed;             // keys whose files didn't load
```
