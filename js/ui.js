import { COLORS, GAME, SHIPS, WEAPONS } from './constants.js';

const text = (ctx, value, x, y, size, color = COLORS.ink, align = 'left') => {
  ctx.font = `700 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
};

/**
 * Draws menus, status HUD, boss status and terminal screens independently of game logic.
 */
export default class UI {
  constructor() { this.time = 0; }

  /** Advances UI-only animation time. */
  update(dt) { this.time += dt; }

  /** Renders the ship/weapon selection menu. */
  renderMenu(ctx, width, height, shipIndex, weaponIndex, focus) {
    this._backplate(ctx, width, height);
    const pulse = 0.7 + Math.sin(this.time * 3.2) * 0.3;
    text(ctx, 'STARFALL', width / 2, 67, 38, COLORS.cyan, 'center');
    text(ctx, 'LEVEL 1 · BREACH THE OUTER RIM', width / 2, 103, 13, COLORS.muted, 'center');
    text(ctx, 'SELECT YOUR SHIP', width / 2, 153, 21, focus === 0 ? COLORS.warning : COLORS.ink, 'center');

    const shipCardW = Math.min(240, (width - 110) / 3);
    const shipStart = width / 2 - shipCardW * 1.5 - 10;
    SHIPS.forEach((ship, index) => {
      const x = shipStart + index * (shipCardW + 10);
      this._selectionCard(ctx, x, 180, shipCardW, 155, index === shipIndex, focus === 0, ship.color);
      this._shipIcon(ctx, x + shipCardW / 2, 218, ship);
      text(ctx, ship.name, x + shipCardW / 2, 258, 16, ship.accent, 'center');
      text(ctx, `${ship.speed} SPD  ·  ${ship.hp} HP`, x + shipCardW / 2, 282, 12, COLORS.ink, 'center');
      text(ctx, `${ship.cooldown.toFixed(2)}s FIRE`, x + shipCardW / 2, 304, 11, COLORS.muted, 'center');
      if (index === shipIndex) text(ctx, 'SELECTED', x + shipCardW / 2, 326, 10, COLORS.warning, 'center');
    });

    text(ctx, 'SELECT WEAPON', width / 2, 384, 21, focus === 1 ? COLORS.warning : COLORS.ink, 'center');
    const weaponCardW = Math.min(240, (width - 110) / 3);
    const weaponStart = width / 2 - weaponCardW * 1.5 - 10;
    WEAPONS.forEach((weapon, index) => {
      const x = weaponStart + index * (weaponCardW + 10);
      this._selectionCard(ctx, x, 411, weaponCardW, 132, index === weaponIndex, focus === 1, weapon.color);
      this._weaponIcon(ctx, x + 31, 447, weapon);
      text(ctx, weapon.name, x + 56, 438, 16, weapon.color, 'left');
      text(ctx, weapon.description, x + 56, 464, 10, COLORS.ink, 'left');
      if (weapon.id === 'laser') text(ctx, 'OVERHEATS AFTER SUSTAINED USE', x + 56, 486, 9, COLORS.muted, 'left');
      if (index === weaponIndex) text(ctx, 'ARMED', x + weaponCardW / 2, 522, 10, COLORS.warning, 'center');
    });

    text(ctx, '← → CHANGE   ·   ↑ ↓ SWITCH PANEL', width / 2, height - 78, 12, COLORS.muted, 'center');
    text(ctx, 'PRESS ENTER OR SPACE TO LAUNCH', width / 2, height - 42, 16, `rgba(234,246,255,${pulse})`, 'center');
  }

  _backplate(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 7, 22, .74)'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(87, 186, 255, .18)'; ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y < height; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    ctx.restore();
  }

  _selectionCard(ctx, x, y, width, height, selected, focused, color) {
    ctx.save();
    const active = selected && focused;
    ctx.fillStyle = active ? 'rgba(25, 38, 77, .88)' : 'rgba(10, 16, 37, .82)';
    ctx.strokeStyle = selected ? (focused ? COLORS.warning : color) : 'rgba(119, 151, 205, .35)';
    ctx.lineWidth = selected ? 2 : 1;
    if (active) { ctx.shadowColor = COLORS.warning; ctx.shadowBlur = 12; }
    ctx.fillRect(x, y, width, height); ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  _shipIcon(ctx, x, y, ship) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = ship.color; ctx.strokeStyle = ship.accent; ctx.shadowColor = ship.color; ctx.shadowBlur = 12;
    ctx.beginPath();
    if (ship.id === 'tank') { ctx.moveTo(-23, 0); ctx.lineTo(-12, -14); ctx.lineTo(14, -14); ctx.lineTo(24, 0); ctx.lineTo(14, 14); ctx.lineTo(-12, 14); }
    else if (ship.id === 'interceptor') { ctx.moveTo(-25, 0); ctx.lineTo(-8, -9); ctx.lineTo(3, -17); ctx.lineTo(25, 0); ctx.lineTo(3, 17); ctx.lineTo(-8, 9); }
    else { ctx.moveTo(-23, 0); ctx.lineTo(-7, -15); ctx.lineTo(25, 0); ctx.lineTo(-7, 15); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  _weaponIcon(ctx, x, y, weapon) {
    ctx.save(); ctx.strokeStyle = weapon.color; ctx.fillStyle = weapon.color; ctx.shadowColor = weapon.color; ctx.shadowBlur = 10;
    if (weapon.id === 'blaster') { ctx.fillRect(x - 17, y - 3, 34, 6); ctx.beginPath(); ctx.arc(x + 18, y, 5, 0, Math.PI * 2); ctx.fill(); }
    else if (weapon.id === 'spread') { [-0.27, 0, 0.27].forEach((angle) => { ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 19, y + Math.sin(angle) * 14); ctx.stroke(); }); }
    else { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 19, y); ctx.stroke(); }
    ctx.restore();
  }

  /** Draws all normal-run HUD components. */
  renderHUD(ctx, game) {
    const { width, player, weapon, score, distance } = game;
    const hpRatio = player.hp / player.maxHp;
    this._bar(ctx, 22, 27, 235, 17, hpRatio, hpRatio > 0.34 ? COLORS.health : COLORS.danger, 'HP');
    text(ctx, `${Math.ceil(player.hp)} / ${player.maxHp}`, 267, 36, 11, COLORS.ink, 'left');

    text(ctx, 'SCORE', width / 2, 26, 10, COLORS.muted, 'center');
    text(ctx, String(score).padStart(6, '0'), width / 2, 45, 22, COLORS.ink, 'center');
    if (player.upgradeTimer > 0) {
      text(ctx, 'OVERCHARGE', width / 2, 68, 10, '#cba5ff', 'center');
      this._bar(ctx, width / 2 - 75, 77, 150, 5, player.upgradeTimer / GAME.POWERUP_DURATION, '#a577ff');
    }

    const right = width - 24;
    text(ctx, weapon.name, right, 28, 15, weapon.weapon.color, 'right');
    text(ctx, 'WEAPON SYSTEM', right, 47, 9, COLORS.muted, 'right');
    if (weapon.weapon.id === 'laser') {
      this._bar(ctx, width - 178, 57, 154, 10, 1 - player.heat / 100, player.laserLockout > 0 ? COLORS.danger : weapon.weapon.color, player.laserLockout > 0 ? 'OVERHEAT' : 'HEAT');
    }

    const progress = Math.min(1, distance / GAME.LEVEL_LENGTH);
    ctx.save(); ctx.globalAlpha = 0.85;
    this._bar(ctx, 22, game.height - 24, 170, 4, progress, COLORS.cyan);
    text(ctx, `SECTOR ${Math.min(99, Math.floor(progress * 100)).toString().padStart(2, '0')}%`, 201, game.height - 22, 10, COLORS.muted, 'left');
    ctx.restore();
  }

  /** Draws the Mother Ship health block over the standard HUD. */
  renderBossHUD(ctx, game) {
    const boss = game.boss;
    const width = game.width;
    const hpRatio = boss.hp / boss.maxHp;
    const barWidth = Math.min(520, width * 0.52);
    text(ctx, 'MOTHER SHIP', width / 2, 103, 15, '#ffb3ed', 'center');
    this._bar(ctx, width / 2 - barWidth / 2, 116, barWidth, 14, hpRatio, '#ed59c7');
    text(ctx, `${Math.ceil(boss.hp)} / ${boss.maxHp}`, width / 2, 139, 10, COLORS.ink, 'center');
    if (!boss.entered) text(ctx, 'APPROACHING · SHIELDS ACTIVE', width / 2, 157, 10, COLORS.cyan, 'center');
    else text(ctx, `PHASE ${boss.phase} // ${boss.phase === 1 ? 'TRACKING' : boss.phase === 2 ? 'BEAM ARRAY' : 'BERSERK'}`, width / 2, 157, 10, COLORS.warning, 'center');
  }

  _bar(ctx, x, y, width, height, ratio, color, label = '') {
    const r = Math.max(0, Math.min(1, ratio));
    ctx.save();
    if (label) text(ctx, label, x, y - 10, 10, COLORS.muted, 'left');
    ctx.fillStyle = 'rgba(3, 7, 18, .82)'; ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (width - 2) * r), Math.max(0, height - 2));
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(226, 245, 255, .45)'; ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  /** Renders a polished terminal victory or defeat overlay. */
  renderTerminal(ctx, width, height, state, score) {
    this._backplate(ctx, width, height);
    const victory = state === 'VICTORY';
    const primary = victory ? COLORS.health : COLORS.danger;
    const headline = victory ? 'SECTOR SECURED' : 'SHIP LOST';
    const subhead = victory ? 'MOTHER SHIP DESTROYED · LEVEL 1 COMPLETE' : 'THE OUTER RIM HOLDS—for now';
    const pulse = 0.65 + Math.sin(this.time * 3) * 0.35;
    text(ctx, victory ? '✦' : '✕', width / 2, height / 2 - 117, 56, primary, 'center');
    text(ctx, headline, width / 2, height / 2 - 55, 38, primary, 'center');
    text(ctx, subhead, width / 2, height / 2 - 16, 13, COLORS.ink, 'center');
    text(ctx, `FINAL SCORE  ${String(score).padStart(6, '0')}`, width / 2, height / 2 + 34, 20, COLORS.warning, 'center');
    text(ctx, 'PRESS ENTER OR SPACE TO FLY AGAIN', width / 2, height / 2 + 94, 14, `rgba(234,246,255,${pulse})`, 'center');
  }

  /** Fades a just-entered game state into view. */
  renderFade(ctx, width, height, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.fillStyle = `rgba(2, 3, 12, ${Math.min(1, alpha)})`; ctx.fillRect(0, 0, width, height); ctx.restore();
  }
}
