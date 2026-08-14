// ============================================================================
//  MAIN (Punto de entrada: inicializa el juego, el bucle de animación y
//  conecta todos los módulos)
//  ----------------------------------------------------------------------------
//  Orquesta el estado de la partida (menú / jugando / pausa / fin), el bucle
//  de animación, la entrada de teclado y ratón, y une el tablero (board), las
//  piezas (pieces), el renderizado (renderer) y la interfaz HTML (interface).
// ============================================================================

import { Board, COLS, ROWS } from './game/board.js';
import { generatePiece } from './game/pieces.js';
import { Renderer } from './ui/renderer.js';
import { Interface } from './ui/interface.js';
import { sound } from './system/sound.js';
import {
  loadState,
  getState,
  saveState,
  addCoins,
  addXP,
  getLevel,
  getCoinMultiplier,
  getMaxLives,
  buyUpgrade,
  setActiveTheme,
  setMuted,
  resetAllState,
  COINS_PER_ROW,
  COMBO_BONUS,
} from './system/state.js';
import {
  MISSIONS,
} from './config/phrases.js';
import {
  startMission,
  getCurrentMission,
  getCurrentPhraseData,
  getPhraseNumber,
  getHighlightColumn,
  isLastPhrase,
  advancePhrase,
  completeMission,
  PHRASES_PER_MISSION,
} from './system/progression.js';

// --- Elementos del DOM ------------------------------------------------------

const canvas = document.getElementById('board');
const nextCanvas = document.getElementById('next');

// --- Módulos principales ----------------------------------------------------

const renderer = new Renderer(canvas, nextCanvas);
const ui = new Interface();

// --- Estado transitorio de la partida ---------------------------------------

let mode = 'menu'; // 'menu' | 'playing' | 'paused' | 'complete' | 'gameover'
let board = null;
let piece = null;
let nextPiece = null;
let lives = 0;
let highlightCol = 0;

// Temporizadores y efectos
let fallAccum = 0;
let fallInterval = 900;
let lastTime = 0;
let pistaActive = false;
let pistaTimer = 0;
let eraserActive = false;
let shake = 0;
let flash = { rows: [], t: 0, duration: 400 };
let speedBonusTimer = 0;

// ============================================================================
//  UTILIDADES
// ============================================================================

function collectHUD() {
  return {
    coins: getState().coins,
    level: getLevel(),
    mission: getCurrentMission(),
    phrase: getCurrentPhraseData().sentence,
    phraseNum: getPhraseNumber(),
    maxPhrases: PHRASES_PER_MISSION,
    lives,
    maxLives: getMaxLives(),
    hintUses: getState().pistaVisual,
    eraserUses: getState().eraser,
    activeTheme: getState().activeTheme,
    muted: getState().muted,
  };
}

function recomputeFallInterval() {
  let base = Math.max(180, 950 - (getLevel() - 1) * 65);
  if (speedBonusTimer > 0) base += 220; // reducción temporal de velocidad
  fallInterval = base;
}

// ============================================================================
//  FLUJO DE PARTIDA
// ============================================================================

function startMissionRun(missionIdx, speedBonus) {
  startMission(missionIdx);
  speedBonusTimer = speedBonus ? 20000 : 0;
  board = new Board();
  lives = getMaxLives();
  pistaActive = false;
  pistaTimer = 0;
  eraserActive = false;
  shake = 0;
  flash = { rows: [], t: 0, duration: 400 };
  fallAccum = 0;
  recomputeFallInterval();
  mode = 'playing';
  ui.hideAllModals();
  spawnPiece();
  ui.updateHUD(collectHUD());
}

// Genera la pieza actual y la siguiente, para la frase vigente
function spawnPiece() {
  highlightCol = getHighlightColumn();
  const phrase = getCurrentPhraseData();
  piece = generatePiece(phrase, getState().activeTheme);
  nextPiece = generatePiece(phrase, getState().activeTheme);
  if (board.collides(piece)) {
    triggerGameOver();
    return;
  }
  ui.updateHUD(collectHUD());
}

// Baja la pieza un paso; si no puede, la bloquea y evalúa la jugada
function step() {
  if (!board.tryMove(piece, 0, 1)) {
    lockPiece();
  }
}

function hardDrop() {
  while (board.tryMove(piece, 0, 1)) {
    /* caída libre */
  }
  fallAccum = 0;
  lockPiece();
}

function lockPiece() {
  sound.lock();
  const { placed, outcome } = board.lockAndEvaluate(piece, highlightCol);

  if (outcome === 'correct') {
    const keepGoing = handleCorrect(placed);
    if (!keepGoing) return; // misión cumplida: se detiene la partida
  } else if (outcome === 'wrong') {
    handleWrong();
    if (lives <= 0) return;
  }

  if (board.topOut) {
    triggerGameOver();
    return;
  }
  spawnPiece();
}

// --- Acierto ---------------------------------------------------------------

