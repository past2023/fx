import { COLORS, TUNING } from './constants.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Level-ending Mother Ship controller: entry immunity, phase attacks and beam hit test.
 */
export default class Boss {
  constructor() {
    this.reset(1280, 720);
  }

  /** Restores the boss to its off-screen arrival state. */
  reset(width, height) {
    this.width = width;
    this.height = height;
    this.scale = TUNING.BOSS.SCALE;
    this.x = width + 210;
    this.y = height * 0.5;
    this.targetX = width * 0.7;
    this.hp = this.maxHp = TUNING.BOSS.HP;
    this.active = true;
    this.entered = false;
    this.dead = false;
    this.phase = 1;
    this.age = 0;
    this.aimTimer = 0.7;
    this.droneTimer = TUNING.BOSS.PHASE_THREE_DRONE_INTERVAL;
    this.dashTimer = TUNING.BOSS.DASH_COOLDOWN_MIN;
    this.dashTime = 0;
    this.laserAngle = Math.PI;
    this.phaseJustChanged = false;
  }

  /** Updates entry movement, phase selection and boss attacks. */
  update(dt, player, bullets, enemies, width, height) {
    if (!this.active || this.dead) return { entered: false, phaseChanged: false, fired: false };
    this.width = width; this.height = height;
    this.age += dt;
    this.phaseJustChanged = false;

    if (!this.entered) {
      this.x -= TUNING.BOSS.ENTRY_SPEED * dt;
      if (this.x <= this.targetX) {
        this.x = this.targetX;
        this.entered = true;
        return { entered: true, phaseChanged: false, fired: false };
      }
      return { entered: false, phaseChanged: false, fired: false };
    }

    const previousPhase = this.phase;
    const ratio = this.hp / this.maxHp;
    this.phase = ratio > 0.6 ? 1 : ratio > 0.3 ? 2 : 3;
    this.phaseJustChanged = previousPhase !== this.phase;

    const sineSpeed = this.phase === 3 ? 2.6 : 1.1;
    const sineAmplitude = this.phase === 3 ? 195 : this.phase === 2 ? 130 : 105;
    const homeX = width * 0.7;
    if (this.phase === 3) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0 && this.dashTime <= 0) {
        this.dashTime = TUNING.BOSS.DASH_DURATION;
        this.dashTimer = TUNING.BOSS.DASH_COOLDOWN_MIN + Math.random() * TUNING.BOSS.DASH_COOLDOWN_RANDOM;
      }
    }
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.x += (Math.max(player.x + 135, width * 0.42) - this.x) * Math.min(1, 3.8 * dt);
      this.y += (player.y - this.y) * Math.min(1, 3.2 * dt);
    } else {
      this.x += (homeX - this.x) * Math.min(1, 1.5 * dt);
      const desiredY = height * 0.5 + Math.sin(this.age * sineSpeed) * sineAmplitude;
      this.y += (desiredY - this.y) * Math.min(1, 2.4 * dt);
    }
    this.x = clamp(this.x, width * 0.4, width * 0.82);
    this.y = clamp(this.y, 120, height - 120);

    let fired = false;
    this.aimTimer -= dt;
    const interval = this.phase === 1 ? TUNING.BOSS.PHASE_ONE_AIM_INTERVAL : this.phase === 2 ? TUNING.BOSS.PHASE_TWO_AIM_INTERVAL : TUNING.BOSS.PHASE_THREE_AIM_INTERVAL;
    if (this.aimTimer <= 0) {
      this.aimTimer += interval;
      this._fireAtPlayer(player, bullets);
      fired = true;
    }
    if (this.phase >= 2) this.laserAngle = Math.PI + Math.sin(this.age * (this.phase === 3 ? 1.9 : 1.15)) * 0.82;
    if (this.phase === 3) {
      this.droneTimer -= dt;
      if (this.droneTimer <= 0) {
        this.droneTimer += TUNING.BOSS.PHASE_THREE_DRONE_INTERVAL;
        enemies.spawn('drone', this.x - 78, clamp(this.y - 76, 30, height - 30));
        enemies.spawn('drone', this.x - 78, clamp(this.y, 30, height - 30));
        enemies.spawn('drone', this.x - 78, clamp(this.y + 76, 30, height - 30));
      }
    }
    return { entered: false, phaseChanged: this.phaseJustChanged, fired };
  }

  _fireAtPlayer(player, bullets) {
    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const offsets = this.phase === 1 ? [0] : this.phase === 2 ? [-0.14, 0.14] : [-0.42, -0.21, 0, 0.21, 0.42];
    const damage = this.phase === 3 ? 24 : this.phase === 2 ? 20 : 18;
    for (const offset of offsets) {
      const angle = baseAngle + offset;
      bullets.fire({
        x: this.x - 70 * this.scale,
        y: this.y + offset * 58,
        vx: Math.cos(angle) * TUNING.BOSS.AIMED_BULLET_SPEED,
        vy: Math.sin(angle) * TUNING.BOSS.AIMED_BULLET_SPEED,
        damage,
        team: 'enemy',
        type: 'enemyOrb',
        color: this.phase === 3 ? '#ff5b8b' : this.phase === 2 ? '#ec78ff' : '#c980ff',
        w: this.phase === 3 ? 14 : 12,
        h: this.phase === 3 ? 14 : 12,
        life: 5,
      });
    }
  }

  /** Applies player projectile damage once the entry shield has disengaged. */
  takeDamage(amount) {
    if (!this.active || this.dead || !this.entered) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  /** Returns body collision bounds. */
  getBounds() { return { x: this.x - 98 * this.scale, y: this.y - 84 * this.scale, w: 196 * this.scale, h: 168 * this.scale }; }

  /** Tests player AABB against the active laser ray's expanded thickness. */
  laserHits(bounds) {
    if (!this.entered || this.phase < 2 || this.dead) return false;
    // Slab test against an AABB expanded by the beam's visual thickness.
    const padding = 14;
    const box = {
      x: bounds.x - padding,
      y: bounds.y - padding,
      w: bounds.w + padding * 2,
      h: bounds.h + padding * 2,
    };
    const dx = Math.cos(this.laserAngle) * TUNING.BOSS.LASER_RANGE;
    const dy = Math.sin(this.laserAngle) * TUNING.BOSS.LASER_RANGE;
    let near = 0;
    let far = 1;
    for (const [origin, delta, min, max] of [
      [this.x, dx, box.x, box.x + box.w],
      [this.y, dy, box.y, box.y + box.h],
    ]) {
      if (Math.abs(delta) < 0.00001) {
        if (origin < min || origin > max) return false;
        continue;
      }
      let a = (min - origin) / delta;
      let b = (max - origin) / delta;
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a);
      far = Math.min(far, b);
      if (near > far) return false;
    }
    return far >= 0 && near <= 1;
  }

  /** Draws the dangerous phase-two-plus sweeping beam. */
  renderLaser(ctx) {
    if (!this.entered || this.phase < 2 || this.dead) return;
    const endX = this.x + Math.cos(this.laserAngle) * TUNING.BOSS.LASER_RANGE;
    const endY = this.y + Math.sin(this.laserAngle) * TUNING.BOSS.LASER_RANGE;
    const pulse = 0.75 + Math.sin(this.age * 10) * 0.2;
    ctx.save();
    ctx.globalAlpha = 0.28 * pulse;
    ctx.strokeStyle = '#ff4fcf';
    ctx.lineWidth = 28;
    ctx.shadowColor = '#ff4fcf'; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.moveTo(this.x - 62 * this.scale, this.y); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = '#ffd4f3'; ctx.lineWidth = 3; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(this.x - 62 * this.scale, this.y); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
    ctx.setLineDash([10, 16]); ctx.lineDashOffset = -this.age * 140;
    ctx.beginPath(); ctx.moveTo(this.x - 62 * this.scale, this.y); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.setLineDash([]);
    const source = ctx.createRadialGradient(this.x - 55, this.y, 2, this.x - 55, this.y, 38);
    source.addColorStop(0, 'rgba(255,255,255,.95)'); source.addColorStop(.25, '#ff7be1'); source.addColorStop(1, 'rgba(255,72,204,0)');
    ctx.globalAlpha = pulse; ctx.fillStyle = source; ctx.beginPath(); ctx.arc(this.x - 55, this.y, 38, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /** Draws a segmented geometric mother ship or a supplied sprite. */
  render(ctx, assets) {
    if (!this.active || this.dead) return;
    const sprite = assets?.images?.boss;
    if (sprite) {
      ctx.drawImage(sprite, this.x - 105 * this.scale, this.y - 92 * this.scale, 210 * this.scale, 184 * this.scale);
      return;
    }
    const pulse = 0.72 + Math.sin(this.age * 4) * 0.28;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.shadowColor = '#a969ff'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#263052'; ctx.strokeStyle = '#d4ccff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-98, 0); ctx.lineTo(-62, -56); ctx.lineTo(-10, -80); ctx.lineTo(70, -58);
    ctx.lineTo(101, 0); ctx.lineTo(70, 58); ctx.lineTo(-10, 80); ctx.lineTo(-62, 56); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#151b36';
    for (const y of [-43, 0, 43]) {
      ctx.fillRect(-78, y - 9, 55, 18);
      ctx.strokeRect(-78, y - 9, 55, 18);
    }
    ctx.fillStyle = '#563d92';
    ctx.beginPath(); ctx.moveTo(-12, -66); ctx.lineTo(77, -36); ctx.lineTo(55, 0); ctx.lineTo(77, 36); ctx.lineTo(-12, 66); ctx.closePath(); ctx.fill();
    ctx.shadowColor = '#ff64dc'; ctx.shadowBlur = 28;
    ctx.fillStyle = `rgba(255, 102, 220, ${pulse})`;
    ctx.beginPath(); ctx.arc(20, 0, 24 + pulse * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3ff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(20, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff5bd3';
    ctx.beginPath(); ctx.arc(-35, -33, 7, 0, Math.PI * 2); ctx.arc(-35, 33, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(194, 221, 255, .45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-82, -22); ctx.lineTo(-20, -22); ctx.moveTo(-82, 22); ctx.lineTo(-20, 22); ctx.stroke();
    for (let index = 0; index < 4; index += 1) {
      const orbit = this.age * (1.5 + index * .14) + index * Math.PI * .5;
      const ox = 20 + Math.cos(orbit) * 36;
      const oy = Math.sin(orbit) * 36;
      ctx.fillStyle = index % 2 ? '#78eaff' : '#ff9be5'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 11;
      ctx.beginPath(); ctx.arc(ox, oy, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    if (!this.entered) {
      ctx.globalAlpha = 0.45 + pulse * 0.2;
      ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 3; ctx.shadowColor = COLORS.cyan;
      ctx.beginPath(); ctx.arc(0, 0, 108, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}
