import { COLORS, ENEMY_TYPES, GAME, TUNING } from './constants.js';
import { Pool } from './bullet.js';

class Enemy {
  constructor() {
    this.active = false;
    this.x = this.y = 0;
    this.type = ENEMY_TYPES.scout;
    this.hp = 0;
    this.maxHp = 0;
    this.age = 0;
    this.wave = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.jitterTimer = 0;
    this.jitterY = 0;
  }

  reset(type, x, y, wave = 0) {
    this.active = true;
    this.type = type;
    this.x = x;
    this.y = y;
    this.hp = this.maxHp = type.hp;
    this.age = 0;
    this.wave = wave;
    this.phase = Math.random() * Math.PI * 2;
    this.jitterTimer = 0.1 + Math.random() * 0.4;
    this.jitterY = 0;
    return this;
  }

  update(dt, width, height, player = null) {
    if (!this.active) return;
    this.age += dt;
    this.x -= this.type.speed * dt;
    if (this.type.id === 'scout') {
      this.y += Math.sin(this.age * TUNING.ENEMY.SCOUT_SWAY_SPEED + this.phase) * TUNING.ENEMY.SCOUT_SWAY_AMOUNT * dt;
    } else if (this.type.id === 'drone') {
      this.jitterTimer -= dt;
      if (this.jitterTimer <= 0) {
        this.jitterTimer += TUNING.ENEMY.DRONE_JITTER_INTERVAL;
        this.jitterY = (Math.random() - 0.5) * 260;
      }
      this.y += Math.sign(this.jitterY - this.y) * TUNING.ENEMY.DRONE_Y_SPEED * dt;
    }
    this.y = Math.max(this.type.h / 2, Math.min(height - this.type.h / 2, this.y));
    if (this.x < -this.type.w - 25 || this.x > width + 300) this.active = false;
  }

  getBounds() { return { x: this.x - this.type.w / 2, y: this.y - this.type.h / 2, w: this.type.w, h: this.type.h }; }