function handleCorrect(placed) {
  const completedPhrase = getCurrentPhraseData();

  // Filas a eliminar (fila de la respuesta + filas llenas por apilamiento)
  const clearList = board.computeClearRows(placed, 'correct', highlightCol);

  // Capturamos las celdas antes de borrarlas para generar las partículas
  const clearedCells = [];
  clearList.forEach((r) => {
    for (let c = 0; c < COLS; c++) {
      if (board.grid[r][c]) {
        clearedCells.push({ col: c, row: r, color: board.grid[r][c].color });
      }
    }
  });

  const count = board.clearRows(clearList);
  clearedCells.forEach((cc) => renderer.spawnParticles(cc.col, cc.row, cc.color));
  flash = { rows: clearList, t: 0, duration: 400 };

  // Monedas (base + bono por combo, multiplicado por nivel / mejoras)
  const mult = getCoinMultiplier();
  let coinsGain = count * COINS_PER_ROW + (count >= 2 ? COMBO_BONUS : 0);
  coinsGain = Math.round(coinsGain * mult);
  addCoins(coinsGain);

  // Sonido
  if (count >= 2) sound.combo();
  else sound.correct();
  if (coinsGain > 0) sound.coin();

  // Experiencia y nivel
  const levelBefore = getLevel();
  addXP(1);
  if (getLevel() > levelBefore) {
    sound.levelUp();
    recomputeFallInterval();
  }

  // Mensaje con la pista en ruso (2 s)
  const comboText = count >= 2 ? ` (¡combo x${count}!)` : '';
  ui.showToast(
    `¡Muy bien! ✓ +${coinsGain} 🪙${comboText}`,
    completedPhrase.hint,
    'good'
  );

  // ¿Era la última frase de la misión?
  if (isLastPhrase()) {
    advancePhrase();
    const result = completeMission();
    sound.missionComplete();
    ui.updateHUD(collectHUD());
    mode = 'complete';
    ui.showMissionComplete(result);
    return false; // no continuar con la pieza actual
  }

  advancePhrase();
  ui.updateHUD(collectHUD());
  return true;
}

// --- Error -----------------------------------------------------------------

function handleWrong() {
  lives -= 1;
  shake = 1;
  sound.wrong();
  ui.showToast(
    `¡Error! Pierdes una vida 💔`,
    getCurrentPhraseData().hint,
    'bad'
  );
  ui.updateLives(lives, getMaxLives());

  if (lives <= 0) {
    triggerGameOver();
  }
}

function triggerGameOver() {
  sound.gameOver();
  mode = 'gameover';
  ui.updateHUD(collectHUD());
  ui.showGameOver(getCurrentMission());
}

// ============================================================================
//  PAUSA / MENÚ / ACCIONES
// ============================================================================

function togglePause() {
  if (mode === 'playing') {
    mode = 'paused';
    ui.showPause();
  } else if (mode === 'paused') {
    resume();
  }
}

function resume() {
  if (mode !== 'paused') return;
  mode = 'playing';
  lastTime = 0;
  fallAccum = 0;
  ui.hideAllModals();
}

function toMenu() {
  mode = 'menu';
  ui.hideAllModals();
  ui.showMenu();
}

function play() {
  const s = getState();
  let idx = s.currentMission;
  // Si la misión actual ya está completa, avanzamos a la siguiente disponible
  if (s.completed[idx] && idx < MISSIONS.length - 1 && s.unlocked > idx) {
    idx = idx + 1;
  }
  startMissionRun(idx, false);
}

function openShop() {
  if (mode === 'playing') mode = 'paused'; // la tienda no está disponible en partida activa
  ui.showShop();
}

function openMap() {
  if (mode === 'playing') mode = 'paused';
  ui.showMap();
}

function playMission(idx) {
  const s = getState();
  if (idx < s.unlocked) {
    startMissionRun(idx, false);
  }
}

function nextMission() {
  const s = getState();
  const prev = MISSIONS[s.currentMission];
  const nextIdx = s.currentMission + 1;
  const withSpeedBonus = prev.reward && prev.reward.speedBonus;
  if (nextIdx < MISSIONS.length) {
    startMissionRun(nextIdx, withSpeedBonus);
  } else {
    toMenu();
  }
}

function retry() {
  startMissionRun(getState().currentMission, false);
}

function restartCurrent() {
  startMissionRun(getState().currentMission, false);
}

function useHint() {
  const s = getState();
  if (s.pistaVisual > 0) {
    s.pistaVisual -= 1;
    saveState();
    pistaActive = true;
    pistaTimer = 15000; // 15 segundos
    sound.buy();
    ui.showToast('Pista visual activa (15 s) 💡', null, 'info');
    ui.updateHUD(collectHUD());
  } else {
    ui.showToast('No tienes pistas. Cómpralas en la tienda 🛒', null, 'bad');
  }
}

