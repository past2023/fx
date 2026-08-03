// Bio-Force: Parasite Dawn - Boss Class

class Boss extends Enemy {
    constructor(x, y) {
        super(x, y, CONSTANTS.BOSS_HP, CONSTANTS.SCORE_BOSS);
        this.radius = 60;
        this.width = 120;
        this.height = 100;
        this.targetX = CONSTANTS.BOSS_ENTER_X;
        this.entering = true;
        this.phase = 1;
        this.phaseTimer = 0;
        this.attackTimer = 0;
        this.clawLeft = { x: x - 50, y: y - 40, active: true, hp: 10 };
        this.clawRight = { x: x + 50, y: y - 40, active: true, hp: 10 };
        this.laserAngle = 0;
        this.eyeFlash = 0;
        // TODO: Replace with sprite image
        this.sprite = null;
    }
    
    update(dt, scrollSpeed) {
        if (this.entering) {
            // Enter from right
            this.x -= scrollSpeed * dt * 0.3;
            if (this.x <= this.targetX) {
                this.x = this.targetX;
                this.entering = false;
                Sound.playBossEnter();
            }
        } else {
            // Hover in place with slight movement
            this.y += Math.sin(Date.now() / 500) * 0.5;
            
            // Update phase based on HP
            this.updatePhase();
            
            // Attack patterns
            this.updateAttacks(dt);
        }
        
        // Update claws
        this.updateClaws(dt);
        
        // Flash effect for invulnerability
        if (this.eyeFlash > 0) {
            this.eyeFlash -= dt;
        }
    }
    
    updatePhase() {
        const hpPercent = this.hp / CONSTANTS.BOSS_HP;
        
        if (hpPercent < 0.4) {
            this.phase = 3;
        } else if (hpPercent < 0.7) {
            this.phase = 2;
        } else {
            this.phase = 1;
        }
    }
    
    updateAttacks(dt) {
        this.attackTimer -= dt;
        this.phaseTimer += dt;
        
        if (this.attackTimer <= 0) {
            switch (this.phase) {
                case 1:
                    // 3-way spread from eye
                    this.shootSpread(Math.PI, 0.3);
                    this.attackTimer = 1.0;
                    break;
                    
                case 2:
                    // Rotating laser sweep
                    this.fireLaserSweep();
                    this.attackTimer = 1.5;
                    break;
                    
                case 3:
                    // Rapid bullet rings
                    this.fireBulletRing();
                    this.attackTimer = 0.5;
                    break;
            }
        }
    }
    
    updateClaws(dt) {
        const clawOffset = 50;
        
        if (this.phase >= 2) {
            // Claws detach and move independently
            this.clawLeft.x = this.x - 70 + Math.sin(this.phaseTimer * 2) * 20;
            this.clawLeft.y = this.y - 40 + Math.cos(this.phaseTimer * 1.5) * 30;
            
            this.clawRight.x = this.x + 70 + Math.sin(this.phaseTimer * 2.2) * 20;
            this.clawRight.y = this.y - 40 + Math.cos(this.phaseTimer * 1.7) * 30;
            
            // Claws fire occasionally
            if (this.clawLeft.active && Math.random() < 0.02) {
                this.shootFrom(this.clawLeft.x, this.clawLeft.y, Math.PI);
            }
            if (this.clawRight.active && Math.random() < 0.02) {
                this.shootFrom(this.clawRight.x, this.clawRight.y, Math.PI);
            }
        } else {
            // Claws attached
            this.clawLeft.x = this.x - 50;
            this.clawLeft.y = this.y - 40;
            this.clawRight.x = this.x + 50;
            this.clawRight.y = this.y - 40;
        }
    }
    
    shootSpread(baseAngle, spread) {
        for (let i = -1; i <= 1; i++) {
            const angle = baseAngle + i * spread;
            BossBullets.get(this.x, this.y, angle, CONSTANTS.BOSS_BULLET_SPEED, 1);
        }
        Sound.playEnemyBullet();
    }
    
