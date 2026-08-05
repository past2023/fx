import { ECONOMY, GAME, SHIPS, STATES, TUNING, WEAPONS } from './constants.js';
import AudioManager from './assetLoader.js';
import InputManager from './input.js';
import Background from './background.js';
import Player from './player.js';
import WeaponSystem from './weapon.js';
import BulletPool from './bullet.js';
import EnemyManager from './enemy.js';
import Boss from './boss.js';
import ParticleSystem from './particle.js';
import UI from './ui.js';

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * Main application orchestrator. Owns the requestAnimationFrame loop, screen state,
 * gameplay systems, collision pass and resize/teardown lifecycle.
 */
export default class Game {
  constructor(canvas, assets) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('[game] A valid canvas element is required.');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('[game] Canvas 2D context is unavailable.');
    this.assets = assets;
    this.audio = new AudioManager(assets);
    this.input = new InputManager(window);
    this.background = new Background();
    this.bullets = new BulletPool();
    this.enemies = new EnemyManager();
    this.particles = new ParticleSystem();
    this.boss = new Boss();
    this.ui = new UI();
    this.hangar = this._loadHangar();
    this.runCoins = 0;
    this.player = null;
    this.weapon = null;
    this.state = STATES.MENU;
    this.selectedShip = 0;
    this.selectedWeapon = 0;
    this.menuFocus = 0;
    this.score = 0;
    this.distance = 0;
    this.nextWave = 0;
    this.waveMilestones = [500, 1200, 2000, 2800, 3600, 4400];
    this.fade = 1;
    this.shakeDuration = 0;
    this.shakePower = 0;
    this.bossDeathTimer = null;
    this.rafId = 0;
    this.lastTime = 0;
    this.running = false;
    this.width = GAME.WIDTH;
    this.height = GAME.HEIGHT;
    this.pixelRatio = 1;
    this._resize = this._resize.bind(this);
    this._frame = this._frame.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
    console.info('[game] State -> MENU');
  }

  /** Starts the frame-rate independent requestAnimationFrame loop. */
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._frame);
    console.info('[game] Starfall initialized.');
  }

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(GAME.MAX_DT, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    try {
      this.update(dt);
      this.render();
    } catch (error) {
      console.error('[game] Fatal frame error:', error);
      this.stop();
      throw error;
    }
    this.input.endFrame();
    this.rafId = requestAnimationFrame(this._frame);
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const displayWidth = Math.max(320, Math.round(rect.width || GAME.WIDTH));
    const displayHeight = Math.max(180, Math.round(rect.height || (displayWidth * 9 / 16)));
    this.width = displayWidth;
    this.height = displayHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(displayWidth * this.pixelRatio);
    this.canvas.height = Math.round(displayHeight * this.pixelRatio);
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.background.resize(this.width, this.height);
    if (this.player) {
      this.player.x = Math.max(this.player.w / 2, Math.min(this.width - this.player.w / 2, this.player.x));
      this.player.y = Math.max(this.player.h / 2, Math.min(this.height - this.player.h / 2, this.player.y));
    }
  }

  /** Updates state-specific logic and the shared visual transition state. */
  update(dt) {
    this.background.update(dt);
    this.ui.update(dt);
    this.fade = Math.max(0, this.fade - dt * 1.8);
    this.shakeDuration = Math.max(0, this.shakeDuration - dt);

    switch (this.state) {
      case STATES.MENU: this._updateMenu(); break;
      case STATES.PLAYING: this._updatePlaying(dt); break;
      case STATES.BOSS: this._updateBoss(dt); break;
      case STATES.VICTORY:
      case STATES.GAME_OVER:
        if (this.input.wasPressed('start')) this._returnToMenu();
        this.particles.update(dt);
        break;
      default: console.error('[game] Unknown state:', this.state);
    }
  }

  _updateMenu() {
    const horizontal = (this.input.wasPressed('left') ? -1 : 0) + (this.input.wasPressed('right') ? 1 : 0);
    if (this.input.wasPressed('up')) this.menuFocus = 0;
    if (this.input.wasPressed('down')) this.menuFocus = 1;
    if (horizontal) {
      if (this.menuFocus === 0) this.selectedShip = (this.selectedShip + horizontal + SHIPS.length) % SHIPS.length;
      else this.selectedWeapon = (this.selectedWeapon + horizontal + WEAPONS.length) % WEAPONS.length;
      this.audio.playSound('menuMove');
    }
    if (this.input.wasPressed('upgrade')) this._tryUpgradeSelectedShip();
    if (this.input.wasPressed('start')) this._beginRun();
  }

  _beginRun() {
    this.score = 0;
    this.distance = 0;
    this.nextWave = 0;
    this.bossDeathTimer = null;
    this.runCoins = 0;
    this.bullets.clear();
    this.enemies.clear();
    this.particles.clear();
    const selectedShip = SHIPS[this.selectedShip];
    this.player = new Player(selectedShip, this._shipLevel(selectedShip.id));
    this.player.place(this.width, this.height);
    this.weapon = new WeaponSystem(WEAPONS[this.selectedWeapon]);
    this.boss.reset(this.width, this.height);
    this._setState(STATES.PLAYING);
    this.audio.playMusic('level1');
    this.audio.playSound('launch');
  }

  _returnToMenu() {
    this.bullets.clear();
    this.enemies.clear();
    this.particles.clear();
    this.player = null;
    this.weapon = null;
    this.bossDeathTimer = null;
    this.audio.stopMusic();
    this._setState(STATES.MENU);
  }

  _updatePlaying(dt) {
    this._updateCombatWorld(dt, false);
    if (this.state !== STATES.PLAYING) return;
    this.distance += GAME.LEVEL_SCROLL_SPEED * dt;
    while (this.nextWave < this.waveMilestones.length && this.distance >= this.waveMilestones[this.nextWave]) {
      this.enemies.triggerWave(this.nextWave + 1, this.width, this.height);
      console.info(`[game] Wave ${this.nextWave + 1} deployed at ${Math.round(this.distance)} units.`);
      this.nextWave += 1;
    }
    if (this.distance >= GAME.LEVEL_LENGTH && this.nextWave >= this.waveMilestones.length && this.enemies.isClear()) {
      console.info('[game] Level clear. Mother Ship incoming.');
      this._setState(STATES.BOSS);
    }
  }

  _updateBoss(dt) {
    if (this.bossDeathTimer !== null) {
      this.player.update(dt, this.input, this.width, this.height, this.particles);
      this.particles.update(dt);
      this.bossDeathTimer -= dt;
      if (this.bossDeathTimer <= 0) this._setState(STATES.VICTORY);
      return;
    }

    this.player.update(dt, this.input, this.width, this.height, this.particles);
    this._handleWeaponSwitching();
    this.weapon.update(dt, this.player, this.input, this.bullets, this.width, this.particles);
    this.enemies.update(dt, this.width, this.height, this.player);
    const bossEvent = this.boss.update(dt, this.player, this.bullets, this.enemies, this.width, this.height);
    if (bossEvent.entered) {
      this._shake(0.45, 11);
      this.audio.playSound('bossArrival');
      console.info('[game] Mother Ship shields disengaged.');
    }
    if (bossEvent.phaseChanged) {
      this._shake(0.32, 9);
      this.audio.playSound('bossPhase');
      console.info(`[game] Mother Ship phase ${this.boss.phase}.`);
    }
    this.bullets.update(dt, this.width, this.height);
    this.particles.update(dt);
    this._resolveEnemyInteractions();
    this._resolveBossInteractions(dt);
    this._checkPlayerDeath();
  }

  _updateCombatWorld(dt) {
    this.player.update(dt, this.input, this.width, this.height, this.particles);
    this._handleWeaponSwitching();
    this.weapon.update(dt, this.player, this.input, this.bullets, this.width, this.particles);
    this.enemies.update(dt, this.width, this.height, this.player);
    this.bullets.update(dt, this.width, this.height);
    this.particles.update(dt);
    this._resolveEnemyInteractions();
    this._checkPlayerDeath();
  }

  _resolveEnemyInteractions() {
    const playerBounds = this.player.getBounds();
    for (const bullet of this.bullets.pool.items) {
      if (!bullet.active) continue;
      if (bullet.team === 'player') {
        for (const enemy of this.enemies.pool.items) {
          if (!enemy.active || !overlaps(bullet.getBounds(), enemy.getBounds())) continue;
          if (bullet.splashRadius > 0) {
            this._detonateNova(bullet);
            this.bullets.release(bullet);
            break;
          }
          enemy.hp -= bullet.damage;
          this.particles.sparks(bullet.x, bullet.y, bullet.color, bullet.type === 'laser' ? 2 : 6);
          if (enemy.hp <= 0) this._destroyEnemy(enemy);
          if (bullet.type !== 'laser') { this.bullets.release(bullet); break; }
        }
      } else if (overlaps(bullet.getBounds(), playerBounds)) {
        if (this.player.takeDamage(bullet.damage)) {
          this.particles.sparks(this.player.x, this.player.y, '#ff8b9d', 8);
          this.audio.playSound('playerHit');
        }
        this.bullets.release(bullet);
      }
    }

    for (const enemy of this.enemies.pool.items) {
      if (!enemy.active || !overlaps(enemy.getBounds(), playerBounds)) continue;
      if (this.player.takeDamage(enemy.type.id === 'heavy' ? 50 : 28)) {
        this.particles.sparks(this.player.x, this.player.y, '#ff8b9d', 10);
        this.audio.playSound('playerHit');
      }
      this._destroyEnemy(enemy, true);
    }

    for (const powerup of this.enemies.powerupPool.items) {
      if (!powerup.active || !overlaps(powerup.getBounds(), playerBounds)) continue;
      powerup.active = false;
      if (powerup.kind === 'health') this.player.heal(30);
      else this.player.activateUpgrade();
      this.particles.explosion(powerup.x, powerup.y, powerup.kind === 'health' ? '#62f094' : '#a577ff', 12, 0.55);
      this.audio.playSound('powerup');
    }

    for (const coin of this.enemies.coinPool.items) {
      if (!coin.active || !overlaps(coin.getBounds(), playerBounds)) continue;
      coin.active = false;
      this._awardCoins(coin.value, true);
      this.particles.coinCollect(coin.x, coin.y);
      this.audio.playSound('coin');
    }
  }

  _resolveBossInteractions(dt) {
    const playerBounds = this.player.getBounds();
    for (const bullet of this.bullets.pool.items) {
      if (!bullet.active || bullet.team !== 'player' || !overlaps(bullet.getBounds(), this.boss.getBounds())) continue;
      const damaged = this.boss.takeDamage(bullet.damage);
      this.particles.sparks(bullet.x, bullet.y, damaged ? '#ffb4ec' : '#6eeeff', bullet.type === 'laser' ? 2 : 6);
      if (bullet.type !== 'laser') this.bullets.release(bullet);
      if (this.boss.dead) { this._destroyBoss(); break; }
    }
    if (this.boss.laserHits(playerBounds) && this.player.takeDamage(TUNING.BOSS.LASER_DAMAGE_PER_FRAME * 60 * dt)) {
      this.particles.sparks(this.player.x, this.player.y, '#ff93df', 10);
      this.audio.playSound('playerHit');
    }
    if (this.boss.entered && overlaps(this.boss.getBounds(), playerBounds) && this.player.takeDamage(40)) {
      this.particles.sparks(this.player.x, this.player.y, '#ff93df', 10);
    }
  }

  _handleWeaponSwitching() {
    const direction = (this.input.wasPressed('nextWeapon') ? 1 : 0) - (this.input.wasPressed('previousWeapon') ? 1 : 0);
    if (!direction) return;
    const selected = this.weapon.cycle(direction);
    this.player.heat = 0;
    this.player.laserLockout = 0;
    this.audio.playSound('weaponSwitch');
    console.info(`[game] Weapon armed -> ${selected.name}`);
  }

  _detonateNova(bullet) {
    const radius = bullet.splashRadius;
    for (const enemy of this.enemies.pool.items) {
      if (!enemy.active) continue;
      const distance = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
      if (distance > radius + Math.max(enemy.type.w, enemy.type.h) / 2) continue;
      const falloff = Math.max(0.35, 1 - distance / radius);
      enemy.hp -= bullet.damage * falloff;
      if (enemy.hp <= 0) this._destroyEnemy(enemy);
    }
    this.particles.explosion(bullet.x, bullet.y, bullet.color, 20, 0.7);
    this._shake(0.12, 4);
    this.audio.playSound('novaImpact');
  }

  _loadHangar() {
    const fallback = { coins: 0, shipLevels: Object.fromEntries(SHIPS.map((ship) => [ship.id, 0])) };
    try {
      const saved = JSON.parse(localStorage.getItem(ECONOMY.STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      for (const ship of SHIPS) {
        fallback.shipLevels[ship.id] = Math.max(0, Math.min(ECONOMY.MAX_SHIP_LEVEL, Number(saved.shipLevels?.[ship.id]) || 0));
      }
      fallback.coins = Math.max(0, Math.floor(Number(saved.coins) || 0));
    } catch (error) {
      console.warn('[game] Hangar save is unavailable; using a temporary wallet.', error);
    }
    return fallback;
  }

  _saveHangar() {
    try { localStorage.setItem(ECONOMY.STORAGE_KEY, JSON.stringify(this.hangar)); }
    catch (error) { console.warn('[game] Could not save hangar progress.', error); }
  }

  _shipLevel(shipId) { return this.hangar.shipLevels[shipId] || 0; }

  _upgradeCost(shipId) {
    return ECONOMY.SHIP_UPGRADE_BASE_COST + this._shipLevel(shipId) * ECONOMY.SHIP_UPGRADE_COST_STEP;
  }

  _tryUpgradeSelectedShip() {
    const ship = SHIPS[this.selectedShip];
    const level = this._shipLevel(ship.id);
    if (level >= ECONOMY.MAX_SHIP_LEVEL) {
      console.info(`[game] ${ship.name} is already at maximum upgrade level.`);
      return;
    }
    const cost = this._upgradeCost(ship.id);
    if (this.hangar.coins < cost) {
      console.info(`[game] Upgrade requires ${cost} coins; wallet contains ${this.hangar.coins}.`);
      this._shake(0.12, 3);
      return;
    }
    this.hangar.coins -= cost;
    this.hangar.shipLevels[ship.id] = level + 1;
    this._saveHangar();
    this.audio.playSound('upgrade');
    console.info(`[game] ${ship.name} upgraded to MK ${level + 1}.`);
  }

  _awardCoins(amount, collected) {
    this.hangar.coins += amount;
    this.runCoins += amount;
    this._saveHangar();
    if (collected) console.info(`[game] +${amount} salvage coin. Wallet: ${this.hangar.coins}.`);
  }

  _destroyEnemy(enemy, forceHealth = false) {
    const destroyed = this.enemies.destroy(enemy, forceHealth || enemy.type.id === 'heavy');
    if (!destroyed) return;
    this.score += destroyed.type.points;
    const scale = destroyed.type.id === 'heavy' ? 1.7 : 0.85;
    this.particles.explosion(destroyed.x, destroyed.y, destroyed.type.color, destroyed.type.id === 'heavy' ? 46 : 20, scale);
    this.audio.playSound('enemyExplosion');
  }

  _destroyBoss() {
    if (this.bossDeathTimer !== null) return;
    this.score += 5000;
    this._awardCoins(ECONOMY.BOSS_COIN_REWARD, false);
    this.bossDeathTimer = GAME.BOSS_DEATH_DELAY;
    this.enemies.clear();
    this.bullets.clear();
    this.particles.explosion(this.boss.x, this.boss.y, '#ff60d3', 120, 2.3);
    this._shake(1.0, 19);
    this.audio.playSound('bossExplosion');
    console.info('[game] Mother Ship destroyed. Victory transition armed.');
  }

  _checkPlayerDeath() {
    if (this.player.alive) return;
    this.particles.explosion(this.player.x, this.player.y, this.player.ship.color, 50, 1.3);
    this.audio.playSound('playerExplosion');
    this._setState(STATES.GAME_OVER);
  }

  _setState(state) {
    this.state = state;
    this.fade = 0.72;
    console.info(`[game] State -> ${state}`);
    if (state === STATES.BOSS) {
      this.boss.reset(this.width, this.height);
      this._shake(0.5, 12);
      this.audio.playMusic('boss');
    } else if (state === STATES.VICTORY || state === STATES.GAME_OVER) {
      this.audio.stopMusic();
    }
  }

  _shake(duration, power) {
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakePower = Math.max(this.shakePower, power);
  }

  /** Draws world systems in depth order, then the state-specific UI layer. */
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    if (this.shakeDuration > 0) {
      const magnitude = this.shakePower * (this.shakeDuration / Math.max(this.shakeDuration, 0.001));
      ctx.translate((Math.random() - 0.5) * magnitude, (Math.random() - 0.5) * magnitude);
    }
    this.background.render(ctx);

    if (this.state !== STATES.MENU) {
      if (this.state === STATES.BOSS) this.boss.renderLaser(ctx);
      this.particles.render(ctx);
      this.enemies.render(ctx, this.assets);
      if (this.state === STATES.BOSS) this.boss.render(ctx, this.assets);
      this.bullets.render(ctx);
      this.player?.render(ctx, this.assets);
    }
    ctx.restore();

    if (this.state === STATES.MENU) this.ui.renderMenu(ctx, this.width, this.height, this.selectedShip, this.selectedWeapon, this.menuFocus, this.hangar);
    else if (this.state === STATES.PLAYING) this.ui.renderHUD(ctx, this);
    else if (this.state === STATES.BOSS) {
      this.ui.renderHUD(ctx, this);
      this.ui.renderBossHUD(ctx, this);
    } else this.ui.renderTerminal(ctx, this.width, this.height, this.state, this.score);

    this.ui.renderFade(ctx, this.width, this.height, this.fade);
  }

  /** Stops animation, unregisters listeners and releases retained pool objects. */
  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._resize);
    this.input.destroy();
    this.bullets.clear();
    this.enemies.clear();
    this.particles.clear();
    this.audio.stopMusic();
    console.info('[game] Teardown complete.');
  }
}