  render(ctx, assets) {
    const sprite = assets?.images?.[this.type.id];
    if (sprite) {
      ctx.drawImage(sprite, this.x - this.type.w / 2, this.y - this.type.h / 2, this.type.w, this.type.h);
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.type.color;
    ctx.strokeStyle = '#eaf6ff';
    ctx.lineWidth = 1;
    ctx.shadowColor = this.type.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    if (this.type.id === 'scout') {
      ctx.moveTo(-16, 0); ctx.lineTo(13, -12); ctx.lineTo(17, 0); ctx.lineTo(13, 12); ctx.closePath();
    } else if (this.type.id === 'drone') {
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.moveTo(-7, -2); ctx.lineTo(-16, -9); ctx.lineTo(-13, 0); ctx.lineTo(-16, 9); ctx.closePath();
      ctx.moveTo(7, -2); ctx.lineTo(16, -9); ctx.lineTo(13, 0); ctx.lineTo(16, 9); ctx.closePath();
    } else {
      const w = this.type.w / 2; const h = this.type.h / 2;
      ctx.moveTo(-w, 0); ctx.lineTo(-w * 0.55, -h); ctx.lineTo(w * 0.55, -h);
      ctx.lineTo(w, 0); ctx.lineTo(w * 0.55, h); ctx.lineTo(-w * 0.55, h); ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    if (this.hp < this.maxHp && this.type.id !== 'drone') {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(5, 8, 20, .75)';
      ctx.fillRect(-this.type.w / 2, -this.type.h / 2 - 8, this.type.w, 4);
      ctx.fillStyle = '#ff7a7a';
      ctx.fillRect(-this.type.w / 2, -this.type.h / 2 - 8, this.type.w * (this.hp / this.maxHp), 4);
    }
    ctx.restore();
  }
}

class Coin {
  constructor() {
    this.active = false;
    this.x = this.y = 0;
    this.vx = this.vy = 0;
    this.age = 0;
    this.value = TUNING.COIN.VALUE;
    this.phase = 0;
  }

  reset(x, y, value = TUNING.COIN.VALUE) {
    this.active = true;
    this.x = x; this.y = y;
    this.vx = -TUNING.COIN.DRIFT_SPEED * (0.45 + Math.random() * 0.75);
    this.vy = (Math.random() - 0.5) * 120;
    this.age = 0;
    this.value = value;
    this.phase = Math.random() * Math.PI * 2;
    return this;
  }

  update(dt, width, height, player) {
    if (!this.active) return;
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 1 - Math.min(0.9, 1.4 * dt);
    this.vy *= 1 - Math.min(0.9, 1.4 * dt);
    this.y += Math.sin(this.age * 7 + this.phase) * 14 * dt;
    if (player?.alive) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.hypot(dx, dy);
      if (distance < TUNING.COIN.MAGNET_RANGE && distance > 0.01) {
        const pull = (1 - distance / TUNING.COIN.MAGNET_RANGE) * TUNING.COIN.MAGNET_ACCELERATION;
        this.x += dx * pull * dt;
        this.y += dy * pull * dt;
      }
    }
    if (this.x < -35 || this.y < -35 || this.y > height + 35 || this.x > width + 35) this.active = false;
  }

  getBounds() { return { x: this.x - 10, y: this.y - 10, w: 20, h: 20 }; }

  render(ctx) {
    const spin = Math.max(0.28, Math.abs(Math.cos(this.age * 7 + this.phase)));
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(spin, 1);
    ctx.shadowColor = COLORS.coin; ctx.shadowBlur = 15;
    const face = ctx.createRadialGradient(-3, -4, 1, 0, 0, 10);
    face.addColorStop(0, '#fff6b0'); face.addColorStop(0.42, COLORS.coin); face.addColorStop(1, '#d48519');
    ctx.fillStyle = face;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff4ae'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff5ad'; ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', 0, .5);
    ctx.restore();
  }
}

class PowerUp {
  constructor() { this.active = false; this.x = this.y = 0; this.kind = 'health'; this.age = 0; }
  reset(x, y, kind) { this.active = true; this.x = x; this.y = y; this.kind = kind; this.age = 0; return this; }
  update(dt, width, height, player = null) {
    if (!this.active) return;
    this.age += dt;
    this.x -= TUNING.POWERUP.DRIFT_SPEED * dt;
    this.y += Math.sin(this.age * 5) * 20 * dt;
    if (this.x < -30 || this.y < -30 || this.y > height + 30 || this.x > width + 30) this.active = false;
  }
  getBounds() { return { x: this.x - 13, y: this.y - 13, w: 26, h: 26 }; }
  render(ctx) {
    const color = this.kind === 'health' ? '#62f094' : '#a577ff';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.shadowColor = color; ctx.shadowBlur = 15; ctx.fillStyle = color;
    if (this.kind === 'health') {
      ctx.fillRect(-4, -10, 8, 20); ctx.fillRect(-10, -4, 20, 8);
      ctx.strokeStyle = '#eaffef'; ctx.strokeRect(-10, -4, 20, 8);
    } else {
      ctx.beginPath(); ctx.arc(0, 0, 10 + Math.sin(this.age * 8) * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f4eaff'; ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * Schedules Level 1 waves and owns pooled enemy plus power-up entities.
 */
export default class EnemyManager {
  constructor() {
    this.pool = new Pool(() => new Enemy(), GAME.MAX_ENEMIES);
    this.powerupPool = new Pool(() => new PowerUp(), 20);
    this.coinPool = new Pool(() => new Coin(), GAME.MAX_COINS);
    this.schedule = [];
    this.waveNumber = 0;
  }

  /** Removes current enemies, drops and pending wave spawns. */
  clear() {
    this.pool.clear();
    this.powerupPool.clear();
    this.coinPool.clear();
    this.schedule.length = 0;
    this.waveNumber = 0;
  }

  /** Adds one enemy to the delayed spawn queue. */
  queue(typeId, x, y, delay = 0, wave = this.waveNumber) {
    this.schedule.push({ typeId, x, y, delay, wave });
  }

  /** Starts the authored wave corresponding to a distance milestone. */
  triggerWave(id, width, height) {
    this.waveNumber = id;
    const mid = height * 0.5;
    const edge = width + 65;
    if (id === 1) {
      for (let i = 0; i < 5; i += 1) {
        const distance = Math.abs(i - 2);
        this.queue('scout', edge + distance * 100, mid + (i - 2) * 80, i * 0.07);
      }
    } else if (id === 2) {
      [0.28, 0.5, 0.72].forEach((ratio, index) => this.queue('tank', edge + 35, height * ratio, index * 0.5));
    } else if (id === 3) {
      const swarmCenter = mid + (Math.random() - 0.5) * 110;
      for (let i = 0; i < 8; i += 1) this.queue('drone', edge + i * 35, swarmCenter + (Math.random() - 0.5) * 150, i * 0.08);
    } else if (id === 4) {
      this.queue('tank', edge + 30, height * 0.35, 0);
      this.queue('tank', edge + 80, height * 0.65, 0.5);
      for (let i = 0; i < 4; i += 1) this.queue('scout', edge + 220 + i * 70, height * (0.3 + i * 0.13), 0.8 + i * 0.11);
    } else if (id === 5) {
      for (let i = 0; i < 10; i += 1) {
        this.queue('scout', edge + (i % 5) * 62, height * (i < 5 ? 0.31 : 0.67) + (i % 5 - 2) * 25, i * 0.12);
      }
    } else if (id === 6) {
      this.queue('heavy', edge + 80, mid, 0);
    }
  }

  /** Spawns an individual enemy immediately, used by the boss drone summon. */
  spawn(typeId, x, y, wave = 99) {
    const type = ENEMY_TYPES[typeId];
    const enemy = this.pool.get();
    return enemy && type ? enemy.reset(type, x, y, wave) : null;
  }

  /** Advances delayed spawns, enemies and collectible drops. */
  update(dt, width, height, player = null) {
    for (let index = this.schedule.length - 1; index >= 0; index -= 1) {
      const request = this.schedule[index];
      request.delay -= dt;
      if (request.delay <= 0) {
        this.spawn(request.typeId, request.x, request.y, request.wave);
        this.schedule.splice(index, 1);
      }
    }
    for (const enemy of this.pool.items) enemy.update(dt, width, height);
    for (const powerup of this.powerupPool.items) powerup.update(dt, width, height);
    for (const coin of this.coinPool.items) coin.update(dt, width, height, player);
  }

  /** Deactivates a defeated enemy and potentially creates a collectible drop. */
  destroy(enemy, forceHealth = false) {
    if (!enemy?.active) return null;
    enemy.active = false;
    this.dropCoins(enemy.x, enemy.y, enemy.type.coins);
    if (forceHealth || Math.random() < GAME.POWERUP_CHANCE) {
      const type = forceHealth || Math.random() < 0.5 ? 'health' : 'upgrade';
      this.dropPowerup(enemy.x, enemy.y, type);
    }
    return enemy;
  }

  /** Creates a pooled health or overcharge pickup. */
  dropPowerup(x, y, kind) {
    const powerup = this.powerupPool.get();
    return powerup?.reset(x, y, kind) || null;
  }

  /** Creates the authored amount of magnetized salvage currency for a defeated foe. */
  dropCoins(x, y, count = 1) {
    for (let index = 0; index < count; index += 1) {
      const coin = this.coinPool.get();
      if (!coin) return;
      coin.reset(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 18);
    }
  }

  /** Whether all wave enemy slots and delayed spawn slots have drained. */
  isClear() {
    return this.schedule.length === 0 && !this.pool.items.some((enemy) => enemy.active);
  }

  /** Draws active enemies and collectibles. */
  render(ctx, assets) {
    for (const enemy of this.pool.items) if (enemy.active) enemy.render(ctx, assets);
    for (const powerup of this.powerupPool.items) if (powerup.active) powerup.render(ctx);
    for (const coin of this.coinPool.items) if (coin.active) coin.render(ctx);
  }
}
