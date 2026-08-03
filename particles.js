/**
 * particles.js - Particle system and explosion effects
 * Uses object pooling for performance.
 */

(function() {
    'use strict';

    class Particle {
        constructor() {
            this.active = false;
            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.life = 0;
            this.maxLife = 0;
            this.size = 0;
            this.color = '#ffffff';
            this.type = 'circle'; // circle, spark, debris
            this.friction = 0.98;
            this.sprite = null; // For future sprite replacement
        }

        init(x, y, vx, vy, life, size, color, type) {
            this.active = true;
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.life = life;
            this.maxLife = life;
            this.size = size;
            this.color = color;
            this.type = type || 'circle';
            this.friction = type === 'debris' ? 0.96 : 0.98;
        }

        update(dt) {
            if (!this.active) return;

            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.life -= dt;

            if (this.life <= 0) {
                this.active = false;
            }
        }

        render(ctx) {
            if (!this.active) return;

            // TODO: Replace with sprite image
            if (this.sprite) {
                ctx.drawImage(this.sprite, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                return;
            }

            const alpha = Math.max(0, this.life / this.maxLife);
            ctx.globalAlpha = alpha;

            if (this.type === 'spark') {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.size * 0.5;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x - this.vx * 0.02, this.y - this.vy * 0.02);
                ctx.stroke();
            } else if (this.type === 'debris') {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
            } else {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
        }
    }

    class ParticleSystem {
        constructor() {
            this.pool = [];
            this.activeCount = 0;

            // Pre-allocate pool
            for (let i = 0; i < GAME_CONSTANTS.MAX_PARTICLES; i++) {
                this.pool.push(new Particle());
            }
        }

        /**
         * Get inactive particle from pool
         */
        _getParticle() {
            for (let i = 0; i < this.pool.length; i++) {
                if (!this.pool[i].active) {
                    return this.pool[i];
                }
            }
            return null; // Pool exhausted
        }

        /**
         * Emit a single particle
         */
        emit(x, y, vx, vy, life, size, color, type) {
            const p = this._getParticle();
            if (p) {
                p.init(x, y, vx, vy, life, size, color, type);
                this.activeCount++;
            }
        }

        /**
         * Create explosion effect
         */
        explosion(x, y, count, color1, color2, size, speed, life) {
            count = count || GAME_CONSTANTS.EXPLOSION_PARTICLES;
            color1 = color1 || '#ffaa00';
            color2 = color2 || '#ff4400';
            size = size || 6;
            speed = speed || 200;
            life = life || 0.5;

            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
                const vel = speed * (0.5 + Math.random() * 0.5);
                const vx = Math.cos(angle) * vel;
                const vy = Math.sin(angle) * vel;
                const color = Math.random() > 0.5 ? color1 : color2;
                const type = Math.random() > 0.7 ? 'spark' : 'circle';
                const pSize = size * (0.5 + Math.random() * 0.5);

                this.emit(x, y, vx, vy, life, pSize, color, type);
            }
        }

        /**
         * Create debris field
         */
        debris(x, y, count, color) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const vel = 100 + Math.random() * 150;
                const vx = Math.cos(angle) * vel;
                const vy = Math.sin(angle) * vel;
                const size = 3 + Math.random() * 5;
                const life = GAME_CONSTANTS.DEBRIS_LIFETIME * (0.7 + Math.random() * 0.3);

                this.emit(x, y, vx, vy, life, size, color, 'debris');
            }
        }

        /**
         * Small hit spark
         */
        hitSpark(x, y, color) {
            this.explosion(x, y, 5, color || '#ffffff', '#ffcc00', 3, 100, 0.2);
        }

        update(dt) {
            this.activeCount = 0;
            for (let i = 0; i < this.pool.length; i++) {
                if (this.pool[i].active) {
                    this.pool[i].update(dt);
                    if (this.pool[i].active) {
                        this.activeCount++;
                    }
                }
            }
        }

        render(ctx) {
            for (let i = 0; i < this.pool.length; i++) {
                this.pool[i].render(ctx);
            }
        }

        clear() {
            for (let i = 0; i < this.pool.length; i++) {
                this.pool[i].active = false;
            }
            this.activeCount = 0;
        }
    }

    window.Particle = Particle;
    window.ParticleSystem = ParticleSystem;
})();