    shootFrom(x, y, angle) {
        EnemyBullets.get(x, y, angle, CONSTANTS.ENEMY_BULLET_SPEED, false);
        Sound.playEnemyBullet();
    }
    
    fireLaserSweep() {
        // Fire a rotating sweep of bullets
        const startAngle = -Math.PI/2;
        const endAngle = Math.PI/2;
        const count = 8;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const angle = startAngle + (endAngle - startAngle) * (i / count);
                BossBullets.get(this.x, this.y, angle, CONSTANTS.BOSS_BULLET_SPEED * 1.5, 1);
            }, i * 100);
        }
        Sound.playEnemyBullet();
    }
    
    fireBulletRing() {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            BossBullets.get(this.x, this.y, angle, CONSTANTS.BOSS_BULLET_SPEED, 1);
        }
        Sound.playEnemyBullet();
    }
    
    takeDamage(amount, hitX, hitY) {
        if (this.invulnerable || this.eyeFlash > 0) return;
        
        // Check if hitting claws
        if (this.phase >= 2) {
            const dxLeft = hitX - this.clawLeft.x;
            const dyLeft = hitY - this.clawLeft.y;
            if (Math.sqrt(dxLeft*dxLeft + dyLeft*dyLeft) < 25 && this.clawLeft.active) {
                this.clawLeft.hp -= amount;
                if (this.clawLeft.hp <= 0) {
                    this.clawLeft.active = false;
                    Particles.emitExplosion(this.clawLeft.x, this.clawLeft.y, 'medium');
                }
                Sound.playHit();
                return;
            }
            
            const dxRight = hitX - this.clawRight.x;
            const dyRight = hitY - this.clawRight.y;
            if (Math.sqrt(dxRight*dxRight + dyRight*dyRight) < 25 && this.clawRight.active) {
                this.clawRight.hp -= amount;
                if (this.clawRight.hp <= 0) {
                    this.clawRight.active = false;
                    Particles.emitExplosion(this.clawRight.x, this.clawRight.y, 'medium');
                }
                Sound.playHit();
                return;
            }
        }
        
        // Hit the main body/eye
        this.hp -= amount;
        this.eyeFlash = 0.1;
        Sound.playHit();
        
        if (this.hp <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        this.active = false;
        Particles.emitExplosion(this.x, this.y, 'boss');
        GameInstance.addScore(this.scoreValue);
        GameInstance.bossDefeated();
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        } else {
            // Draw bio-mechanical boss
            
            // Main body - pulsing organic circle
            const pulse = 1 + Math.sin(Date.now() / 200) * 0.05;
            
            ctx.fillStyle = CONSTANTS.COLOR_BOSS;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.width/2 * pulse, this.height/2 * pulse, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Organic veins
            ctx.strokeStyle = CONSTANTS.COLOR_BOSS_VEINS;
            ctx.lineWidth = 3;
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI - Math.PI/2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + Math.cos(angle) * this.width/2 * pulse,
                    this.y + Math.sin(angle) * this.height/2 * pulse
                );
                ctx.stroke();
            }
            
            // Central eye (weak point)
            const eyeColor = this.eyeFlash > 0 ? '#FFFFFF' : CONSTANTS.COLOR_BOSS_EYE;
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Eye pupil
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Claws
            this.renderClaw(ctx, this.clawLeft, -1);
            this.renderClaw(ctx, this.clawRight, 1);
        }
        
        ctx.restore();
    }
    
    renderClaw(ctx, claw, direction) {
        if (!claw.active) return;
        
        ctx.save();
        ctx.translate(claw.x, claw.y);
        ctx.scale(direction, 1);
        
        // Claw body
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Mechanical segments
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.stroke();
        
        // Orb on claw (destructible in phase 2)
        ctx.fillStyle = '#FF00FF';
        ctx.beginPath();
        ctx.arc(15, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            radius: this.radius
        };
    }
}

// Boss bullet pool
const BossBullets = new BulletPool();
