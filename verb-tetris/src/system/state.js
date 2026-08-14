// ============================================================================
//  SYSTEM / STATE (Estado global + persistencia en localStorage)
//  ----------------------------------------------------------------------------
//  Gestiona todo el progreso del jugador (monedas, vidas, nivel, mejoras,
//  misiones completadas, tema activo...) y lo guarda automáticamente en el
//  localStorage del navegador para que no se pierda al recargar la página.
// ============================================================================

export const SAVE_KEY = 'verbTetrisSave_v1';

// Constantes de juego
export const BASE_LIVES = 3; // vidas iniciales
export const MAX_LIVES = 5; // máximo de corazones (con mejoras)
export const COINS_PER_ROW = 10; // monedas por fila eliminada correctamente
export const COMBO_BONUS = 25; // bono por eliminar 2 filas a la vez
export const MISSION_BONUS = 50; // bono por misión cumplida
export const COINS_PER_LEVEL = 10; // XP necesaria para subir un nivel
export const EXTRA_HEART_COST = 50;
export const HINT_COST = 30;
export const ERASER_COST = 40;
export const MULTIPLIER_COST = 100;

// Objeto de estado por defecto
function defaultState() {
  return {
    coins: 0,
    xp: 0,
    currentMission: 0, // índice de la misión actual (0-5)
    currentPhrase: 0, // índice de la frase dentro de la misión (0-9)
    completed: [false, false, false, false, false, false],
    unlocked: 1, // cuántas misiones están desbloqueadas (empieza en 1)
    extraHearts: 0, // corazones extra comprados (máx. 2 -> total 5)
    permanentMultiplier: false, // multiplicador permanente (x2)
    pistaVisual: 0, // usos disponibles de la Pista Visual
    eraser: 0, // usos disponibles del Eliminador de Errores
    zen: false, // modo Zen desbloqueado (reduce velocidad de caída)
    themesUnlocked: ['default'],
    activeTheme: 'default',
    muted: false,
  };
}

let state = null;

// --- Carga / guardado -------------------------------------------------------

export function loadState() {
  state = defaultState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Mezclamos con los valores por defecto para tolerar versiones antiguas
      state = Object.assign(defaultState(), parsed);
    }
  } catch (e) {
    // Si el guardado está corrupto, empezamos de cero
    console.warn('No se pudo leer el guardado. Empezando de nuevo.', e);
    state = defaultState();
  }
  return state;
}

export function saveState() {
  if (!state) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar el progreso.', e);
  }
}

export function resetAllState() {
  state = defaultState();
  saveState();
}

export function getState() {
  return state;
}

// --- Monedas ----------------------------------------------------------------

export function addCoins(amount) {
  if (!state) return;
  state.coins = Math.max(0, state.coins + Math.round(amount));
  saveState();
  return state.coins;
}

export function spendCoins(amount) {
  if (!state) return false;
  if (state.coins < amount) return false;
  state.coins -= amount;
  saveState();
  return true;
}

export function getCoinMultiplier() {
  if (!state) return 1;
  let mult = 1;
  mult += (getLevel() - 1) * 0.2; // nivel 1 = x1, nivel 2 = x1.2, ...
  if (state.permanentMultiplier) mult *= 2; // multiplicador permanente
  return mult;
}

// --- Experiencia y nivel ----------------------------------------------------

export function addXP(n = 1) {
  if (!state) return;
  state.xp += n;
  saveState();
}

export function getLevel() {
  if (!state) return 1;
  return Math.floor(state.xp / COINS_PER_LEVEL) + 1;
}

// --- Vidas ------------------------------------------------------------------

export function getMaxLives() {
  return Math.min(MAX_LIVES, BASE_LIVES + (state ? state.extraHearts : 0));
}

// --- Tienda ----------------------------------------------------------------

// Compra una mejora. Devuelve {ok, reason} o {ok:true}
export function buyUpgrade(id) {
  if (!state) return { ok: false, reason: 'no-state' };

  switch (id) {
    case 'heart': {
      if (getMaxLives() >= MAX_LIVES)
        return { ok: false, reason: 'max' }; // ya tienes el máximo
      if (!spendCoins(EXTRA_HEART_COST)) return { ok: false, reason: 'coins' };
      state.extraHearts += 1;
      saveState();
      return { ok: true };
    }
    case 'hint': {
      if (!spendCoins(HINT_COST)) return { ok: false, reason: 'coins' };
      state.pistaVisual += 1;
      saveState();
      return { ok: true };
    }
    case 'eraser': {
      if (!spendCoins(ERASER_COST)) return { ok: false, reason: 'coins' };
      state.eraser += 1;
      saveState();
      return { ok: true };
    }
    case 'multiplier': {
      if (state.permanentMultiplier) return { ok: false, reason: 'owned' };
      if (!spendCoins(MULTIPLIER_COST)) return { ok: false, reason: 'coins' };
      state.permanentMultiplier = true;
      saveState();
      return { ok: true };
    }
    default:
      return { ok: false, reason: 'unknown' };
  }
}

// --- Temas estéticos --------------------------------------------------------

export function unlockTheme(themeName) {
  if (!state) return;
  if (!state.themesUnlocked.includes(themeName)) {
    state.themesUnlocked.push(themeName);
    saveState();
  }
}

export function setActiveTheme(themeName) {
  if (!state) return;
  if (state.themesUnlocked.includes(themeName)) {
    state.activeTheme = themeName;
    saveState();
  }
}

export function setMuted(m) {
  if (!state) return;
  state.muted = !!m;
  saveState();
}
