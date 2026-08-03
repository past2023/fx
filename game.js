/**
 * game.js - Main game loop, state machine, object pools, level sequencing, collision detection
 */

(function() {
    'use strict';

    const STATE = {
        MENU: 'MENU',
        PLAYING: 'PLAYING',
        BOSS: 'BOSS',
        GAMEOVER: 'GAMEOVER',
        STAGE_CLEAR: 'STAGE_CLEAR'
    };

    class Game {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = GAME_CONSTANTS.GAME_WIDTH;
            this.height = GAME_CONSTANTS.GAME_HEIGHT;

            this.state = STATE.MENU;
            this.score = 0;
            this.highScore = parseInt(localStorage.getItem(GAME_CONSTANTS.HS_KEY)) || 0;
            this.levelTime = 0;
            this.scrollSpeed = GAME_CONSTANTS.SCROLL_SPEED;

            // Screen shake
            this.shakeAmount = 0;
            this.shakeTimer = 0;

            // Core systems
            this.input = new InputManager();
            this.sound = new SoundManager();
            this.particles = new ParticleSystem();
            this.background = new Background();
            this.hud = new HUD();

            // Object pools
            this.bullets = {
                playerPool: new BulletPool(GAME_CONSTANTS.POOL_BULLETS_PLAYER, true),
                enemyPool: new BulletPool(GAME_CONSTANTS.POOL_BULLETS_ENEMY, false)
            };
            this.enemies = new EnemyPool(GAME_CONSTANTS.POOL_ENEMIES);
            this.boss = null;

            // Player
            this.player = new Player(this);

            // Level sequencing
            this.waveFlags = {
                wave1: false,
                wave2: false,
                wave3: false,
                wave4: false,
                wave5: false,
                boss: false,
                warningShown: false
            };

            // Timing
            this.lastTime = 0;
            this.running = false;

            // Menu
            this.menuPhase = 0;
        }

        /**
         * Start the game loop
         */
        start() {
            this.running = true;
            this.lastTime = performance.now();
            this.loop(this.lastTime);
        }

        /**
         * Main game loop
         */
        loop(timestamp) {
            if (!this.running) return;

            let dt = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;

            // Cap delta time
            if (dt > GAME_CONSTANTS.MAX_DT) {
                dt = GAME_CONSTANTS.MAX_DT;
            }

            this.update(dt);
            this.render();
            this.input.update();

            requestAnimationFrame((t) => this.loop(t));
        }

        /**
         * Update game state
         */
        update(dt) {
            this.menuPhase += dt;

            switch (this.state) {
                case STATE.MENU:
                    this.background.update(dt, 30);
                    this.hud.update(dt);
                    if (this.input.wasConfirm()) {
                        this.sound.init();
                        this.sound.resume();
                        this.sound.menuSelect();
                        this.startLevel();
                    }
                    break;

                case STATE.PLAYING:
                case STATE.BOSS:
                    this.levelTime += dt;
                    this.updateLevel(dt);
                    this.updateEntities(dt);
                    this.checkCollisions();
                    this.particles.update(dt);
                    this.background.update(dt, this.scrollSpeed);
                    this.hud.update(dt);

                    // Screen shake
                    if (this.shakeTimer > 0) {
                        this.shakeTimer -= dt;
                        if (this.shakeTimer <= 0) {
                            this.shakeAmount = 0;
                        }
                    }

                    // Check game over
                    if (this.player.lives <= 0 && !this.player.alive) {
                        this.state = STATE.GAMEOVER;
                    }
                    break;

                case STATE.GAMEOVER:
                    this.particles.update(dt);
                    this.background.update(dt, 20);
                    this.hud.update(dt);
                    if (this.input.wasConfirm() && this.hud.stageClearTimer > 1) {
                        this.state = STATE.MENU;
                    }
                    break;

                case STATE.STAGE_CLEAR:
                    this.particles.update(dt);
                    this.background.update(dt, 20);
                    this.hud.update(dt);
                    if (this.input.wasConfirm() && this.hud.stageClearTimer > 2) {
                        this.state = STATE.MENU;
                    }
                    break;
            }
        }

        /**
         * Start a new level
         */
        startLevel() {
            this.state = STATE.PLAYING;
            this.score = 0;
            this.levelTime = 0;
            this.scrollSpeed = GAME_CONSTANTS.SCROLL_SPEED;
            this.player.reset();
            this.enemies.clear();
            this.bullets.playerPool.clear();
            this.bullets.enemyPool.clear();
            this.particles.clear();
            this.background.reset();
            this.hud.reset();
            this.boss = null;

            this.waveFlags = {
                wave1: false, wave2: false, wave3: false,
                wave4: false, wave5: false, boss: false,
                warningShown: false
            };
        }

        /**
         * Update level sequencing - spawn enemy waves based on time
         */
        updateLevel(dt) {
            const t = this.levelTime;
            const C = GAME_CONSTANTS;

            // Wave 1: Drones (0-10s)
            if (t >= C.WAVE_1_START && !this.waveFlags.wave1) {
                this.waveFlags.wave1 = true;
                this.scheduleWave('drone_burst', 1, 8, 1.0);
            }

            // Wave 2: Turrets (10-20s)
            if (t >= C.WAVE_2_START && !this.waveFlags.wave2) {
                this.waveFlags.wave2 = true;
                this.spawnTurretWave();
            }

            // Wave 3: Swarm + power-up (20-35s)
            if (t >= C.WAVE_3_START && !this.waveFlags.wave3) {
                this.waveFlags.wave3 = true;
                this.scheduleWave('swarm_wave', 1, 12, 0.4);
                // Spawn power-up in the middle of swarm
                setTimeout(() => {
                    if (this.state === STATE.PLAYING) {
                        this.spawnPowerUp();
                    }
                }, 3000);
            }

            // Wave 4: Mid-boss (35-50s)
            if (t >= C.WAVE_4_START && !this.waveFlags.wave4) {
                this.waveFlags.wave4 = true;
                this.spawnMidBoss();
            }

            // Wave 5: Calm + warning (50-65s)
            if (t >= C.WAVE_5_START && !this.waveFlags.wave5) {
                this.waveFlags.wave5 = true;
                // Calm period with a few scattered drones
                this.scheduleWave('calm_drones', 2, 5, 2.0);
                // Show warning before boss
                setTimeout(() => {
                    if (this.state === STATE.PLAYING || this.state === STATE.BOSS) {
                        this.hud.showWarning(C.WARNING_DURATION);
                        this.sound.bossAlert();
                        this.waveFlags.warningShown = true;
                    }
                }, 3000);
            }

            // Wave 6: Boss (65s+)
            if (t >= C.WAVE_6_START && !this.waveFlags.boss) {
                this.waveFlags.boss = true;
                this.spawnBoss();
            }
        }

        scheduleWave(name, delay, count, interval) {
            setTimeout(() => {
                if (this.state !== STATE.PLAYING && this.state !== STATE.BOSS) return;
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        if (this.state !== STATE.PLAYING && this.state !== STATE.BOSS) return;
                        this._executeWave(name, i);
                    }, i * interval * 1000);
                }
            }, delay * 1000);
        }

        _executeWave(name, index) {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            const H = GAME_CONSTANTS.GAME_HEIGHT;

            switch (name) {
                case 'drone_burst':
                    const y = 60 + (index % 5) * (H - 120) / 4;
                    this.enemies.spawn('drone', W + 30, y);
                    break;

                case 'swarm_wave':
                    const sy = 50 + Math.random() * (H - 100);
                    this.enemies.spawn('swarm', W + 30 + index * 20, sy);
                    break;

                case 'calm_drones':
                    const cy = 80 + Math.random() * (H - 160);
                    this.enemies.spawn('drone', W + 30, cy);
                    break;
            }
        }

        spawnTurretWave() {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            const H = GAME_CONSTANTS.GAME_HEIGHT;

            // Ceiling turrets
            for (let i = 0; i < 4; i++) {
                const x = W * 0.4 + i * 120 + Math.random() * 40;
                this.enemies.spawn('turret', x, 10, true);
            }

            // Floor turrets
            for (let i = 0; i < 3; i++) {
                const x = W * 0.5 + i * 140 + Math.random() * 40;
                this.enemies.spawn('turret', x, H - 10, false);
            }
        }

        spawnPowerUp() {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            const H = GAME_CONSTANTS.GAME_HEIGHT;
            const x = W + 30;
            const y = H * 0.3 + Math.random() * H * 0.4;
            this.enemies.spawn('powerup', x, y);
        }

        spawnMidBoss() {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            this.enemies.spawn('midboss', W + 40, this.height / 2);
        }

        spawnBoss() {
            this.state = STATE.BOSS;
            this.scrollSpeed = GAME_CONSTANTS.SCROLL_BOSS_SPEED;
            this.boss = new GoliathParasite();
            this.boss.init();
        }

        /**
         * Update all game entities
         */
        updateEntities(dt) {
            // Player
            this.player.update(dt, this.input);

            // Enemies
            this.enemies.update(dt, this);

            // Bullets
            this.bullets.playerPool.update(dt);
            this.bullets.enemyPool.update(dt);

            // Boss
            if (this.boss) {
                this.boss.update(dt, this);

                // Boss defeated
                if (!this.boss.active && this.boss.hp <= 0) {
                    this.onBossDefeated();
                }
            }
        }

        /**
         * Check all collisions
         */
        checkCollisions() {
            // Player bullets vs enemies
            this.bullets.playerPool.forEachActive((bullet) => {
                let hit = false;

                // vs regular enemies
                this.enemies.forEachActive((enemy) => {
                    if (enemy.type === 'powerup') return; // Power-ups handle their own
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < (bullet.radius + enemy.radius)) {
                        if (enemy.takeDamage(bullet.damage)) {
                            // Enemy destroyed
                            this.addScore(enemy.score);
                            this.particles.explosion(enemy.x, enemy.y,
                                enemy.type === 'midboss' ? 30 : 12,
                                '#ffaa00', '#ff4400',
                                enemy.type === 'midboss' ? 8 : 5,
                                enemy.type === 'midboss' ? 250 : 150,
                                enemy.type === 'midboss' ? 0.8 : 0.4
                            );
                            if (enemy.type === 'midboss') {
                                this.sound.explosionLarge();
                                this.shake(8, 0.4);
                                this.particles.debris(enemy.x, enemy.y, 15, '#9922cc');
                            } else {
                                this.sound.explosionSmall();
                            }
                        } else {
                            this.particles.hitSpark(bullet.x, bullet.y, '#ffffff');
                        }
                        hit = true;
                    }
                });

                // vs boss claws
                if (this.boss && this.boss.active) {
                    const clawResult = this.boss.checkClawCollision(bullet);
                    if (clawResult === 'claw_destroyed') {
                        this.addScore(500);
                        this.particles.explosion(bullet.x, bullet.y, 15, '#888899', '#ff3366', 5, 200, 0.5);
                        this.sound.explosionLarge();
                        hit = true;
                    } else if (clawResult === 'claw_hit') {
                        this.particles.hitSpark(bullet.x, bullet.y, '#888899');
                        hit = true;
                    }

                    // vs boss eye
                    if (!hit) {
                        const eyeX = this.boss.x - this.boss.coreRadius;
                        const dx = bullet.x - eyeX;
                        const dy = bullet.y - this.boss.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < this.boss.coreRadius + 5) {
                            this.boss.hp -= bullet.damage;
                            this.particles.hitSpark(bullet.x, bullet.y, '#ffff00');
                            hit = true;
                            
                            if (this.boss.hp <= 0) {
                                this.boss.active = false;
                            }
                        }
                    }
                }

                if (hit && !bullet.piercing) {
                    bullet.deactivate();
                }
            });

            // Enemy bullets vs player (and force pod)
            this.bullets.enemyPool.forEachActive((bullet) => {
                if (!this.player.alive) return;

                // Check Force Pod blocking first
                if (this.player.pod.isBlocking(bullet.x, bullet.y, bullet.radius)) {
                    this.particles.hitSpark(bullet.x, bullet.y, GAME_CONSTANTS.COLOR_POD);
                    bullet.deactivate();
                    return;
                }

                // Check player hit
                if (this.player.checkBulletCollision(bullet)) {
                    this.player.takeDamage();
                    bullet.deactivate();
                }
            });

            // Enemy bodies vs player
            if (this.player.alive) {
                this.enemies.forEachActive((enemy) => {
                    if (enemy.type === 'powerup' || enemy.type === 'turret') return;

                    // Pod damage to enemies on contact
                    if (this.player.pod.active) {
                        const ph = this.player.pod.getHitbox();
                        const dx = enemy.x - ph.x;
                        const dy = enemy.y - ph.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < (ph.radius + enemy.radius)) {
                            if (enemy.takeDamage(1)) {
                                this.addScore(enemy.score);
                                this.particles.explosion(enemy.x, enemy.y, 10, '#ffaa00', '#ff4400', 4, 120, 0.3);
                                this.sound.explosionSmall();
                            }
                        }
                    }

                    // Player body collision
                    if (this.player.checkEnemyCollision(enemy)) {
                        this.player.takeDamage();
                    }
                });

                // Boss body collision
                if (this.boss && this.boss.active) {
                    if (this.boss.checkBodyCollision(this.player.x, this.player.y, this.player.hitboxRadius)) {
                        this.player.takeDamage();
                    }
                }
            }
        }

        /**
         * Handle boss defeat
         */
        onBossDefeated() {
            this.addScore(GAME_CONSTANTS.BOSS_SCORE);
            this.sound.explosionLarge();
            this.shake(15, 1.5);

            // Massive explosion
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    if (!this.boss) return;
                    const ox = this.boss.x + (Math.random() - 0.5) * 80;
                    const oy = this.boss.y + (Math.random() - 0.5) * 80;
                    this.particles.explosion(ox, oy, 25, '#ff4400', '#ffaa00', 8, 300, 0.8);
                    this.particles.debris(ox, oy, 8, '#660033');
                    this.sound.explosionLarge();
                }, i * 200);
            }

            // Stage clear
            setTimeout(() => {
                this.hud.showStageClear();
                this.state = STATE.STAGE_CLEAR;
                this.saveHighScore();
            }, 1200);
        }

        /**
         * Add score and update high score
         */
        addScore(amount) {
            this.score += amount;
            if (this.score > this.highScore) {
                this.highScore = this.score;
            }
        }

        saveHighScore() {
            localStorage.setItem(GAME_CONSTANTS.HS_KEY, this.highScore.toString());
        }

        /**
         * Screen shake effect
         */
        shake(amount, duration) {
            this.shakeAmount = amount;
            this.shakeTimer = duration;
        }

        /**
         * Render everything
         */
        render() {
            const ctx = this.ctx;
            ctx.save();

            // Apply screen shake
            if (this.shakeTimer > 0) {
                const sx = (Math.random() - 0.5) * this.shakeAmount * 2;
                const sy = (Math.random() - 0.5) * this.shakeAmount * 2;
                ctx.translate(sx, sy);
            }

            // Background
            this.background.render(ctx);

            switch (this.state) {
                case STATE.MENU:
                    this.renderMenu(ctx);
                    break;

                case STATE.PLAYING:
                case STATE.BOSS:
                    this.renderGame(ctx);
                    break;

                case STATE.GAMEOVER:
                    this.renderGame(ctx);
                    this.renderGameOver(ctx);
                    break;

                case STATE.STAGE_CLEAR:
                    this.renderGame(ctx);
                    break;
            }

            // HUD always on top
            this.hud.render(ctx, this);

            ctx.restore();
        }

        renderMenu(ctx) {
            const W = this.width;
            const H = this.height;

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 42px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BIO-FORCE', W / 2, H * 0.3);

            ctx.fillStyle = '#00e5ff';
            ctx.font = 'bold 22px monospace';
            ctx.fillText('PARASITE DAWN', W / 2, H * 0.3 + 40);

            // Instructions
            const flashAlpha = (Math.sin(this.menuPhase * 3) + 1) / 2;
            ctx.globalAlpha = 0.5 + flashAlpha * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px monospace';
            ctx.fillText('PRESS SPACE OR Z TO START', W / 2, H * 0.55);
            ctx.globalAlpha = 1;

            // Controls
            ctx.fillStyle = '#888888';
            ctx.font = '13px monospace';
            ctx.fillText('ARROWS / WASD - MOVE', W / 2, H * 0.68);
            ctx.fillText('Z / SPACE - FIRE', W / 2, H * 0.68 + 22);
            ctx.fillText('X - DETACH / RECALL FORCE POD', W / 2, H * 0.68 + 44);

            // High score
            ctx.fillStyle = '#ffcc00';
            ctx.font = '14px monospace';
            ctx.fillText('HIGH SCORE: ' + this.highScore.toString().padStart(8, '0'), W / 2, H * 0.88);

            // Level name
            ctx.fillStyle = '#555555';
            ctx.font = '12px monospace';
            ctx.fillText('LEVEL 1 - BIO-FORCE: PARASITE DAWN', W / 2, H * 0.94);
        }

        renderGame(ctx) {
            // Enemies
            this.enemies.render(ctx);

            // Boss
            if (this.boss) {
                this.boss.render(ctx);
            }

            // Bullets
            this.bullets.enemyPool.render(ctx);
            this.bullets.playerPool.render(ctx);

            // Player
            this.player.render(ctx);

            // Particles
            this.particles.render(ctx);
        }

        renderGameOver(ctx) {
            const W = this.width;
            const H = this.height;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 40px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', W / 2, H * 0.4);

            ctx.fillStyle = '#ffffff';
            ctx.font = '18px monospace';
            ctx.fillText('SCORE: ' + this.score.toString().padStart(8, '0'), W / 2, H * 0.52);

            const flash = (Math.sin(this.menuPhase * 3) + 1) / 2;
            ctx.globalAlpha = 0.5 + flash * 0.5;
            ctx.font = '16px monospace';
            ctx.fillText('PRESS SPACE TO CONTINUE', W / 2, H * 0.65);
            ctx.globalAlpha = 1;
        }

        /**
         * Destroy game (cleanup)
         */
        destroy() {
            this.running = false;
            this.input.destroy();
        }
    }

    window.Game = Game;
    window.GAME_STATE = STATE;
})();
