/**
 * player.js - Player ship, lives, invincibility
 * Manages player movement, firing, and pod interaction.
 */

(function() {
    'use strict';

    class Player {
        constructor(game) {
            this.game = game;
            this.x = GAME_CONSTANTS.GAME_WIDTH * GAME_CONSTANTS.PLAYER_X_RATIO;
            this.y = GAME_CONSTANTS.PLAYER_START_Y;
            this.vx = 0;
            this.vy = 0;
            this.speed = GAME_CONSTANTS.PLAYER_SPEED;
            this.radius = GAME_CONSTANTS.PLAYER_DRAW_RADIUS;
            this.hitboxRadius = GAME_CONSTANTS.PLAYER_HITBOX;
            
            this.lives = GAME_CONSTANTS.PLAYER_MAX_LIVES;
            this.invincible = false;
            this.invincibleTimer = 0;
            this.alive = true;
            
            this.fireTimer = 0;
            this.fireRate = GAME_CONSTANTS.PLAYER_FIRE_RATE;
            
            this.pod = new ForcePod();
            this.pod.attach(this.x, this.y);
            
            this.sprite = null; // For future sprite replacement
            this.thrusterPhase = 0;
            this.flickerPhase = 0;
        }

        /**
         * Reset player to initial state
         */
        reset() {
            this.x = GAME_CONSTANTS.GAME_WIDTH * GAME_CONSTANTS.PLAYER_X_RATIO;
            this.y = GAME_CONSTANTS.PLAYER_START_Y;
            this.vx = 0;
            this.vy = 0;
            this.lives = GAME_CONSTANTS.PLAYER_MAX_LIVES;
            this.invincible = false;
            this.invincibleTimer = 0;
            this.alive = true;
            this.fireTimer = 0;
            this.pod.reset();
            this.pod.attach(this.x, this.y);
        }

        /**
         * Respawn after death
         */
        respawn() {
            this.x = GAME_CONSTANTS.GAME_WIDTH * GAME_CONSTANTS.PLAYER_X_RATIO;
            this.y = GAME_CONSTANTS.PLAYER_START_Y;
            this.alive = true;
            this.invincible = true;
            this.invincibleTimer = GAME_CONSTANTS.PLAYER_INVINCIBLE_TIME;
            this.pod.reset();
            this.pod.attach(this.x, this.y);
        }

        update(dt, input) {
            if (!this.alive) return;

            // Movement
            const move = input.getMovement();
            this.x += move.x * this.speed * dt;
            this.y += move.y * this.speed * dt;

            // Clamp to screen bounds
            this.x = Math.max(this.radius, Math.min(GAME_CONSTANTS.GAME_WIDTH * 0.45, this.x));
            this.y = Math.max(this.radius, Math.min(GAME_CONSTANTS.GAME_HEIGHT - this.radius, this.y));

            // Invincibility timer
            if (this.invincible) {
                this.invincibleTimer -= dt;
                this.flickerPhase += dt * 20;
                if (this.invincibleTimer <= 0) {
                    this.invincible = false;
                }
            }

            // Firing
            this.fireTimer -= dt;
            if (input.isFiring() && this.fireTimer <= 0) {
                this.fire();
                this.fireTimer = this.fireRate;
            }

            // Pod action (detach/recall)
            if (input.wasPodAction()) {
                if (this.pod.state === POD_STATE.ATTACHED) {
                    this.pod.detach(this.x, this.y);
                    this.game.sound.podDetach();
                } else {
                    this.pod.recall(this.x, this.y);
                    this.game.sound.podAttach();
                }
            }

            // Update pod
            this.pod.update(dt, this.x, this.y);

            // Thruster animation
            this.thrusterPhase += dt * 15;
        }

        /**
         * Fire bullets based on pod power level and state
         */
        fire() {
            const bulletPool = this.game.bullets.playerPool;
            
            if (this.pod.state === POD_STATE.ATTACHED) {
                // Fire from pod position
                const fireX = this.pod.x + this.pod.radius;
                const fireY = this.pod.y;
                
                if (this.pod.powerLevel === 0) {
                    // Single shot
                    bulletPool.firePlayer(fireX, fireY, GAME_CONSTANTS.PLAYER_BULLET_SPEED, 0);
                } else if (this.pod.powerLevel === 1) {
                    // Double shot (spread vertically)
                    bulletPool.firePlayer(fireX, fireY - 6, GAME_CONSTANTS.PLAYER_BULLET_SPEED, 0);
                    bulletPool.firePlayer(fireX, fireY + 6, GAME_CONSTANTS.PLAYER_BULLET_SPEED, 0);
                } else {
                    // Triple spread
                    bulletPool.firePlayer(fireX, fireY, GAME_CONSTANTS.PLAYER_BULLET_SPEED, 0);
                    bulletPool.firePlayer(fireX, fireY, GAME_CONSTANTS.PLAYER_BULLET_SPEED * 0.95, -80);
                    bulletPool.firePlayer(fireX, fireY, GAME_CONSTANTS.PLAYER_BULLET_SPEED * 0.95, 80);
                }
            } else {
                // Fire from ship when pod is detached
                bulletPool.firePlayer(this.x + this.radius, this.y, GAME_CONSTANTS.PLAYER_BULLET_SPEED, 0);
            }
            
            this.game.sound.laser();
        }

        /**
         * Take damage (called on collision)
         */
        takeDamage() {
            if (this.invincible || !this.alive) return false;
            
            this.lives--;
            this.alive = false;
            this.game.sound.playerDeath();
            
            // Big explosion
            this.game.particles.explosion(this.x, this.y, 30, 
                GAME_CONSTANTS.COLOR_PLAYER, '#ffffff', 8, 300, 0.8);
            this.game.particles.debris(this.x, this.y, 10, GAME_CONSTANTS.COLOR_PLAYER_DIM);
            
            if (this.lives > 0) {
                // Schedule respawn
                setTimeout(() => {
                    this.respawn();
                }, 1500);
            }
            
            return true;
        }

        /**
         * Check collision with enemy bullets
         */
        checkBulletCollision(bullet) {
            if (!this.alive || this.invincible) return false;
            
            const dx = bullet.x - this.x;
            const dy = bullet.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            return dist < (this.hitboxRadius + bullet.radius);
        }

        /**
         * Check collision with enemy (body)
         */
        checkEnemyCollision(enemy) {
            if (!this.alive || this.invincible) return false;
            
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            return dist < (this.hitboxRadius + enemy.radius);
        }

        render(ctx) {
            if (!this.alive) return;

            // TODO: Replace with sprite image
            if (this.sprite) {
                ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                return;
            }

            // Flicker when invincible
            if (this.invincible && Math.sin(this.flickerPhase) > 0) {
                return;
            }

            // Draw thruster flame
            const thrusterLen = 10 + Math.sin(this.thrusterPhase) * 4;
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius, this.y);
            ctx.lineTo(this.x - this.radius - thrusterLen, this.y - 4);
            ctx.lineTo(this.x - this.radius - thrusterLen - 3, this.y);
            ctx.lineTo(this.x - this.radius - thrusterLen, this.y + 4);
            ctx.closePath();
            ctx.fill();

            // Main ship body (cyan triangle)
            ctx.fillStyle = GAME_CONSTANTS.COLOR_PLAYER;
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x - this.radius * 0.7, this.y - this.radius * 0.6);
            ctx.lineTo(this.x - this.radius * 0.5, this.y);
            ctx.lineTo(this.x - this.radius * 0.7, this.y + this.radius * 0.6);
            ctx.closePath();
            ctx.fill();

            // Cockpit highlight
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x + 2, this.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Ship outline
            ctx.strokeStyle = GAME_CONSTANTS.COLOR_PLAYER_DIM;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x - this.radius * 0.7, this.y - this.radius * 0.6);
            ctx.lineTo(this.x - this.radius * 0.5, this.y);
            ctx.lineTo(this.x - this.radius * 0.7, this.y + this.radius * 0.6);
            ctx.closePath();
            ctx.stroke();

            // Render pod
            this.pod.render(ctx);
        }
    }

    window.Player = Player;
})();
