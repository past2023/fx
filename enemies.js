/**
 * enemies.js - All regular enemy types
 * Drone, turret, swarm, mid-boss (worm), and power-up carrier.
 */

(function() {
    'use strict';

    // -----------------------------------------------------------
    // Base Enemy class
    // -----------------------------------------------------------
    class Enemy {
        constructor() {
            this.active = false;
            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.hp = 1;
            this.maxHp = 1;
            this.radius = 16;
            this.score = 100;
            this.fireTimer = 0;
            this.fireRate = 2;
            this.type = 'generic';
            this.sprite = null; // For future sprite replacement
            this.phase = 0;     // For animation / sine waves
        }

        init(x, y) {
            this.active = true;
            this.x = x;
            this.y = y;
        }

        update(dt, game) {
            // Override in subclasses
        }

        takeDamage(amount) {
            this.hp -= amount;
            if (this.hp <= 0) {
                this.active = false;
                return true; // destroyed
            }
            return false;
        }

        render(ctx) {
            // Override in subclasses
        }

        deactivate() {
            this.active = false;
        }
    }

    // -----------------------------------------------------------
    // Drone: sine-wave movement, single shots
    // -----------------------------------------------------------
    class Drone extends Enemy {
        constructor() {
            super();
            this.type = 'drone';
            this.hp = GAME_CONSTANTS.DRONE_HP;
            this.maxHp = GAME_CONSTANTS.DRONE_HP;
            this.score = GAME_CONSTANTS.DRONE_SCORE;
            this.radius = 14;
            this.fireRate = GAME_CONSTANTS.DRONE_FIRE_RATE;
            this.baseY = 0;
            this.amplitude = GAME_CONSTANTS.DRONE_AMPLITUDE;
            this.freq = GAME_CONSTANTS.DRONE_FREQ;
            this.entrySpeed = 160;
        }

        init(x, y) {
            super.init(x, y);
            this.baseY = y;
            this.hp = GAME_CONSTANTS.DRONE_HP;
            this.phase = Math.random() * Math.PI * 2;
            this.vx = -this.entrySpeed;
            this.fireTimer = Math.random() * this.fireRate;
        }

        update(dt, game) {
            if (!this.active) return;

            this.phase += this.freq * dt;
            this.x += this.vx * dt;
            this.y = this.baseY + Math.sin(this.phase) * this.amplitude;

            // Fire at player
            this.fireTimer -= dt;
            if (this.fireTimer <= 0 && game.player.alive) {
                this.fireTimer = this.fireRate;
                const bulletPool = game.bullets.enemyPool;
                bulletPool.fireEnemy(this.x, this.y, -GAME_CONSTANTS.ENEMY_BULLET_SPEED, 0);
            }

            // Off-screen removal
            if (this.x < -30) {
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

            // Red diamond-shaped drone
            ctx.fillStyle = GAME_CONSTANTS.COLOR_DRONE;
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x, this.y - this.radius * 0.7);
            ctx.lineTo(this.x - this.radius, this.y);
            ctx.lineTo(this.x, this.y + this.radius * 0.7);
            ctx.closePath();
            ctx.fill();

            // Eye
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Wing details
            ctx.strokeStyle = '#ff6666';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x - 4, this.y - this.radius * 0.4);
            ctx.lineTo(this.x - 4, this.y + this.radius * 0.4);
            ctx.stroke();
        }
    }

    // -----------------------------------------------------------
    // Turret: ceiling/floor mounted, aimed shots
    // -----------------------------------------------------------
    class Turret extends Enemy {
        constructor() {
            super();
            this.type = 'turret';
            this.hp = GAME_CONSTANTS.TURRET_HP;
            this.maxHp = GAME_CONSTANTS.TURRET_HP;
            this.score = GAME_CONSTANTS.TURRET_SCORE;
            this.radius = 18;
            this.fireRate = GAME_CONSTANTS.TURRET_FIRE_RATE;
            this.isCeiling = false;
            this.barrelAngle = 0;
        }

        init(x, y, isCeiling) {
            super.init(x, y);
            this.hp = GAME_CONSTANTS.TURRET_HP;
            this.isCeiling = isCeiling;
            this.fireTimer = Math.random() * this.fireRate;
            this.barrelAngle = isCeiling ? Math.PI * 0.5 : -Math.PI * 0.5;
            this.vx = 0;
            this.vy = 0;
        }

        update(dt, game) {
            if (!this.active) return;

            // Aim at player
            if (game.player.alive) {
                const dx = game.player.x - this.x;
                const dy = game.player.y - this.y;
                this.barrelAngle = Math.atan2(dy, dx);
            }

            // Fire aimed bullets
            this.fireTimer -= dt;
            if (this.fireTimer <= 0 && game.player.alive) {
                this.fireTimer = this.fireRate;
                
                const speed = GAME_CONSTANTS.ENEMY_BULLET_SPEED;
                const bvx = Math.cos(this.barrelAngle) * speed;
                const bvy = Math.sin(this.barrelAngle) * speed;
                
                const bulletPool = game.bullets.enemyPool;
                bulletPool.fireEnemy(this.x, this.y, bvx, bvy);
            }

            // Scroll with world
            this.x -= game.scrollSpeed * dt;
            
            // Remove if off-screen
            if (this.x < -30) {
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

            // Base (rectangle attached to ceiling/floor)
            ctx.fillStyle = GAME_CONSTANTS.COLOR_TURRET;
            if (this.isCeiling) {
                ctx.fillRect(this.x - this.radius * 0.7, this.y - this.radius, this.radius * 1.4, this.radius);
            } else {
                ctx.fillRect(this.x - this.radius * 0.7, this.y, this.radius * 1.4, this.radius);
            }

            // Barrel
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.barrelAngle);
            ctx.fillStyle = '#dd4477';
            ctx.fillRect(0, -3, this.radius * 1.2, 6);
            ctx.restore();

            // Core
            ctx.fillStyle = '#ff88aa';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // HP indicator (if damaged)
            if (this.hp < this.maxHp) {
                const barW = 30;
                const barH = 3;
                const ratio = this.hp / this.maxHp;
                ctx.fillStyle = '#440000';
                ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8, barW, barH);
                ctx.fillStyle = '#ff3366';
                ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8, barW * ratio, barH);
            }
        }
    }

    // -----------------------------------------------------------
    // Swarm: fast enemies that move in groups
    // -----------------------------------------------------------
    class Swarm extends Enemy {
        constructor() {
            super();
            this.type = 'swarm';
            this.hp = GAME_CONSTANTS.SWARM_HP;
            this.maxHp = GAME_CONSTANTS.SWARM_HP;
            this.score = GAME_CONSTANTS.SWARM_SCORE;
            this.radius = 10;
            this.speed = GAME_CONSTANTS.SWARM_SPEED;
            this.wobblePhase = 0;
        }

        init(x, y) {
            super.init(x, y);
            this.hp = GAME_CONSTANTS.SWARM_HP;
            this.wobblePhase = Math.random() * Math.PI * 2;
            this.fireTimer = 999; // Swarms don't fire
        }

        update(dt, game) {
            if (!this.active) return;

            this.wobblePhase += 4 * dt;
            this.x -= this.speed * dt;
            this.y += Math.sin(this.wobblePhase) * 60 * dt;

            if (this.x < -20) {
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

            // Small orange arrow-shaped enemy
            ctx.fillStyle = GAME_CONSTANTS.COLOR_SWARM;
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x - this.radius * 0.5, this.y - this.radius * 0.8);
            ctx.lineTo(this.x - this.radius * 0.2, this.y);
            ctx.lineTo(this.x - this.radius * 0.5, this.y + this.radius * 0.8);
            ctx.closePath();
            ctx.fill();

            // Trailing glow
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffaa44';
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius * 0.3, this.y);
            ctx.lineTo(this.x - this.radius * 1.5, this.y - 3);
            ctx.lineTo(this.x - this.radius * 1.5, this.y + 3);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // -----------------------------------------------------------
    // PowerUp: floating collectible
    // -----------------------------------------------------------
    class PowerUp extends Enemy {
        constructor() {
            super();
            this.type = 'powerup';
            this.hp = 1;
            this.maxHp = 1;
            this.score = GAME_CONSTANTS.POWERUP_SCORE;
            this.radius = 14;
            this.speed = 100;
            this.phase = 0;
            this.pickedUp = false;
        }

        init(x, y) {
            super.init(x, y);
            this.hp = 1;
            this.phase = 0;
            this.pickedUp = false;
            this.fireTimer = 999;
        }

        update(dt, game) {
            if (!this.active) return;
            this.phase += 3 * dt;
            this.x -= this.speed * dt;
            this.y += Math.sin(this.phase) * 20 * dt;

            // Check if player collects it
            if (!this.pickedUp && game.player.alive) {
                const dx = game.player.x - this.x;
                const dy = game.player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (game.player.radius + this.radius)) {
                    this.pickedUp = true;
                    this.active = false;
                    game.player.pod.upgrade();
                    game.addScore(this.score);
                    game.sound.powerUp();
                    game.particles.explosion(this.x, this.y, 10, '#00ff88', '#ffffff', 4, 100, 0.4);
                }
            }

            if (this.x < -20) {
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

            // Glowing green capsule
            const pulse = 1 + Math.sin(this.phase * 2) * 0.1;

            // Outer glow
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Capsule body
            ctx.fillStyle = '#00cc66';
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius * pulse, this.radius * 0.6 * pulse, 0, 0, Math.PI * 2);
            ctx.fill();

            // "P" label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('P', this.x, this.y + 1);
        }
    }

    // -----------------------------------------------------------
    // MidBoss: large worm weaving vertically, shoots slow orbs
    // -----------------------------------------------------------
    class MidBoss extends Enemy {
        constructor() {
            super();
            this.type = 'midboss';
            this.hp = GAME_CONSTANTS.MIDBOSS_HP;
            this.maxHp = GAME_CONSTANTS.MIDBOSS_HP;
            this.score = GAME_CONSTANTS.MIDBOSS_SCORE;
            this.radius = 30;
            this.fireRate = 0.8;
            this.entered = false;
            this.baseY = GAME_CONSTANTS.GAME_HEIGHT / 2;
            this.weavePhase = 0;
            this.segmentOffsets = [];
            this.alive_timer = 0;
            
            // Generate segment offsets for worm body
            for (let i = 0; i < 5; i++) {
                this.segmentOffsets.push({ x: i * 28, y: 0 });
            }
        }

        init(x, y) {
            super.init(x, y);
            this.hp = GAME_CONSTANTS.MIDBOSS_HP;
            this.entered = false;
            this.baseY = y;
            this.weavePhase = 0;
            this.fireTimer = 0;
            this.alive_timer = 0;
        }

        update(dt, game) {
            if (!this.active) return;
            
            this.alive_timer += dt;
            this.weavePhase += 1.5 * dt;

            // Enter from right and stop
            if (!this.entered) {
                this.x -= 100 * dt;
                if (this.x <= GAME_CONSTANTS.GAME_WIDTH * 0.7) {
                    this.entered = true;
                }
            } else {
                // Weave vertically
                this.y = this.baseY + Math.sin(this.weavePhase) * 120;
            }

            // Update segments to follow head
            for (let i = 0; i < this.segmentOffsets.length; i++) {
                const targetX = this.x + (i + 1) * 28;
                const targetY = this.baseY + Math.sin(this.weavePhase - (i + 1) * 0.4) * 120 - this.y;
                this.segmentOffsets[i].y = targetY;
            }

            // Fire slow orbs at player
            this.fireTimer -= dt;
            if (this.fireTimer <= 0 && this.entered && game.player.alive) {
                this.fireTimer = this.fireRate;
                const dx = game.player.x - this.x;
                const dy = game.player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const speed = 120;
                
                const bulletPool = game.bullets.enemyPool;
                bulletPool.fireEnemy(this.x, this.y, (dx / dist) * speed, (dy / dist) * speed, 8);
            }
        }

        takeDamage(amount) {
            this.hp -= amount;
            if (this.hp <= 0) {
                this.active = false;
                return true;
            }
            return false;
        }

        render(ctx) {
            if (!this.active) return;

            // TODO: Replace with sprite image
            if (this.sprite) {
                ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                return;
            }

            // Draw segments (tail to head)
            for (let i = this.segmentOffsets.length - 1; i >= 0; i--) {
                const sx = this.x + this.segmentOffsets[i].x;
                const sy = this.y + this.segmentOffsets[i].y;
                const segR = this.radius * (1 - i * 0.1);
                
                ctx.fillStyle = GAME_CONSTANTS.COLOR_MIDBOSS;
                ctx.beginPath();
                ctx.arc(sx, sy, segR, 0, Math.PI * 2);
                ctx.fill();

                // Segment ring
                ctx.strokeStyle = '#bb44ee';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sx, sy, segR * 0.8, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Head (main body)
            ctx.fillStyle = GAME_CONSTANTS.COLOR_MIDBOSS;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Pulsing veins
            const pulseAlpha = 0.5 + Math.sin(this.alive_timer * 3) * 0.3;
            ctx.globalAlpha = pulseAlpha;
            ctx.strokeStyle = '#ff44ff';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI * 2 / 4) * i + this.alive_timer;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + Math.cos(angle) * this.radius * 0.9,
                    this.y + Math.sin(angle) * this.radius * 0.9
                );
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Eye
            ctx.fillStyle = '#ff0066';
            ctx.beginPath();
            ctx.arc(this.x - 8, this.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x - 10, this.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            // HP bar
            const barW = 60;
            const barH = 5;
            const ratio = this.hp / this.maxHp;
            ctx.fillStyle = '#440000';
            ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW, barH);
            ctx.fillStyle = '#ff44ff';
            ctx.fillRect(this.x - barW / 2, this.y - this.radius - 12, barW * ratio, barH);
        }
    }

    // -----------------------------------------------------------
    // Enemy pool - manages dynamic enemy list
    // -----------------------------------------------------------
    class EnemyPool {
        constructor(size) {
            this.pool = [];
        }

        spawn(type, x, y, extraArgs) {
            let enemy;
            switch (type) {
                case 'drone':
                    enemy = new Drone();
                    break;
                case 'turret':
                    enemy = new Turret();
                    break;
                case 'swarm':
                    enemy = new Swarm();
                    break;
                case 'powerup':
                    enemy = new PowerUp();
                    break;
                case 'midboss':
                    enemy = new MidBoss();
                    break;
                default:
                    return null;
            }

            if (type === 'turret') {
                enemy.init(x, y, extraArgs);
            } else {
                enemy.init(x, y);
            }
            
            this.pool.push(enemy);
            return enemy;
        }

        update(dt, game) {
            for (let i = this.pool.length - 1; i >= 0; i--) {
                const enemy = this.pool[i];
                if (enemy.active) {
                    enemy.update(dt, game);
                } else {
                    // Remove inactive enemies
                    this.pool.splice(i, 1);
                }
            }
        }

        render(ctx) {
            for (let i = 0; i < this.pool.length; i++) {
                if (this.pool[i].active) {
                    this.pool[i].render(ctx);
                }
            }
        }

        forEachActive(callback) {
            for (let i = 0; i < this.pool.length; i++) {
                if (this.pool[i].active) {
                    callback(this.pool[i]);
                }
            }
        }

        clear() {
            this.pool.length = 0;
        }
    }

    window.Enemy = Enemy;
    window.Drone = Drone;
    window.Turret = Turret;
    window.Swarm = Swarm;
    window.PowerUp = PowerUp;
    window.MidBoss = MidBoss;
    window.EnemyPool = EnemyPool;
})();
