// ============================================================================
//  SYSTEM / PROGRESSION (Progresión por misiones)
//  ----------------------------------------------------------------------------
//  Maneja el avance de frase en frase, la finalización de misiones, el
//  desbloqueo de la siguiente misión y las recompensas automáticas (bonus de
//  monedas, temas estéticos, reducción temporal de velocidad, consumibles).
// ============================================================================

import { MISSIONS } from '../config/phrases.js';
import {
  getState,
  addCoins,
  unlockTheme,
  saveState,
  MISSION_BONUS,
} from './state.js';

export const PHRASES_PER_MISSION = 10; // frases exactas por misión

// Número de frase actual (1-10)
export function getPhraseNumber() {
  const s = getState();
  return Math.min(s.currentPhrase + 1, PHRASES_PER_MISSION);
}

export function getCurrentMission() {
  const s = getState();
  return MISSIONS[s.currentMission] || MISSIONS[0];
}

export function getCurrentPhraseData() {
  const s = getState();
  const mission = getCurrentMission();
  return mission.phrases[s.currentPhrase] || mission.phrases[0];
}

// Devuelve la columna resaltada (0-3) para la frase actual
export function getHighlightColumn() {
  return getCurrentPhraseData().column - 1; // 1-4 -> 0-3
}

// ¿La frase actual ya es la última de la misión?
export function isLastPhrase() {
  const s = getState();
  return s.currentPhrase >= PHRASES_PER_MISSION - 1;
}

// Inicia (o reinicia) una misión por su índice. Conserva monedas y mejoras.
export function startMission(index) {
  const s = getState();
  s.currentMission = index;
  s.currentPhrase = 0;
  saveState();
}

// Avanza a la siguiente frase tras un acierto. Devuelve true si era la última.
export function advancePhrase() {
  const s = getState();
  s.currentPhrase += 1;
  saveState();
  return s.currentPhrase >= PHRASES_PER_MISSION;
}

// La misión queda cumplida: +50 monedas, desbloquea la siguiente y aplica
// la recompensa automática definida en el banco de frases.
export function completeMission() {
  const s = getState();
  const mission = getCurrentMission();
  const idx = s.currentMission;

  s.completed[idx] = true;

  // Bonus de 50 monedas
  addCoins(MISSION_BONUS);

  // Desbloquear la siguiente misión (si no es la última)
  if (idx < MISSIONS.length - 1 && s.unlocked <= idx + 1) {
    s.unlocked = idx + 2; // +1 ya desbloqueada, +1 nueva
  }

  // Aplicar recompensa automática de la misión
  const r = mission.reward || {};
  if (r.theme) unlockTheme(r.theme);
  if (r.consumable === 'pista') s.pistaVisual += 1;
  if (r.zen) s.zen = true;

  saveState();

  return {
    mission,
    isLast: idx === MISSIONS.length - 1,
    unlockedTheme: r.theme || null,
    zenUnlocked: !!r.zen,
  };
}
