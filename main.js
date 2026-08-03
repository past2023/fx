/**
 * main.js - Initialization; creates the Game instance
 * Handles canvas scaling, resize events, and fullscreen.
 */

(function() {
    'use strict';

    // -----------------------------------------------------------
    // AssetLoader stub - will later hold loaded images
    // -----------------------------------------------------------
    const AssetLoader = {
        images: {},
        load: function(name, src) {
            // Stub: will load image and store in this.images[name]
            // const img = new Image();
            // img.src = src;
            // this.images[name] = img;
        },
        get: function(name) {
            return this.images[name] || null;
        }
    };

    // -----------------------------------------------------------
    // Canvas setup and scaling
    // -----------------------------------------------------------
    function setupCanvas() {
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        // Set logical resolution
        canvas.width = GAME_CONSTANTS.GAME_WIDTH;
        canvas.height = GAME_CONSTANTS.GAME_HEIGHT;

        // Scale to fit window while preserving aspect ratio
        function resize() {
            const windowW = window.innerWidth;
            const windowH = window.innerHeight;
            const gameRatio = GAME_CONSTANTS.GAME_WIDTH / GAME_CONSTANTS.GAME_HEIGHT;
            const windowRatio = windowW / windowH;

            let newW, newH;
            if (windowRatio > gameRatio) {
                // Window is wider than game
                newH = windowH;
                newW = newH * gameRatio;
            } else {
                // Window is taller than game
                newW = windowW;
                newH = newW / gameRatio;
            }

            canvas.style.width = newW + 'px';
            canvas.style.height = newH + 'px';
        }

        window.addEventListener('resize', resize);
        resize();

        // Disable image smoothing for pixel-perfect rendering
        ctx.imageSmoothingEnabled = false;

        return { canvas, ctx };
    }

    // -----------------------------------------------------------
    // Mute button
    // -----------------------------------------------------------
    function setupMuteButton(game) {
        const btn = document.getElementById('muteBtn');
        btn.addEventListener('click', () => {
            game.sound.init();
            const muted = game.sound.toggleMute();
            btn.textContent = muted ? '🔇' : '🔊';
        });
    }

    // -----------------------------------------------------------
    // Fullscreen support
    // -----------------------------------------------------------
    function setupFullscreen() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.log('Fullscreen failed:', err);
                    });
                } else {
                    document.exitFullscreen();
                }
            }
        });
    }

    // -----------------------------------------------------------
    // Initialize and start game
    // -----------------------------------------------------------
    function init() {
        console.log('Bio-Force: Parasite Dawn - Initializing...');

        const { canvas, ctx } = setupCanvas();
        const game = new Game(canvas);

        setupMuteButton(game);
        setupFullscreen();

        // Expose for debugging (optional)
        window.game = game;
        window.AssetLoader = AssetLoader;

        console.log('Starting game loop...');
        game.start();
    }

    // Wait for DOM to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
