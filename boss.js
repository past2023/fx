/**
 * boss.js - Level 1 boss: "Goliath Parasite"
 * Massive bio-mechanical creature with three phases.
 */

(function() {
    'use strict';

    const BOSS_PHASE = {
        ENTERING: 0,
        PHASE_1: 1,   // 100-70% HP: 3-way spread + claw aimed shots
        PHASE_2: 2,   // 70-40% HP: Detached claws + rotating laser
        PHASE_3: 3    // Below 40%: Rapid bullet rings + faster laser
    };

    class BossClaw {
        constructor(isLeft) {
            this.isLeft = isLeft;
            this.x = 0;
            this.y = 0;
            this.targetX = 0;
            this.targetY = 0;
            this.active = true;
            this.detached = false;
            this.hp = 8;
            this.maxHp = 8;
            this.radius = 20;
            this.attackTimer = 0;
            this.attackRate = 1.5;
            this.orbitAngle = 0;
            this.phase = 0;
        }

        reset(bossX, bossY) {
            this.active = true;
            this.detached = false;
            this.hp = this.maxHp;
            this.attackTimer = 0;

            if (this.isLeft) {
                this.x = bossX - 50;
                this.y = bossY - 60;
                this.targetX = bossX - 50;
                this.targetY = bossY - 60;
            } else {
                this.x = bossX - 50;
                this.y = bossY + 60;
                this.targetX = bossX - 50;
                this.targetY = bossY + 60;
            }
        }

        detach() {
            this.detached = true;
        }

        update(dt, bossX, bossY) {
            if (!this.active) return;
            this.phase += dt * 2;

            if (this.detached) {
                // Phase 2+: orbit around boss
                this.orbitAngle += dt * 1.5;
                const orbitRadius = 120;
                this.targetX = bossX + Math.cos(this.orbitAngle) * orbitRadius;
                this.targetY = bossY + Math.sin(this.orbitAngle) * orbitRadius;
                this.x += (this.targetX - this.x) * 2 * dt;
                this.y += (this.targetY - this.y) * 2 * dt;
            } else {
                const offsetX = -50;
                const offsetY = this.isLeft ? -60 : 60;
                this.targetX = bossX + offsetX;
                this.targetY = bossY + offsetY;
                this.x += (this.targetX - this.x) * 5 * dt;
                this.y += (this.targetY - this.y) * 5 * dt;
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

            ctx.fillStyle = GAME_CONSTANTS.COLOR_CLAW;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            // Claw pincers
            ctx.strokeStyle = '#888899';
            ctx.lineWidth = 3;
            const pincerOpen = Math.sin(this.phase) * 0.3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - 25, this.y - 15 - pincerOpen * 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - 25, this.y + 15 + pincerOpen * 10);
            ctx.stroke();

            // Glowing core
            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // HP bar if damaged and detached
            if (this.hp < this.maxHp && this.detached) {
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

    class GoliathParasite {
        constructor() {
            this.active = false;
            this.x = GAME_CONSTANTS.GAME_WIDTH + 100;
            this.y = GAME_CONSTANTS.GAME_HEIGHT / 2;
            this.targetX = GAME_CONSTANTS.BOSS_STOP_X;
            this.targetY = GAME_CONSTANTS.GAME_HEIGHT / 2;

            this.hp = GAME_CONSTANTS.BOSS_HP;
            this.maxHp = GAME_CONSTANTS.BOSS_HP;
            this.score = GAME_CONSTANTS.BOSS_SCORE;
            this.radius = 60;
            this.coreRadius = 25;

            this.phase = BOSS_PHASE.ENTERING;
            this.entered = false;
            this.alive_timer = 0;
            this.attackTimer = 0;
            this.laserAngle = 0;
            this.laserActive = false;
            this.laserSweepSpeed = 0;

            this.claws = [
                new BossClaw(true),
                new BossClaw(false)
            ];

            this.pulsePhase = 0;
            this.veinPhase = 0;
            this.eyeFlash = 0;

            this.sprite = null;
        }

        init() {
            this.active = true;
            this.x = GAME_CONSTANTS.GAME_WIDTH + 100;
            this.y = GAME_CONSTANTS.GAME_HEIGHT / 2;
            this.hp = GAME_CONSTANTS.BOSS_HP;
            this.phase = BOSS_PHASE.ENTERING;
            this.entered = false;
            this.alive_timer = 0;
            this.attackTimer = 0;
            this.laserActive = false;
            this.laserAngle = 0;

            this.claws[0] = new BossClaw(true);
            this.claws[1] = new BossClaw(false);
        }

        update(dt, game) {
            if (!this.active) return;

            this.alive_timer += dt;
            this.pulsePhase += dt * 2;
            this.veinPhase += dt * 3;

            // Phase transitions
            const hpRatio = this.hp / this.maxHp;
            if (hpRatio <= 0.4) {
                this.phase = BOSS_PHASE.PHASE_3;
            } else if (hpRatio <= 0.7) {
                this.phase = BOSS_PHASE.PHASE_2;
            } else if (this.entered) {
                this.phase = BOSS_PHASE.PHASE_1;
            }

            // Enter from right
            if (!this.entered) {
                this.x -= 100 * dt;
                if (this.x <= this.targetX) {
                    this.x = this.targetX;
                    this.entered = true;
                    game.sound.bossAlert();
                }
            } else {
                // Gentle vertical bobbing
                this.y = this.targetY + Math.sin(this.alive_timer * 0.8) * 30;
            }

            // Update claws
            for (let i = 0; i < this.claws.length; i++) {
                const claw = this.claws[i];
                claw.update(dt, this.x, this.y);

                // Phase 2+: detach claws
                if (this.phase >= BOSS_PHASE.PHASE_2 && !claw.detached && claw.active) {
                    claw.detach();
                }

                // Claw attacks
                if (claw.active && this.entered) {
                    claw.attackTimer -= dt;
                    if (claw.attackTimer <= 0 && game.player.alive) {
                        claw.attackTimer = claw.attackRate;
                        const dx = game.player.x - claw.x;
                        const dy = game.player.y - claw.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        const speed = GAME_CONSTANTS.ENEMY_BULLET_SPEED * 1.2;
                        game.bullets.enemyPool.fireEnemy(
                            claw.x, claw.y,
                            (dx / dist) * speed, (dy / dist) * speed
                        );
                    }
                }
            }

            // Core attacks
            if (this.entered && game.player.alive) {
                this.attackTimer -= dt;

                if (this.phase === BOSS_PHASE.PHASE_1) {
                    if (this.attackTimer <= 0) {
                        this.attackTimer = 1.2;
                        this.fire3WaySpread(game);
                    }
                } else if (this.phase === BOSS_PHASE.PHASE_2) {
                    if (!this.laserActive) {
                        this.laserAngle = 0;
                        this.laserActive = true;
                        this.laserSweepSpeed = 1.5;
                        game.sound.bossLaser();
                    }
                    this.laserAngle += this.laserSweepSpeed * dt;
                    if (this.laserAngle > Math.PI * 2) {
                        this.laserActive = false;
                        this.attackTimer = 1.5;
                    }
                    if (this.laserActive && Math.random() < 0.3) {
                        const speed = 250;
                        game.bullets.enemyPool.fireEnemy(
                            this.x - this.coreRadius, this.y,
                            Math.cos(this.laserAngle + Math.PI) * speed,
                            Math.sin(this.laserAngle + Math.PI) * speed, 6
                        );
                    }
                } else if (this.phase === BOSS_PHASE.PHASE_3) {
                    if (this.attackTimer <= 0) {
                        this.attackTimer = 0.4;
                        this.fireBulletRing(game, 12);
                    }
                    if (this.laserActive) {
                        this.laserAngle += this.laserSweepSpeed * dt;
                        if (this.laserAngle > Math.PI * 2) {
                            this.laserActive = false;
                            this.attackTimer = 0.8;
                        }
                        if (Math.random() < 0.4) {
                            const speed = 300;
                            game.bullets.enemyPool.fireEnemy(
                                this.x - this.coreRadius, this.y,
                                Math.cos(this.laserAngle + Math.PI) * speed,
                                Math.sin(this.laserAngle + Math.PI) * speed, 6
                            );
                        }
                    } else {
                        this.laserAngle = 0;
                        this.laserActive = true;
                        this.laserSweepSpeed = 2.5;
                        game.sound.bossLaser();
                    }
                    this.eyeFlash = Math.sin(this.alive_timer * 8);
                }
            }
        }

        fire3WaySpread(game) {
            const baseAngle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
            const spread = 0.3;
            const speed = 180;
            for (let i = -1; i <= 1; i++) {
                const angle = baseAngle + i * spread;
                game.bullets.enemyPool.fireEnemy(
                    this.x - this.coreRadius, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed
                );
            }
        }

        fireBulletRing(game, count) {
            const speed = 200;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                game.bullets.enemyPool.fireEnemy(
                    this.x, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed, 5
                );
            }
        }

        takeDamage(amount, hitX, hitY) {
            if (!this.active) return false;
            const eyeX = this.x - this.coreRadius;
            const dx = hitX - eyeX;
            const dy = hitY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.coreRadius + 5) {
                this.hp -= amount;
                if (this.hp <= 0) {
                    this.active = false;
                    return true;
                }
            }
            return false;
        }

        checkClawCollision(bullet) {
            for (let i = 0; i < this.claws.length; i++) {
                const claw = this.claws[i];
                if (!claw.active) continue;
                const dx = bullet.x - claw.x;
                const dy = bullet.y - claw.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (claw.radius + bullet.radius)) {
                    if (claw.takeDamage(bullet.damage)) {
                        return 'claw_destroyed';
                    }
                    return 'claw_hit';
                }
            }
            return null;
        }

        checkBodyCollision(playerX, playerY, playerRadius) {
            if (!this.active || !this.entered) return false;
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (this.radius + playerRadius)) return true;
            for (let i = 0; i < this.claws.length; i++) {
                const claw = this.claws[i];
                if (!claw.active) continue;
                const cdx = playerX - claw.x;
                const cdy = playerY - claw.y;
                const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cdist < (claw.radius + playerRadius)) return true;
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

            // Draw claws (behind body)
            for (let i = 0; i < this.claws.length; i++) {
                this.claws[i].render(ctx);
            }

            // Main body
            const pulse = 1 + Math.sin(this.pulsePhase) * 0.05;
            const bodyR = this.radius * pulse;

            ctx.fillStyle = GAME_CONSTANTS.COLOR_BOSS_BODY;
            ctx.beginPath();
            ctx.arc(this.x, this.y, bodyR, 0, Math.PI * 2);
            ctx.fill();

            // Organic veins
            ctx.strokeStyle = GAME_CONSTANTS.COLOR_BOSS_VEIN;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6 + Math.sin(this.veinPhase) * 0.2;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + this.veinPhase * 0.2;
                const veinLen = bodyR * (0.6 + Math.sin(this.veinPhase + i) * 0.2);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.quadraticCurveTo(
                    this.x + Math.cos(angle) * veinLen * 0.5,
                    this.y + Math.sin(angle) * veinLen * 0.5 + Math.sin(this.veinPhase + i * 2) * 10,
                    this.x + Math.cos(angle) * veinLen,
                    this.y + Math.sin(angle) * veinLen
                );
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Core (eye)
            const coreX = this.x - this.coreRadius;
            ctx.fillStyle = GAME_CONSTANTS.COLOR_BOSS_EYE;
            ctx.beginPath();
            ctx.arc(coreX, this.y, this.coreRadius, 0, Math.PI * 2);
            ctx.fill();

            // Eye flash in phase 3
            if (this.phase === BOSS_PHASE.PHASE_3 && this.eyeFlash > 0.5) {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(coreX, this.y, this.coreRadius * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Pupil
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(coreX - 3, this.y, this.coreRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Eye highlight
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(coreX - 8, this.y - 5, 4, 0, Math.PI * 2);
            ctx.fill();

            // Laser beam
            if (this.laserActive && this.phase >= BOSS_PHASE.PHASE_2) {
                ctx.strokeStyle = '#ff0066';
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.7;
                const laserLen = 400;
                const laserEndX = coreX + Math.cos(this.laserAngle + Math.PI) * laserLen;
                const laserEndY = this.y + Math.sin(this.laserAngle + Math.PI) * laserLen;
                ctx.beginPath();
                ctx.moveTo(coreX, this.y);
                ctx.lineTo(laserEndX, laserEndY);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }

    window.GoliathParasite = GoliathParasite;
    window.BOSS_PHASE = BOSS_PHASE;
})();
