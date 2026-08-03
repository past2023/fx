/**
 * sound.js - Web Audio API procedural sound effects
 * All SFX are generated with oscillators and noise buffers.
 */

(function() {
    'use strict';

    class SoundManager {
        constructor() {
            this.ctx = null;
            this.masterGain = null;
            this.muted = false;
            this._initialized = false;
        }

        /**
         * Must be called after a user gesture to unlock audio context.
         */
        init() {
            if (this._initialized) return;
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = GAME_CONSTANTS.SFX_VOLUME_MASTER;
                this.masterGain.connect(this.ctx.destination);
                this._initialized = true;
            } catch (e) {
                console.warn('Web Audio API not supported');
            }
        }

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            if (this.masterGain) {
                this.masterGain.gain.value = this.muted ? 0 : GAME_CONSTANTS.SFX_VOLUME_MASTER;
            }
            return this.muted;
        }

        // ---- Helper: create an oscillator note ----
        _osc(type, freq, startTime, duration, volume) {
            if (!this._initialized) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume || 0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(startTime + duration);
        }

        // ---- Helper: white noise burst ----
        _noise(startTime, duration, volume) {
            if (!this._initialized) return;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1);
            }
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume || 0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            source.connect(gain);
            gain.connect(this.masterGain);
            source.start(startTime);
            source.stop(startTime + duration);
        }

        // ---- Sound effects ----

        /**
         * Player laser shot
         */
        laser() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.1);
        }

        /**
         * Small explosion (enemies)
         */
        explosionSmall() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            this._noise(t, 0.2, 0.25);
            this._osc('sine', 150, t, 0.15, 0.2);
        }

        /**
         * Large explosion (mid-boss, boss)
         */
        explosionLarge() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            this._noise(t, 0.5, 0.35);
            this._osc('sine', 80, t, 0.4, 0.3);
            this._osc('sine', 60, t + 0.1, 0.3, 0.2);
        }

        /**
         * Boss alert siren
         */
        bossAlert() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            for (let i = 0; i < 4; i++) {
                const start = t + i * 0.5;
                this._osc('sawtooth', 300, start, 0.25, 0.15);
                this._osc('sawtooth', 450, start + 0.25, 0.25, 0.15);
            }
        }

        /**
         * Power-up collect
         */
        powerUp() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            this._osc('sine', 523, t, 0.1, 0.2);
            this._osc('sine', 659, t + 0.08, 0.1, 0.2);
            this._osc('sine', 784, t + 0.16, 0.15, 0.25);
        }

        /**
         * Player death
         */
        playerDeath() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            this._noise(t, 0.6, 0.3);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.6);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.6);
        }

        /**
         * Pod detach
         */
        podDetach() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            this._osc('triangle', 600, t, 0.08, 0.15);
            this._osc('triangle', 900, t + 0.05, 0.08, 0.15);
        }

        /**
         * Pod attach
         */
        podAttach() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            this._osc('triangle', 900, t, 0.06, 0.12);
            this._osc('triangle', 600, t + 0.04, 0.06, 0.12);
        }

        /**
         * Boss laser sweep
         */
        bossLaser() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.linearRampToValueAtTime(200, t + 0.3);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.35);
        }

        /**
         * Menu select
         */
        menuSelect() {
            if (!this._initialized) return;
            const t = this.ctx.currentTime;
            this._osc('sine', 880, t, 0.05, 0.2);
        }
    }

    window.SoundManager = SoundManager;
})();
