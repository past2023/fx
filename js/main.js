// File: js/main.js
/**
 * Game orchestrator.
 *
 *  - fixed-timestep-ish delta loop on requestAnimationFrame
 *  - MENU / PLAYING / PAUSED / GAME_OVER state machine
 *  - wave director (progressive spawns + boss waves)
 *  - combo & scoring economy
 *  - central collision dispatch (via Collision.js helpers)
 *  - screen shake, hit-stop and the CRT presentation pass
 *
 * Everything else lives in its own module; this file only wires them.
 */

import {
  GAME_W, GAME_H, STATE, COLORS, RULES, WEAPONS, SHAKE,
  clamp, rand, randInt, pick, lerp,
} from '#game/config.js';
import { input } from '#game/Input.js';
import { sfx } from '#game/Sound.js';
import { ParticleSystem } from '#game/Particle.js';
import { BulletPool } from '#game/Bullet.js';
import { Player } from '#game/Player.js';
import { WeaponSystem } from '#game/WeaponSystem.js';
import { createEnemy, Boss } from '#game/Enemy.js';
import { PowerUp, rollDropType } from '#game/PowerUp.js';
import { Scroller } from '#game/Scroller.js';
import { UIManager } from '#game/UIManager.js';
import { aabb, resolve } from '#game/Collision.js';

/**
 * Wave composition tables — index is clamped to the last entry.
 * `rate` is the average gap in seconds between spawns; waves are tuned so
 * the lane is never empty for more than a couple of seconds.
 */
const WAVE_TABLE = [
  { grunt: 8,  jetski: 2,  helicopter: 0, rate: 1.05 },
  { grunt: 10, jetski: 5,  helicopter: 1, rate: 0.95 },
  { grunt: 12, jetski: 7,  helicopter: 2, rate: 0.85 },
  { grunt: 13, jetski: 9,  helicopter: 3, rate: 0.78 },
  { grunt: 15, jetski: 11, helicopter: 4, rate: 0.7 },
  { grunt: 17, jetski: 13, helicopter: 5, rate: 0.63 },
  { grunt: 20, jetski: 16, helicopter: 6, rate: 0.55 },
];

class Game {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;

    // --- systems ---
    this.particles = new ParticleSystem(1000);
    this.bullets = new BulletPool(200);       // player projectiles
    this.enemyBullets = new BulletPool(220);  // hostile projectiles
    this.player = new Player(this.particles);
    this.weapons = new WeaponSystem(this.bullets, this.particles);
    this.scroller = new Scroller(this.particles);
    this.ui = new UIManager();

    /** @type {Array<import('#game/Enemy.js').Enemy>} */
    this.enemies = [];
    /** @type {PowerUp[]} */
    this.powerups = [];

    // --- presentation ---
    this.shakeAmt = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.hitStop = 0;
    this.flashScreen = 0;

    // --- run state ---
    this.state = STATE.MENU;
    this.hiScore = this.loadHiScore();
    this.time = 0;
    this.lastTs = 0;
    this.resetRun();

