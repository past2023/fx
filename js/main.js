import { loadAssets } from './assetLoader.js';
import Game from './game.js';

/** Bootstraps the game after the HTML module graph and future assets are available. */
async function boot() {
  try {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) throw new Error('Missing #gameCanvas in index.html.');
    const assets = await loadAssets();
    const game = new Game(canvas, assets);
    game.start();
    window.addEventListener('beforeunload', () => game.stop(), { once: true });
    window.starfallGame = game;
  } catch (error) {
    console.error('[boot] Starfall could not start:', error);
    const message = document.createElement('p');
    message.className = 'boot-error';
    message.textContent = `Unable to start Starfall: ${error.message}`;
    document.body.append(message);
  }
}

boot();
