# NEON WAKE — Hydrofoil Assault

A 2D top-down, vertical-scrolling futuristic speedboat **race** in a bright
summer-daytime pixel-art style: run a point-to-point ocean course against three
rival racers, rescue swimmers from the water, master drift and currents, bank
power-up tokens on a Gradius-style selector, and sink the destroyer waiting at
the finish. Vanilla JavaScript, native ES Modules, HTML5 Canvas.

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
| `←` `→` `↑` `↓` / `WASD` | Steer — momentum-based, the hull keeps sliding |
| `↑` / `W` **held** | **Boost** — burns the boost gauge, speeds up the world |
| `Shift` **held** | **Drift** — break grip, slide wide, charge a drift boost |
| `Space` | Machine guns (regenerating ammo) |
| `X` | Homing missile (max 3) |
| `Z` / `Enter` | **Activate** the selected power-up on the token bar |
| `P` / `Esc` | Pause &nbsp;·&nbsp; `Esc` on the results screen returns to the title |
| `M` | Mute |

---

## Gameplay

### The race

The course is a fixed **point-to-point route of themed sections** — Harbour
Start, Coral Reef, Rescue Zone, Patrol Gauntlet, Narrow Straits, Survivors
Ahead, Open Sea Sprint — ending in a **Final Boss** destroyer. A progress track
across the top of the screen shows every section, the rescue zones (green), the
finish flag and your pip moving along the route.

- **Rivals & placement** — VIPER, ORCA and KESTREL race the same route. Your
  position (`1ST` … `4TH`) updates live in the top-right, rivals rubber-band so
  the pack stays close, and you can body-check them. Finishing position pays a
  large placement bonus.
- **Checkpoint gates** — pylon gates appear through the course; passing between
  them refunds boost and pays points, missing one costs you nothing but time.
- **Final boss** — reaching the end of the route triggers the destroyer. Sink it
  to cross the finish line and see the results screen.

### People rescue

Marked **rescue zones** drop swimmers into the water; they drift with the
current and panic-flash as their timer runs down. Drive over one to pick it up
(`SURVIVORS n/N` tracks the zone). Every save pays out, and clearing a whole
zone pays a large bonus. Swimmers you leave behind are lost for good and are
counted on the results screen.

### Water momentum & drift

The boat has **no car-like grip**. Lateral velocity bleeds off exponentially
rather than snapping to zero, so you carry speed through turns and have to
plan entries. Holding `Shift` **drifts**: grip drops, steering authority rises,
the hull banks hard and a drift charge builds — release it for a free speed
burst. A **flow-field current** pushes the boat, the enemies and the swimmers
around; faint arrows hint at its direction, and riding it is faster than
fighting it.

### Gradius power-up bar

Killing enemies and clearing gates drops **tokens**. Tokens light up a selector
bar along the bottom of the screen, and `Z` spends them on whichever slot you
can currently afford:

| Slot | Cost | Effect |
| --- | --- | --- |
| `SPEED` | 1 | +10% top speed, stacks up to 4× |
| `MISSILE` | 2 | +2 homing missiles |
| `FIRE` | 3 | 16 s of spread fire |
| `TURBO` | 4 | 9 s of free boost (no gauge drain) |
| `SHIELD` | 5 | 12 s of damage immunity |

Banking tokens for an expensive slot instead of spending them immediately is the
core economic decision — exactly like Gradius.

- **Boost economy** — holding up drains the gauge and accelerates the scroll;
  it refills when you ease off (faster if you throttle down). The sea visibly
  whips up — more whitecaps and speed streaks — the faster you go.
- **Weapons** — machine guns fire continuously and the ammo bar refills
  automatically; blue `W` pickups grant a temporary 3-way (and, stacked, 5-way)
  spread. `X` launches homing missiles that re-acquire a new target if
  theirs dies, and deal splash damage.
- **Pickups** — blue = spread, red = missile, yellow = ammo, green = 1UP,
  white = shield. They magnetise toward you when you get close.
- **Enemies** — Grunt gunboats strafe and shoot aimed plasma; Jet Skis line up
  and then charge to ram; Helicopters hover and drop arcing bombs.
- **Hazards** — floating mines (destructible, and they damage enemies too),
  rocky islands (solid — you bounce off) and whirlpools (they drag and slow you
  but deal no damage).
- **Section pacing** — each course section defines its own enemy and mine
  density, so pressure ebbs and flows along the route instead of arriving in
  fixed waves. The **Destroyer boss** has three escalating attack phases and a
  staged, explosive death.
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
    ├── main.js           game loop, delta time, state machine, course director,
    │                     scoring/combo economy, central collision dispatch
    ├── config.js         all constants (sizes, palette, physics, tuning) + math helpers
    ├── Input.js          keyboard singleton — held state + per-frame edge presses
    ├── Player.js         speedboat: inertia, boost, i-frames, banking, wake
    ├── Enemy.js          Enemy base + Grunt, JetSki, Helicopter, Boss
    ├── Bullet.js         pooled projectiles (tracer / plasma / bomb / homing missile)
    ├── WeaponSystem.js   cooldowns, ammo regen, spread upgrades, missile logic
    ├── Particle.js       pooled pixel particles: explosions, wake, sparks, popups
    ├── PowerUp.js        pickup cubes + weighted drop table
    ├── Scroller.js       daytime sky, tropical coast, ocean, buoys, obstacles
    ├── Course.js         point-to-point route, themed sections, checkpoint gates
    ├── Rival.js          the three AI racers + live placement logic
    ├── Rescue.js         swimmers in the water + rescue-zone bookkeeping
    ├── Current.js        flow-field water current that pushes everything around
    ├── PowerBar.js       Gradius token economy + manual power-up activation
    ├── Collision.js      pure AABB / circle / MTV helpers (no state, no imports)
    ├── UIManager.js      HUD, course track, power bar, banners, boss bar,
    │                     menu / pause / game-over / finish screens, CRT pass
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