    input.attach(window);
    // First gesture unlocks audio (browser autoplay policy).
    const unlock = () => sfx.unlock();
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });
  }

  /* ------------------------------------------------------------------ */
  /* Run lifecycle                                                      */
  /* ------------------------------------------------------------------ */

  /** Reset everything for a fresh run (also used to seed the menu demo). */
  resetRun() {
    this.player.reset();
    this.weapons.reset();
    this.scroller.reset();
    this.particles.clear();
    this.bullets.clear();
    this.enemyBullets.clear();
    this.enemies.length = 0;
    this.powerups.length = 0;
    this.ui.reset();

    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.bestCombo = 1;
    this.comboTimer = 0;
    this.comboPop = 1;
    this.multiplier = 1;
    this.wave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 1.2;
    this.spawnQueue = [];
    this.boss = null;
    this.bossPending = false;
    this.overTime = 0;
    this.newHiScore = false;
    this.shakeAmt = 0;
    this.hitStop = 0;
  }

  /** MENU → PLAYING */
  startGame() {
    this.resetRun();
    this.state = STATE.PLAYING;
    this.startWave(1);
    sfx.unlock();
    sfx.play('start');
    sfx.setMusic(true);
  }

  /** PLAYING → GAME_OVER */
  gameOver() {
    this.state = STATE.GAME_OVER;
    this.overTime = 0;
    this.shake(SHAKE.huge);
    this.flashScreen = 0.35;
    sfx.setMusic(false);
    sfx.play('gameOver');
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.newHiScore = true;
      this.saveHiScore(this.hiScore);
    }
  }

  /** @returns {number} persisted hi-score (0 if storage unavailable) */
  loadHiScore() {
    try { return parseInt(localStorage.getItem(RULES.hiScoreKey) || '0', 10) || 0; }
    catch { return 0; }
  }

  /** @param {number} v */
  saveHiScore(v) {
    try { localStorage.setItem(RULES.hiScoreKey, String(v)); } catch { /* private mode */ }
  }

  /* ------------------------------------------------------------------ */
  /* Wave director                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Begin wave `n`. Every RULES.bossEvery-th wave spawns the destroyer.
   * @param {number} n
   */
  startWave(n) {
    this.wave = n;
    this.waveTimer = 0;
    const isBoss = n % RULES.bossEvery === 0;

    if (isBoss) {
      this.spawnQueue = [];
      this.bossPending = true;
      this.scroller.clearObstacles(this.particles);
      this.ui.banner('WARNING', 'DESTROYER INBOUND', 2.6);
      sfx.play('bossWarn');
      this.shake(SHAKE.medium);
      return;
    }

    const t = WAVE_TABLE[Math.min(WAVE_TABLE.length - 1, n - 1)];
    const bonus = Math.floor(Math.max(0, n - WAVE_TABLE.length) * 0.8);
    /** @type {string[]} */
    const queue = [];
    for (let i = 0; i < t.grunt + bonus; i++) queue.push('grunt');
    for (let i = 0; i < t.jetski + bonus; i++) queue.push('jetski');
    for (let i = 0; i < t.helicopter + Math.floor(bonus / 2); i++) queue.push('helicopter');
    // Shuffle for variety.
    for (let i = queue.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    this.spawnQueue = queue;
    this.spawnRate = t.rate * Math.max(0.42, 1 - n * 0.03);
    this.spawnTimer = 0.6;
    this.ui.banner(`WAVE ${n}`, `${queue.length} HOSTILES`, 1.8);
    sfx.play('wave');
  }

  /** Pull the next enemy off the queue and place it above the screen. */
  spawnFromQueue() {
    if (!this.spawnQueue.length) return;
    const type = this.spawnQueue.shift();
    const level = this.wave - 1;
    // Grunts sometimes arrive as a small formation.
    if (type === 'grunt' && Math.random() < 0.3 && this.spawnQueue.length >= 2) {
      const cx = rand(90, GAME_W - 90);
      for (let i = -1; i <= 1; i++) {
        this.enemies.push(createEnemy('grunt', clamp(cx + i * 46, 30, GAME_W - 30), -40 - Math.abs(i) * 26, level));
        if (i !== 0 && this.spawnQueue[0] === 'grunt') this.spawnQueue.shift();
      }
      return;
    }
    this.enemies.push(createEnemy(type, rand(40, GAME_W - 40), -40, level));
  }

  /* ------------------------------------------------------------------ */
  /* Scoring & juice helpers                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Award points, applying the combo multiplier and spawning a popup.
   * @param {number} base
   * @param {number} x @param {number} y
   * @param {boolean} [useCombo]
   */
  addScore(base, x, y, useCombo = true) {
    const gained = Math.round(base * (useCombo ? this.multiplier : 1));
    this.score += gained;
    const col = useCombo && this.multiplier > 1 ? COLORS.yellow : COLORS.white;
    this.particles.popup(x, y - 10, `+${gained}`, col);
  }

  /** Register a kill: bumps the combo chain and refreshes its timer. */
  registerKill() {
    this.kills++;
    this.combo++;
    this.comboTimer = RULES.comboWindow;
    const idx = clamp(Math.floor(Math.log2(Math.max(1, this.combo))), 0, RULES.comboSteps.length - 1);
    const next = RULES.comboSteps[idx];
    if (next !== this.multiplier) {
      this.multiplier = next;
      this.comboPop = 0;
      if (this.multiplier > 1) {
        sfx.play('combo', idx);
        this.ui.notify(`COMBO x${this.multiplier}`);
        this.flashScreen = 0.12;
      }
    }
    this.bestCombo = Math.max(this.bestCombo, this.multiplier);
  }

  /** Break the combo chain (player took damage). */
  breakCombo() { this.combo = 0; this.multiplier = 1; this.comboTimer = 0; }

  /** @param {number} amount screen-shake magnitude in px */
  shake(amount) { this.shakeAmt = Math.min(28, Math.max(this.shakeAmt, amount)); }

  /** Brief freeze-frame for impact weight. */
  freeze(t = 0.05) { this.hitStop = Math.max(this.hitStop, t); }

  /**
   * Maybe drop a pickup where an enemy died.
   * @param {number} x @param {number} y @param {number} chance
   */
  maybeDrop(x, y, chance = 0.24) {
    if (Math.random() > chance) return;
    const type = rollDropType({
      missiles: this.weapons.missiles,
      lives: this.player.lives,
      spreadActive: this.weapons.spread > 0,
    });
    this.powerups.push(new PowerUp(x, y, type));
  }

  /* ------------------------------------------------------------------ */
  /* Update                                                             */
  /* ------------------------------------------------------------------ */

  /** @param {number} dt seconds */
  update(dt) {
    this.time += dt;

    // Global hit-stop: freeze gameplay but keep UI animating.
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.12;
    }

    // Screen shake decay + offset (trauma-style falloff).
    this.shakeAmt = Math.max(0, this.shakeAmt - this.shakeAmt * 7 * dt - 6 * dt);
    const s = this.shakeAmt;
    this.shakeX = rand(-s, s);
    this.shakeY = rand(-s, s);
    if (this.flashScreen > 0) this.flashScreen -= dt;

    switch (this.state) {
      case STATE.MENU: this.updateMenu(dt); break;
      case STATE.PLAYING: this.updatePlaying(dt); break;
      case STATE.PAUSED: this.updatePaused(dt); break;
      case STATE.GAME_OVER: this.updateGameOver(dt); break;
    }

    this.ui.update(dt, { score: this.score });
    input.endFrame();
  }

  /** Attract mode: the world keeps scrolling behind the title. */
  updateMenu(dt) {
    this.scroller.update(dt, {
      boosting: Math.sin(this.time * 0.5) > 0.3,
      player: this.player,
      difficulty: 0.2,
      spawnObstacles: true,
    });
    this.particles.update(dt, this.scroller.scroll);
    // Idle demo boat weaving across the lower third.
    this.player.x = GAME_W / 2 + Math.sin(this.time * 0.9) * 110;
    this.player.y = GAME_H - 190 + Math.cos(this.time * 1.4) * 16;
    this.player.bank = Math.cos(this.time * 0.9) * 0.9;
    this.player.bob += dt * 5;
    this.particles.wake(this.player.x - 7, this.player.y + 18, 0.8);
    this.particles.wake(this.player.x + 7, this.player.y + 18, 0.8);

    if (input.pressed('fire') || input.pressed('confirm')) this.startGame();
    if (input.pressed('mute')) { sfx.unlock(); sfx.toggleMute(); }
  }

  /** Main gameplay tick. */
  updatePlaying(dt) {
    if (input.pressed('pause')) {
      this.state = STATE.PAUSED;
      sfx.setMusic(false);
      sfx.play('ui');
      return;
    }
    if (input.pressed('mute')) sfx.toggleMute();

    const difficulty = clamp(this.wave / 10, 0, 1);
    sfx.updateMusic(dt, difficulty);

    // --- wave timing ---
    this.waveTimer += dt;
    if (this.bossPending && this.waveTimer > 2.4) {
      this.bossPending = false;
      this.boss = new Boss(Math.floor(this.wave / RULES.bossEvery) - 1);
      this.enemies.push(this.boss);
    }
    const bossAlive = this.boss && !this.boss.dead;
    // Advance on the clock, or early once the wave is fully cleared — so a
    // good player is rewarded with the next wave instead of an empty ocean.
    const cleared = !this.spawnQueue.length && this.enemies.length === 0 && this.waveTimer > 4;
    if (!bossAlive && !this.bossPending && (this.waveTimer >= RULES.waveInterval || cleared)) {
      if (cleared) {
        this.score += 250 * this.wave;
        this.ui.notify(`WAVE CLEAR +${250 * this.wave}`);
      }
      this.startWave(this.wave + 1);
    }
    // Boss defeated → advance immediately with a reward.
    if (this.boss && this.boss.dead) {
      this.boss = null;
      this.ui.banner('DESTROYER DOWN', 'BONUS +5000', 2.2);
      this.score += 5000;
      for (let i = 0; i < 3; i++) {
        this.powerups.push(new PowerUp(GAME_W / 2 + (i - 1) * 60, 200, pick(['missile', 'spread', 'shield'])));
      }
      this.startWave(this.wave + 1);
    }

    // --- enemy spawning ---
    if (this.spawnQueue.length && !bossAlive && !this.bossPending) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = (this.spawnRate ?? 1.2) * rand(0.65, 1.35);
        this.spawnFromQueue();
      }
    }

    // --- combo decay ---
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.breakCombo();
    }
    this.comboPop = Math.min(1, this.comboPop + dt * 5);

    // --- actors ---
    const boosting = !this.player.dead && this.player.update(dt, input).boosting;
    this.scroller.update(dt, {
      boosting,
      player: this.player,
      difficulty,
      spawnObstacles: !bossAlive && !this.bossPending,
    });

    this.weapons.update(dt, {
      player: this.player,
      input,
      enemies: this.enemies,
      shake: (n) => this.shake(n),
    });

    // Fire-rate governor: no matter how many enemies are on screen, only a
    // limited number of aimed shots may leave per second. This keeps dense
    // waves exciting instead of an unreadable bullet wall.
    const budgetMax = 1.6 + difficulty * 2.2;
    this.fireBudget = Math.min(budgetMax, (this.fireBudget ?? budgetMax) + dt * (1.1 + difficulty * 1.6));

    const api = {
      player: this.player,
      particles: this.particles,
      bullets: this.enemyBullets,
      scroll: this.scroller.scroll,
      shake: (n) => this.shake(n),
      addScore: (v, x, y) => this.addScore(v, x, y),
      /**
       * Enemies ask permission before shooting; returns false when the
       * shared budget is empty.
       * @returns {boolean}
       */
      requestFire: () => {
        if (this.fireBudget < 1) return false;
        this.fireBudget -= 1;
        return true;
      },
    };

    for (const e of this.enemies) if (!e.dead) e.update(dt, api);
    this.enemies = this.enemies.filter((e) => !e.dead);

    this.bullets.update(dt, { enemies: this.enemies, particles: this.particles, scroll: this.scroller.scroll });
    this.enemyBullets.update(dt, { enemies: this.enemies, particles: this.particles, scroll: this.scroller.scroll });

    for (const p of this.powerups) {
      if (!p.dead) p.update(dt, { scroll: this.scroller.scroll, player: this.player, particles: this.particles });
    }
    this.powerups = this.powerups.filter((p) => !p.dead);

    this.particles.update(dt, this.scroller.scroll);

    this.handleCollisions();

    if (this.player.dead) this.gameOver();
  }

  /** Paused: only listen for the unpause key. */
  updatePaused(dt) {
    if (input.pressed('pause')) {
      this.state = STATE.PLAYING;
      sfx.setMusic(true);
      sfx.play('ui');
    }
    if (input.pressed('mute')) sfx.toggleMute();
  }

  /** Game over: let the wreckage settle, then accept retry input. */
  updateGameOver(dt) {
    this.overTime += dt;
    this.scroller.update(dt, { boosting: false, player: this.player, difficulty: 0, spawnObstacles: false });
    this.bullets.update(dt, { enemies: this.enemies, particles: this.particles, scroll: this.scroller.scroll });
    this.enemyBullets.update(dt, { enemies: this.enemies, particles: this.particles, scroll: this.scroller.scroll });
    for (const e of this.enemies) if (!e.dead) {
      e.update(dt, {
        player: this.player, particles: this.particles, bullets: this.enemyBullets,
        scroll: this.scroller.scroll, shake: () => {}, addScore: () => {},
      });
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.particles.update(dt, this.scroller.scroll);

    if (this.overTime > 1) {
      if (input.pressed('fire') || input.pressed('confirm')) this.startGame();
      if (input.pressed('pause')) { this.state = STATE.MENU; this.resetRun(); }
    }
    if (input.pressed('mute')) sfx.toggleMute();
  }

  /* ------------------------------------------------------------------ */
  /* Collision dispatch                                                 */
  /* ------------------------------------------------------------------ */

  /** All interactions, resolved centrally through Collision.js helpers. */
  handleCollisions() {
    const P = this.player;
    const api = { particles: this.particles, shake: (n) => this.shake(n) };
    const playerBullets = this.bullets.live;
    const hostileBullets = this.enemyBullets.live;

    /* --- player bullets → enemies --- */
    for (const b of playerBullets) {
      if (!b.friendly) continue;
      for (const e of this.enemies) {
        if (e.dead || (e.dying && e.isBoss)) continue;
        if (!aabb(b.body, e.body)) continue;

        this.particles.hitSpark(b.x, b.y - 6, b.kind === 'missile' ? COLORS.magenta : COLORS.cyan);
        if (b.kind === 'missile') {
          this.particles.explosion(b.x, b.y, [COLORS.magenta, COLORS.white, COLORS.yellow], 1);
          this.shake(SHAKE.small);
          sfx.play('explode');
          // Splash damage on neighbours.
          for (const other of this.enemies) {
            if (other === e || other.dead) continue;
            const d = Math.hypot(other.x - b.x, other.y - b.y);
            if (d < 60 && other.damage(WEAPONS.missileDamage * 0.5, api)) this.onEnemyKilled(other);
          }
        } else {
          e.hitPushY = 90;
        }

        const killed = e.damage(b.damage, api);
        if (killed) this.onEnemyKilled(e);
        b.dead = true;
        break;
      }
      if (b.dead) continue;

      /* --- player bullets → mines --- */
      for (const o of this.scroller.obstacles) {
        if (o.dead || o.kind !== 'mine') continue;
        if (!aabb(b.body, o.body)) continue;
        if (o.damage(b.damage, api)) { this.addScore(25, o.x, o.y); this.registerKill(); }
        b.dead = true;
        break;
      }
    }

    /* --- hostile bullets → player --- */
    if (!P.dead) {
      for (const b of hostileBullets) {
        if (b.friendly) continue;
        if (!aabb(b.body, P.body)) continue;
        b.dead = true;
        this.particles.hitSpark(b.x, b.y, COLORS.red, 10);
        this.damagePlayer();
        break;
      }
    }

    /* --- enemies ↔ player (ramming) --- */
    if (!P.dead) {
      for (const e of this.enemies) {
        if (e.dead || (e.isBoss && e.dying)) continue;
        if (!aabb(P.body, e.body)) continue;
        if (e.isBoss) {
          // Push out of the hull instead of instantly deleting the boss.
          const push = resolve(P.body, e.body);
          P.x += push.x; P.y += push.y;
          P.vx = push.x * 6; P.vy = push.y * 6 + 60;
          this.damagePlayer();
        } else {
          if (e.damage(999, api)) this.onEnemyKilled(e, false);
          this.damagePlayer();
        }
        break;
      }
    }

    /* --- obstacles ↔ player --- */
    if (!P.dead) {
      for (const o of this.scroller.obstacles) {
        if (o.dead || o.kind === 'whirlpool') continue;
        if (!aabb(P.body, o.body)) continue;
        if (o.kind === 'mine') {
          o.damage(999, api);
          this.damagePlayer();
        } else if (o.kind === 'island') {
          // Solid: bounce off the rocks and take a hit.
          const push = resolve(P.body, o.body);
          P.x += push.x * 1.2; P.y += push.y * 1.2;
          P.vx = push.x * 8; P.vy = push.y * 8;
          this.particles.splash(P.x, P.y + 10, 10);
          this.damagePlayer();
          sfx.play('thud');
        }
        break;
      }
    }

    /* --- enemies ↔ obstacles (mines are shared hazards) --- */
    for (const e of this.enemies) {
      if (e.dead || e.isBoss) continue;
      for (const o of this.scroller.obstacles) {
        if (o.dead || o.kind !== 'mine') continue;
        if (!aabb(e.body, o.body)) continue;
        o.damage(999, api);
        if (e.damage(3, api)) this.onEnemyKilled(e);
        break;
      }
    }

    /* --- power-ups → player --- */
    if (!P.dead) {
      for (const p of this.powerups) {
        if (p.dead || !aabb(p.body, P.body)) continue;
        p.collect({
          player: P,
          weapons: this.weapons,
          particles: this.particles,
          addScore: (v, x, y) => this.addScore(v, x, y, false),
          notify: (t) => this.ui.notify(t),
        });
      }
    }
  }

  /**
   * Shared "enemy destroyed" bookkeeping.
   * @param {import('#game/Enemy.js').Enemy} e
   * @param {boolean} [drop] whether a pickup may spawn
   */
  onEnemyKilled(e, drop = true) {
    this.registerKill();
    this.addScore(e.score, e.x, e.y);
    this.freeze(e.isBoss ? 0.14 : 0.035);
    if (drop) this.maybeDrop(e.x, e.y, e.type === 'helicopter' ? 0.45 : 0.24);
  }

  /** Player took a hit: shake, flash, break combo, maybe end the run. */
  damagePlayer() {
    const took = this.player.hit(() => {});
    if (!took) { this.shake(SHAKE.small); return; }
    this.breakCombo();
    this.shake(SHAKE.large);
    this.freeze(0.09);
    this.flashScreen = 0.2;
    this.ui.hitFlash();
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(this.shakeX), Math.round(this.shakeY));

    this.scroller.drawBackground(ctx);
    this.scroller.drawBuoys(ctx);
    this.scroller.drawObstacles(ctx);

    if (this.state !== STATE.MENU) {
      for (const p of this.powerups) if (!p.dead) p.draw(ctx);
      for (const e of this.enemies) if (!e.dead) e.draw(ctx);
      this.enemyBullets.draw(ctx);
      this.bullets.draw(ctx);
    }

    if (this.state === STATE.MENU || !this.player.dead) this.player.draw(ctx);
    this.particles.draw(ctx);

    ctx.restore();

    // Full-screen additive flash (kills, combos, damage).
    if (this.flashScreen > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(this.flashScreen, 0, 0.4);
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.restore();
    }

    // --- UI layer (never shaken) ---
    const snap = {
      score: this.score,
      hiScore: Math.max(this.hiScore, this.score),
      lives: this.player.lives,
      boost: this.player.boost,
      ammo: this.weapons.ammo,
      missiles: this.weapons.missiles,
      spreadTime: this.weapons.spreadTime,
      combo: this.combo,
      comboTimer: this.comboTimer,
      comboPop: this.comboPop,
      multiplier: this.multiplier,
      wave: this.wave,
      waveTimer: this.waveTimer,
      metres: this.scroller.metres,
      kills: this.kills,
      bestCombo: this.bestCombo,
      newHiScore: this.newHiScore,
      overTime: this.overTime,
      boss: this.boss && !this.boss.dead && !this.boss.entering ? this.boss : null,
    };

    switch (this.state) {
      case STATE.MENU: this.ui.drawMenu(ctx, snap); break;
      case STATE.PLAYING: this.ui.drawHUD(ctx, snap); break;
      case STATE.PAUSED: this.ui.drawHUD(ctx, snap); this.ui.drawPause(ctx); break;
      // No HUD behind the results panel — it would double up the score readout.
      case STATE.GAME_OVER: this.ui.drawGameOver(ctx, snap); break;
    }

    if (sfx.muted) {
      this.ui.text(ctx, 'MUTED', GAME_W / 2, 14, { size: 10, color: '#5f7bb5', align: 'center', spacing: 1 });
    }

    this.ui.drawCRT(ctx);
  }

  /* ------------------------------------------------------------------ */
  /* Loop                                                               */
  /* ------------------------------------------------------------------ */

  /** @param {number} ts high-resolution timestamp from rAF */
  frame(ts) {
    const raw = (ts - this.lastTs) / 1000;
    this.lastTs = ts;
    // Clamp dt so alt-tabbing never teleports the world.
    const dt = clamp(Number.isFinite(raw) ? raw : 0, 0, 1 / 20);
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.frame);
  }

  /** Kick off the render loop. */
  start() {
    this.frame = this.frame.bind(this);
    this.lastTs = performance.now();
    requestAnimationFrame(this.frame);
  }
}

/**
 * Entry point called from index.html.
 * @param {HTMLCanvasElement} canvas
 * @returns {Game} the running game instance (handy for debugging)
 */
export function boot(canvas) {
  const game = new Game(canvas);
  game.start();
  // Expose for console tinkering without polluting module scope.
  window.__neonwake = game;
  return game;
}