function useEraser() {
  const s = getState();
  if (s.eraser > 0) {
    s.eraser -= 1;
    saveState();
    eraserActive = true;
    sound.buy();
    ui.showToast('Haz clic en un bloque incorrecto para borrarlo 🧹', null, 'info');
    ui.updateHUD(collectHUD());
  } else {
    ui.showToast('No tienes eliminadores. Cómpralos en la tienda 🛒', null, 'bad');
  }
}

function buyItem(id) {
  const res = buyUpgrade(id);
  if (res.ok) sound.buy();
  ui.updateHUD(collectHUD());
  return res;
}

function setTheme(name) {
  setActiveTheme(name);
  ui.updateHUD(collectHUD());
}

function toggleMute() {
  const s = getState();
  setMuted(!s.muted);
  sound.setMuted(s.muted);
  ui.updateHUD(collectHUD());
}

function resetSave() {
  resetAllState();
  sound.setMuted(false);
  mode = 'menu';
  ui.hideAllModals();
  ui.showMenu();
}

// Manejo de la tecla Escape según los modales abiertos
function onEscape() {
  const openModals = [...document.querySelectorAll('.modal')].filter(
    (m) => !m.classList.contains('hidden')
  );
  const ids = openModals.map((m) => m.id);

  if (mode === 'playing') {
    togglePause();
    return;
  }
  if (ids.includes('shop-modal') || ids.includes('map-modal') || ids.includes('theme-modal')) {
    ui.hideAllModals();
    if (mode === 'paused') ui.showPause();
    else ui.showMenu();
    return;
  }
  if (ids.includes('pause-modal')) {
    resume();
    return;
  }
}

// ============================================================================
//  ENTRADA
// ============================================================================

document.addEventListener('keydown', (e) => {
  if (mode !== 'playing') return;

  switch (e.key) {
    case 'ArrowLeft':
      if (board.tryMove(piece, -1, 0)) sound.move();
      e.preventDefault();
      break;
    case 'ArrowRight':
      if (board.tryMove(piece, 1, 0)) sound.move();
      e.preventDefault();
      break;
    case 'ArrowUp':
    case 'x':
    case 'X':
      board.rotate(piece);
      sound.move();
      e.preventDefault();
      break;
    case 'ArrowDown':
      if (board.tryMove(piece, 0, 1)) fallAccum = 0;
      e.preventDefault();
      break;
    case ' ':
      hardDrop();
      e.preventDefault();
      break;
    case 'm':
    case 'M':
      toggleMute();
      break;
  }
});

// Eliminador de Errores: clic sobre un bloque del tablero
canvas.addEventListener('click', (e) => {
  if (mode !== 'playing' || !eraserActive) return;
  const rect = canvas.getBoundingClientRect();
  const cs = renderer.getCellSize();
  const col = Math.floor((e.clientX - rect.left) / cs);
  const row = Math.floor((e.clientY - rect.top) / cs);
  if (board.removeCell(col, row)) {
    eraserActive = false;
    sound.lock();
    ui.updateHUD(collectHUD());
  }
});

// ============================================================================
//  BUCLE DE ANIMACIÓN
// ============================================================================

function loop(ts) {
  requestAnimationFrame(loop);
  if (!lastTime) lastTime = ts;
  const dt = Math.min(ts - lastTime, 100);
  lastTime = ts;

  // Actualizar partículas y efectos
  renderer.updateParticles();
  if (pistaActive) {
    pistaTimer -= dt;
    if (pistaTimer <= 0) pistaActive = false;
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 0.004);
  if (speedBonusTimer > 0) speedBonusTimer -= dt;
  if (flash.t > 0) {
    flash.t += dt;
    if (flash.t >= flash.duration) flash = { rows: [], t: 0, duration: 400 };
  }

  // Gravedad
  if (mode === 'playing') {
    recomputeFallInterval();
    fallAccum += dt;
    while (fallAccum >= fallInterval) {
      fallAccum -= fallInterval;
      step();
      if (mode !== 'playing') break;
    }
  }

  render();
}

function render() {
  const view = {
    board,
    piece: mode === 'playing' || mode === 'paused' ? piece : null,
    highlightColumn: highlightCol,
    flash,
    shake,
    pistaActive,
    gameOver: mode === 'gameover',
    dim: mode === 'complete' || mode === 'gameover',
  };
  renderer.draw(view);
  renderer.drawNext(nextPiece);
}

// ============================================================================
//  INICIALIZACIÓN
// ============================================================================

function init() {
  loadState();
  sound.setMuted(getState().muted);

  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());

  ui.init({
    play,
    resume,
    togglePause,
    openShop,
    openMap,
    playMission,
    nextMission,
    retry,
    restartCurrent,
    toMenu,
    useHint,
    useEraser,
    buyItem,
    setTheme,
    toggleMute,
    resetSave,
    onEscape,
    onPurchase: () => ui.updateHUD(collectHUD()),
  });

  mode = 'menu';
  ui.showMenu();

  // Empezamos el bucle
  requestAnimationFrame(loop);
}

init();
