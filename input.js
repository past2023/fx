/**
 * input.js - Keyboard state manager
 * Tracks which keys are pressed and provides just-pressed detection.
 */

(function() {
    'use strict';

    class InputManager {
        constructor() {
            this.keys = {};
            this.justPressed = {};
            this.prevKeys = {};
            
            this._onKeyDown = this._onKeyDown.bind(this);
            this._onKeyUp = this._onKeyUp.bind(this);
            
            window.addEventListener('keydown', this._onKeyDown);
            window.addEventListener('keyup', this._onKeyUp);
        }
        
        _onKeyDown(e) {
            const key = e.key.toLowerCase();
            if (!this.keys[key]) {
                this.justPressed[key] = true;
            }
            this.keys[key] = true;
            
            // Prevent default for game keys
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'z', 'x'].includes(key)) {
                e.preventDefault();
            }
        }
        
        _onKeyUp(e) {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
        }
        
        /**
         * Check if key is currently held down
         */
        isDown(key) {
            return !!this.keys[key];
        }
        
        /**
         * Check if key was just pressed this frame (edge-triggered)
         */
        wasPressed(key) {
            return !!this.justPressed[key];
        }
        
        /**
         * Update at end of frame - clears justPressed flags
         */
        update() {
            for (const key in this.justPressed) {
                this.justPressed[key] = false;
            }
        }
        
        /**
         * Movement helper - returns {x, y} normalized vector
         */
        getMovement() {
            let mx = 0, my = 0;
            
            if (this.isDown('arrowleft') || this.isDown('a')) mx -= 1;
            if (this.isDown('arrowright') || this.isDown('d')) mx += 1;
            if (this.isDown('arrowup') || this.isDown('w')) my -= 1;
            if (this.isDown('arrowdown') || this.isDown('s')) my += 1;
            
            // Normalize diagonal movement
            if (mx !== 0 && my !== 0) {
                const len = Math.sqrt(mx * mx + my * my);
                mx /= len;
                my /= len;
            }
            
            return { x: mx, y: my };
        }
        
        /**
         * Check fire button (Z or Space)
         */
        isFiring() {
            return this.isDown('z') || this.isDown(' ');
        }
        
        /**
         * Check pod detach/recall (X) - edge triggered
         */
        wasPodAction() {
            return this.wasPressed('x');
        }
        
        /**
         * Check confirm/enter (for menu)
         */
        wasConfirm() {
            return this.wasPressed(' ') || this.wasPressed('z') || this.wasPressed('enter');
        }
        
        destroy() {
            window.removeEventListener('keydown', this._onKeyDown);
            window.removeEventListener('keyup', this._onKeyUp);
        }
    }
    
    window.InputManager = InputManager;
})();
