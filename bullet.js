/**
 * bullet.js - Bullet and enemy bullet classes
 * Uses object pooling for performance.
 */

(function() {
    'use strict';

    // -----------------------------------------------------------
    // Base bullet class
    // -----------------------------------------------------------
    class Bullet {
        constructor() {
            this.active = false;
            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.radius = GAME_CONSTANTS.PLAYER_BULLET_RADIUS;
            this.damage = GAME_CONSTANTS.PLAYER_BULLET_DAMAGE;
            this.isPlayerBullet = true;
            this.sprite = null; // For future sprite replacement
            this.piercing = false;
        }

        init(x, y, vx, vy, isPlayer, radius, damage, piercing) {
            this.active = true;
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.isPlayerBullet = isPlayer;
            this.radius = radius || (isPlayer ? GAME_CONSTANTS.PLAYER_BULLET_RADIUS : GAME_CONSTANTS.ENEMY_BULLET_RADIUS);
            this.damage = damage || (isPlayer ? GAME_CONSTANTS.PLAYER_BULLET_DAMAGE : 1);
            this.piercing = piercing || false;
        }

        update(dt) {
            if (!this.active) return;
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Off-screen check
            if (this.x < -20 || this.x > GAME_CONSTANTS.GAME_WIDTH + 20 ||
                this.y < -20 || this.y > GAME_CONSTANTS.GAME_HEIGHT + 20) {
                this.active = false;
            }
        }

        render(ctx) {
            if (!this.active) return;

            // TODO: Replace with sprite image
            if (this.sprite) {
                ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                return;
            }

            if (this.isPlayerBullet) {
                // Player bullet: yellow pill shape
                ctx.fillStyle = GAME_CONSTANTS.COLOR_BULLET_PLAYER;
                ctx.beginPath();
                const len = this.radius * 3;
                ctx.ellipse(this.x, this.y, len, this.radius, 0, 0, Math.PI * 2);
                ctx.fill();

                // Glow
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(this.x, this.y, len * 0.5, this.radius * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else {
                // Enemy bullet: red sphere with glow
                ctx.fillStyle = GAME_CONSTANTS.COLOR_BULLET_ENEMY;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // Glow
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#ff8888';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        deactivate() {
            this.active = false;
        }
    }

    // -----------------------------------------------------------
    // Bullet pool manager
    // -----------------------------------------------------------
    class BulletPool {
        constructor(size, isPlayerPool) {
            this.pool = [];
            for (let i = 0; i < size; i++) {
                this.pool.push(new Bullet());
            }
            this.isPlayerPool = isPlayerPool;
        }

        /**
         * Get inactive bullet from pool
         */
        get() {
            for (let i = 0; i < this.pool.length; i++) {
                if (!this.pool[i].active) {
                    return this.pool[i];
                }
            }
            return null; // Pool exhausted
        }

        /**
         * Fire a player bullet
         */
        firePlayer(x, y, vx, vy, piercing) {
            const b = this.get();
            if (b) {
                b.init(x, y, vx, vy, true, GAME_CONSTANTS.PLAYER_BULLET_RADIUS,
                    GAME_CONSTANTS.PLAYER_BULLET_DAMAGE, piercing);
                return b;
            }
            return null;
        }

        /**
         * Fire an enemy bullet
         */
        fireEnemy(x, y, vx, vy, radius, damage) {
            const b = this.get();
            if (b) {
                b.init(x, y, vx, vy, false, radius, damage);
                return b;
            }
            return null;
        }

        update(dt) {
            for (let i = 0; i < this.pool.length; i++) {
                if (this.pool[i].active) {
                    this.pool[i].update(dt);
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
        }

        /**
         * Iterate over active bullets (for collision checks)
         */
        forEachActive(callback) {
            for (let i = 0; i < this.pool.length; i++) {
                if (this.pool[i].active) {
                    callback(this.pool[i]);
                }
            }
        }
    }

    window.Bullet = Bullet;
    window.BulletPool = BulletPool;
})();
