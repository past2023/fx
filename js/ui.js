import { COLORS, ECONOMY, GAME, SHIPS, SHIP_UPGRADES, WEAPONS } from './constants.js';

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
  renderMenu(ctx, width, height, shipIndex, weaponIndex, focus, hangar = { coins: 0, shipUpgrades: {} }) {
    this._backplate(ctx, width, height);
    const pulse = 0.7 + Math.sin(this.time * 3.2) * 0.3;
    text(ctx, 'STARFALL', width / 2, 67, 38, COLORS.cyan, 'center');
    text(ctx, 'LEVEL 1 · BREACH THE OUTER RIM', width / 2, 103, 13, COLORS.muted, 'center');
    text(ctx, `SALVAGE  ✦ ${String(hangar.coins || 0).padStart(3, '0')}`, width - 28, 67, 13, COLORS.coin, 'right');
    text(ctx, 'SELECT YOUR SHIP', width / 2, 153, 21, focus === 0 ? COLORS.warning : COLORS.ink, 'center');

    const shipCardW = Math.min(240, (width - 110) / 3);
    const shipStart = width / 2 - shipCardW * 1.5 - 10;
    SHIPS.forEach((ship, index) => {
      const x = shipStart + index * (shipCardW + 10);
      this._selectionCard(ctx, x, 180, shipCardW, 164, index === shipIndex, focus === 0, ship.color);
      this._shipIcon(ctx, x + shipCardW / 2, 218, ship);
      text(ctx, ship.name, x + shipCardW / 2, 258, 16, ship.accent, 'center');
      text(ctx, `${ship.speed} SPD  ·  ${ship.hp} HP`, x + shipCardW / 2, 282, 12, COLORS.ink, 'center');
      text(ctx, `${ship.cooldown.toFixed(2)}s FIRE`, x + shipCardW / 2, 302, 11, COLORS.muted, 'center');
      const modules = hangar.shipUpgrades?.[ship.id] || {};
      const level = SHIP_UPGRADES.reduce((total, module) => total + (modules[module.id] || 0), 0);
      text(ctx, `MK ${level.toString().padStart(2, '0')} · ${level >= SHIP_UPGRADES.length * ECONOMY.MAX_MODULE_LEVEL ? 'MAXED' : 'FIELD FORGE [U]'}`, x + shipCardW / 2, 320, 9, index === shipIndex ? COLORS.warning : COLORS.muted, 'center');
      if (index === shipIndex) text(ctx, 'UPGRADE HULL · THRUST · FIRE CONTROL', x + shipCardW / 2, 337, 8, ship.accent, 'center');
    });

    text(ctx, 'SELECT WEAPON', width / 2, 391, 21, focus === 1 ? COLORS.warning : COLORS.ink, 'center');
    const weaponCardW = Math.min(240, (width - 110) / 3);
    const weaponStart = width / 2 - weaponCardW * 1.5 - 10;
    WEAPONS.forEach((weapon, index) => {
      const x = weaponStart + index * (weaponCardW + 10);
      this._selectionCard(ctx, x, 418, weaponCardW, 132, index === weaponIndex, focus === 1, weapon.color);
      this._weaponIcon(ctx, x + 31, 454, weapon);
      text(ctx, weapon.name, x + 56, 445, 16, weapon.color, 'left');
      text(ctx, weapon.description, x + 56, 471, 10, COLORS.ink, 'left');
      if (weapon.id === 'laser') text(ctx, 'OVERHEATS AFTER SUSTAINED USE', x + 56, 493, 9, COLORS.muted, 'left');
      if (index === weaponIndex) text(ctx, 'ARMED', x + weaponCardW / 2, 529, 10, COLORS.warning, 'center');
    });

    text(ctx, '← → CHANGE   ·   ↑ ↓ SWITCH PANEL   ·   [U] OPEN FIELD FORGE   ·   [X] VOID BOMB', width / 2, height - 78, 12, COLORS.muted, 'center');
    text(ctx, 'PRESS ENTER OR SPACE TO LAUNCH · TOUCH / XBOX / PLAYSTATION / PSP GAMEPADS READY', width / 2, height - 42, 16, `rgba(234,246,255,${pulse})`, 'center');
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
    text(ctx, `SALVAGE  ✦ ${String(game.hangar.coins).padStart(3, '0')}`, 22, 66, 12, COLORS.coin, 'left');
    if (game.runCoins > 0) text(ctx, `+${game.runCoins} THIS RUN`, 22, 82, 9, '#fff1a6', 'left');
    text(ctx, 'VOID BOMBS [X]', 22, 100, 9, '#ffb27c', 'left');
    for (let index = 0; index < player.maxBombs; index += 1) {
      const armed = index < player.bombs;
      ctx.save(); ctx.globalAlpha = armed ? 1 : .22; ctx.fillStyle = armed ? '#ff765b' : '#8892aa'; ctx.shadowColor = '#ff765b'; ctx.shadowBlur = armed ? 8 : 0;
      ctx.beginPath(); ctx.arc(115 + index * 18, 100, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe7b0'; ctx.fillRect(113 + index * 18, 92, 4, 4); ctx.restore();
    }

    text(ctx, 'SCORE', width / 2, 26, 10, COLORS.muted, 'center');
    text(ctx, String(score).padStart(6, '0'), width / 2, 45, 22, COLORS.ink, 'center');
    if (player.upgradeTimer > 0) {
      text(ctx, 'OVERCHARGE', width / 2, 68, 10, '#cba5ff', 'center');
      this._bar(ctx, width / 2 - 75, 77, 150, 5, player.upgradeTimer / GAME.POWERUP_DURATION, '#a577ff');
    }

    const right = width - 24;
    text(ctx, weapon.name, right, 28, 15, weapon.weapon.color, 'right');
    text(ctx, 'WEAPON SYSTEM · [Q/E] CYCLE · [U] FORGE', right, 47, 9, COLORS.muted, 'right');
    if (weapon.weapon.id === 'laser') {
      this._bar(ctx, width - 178, 57, 154, 10, 1 - player.heat / 100, player.laserLockout > 0 ? COLORS.danger : weapon.weapon.color, player.laserLockout > 0 ? 'OVERHEAT' : 'HEAT');
    }

    const progress = Math.min(1, distance / GAME.LEVEL_LENGTH);
    ctx.save(); ctx.globalAlpha = 0.85;
    this._bar(ctx, 22, game.height - 24, 170, 4, progress, COLORS.cyan);
    text(ctx, `SECTOR ${Math.min(99, Math.floor(progress * 100)).toString().padStart(2, '0')}%`, 201, game.height - 22, 10, COLORS.muted, 'left');
    const controller = game.input.getControllerName();
    text(ctx, controller ? `PAD LINK // ${controller.slice(0, 20).toUpperCase()}` : 'TOUCH / GAMEPAD READY', width - 22, game.height - 22, 9, controller ? COLORS.health : COLORS.muted, 'right');
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

  /** Flashes an impact tint over the combat world without obscuring the HUD. */
  renderScreenFlash(ctx, width, height, timer, maxTimer, color) {
    if (timer <= 0 || maxTimer <= 0) return;
    const alpha = Math.min(.26, (timer / maxTimer) * .2);
    ctx.save();
    const wash = ctx.createRadialGradient(width * .5, height * .5, 10, width * .5, height * .5, Math.max(width, height) * .7);
    wash.addColorStop(0, `rgba(255,255,255,${alpha * .2})`);
    wash.addColorStop(.55, color);
    wash.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = alpha * .8;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** Displays a short tactical message with a crisp, animated command-panel treatment. */
  renderNotification(ctx, width, height, game) {
    const message = game.notificationText;
    if (!message) return;
    const y = game.state === 'BOSS' ? 184 : 105;
    const panelWidth = Math.min(width * .52, 510);
    const x = width / 2 - panelWidth / 2;
    const alpha = Math.min(1, game.notificationTimer * 3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(5, 13, 35, .86)';
    ctx.fillRect(x, y - 17, panelWidth, 34);
    ctx.strokeStyle = game.notificationColor; ctx.lineWidth = 1.2; ctx.shadowColor = game.notificationColor; ctx.shadowBlur = 10;
    ctx.strokeRect(x, y - 17, panelWidth, 34);
    ctx.shadowBlur = 0;
    ctx.fillStyle = game.notificationColor; ctx.fillRect(x + 7, y - 10, 3, 20);
    text(ctx, message, width / 2, y, 12, COLORS.ink, 'center');
    ctx.restore();
  }

  /** Adds a subtle cockpit overlay, scanlines and sci-fi corner brackets to every screen. */
  renderFrame(ctx, width, height, state) {
    ctx.save();
    ctx.globalAlpha = state === 'MENU' ? 0.16 : 0.11;
    ctx.fillStyle = '#b9e8ff';
    for (let y = 3; y < height; y += 4) ctx.fillRect(0, y, width, 1);
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = 'rgba(105, 214, 255, .58)'; ctx.lineWidth = 1;
    const inset = 12; const arm = 24;
    const corners = [[inset, inset, 1, 1], [width - inset, inset, -1, 1], [inset, height - inset, 1, -1], [width - inset, height - inset, -1, -1]];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath(); ctx.moveTo(x, y + arm * sy); ctx.lineTo(x, y); ctx.lineTo(x + arm * sx, y); ctx.stroke();
    }
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .25, width / 2, height / 2, Math.max(width, height) * .72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,2,12,.33)');
    ctx.globalAlpha = 1; ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /** Renders the pause-safe Field Forge upgrade window for hangar or mid-combat use. */
  renderUpgradeWindow(ctx, width, height, game) {
    const ship = game.player?.ship || SHIPS[game.selectedShip];
    const upgrades = game._shipUpgrades(ship.id);
    const panelWidth = Math.min(980, width - 72);
    const panelHeight = Math.min(490, height - 54);
    const x = (width - panelWidth) / 2;
    const y = (height - panelHeight) / 2;
    const selected = game.upgradeSelection;

    ctx.save();
    ctx.fillStyle = 'rgba(1, 4, 15, .76)'; ctx.fillRect(0, 0, width, height);
    const panel = ctx.createLinearGradient(x, y, x + panelWidth, y + panelHeight);
    panel.addColorStop(0, 'rgba(13, 30, 66, .98)'); panel.addColorStop(.55, 'rgba(8, 16, 40, .98)'); panel.addColorStop(1, 'rgba(23, 10, 49, .98)');
    ctx.fillStyle = panel; ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeStyle = '#5bd8ff'; ctx.lineWidth = 2; ctx.shadowColor = '#54dfff'; ctx.shadowBlur = 18; ctx.strokeRect(x, y, panelWidth, panelHeight);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(86, 225, 255, .12)'; ctx.fillRect(x, y, panelWidth, 58);
    text(ctx, 'FIELD FORGE', x + 28, y + 27, 25, COLORS.cyan, 'left');
    text(ctx, game.state === 'MENU' ? 'HANGAR MODIFICATION BAY' : 'COMBAT CLOCK PAUSED · LIVE INSTALLATION READY', x + 28, y + 48, 10, COLORS.muted, 'left');
    text(ctx, `SALVAGE  ✦ ${String(game.hangar.coins).padStart(3, '0')}`, x + panelWidth - 28, y + 28, 16, COLORS.coin, 'right');

    const hullX = x + 28;
    this._shipIcon(ctx, hullX + 76, y + 130, ship);
    text(ctx, ship.name, hullX + 76, y + 178, 18, ship.accent, 'center');
    text(ctx, 'ACTIVE HULL', hullX + 76, y + 202, 10, COLORS.muted, 'center');
    text(ctx, `${game.player?.maxHp || ship.hp} HULL`, hullX + 76, y + 231, 13, COLORS.health, 'center');
    text(ctx, `${game.player?.speed || ship.speed} THRUST`, hullX + 76, y + 252, 12, COLORS.cyan, 'center');
    text(ctx, `MK ${SHIP_UPGRADES.reduce((total, module) => total + (upgrades[module.id] || 0), 0).toString().padStart(2, '0')}`, hullX + 76, y + 281, 15, COLORS.warning, 'center');
    ctx.strokeStyle = 'rgba(143, 192, 255, .35)'; ctx.strokeRect(hullX, y + 78, 152, panelHeight - 145);

    const cardsX = hullX + 177;
    const gap = 12;
    const cardsWidth = panelWidth - 205;
    const cardWidth = (cardsWidth - gap * 2) / 3;
    SHIP_UPGRADES.forEach((module, index) => {
      const cardX = cardsX + index * (cardWidth + gap);
      const active = index === selected;
      const level = upgrades[module.id] || 0;
      const maxed = level >= ECONOMY.MAX_MODULE_LEVEL;
      const cost = game._upgradeCost(ship.id, module.id);
      ctx.save();
      ctx.fillStyle = active ? 'rgba(29, 65, 108, .9)' : 'rgba(8, 18, 44, .78)';
      ctx.strokeStyle = active ? module.color : 'rgba(121, 167, 229, .34)';
      ctx.lineWidth = active ? 2 : 1;
      if (active) { ctx.shadowColor = module.color; ctx.shadowBlur = 15; }
      ctx.fillRect(cardX, y + 78, cardWidth, panelHeight - 145); ctx.strokeRect(cardX, y + 78, cardWidth, panelHeight - 145);
      ctx.shadowBlur = 0;
      text(ctx, module.icon, cardX + cardWidth / 2, y + 121, 28, module.color, 'center');
      text(ctx, module.name, cardX + cardWidth / 2, y + 153, 13, module.color, 'center');
      text(ctx, module.label, cardX + cardWidth / 2, y + 177, 10, COLORS.ink, 'center');
      text(ctx, `LEVEL ${level} / ${ECONOMY.MAX_MODULE_LEVEL}`, cardX + cardWidth / 2, y + 209, 13, COLORS.muted, 'center');
      for (let pip = 0; pip < ECONOMY.MAX_MODULE_LEVEL; pip += 1) {
        ctx.fillStyle = pip < level ? module.color : 'rgba(164, 192, 232, .18)';
        ctx.fillRect(cardX + cardWidth / 2 - 31 + pip * 17, y + 225, 12, 5);
      }
      if (maxed) text(ctx, 'MAXIMUM OUTPUT', cardX + cardWidth / 2, y + 268, 11, COLORS.health, 'center');
      else {
        text(ctx, `${cost} ✦`, cardX + cardWidth / 2, y + 263, 20, game.hangar.coins >= cost ? COLORS.coin : COLORS.danger, 'center');
        text(ctx, game.hangar.coins >= cost ? 'READY TO INSTALL' : 'INSUFFICIENT SALVAGE', cardX + cardWidth / 2, y + 286, 9, game.hangar.coins >= cost ? COLORS.health : COLORS.danger, 'center');
      }
      if (active) text(ctx, 'SELECTED', cardX + cardWidth / 2, y + panelHeight - 91, 10, COLORS.warning, 'center');
      ctx.restore();
    });

    ctx.fillStyle = 'rgba(3, 8, 24, .82)'; ctx.fillRect(x, y + panelHeight - 53, panelWidth, 53);
    text(ctx, '← → SELECT MODULE', x + 24, y + panelHeight - 26, 11, COLORS.muted, 'left');
    text(ctx, 'ENTER / SPACE INSTALL', x + panelWidth / 2, y + panelHeight - 26, 12, COLORS.ink, 'center');
    text(ctx, 'U CLOSE FORGE', x + panelWidth - 24, y + panelHeight - 26, 11, COLORS.muted, 'right');
    ctx.restore();
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
