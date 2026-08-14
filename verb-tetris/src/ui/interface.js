// ============================================================================
//  UI / INTERFACE (Manejo de la interfaz HTML: HUD, modales, tienda, mapa)
//  ----------------------------------------------------------------------------
//  Actualiza el HUD y gestiona las ventanas modales (menú, pausa, tienda,
//  mapa de misiones, temas, misión cumplida, fin de partida) y el toast con
//  la pista en ruso. No dibuja en el <canvas> (eso lo hace renderer.js).
// ============================================================================

import {
  getState,
  EXTRA_HEART_COST,
  HINT_COST,
  ERASER_COST,
  MULTIPLIER_COST,
  COINS_PER_LEVEL,
} from '../system/state.js';
import { MISSIONS } from '../config/phrases.js';
import { THEMES } from '../game/pieces.js';

const THEME_LABELS = {
  default: 'Neón Original',
  retro: 'Retro',
  fiesta: 'Fiesta',
  neon: 'Neón Rey',
};

export class Interface {
  constructor() {
    this.handlers = {};
    this.toastTimer = null;
    this._refs = {};
  }

  // --- Inicialización ------------------------------------------------------

  init(handlers) {
    this.handlers = handlers;
    const ids = [
      'overlay',
      'menu-modal', 'pause-modal', 'shop-modal', 'map-modal',
      'theme-modal', 'complete-modal', 'gameover-modal', 'toast',
      'coins-value', 'lives', 'level-value', 'mission-emoji',
      'mission-name', 'mission-verbs', 'phrase-text', 'phrase-count',
      'progress-fill',
      'btn-pause', 'btn-shop', 'btn-map', 'btn-restart',
      'btn-hint', 'btn-eraser',
      'btn-play', 'btn-menu-shop', 'btn-menu-map', 'btn-menu-themes',
      'btn-menu-mute', 'btn-reset-save', 'menu-stats',
      'btn-resume', 'btn-pause-shop', 'btn-pause-map', 'btn-restart-current',
      'btn-to-menu', 'btn-pause-mute', 'btn-themes',
      'shop-coins-value', 'shop-items', 'btn-shop-back',
      'map-timeline', 'btn-map-back',
      'theme-list', 'btn-theme-back',
      'complete-mission-name', 'complete-reward', 'complete-actions',
      'gameover-mission', 'btn-retry', 'btn-go-menu',
    ];
    ids.forEach((id) => (this._refs[id] = document.getElementById(id)));

    // Botones de la barra lateral
    this._refs['btn-pause'].addEventListener('click', () => this.handlers.togglePause && this.handlers.togglePause());
    this._refs['btn-shop'].addEventListener('click', () => this.handlers.openShop && this.handlers.openShop());
    this._refs['btn-map'].addEventListener('click', () => this.handlers.openMap && this.handlers.openMap());
    this._refs['btn-restart'].addEventListener('click', () => this.showRestartConfirm());
    this._refs['btn-hint'].addEventListener('click', () => this.handlers.useHint && this.handlers.useHint());
    this._refs['btn-eraser'].addEventListener('click', () => this.handlers.useEraser && this.handlers.useEraser());

    // Menú principal
    this._refs['btn-play'].addEventListener('click', () => this.handlers.play && this.handlers.play());
    this._refs['btn-menu-shop'].addEventListener('click', () => this.handlers.openShop && this.handlers.openShop());
    this._refs['btn-menu-map'].addEventListener('click', () => this.handlers.openMap && this.handlers.openMap());
    this._refs['btn-menu-themes'].addEventListener('click', () => this.showThemes());
    this._refs['btn-menu-mute'].addEventListener('click', () => this.handlers.toggleMute && this.handlers.toggleMute());
    this._refs['btn-reset-save'].addEventListener('click', () => {
      if (confirm('¿Seguro que quieres borrar todo el progreso? Esta acción no se puede deshacer.')) {
        this.handlers.resetSave && this.handlers.resetSave();
      }
    });

    // Pausa
    this._refs['btn-resume'].addEventListener('click', () => this.handlers.resume && this.handlers.resume());
    this._refs['btn-pause-shop'].addEventListener('click', () => this.handlers.openShop && this.handlers.openShop());
    this._refs['btn-pause-map'].addEventListener('click', () => this.handlers.openMap && this.handlers.openMap());
    this._refs['btn-restart-current'].addEventListener('click', () => {
      this.hide('pause-modal');
      this.showRestartConfirm();
    });
    this._refs['btn-to-menu'].addEventListener('click', () => this.handlers.toMenu && this.handlers.toMenu());
    this._refs['btn-pause-mute'].addEventListener('click', () => this.handlers.toggleMute && this.handlers.toggleMute());
    this._refs['btn-themes'].addEventListener('click', () => this.showThemes());

    // Tienda
    this._refs['btn-shop-back'].addEventListener('click', () => this.hide('shop-modal'));
    // Mapa
    this._refs['btn-map-back'].addEventListener('click', () => this.hide('map-modal'));
    // Temas
    this._refs['btn-theme-back'].addEventListener('click', () => this.hide('theme-modal'));
    // Fin de partida
    this._refs['btn-retry'].addEventListener('click', () => this.handlers.retry && this.handlers.retry());
    this._refs['btn-go-menu'].addEventListener('click', () => this.handlers.toMenu && this.handlers.toMenu());

    // Botones de cierre de modales
    document.querySelectorAll('.close-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-close');
        this.hide(target + '-modal');
      });
    });

    // Cerrar modales con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.handlers.onEscape) this.handlers.onEscape(e);
    });
  }

  // --- Utilidades de visibilidad ------------------------------------------

  show(id) {
    const el = this._refs[id] || document.getElementById(id);
    if (el) el.classList.remove('hidden');
    this._refs['overlay'].classList.remove('hidden');
  }

  hide(id) {
    const el = this._refs[id] || document.getElementById(id);
    if (el) el.classList.add('hidden');
    // Si ya no hay ningún modal visible, ocultamos el overlay
    const visible = document.querySelectorAll('.modal:not(.hidden)');
    if (visible.length === 0) this._refs['overlay'].classList.add('hidden');
  }

  hideAllModals() {
    document.querySelectorAll('.modal').forEach((m) => m.classList.add('hidden'));
    this._refs['overlay'].classList.add('hidden');
  }

  // --- HUD ----------------------------------------------------------------

  updateHUD(opts) {
    const {
      coins, level, mission, phrase, phraseNum, maxPhrases,
      lives, maxLives, hintUses, eraserUses, activeTheme, muted,
    } = opts;

    if (coins !== undefined) this._refs['coins-value'].textContent = coins;
    if (level !== undefined) this._refs['level-value'].textContent = level;

    if (mission) {
      this._refs['mission-emoji'].textContent = mission.emoji;
      this._refs['mission-name'].textContent = `Misión ${mission.id}: ${mission.name}`;
      this._refs['mission-verbs'].textContent = mission.verbs.join(' · ');
    }

    if (phrase !== undefined) this._refs['phrase-text'].textContent = phrase;

    if (phraseNum !== undefined && maxPhrases !== undefined) {
      this._refs['phrase-count'].textContent = `${phraseNum}/${maxPhrases}`;
      const pct = ((phraseNum - 1) / maxPhrases) * 100;
      this._refs['progress-fill'].style.width = pct + '%';
    }

    if (lives !== undefined && maxLives !== undefined) this.updateLives(lives, maxLives);

    // Actualizar etiquetas de la barra lateral
    if (hintUses !== undefined) {
      const btn = this._refs['btn-hint'];
      btn.textContent = hintUses > 0 ? `💡 Pista (${hintUses})` : '💡 Pista';
      btn.classList.toggle('ghost-disabled', hintUses <= 0);
    }
    if (eraserUses !== undefined) {
      const btn = this._refs['btn-eraser'];
      btn.textContent = eraserUses > 0 ? `🧹 Borrar (${eraserUses})` : '🧹 Borrar';
      btn.classList.toggle('ghost-disabled', eraserUses <= 0);
    }
    if (activeTheme !== undefined) {
      document.querySelectorAll('.theme-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.theme === activeTheme);
      });
    }
    if (muted !== undefined) {
      const btnMenu = this._refs['btn-menu-mute'];
      const btnPause = this._refs['btn-pause-mute'];
      const txt = muted ? '🔇 Sonido' : '🔊 Sonido';
      if (btnMenu) btnMenu.textContent = txt;
      if (btnPause) btnPause.textContent = txt;
    }
  }

  updateLives(current, max) {
    const hearts = [];
    for (let i = 0; i < max; i++) {
      const filled = i < current;
      hearts.push(
        `<span class="${filled ? '' : 'heart-broken'}">${filled ? '❤️' : '🖤'}</span>`
      );
    }
    this._refs['lives'].innerHTML = hearts.join('');
  }

  // --- Toast (mensajes con pista en ruso) ---------------------------------

  showToast(text, hint, kind = 'info', duration = 2000) {
    const t = this._refs['toast'];
    t.className = 'toast ' + kind;
    let html = `<div class="toast-text">${text}</div>`;
    if (hint) html += `<div class="toast-hint">🇷🇺 ${hint}</div>`;
    t.innerHTML = html;
    t.classList.remove('hidden');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
  }

  // --- Menú principal -----------------------------------------------------

  showMenu(stats) {
    this.hideAllModals();
    const s = stats || getState();
    const mission = MISSIONS[s.currentMission] || MISSIONS[0];
    this._refs['menu-stats'].innerHTML = `
      <span class="stat">🪙 ${s.coins}</span>
      <span class="stat">⭐ Nivel ${Math.floor(s.xp / COINS_PER_LEVEL) + 1}</span>
      <span class="stat">${mission.emoji} ${mission.name}</span>
      <span class="stat">🎓 Misiones ${s.completed.filter(Boolean).length}/6</span>
    `;
    this.show('menu-modal');
  }

  // --- Pausa --------------------------------------------------------------

  showPause() {
    this.hideAllModals();
    this.show('pause-modal');
  }

  // --- Confirmación de reinicio -------------------------------------------

  showRestartConfirm() {
    const choice = confirm(
      '¿Qué quieres hacer?\n\n· "Aceptar" = Reiniciar la misión actual (pierdes el progreso de esta misión, conservas monedas).\n· "Cancelar" = Volver al menú sin reiniciar.'
    );
    if (choice) {
      if (this.handlers.restartCurrent) this.handlers.restartCurrent();
    } else {
      if (this.handlers.toMenu) this.handlers.toMenu();
    }
  }

  // --- Tienda -------------------------------------------------------------

  showShop() {
    this.hideAllModals();
    this.show('shop-modal');
    this.updateShop();
  }

  updateShop() {
    const s = getState();
    this._refs['shop-coins-value'].textContent = s.coins;
    const maxLives = Math.min(5, 3 + s.extraHearts);

    const items = [
      {
        id: 'heart',
        icon: '❤️',
        name: 'Corazón Extra',
        desc: `Añade una vida al inicio de la partida (máx. 5 vidas).`,
        cost: EXTRA_HEART_COST,
        disabled: maxLives >= 5,
        disabledLabel: '¡Máximo alcanzado!',
      },
      {
        id: 'hint',
        icon: '💡',
        name: 'Pista Visual',
        desc: 'Ilumina en dorado la pieza con el verbo correcto durante 15 s.',
        cost: HINT_COST,
        ownedLabel: `${s.pistaVisual} disponibles`,
      },
      {
        id: 'eraser',
        icon: '🧹',
        name: 'Eliminador de Errores',
        desc: 'Toca un bloque incorrecto del tablero para eliminarlo.',
        cost: ERASER_COST,
        ownedLabel: `${s.eraser} disponibles`,
      },
      {
        id: 'multiplier',
        icon: '🚀',
        name: 'Multiplicador Permanente',
        desc: 'Duplica para siempre todas las monedas ganadas.',
        cost: MULTIPLIER_COST,
        owned: s.permanentMultiplier,
        ownedLabel: 'Comprado ✓',
      },
    ];

    this._refs['shop-items'].innerHTML = items
      .map((it) => {
        const owned = !!it.owned || (it.id === 'heart' && it.disabled);
        const costStr = owned ? '' : `${it.cost} 🪙`;
        const label = owned
          ? it.ownedLabel || (it.id === 'heart' ? '¡Máximo!' : '✓')
          : 'Comprar';
        const disabled = owned || s.coins < it.cost;
        return `
          <div class="shop-item ${owned ? 'owned' : ''}">
            <span class="si-icon">${it.icon}</span>
            <div>
              <div class="si-name">${it.name}</div>
              <div class="si-desc">${it.desc}</div>
            </div>
            <span class="si-cost">${costStr}</span>
            <button class="buy-btn" data-buy="${it.id}" ${disabled ? 'disabled' : ''}>${label}</button>
          </div>
        `;
      })
      .join('');

    this._refs['shop-items'].querySelectorAll('.buy-btn:not(:disabled)').forEach((b) => {
      b.addEventListener('click', () => {
        const res = this.handlers.buyItem && this.handlers.buyItem(b.dataset.buy);
        if (res && !res.ok) {
          this.showToast(res.reason === 'coins' ? 'No tienes suficientes monedas 🪙' : 'No disponible', null, 'bad');
        } else if (res && res.ok) {
          this.showToast('¡Mejora comprada!', null, 'good');
        }
        this.updateShop();
        if (this.handlers.onPurchase) this.handlers.onPurchase();
      });
    });
  }

  // --- Mapa de misiones ---------------------------------------------------

  showMap() {
    this.hideAllModals();
    this.show('map-modal');
    const s = getState();
    const html = MISSIONS.map((m, i) => {
      const completed = s.completed[i];
      const current = i === s.currentMission && !completed;
      const unlocked = i < s.unlocked;
      let badge = '🔒';
      if (completed) badge = '⭐';
      else if (current) badge = '▶️';
      else if (unlocked) badge = '📖';

      let status = 'Bloqueada';
      if (completed) status = 'Completada';
      else if (current) status = 'Misión actual';
      else if (unlocked) status = 'Disponible';

      return `
        <div class="map-node ${completed ? 'completed' : ''} ${current ? 'current' : ''} ${unlocked ? '' : 'locked'}"
             data-mission="${i}">
          <span class="mn-emoji">${m.emoji}</span>
          <div class="mn-info">
            <div class="mn-name">${i + 1}. ${m.name}</div>
            <div class="mn-status">${status}</div>
          </div>
          <span class="mn-badge">${badge}</span>
        </div>
      `;
    }).join('');

    this._refs['map-timeline'].innerHTML = html;
    this._refs['map-timeline'].querySelectorAll('.map-node:not(.locked)').forEach((node) => {
      node.addEventListener('click', () => {
        const idx = parseInt(node.dataset.mission, 10);
        this.hideAllModals();
        if (this.handlers.playMission) this.handlers.playMission(idx);
      });
    });
  }

  // --- Temas --------------------------------------------------------------

  showThemes() {
    this.hideAllModals();
    this.show('theme-modal');
    const s = getState();
    this._refs['theme-list'].innerHTML = Object.keys(THEMES)
      .map((name) => {
        const unlocked = s.themesUnlocked.includes(name);
        const label = THEME_LABELS[name] || name;
        if (!unlocked) {
          return `
            <div class="shop-item">
              <span class="si-icon">🔒</span>
              <div>
                <div class="si-name">${label}</div>
                <div class="si-desc">Desbloquea este tema completando una misión.</div>
              </div>
            </div>
          `;
        }
        return `
          <button class="shop-item theme-btn ${s.activeTheme === name ? 'active' : ''}" data-theme="${name}" style="width:100%;text-align:left;background:transparent;border:1px solid var(--line);color:var(--text);cursor:pointer;padding:12px;border-radius:12px;display:flex;align-items:center;gap:12px;">
            <span class="si-icon">🎨</span>
            <div class="si-name">${label} ${s.activeTheme === name ? '(activo)' : ''}</div>
          </button>
        `;
      })
      .join('');
    this._refs['theme-list'].querySelectorAll('.theme-btn').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.handlers.setTheme) this.handlers.setTheme(b.dataset.theme);
        this.showThemes();
      });
    });
  }

  // --- Misión cumplida ----------------------------------------------------

  showMissionComplete(data) {
    this.hideAllModals();
    this._refs['complete-mission-name'].textContent = `${data.mission.emoji} Misión ${data.mission.id}: ${data.mission.name}`;
    let rewardText = 'Has ganado 50 monedas extra 🪙';
    if (data.unlockedTheme) {
      const label = THEME_LABELS[data.unlockedTheme] || data.unlockedTheme;
      rewardText += `<br>🎨 Tema "${label}" desbloqueado`;
    }
    if (data.zenUnlocked) rewardText += `<br>🐢 Modo Zen desbloqueado (caída más lenta)`;
    this._refs['complete-reward'].innerHTML = rewardText;
    this._refs['complete-actions'].innerHTML = data.isLast
      ? `<button id="btn-complete-menu" class="big-btn primary">🏠 Volver al inicio</button>`
      : `<div class="menu-buttons">
          <button id="btn-complete-next" class="big-btn primary">▶️ Siguiente misión</button>
          <button id="btn-complete-map" class="big-btn">🗺️ Mapa</button>
         </div>`;
    this.show('complete-modal');
    const nextBtn = document.getElementById('btn-complete-next');
    if (nextBtn) nextBtn.addEventListener('click', () => this.handlers.nextMission && this.handlers.nextMission());
    const mapBtn = document.getElementById('btn-complete-map');
    if (mapBtn) mapBtn.addEventListener('click', () => { this.hideAllModals(); this.showMap(); });
    const menuBtn = document.getElementById('btn-complete-menu');
    if (menuBtn) menuBtn.addEventListener('click', () => this.handlers.toMenu && this.handlers.toMenu());
  }

  // --- Fin de partida -----------------------------------------------------

  showGameOver(mission) {
    this.hideAllModals();
    this._refs['gameover-mission'].textContent = `No completaste la misión "${mission.name}".`;
    this.show('gameover-modal');
  }
}
