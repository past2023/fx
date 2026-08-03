// Bio-Force: Parasite Dawn - Enemy Classes

class Enemy {
    constructor(x, y, hp, scoreValue) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = hp;
        this.scoreValue = scoreValue;
        this.active = true;
        this.invulnerable = false;
        this.radius = 20;
        this.vx = 0;
        this.vy = 0;
        this.shootTimer = 0;
        this.shootInterval = 2;
        // TODO: Replace with sprite image
        this.sprite = null;
    }
    
    update(dt, scrollSpeed) {
        this.x -= scrollSpeed * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        if (this.shootTimer > 0) {
            this.shootTimer -= dt;
        }
        
        // Deactivate if off screen left
        if (this.x < -50) {
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Default enemy rendering (override in subclasses)
            ctx.fillStyle = CONSTANTS.COLOR_ENEMY_DRONE;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    takeDamage(amount) {
        if (this.invulnerable) return;
        
        this.hp -= amount;
        Sound.playHit();
        
        if (this.hp <= 0) {
            this.destroy();
        }
    }
    
    destroy() {
        this.active = false;
        Particles.emitExplosion(this.x, this.y, 'small');
        GameInstance.addScore(this.scoreValue);
    }
    
    shoot(angle = Math.PI) {
        EnemyBullets.get(this.x, this.y, angle, CONSTANTS.ENEMY_BULLET_SPEED, false);
        Sound.playEnemyBullet();
    }
}

// Basic drone enemy - moves in sine wave pattern
class DroneEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 2, CONSTANTS.SCORE_ENEMY_DRONE);
        this.radius = 15;
        this.amplitude = 50;
        this.frequency = 2;
        this.phase = Math.random() * Math.PI * 2;
        this.startY = y;
    }
    
    update(dt, scrollSpeed) {
        super.update(dt, scrollSpeed);
        
        // Sine wave movement
        this.y = this.startY + Math.sin((this.x / 100) * this.frequency + this.phase) * this.amplitude;
        
        // Shoot occasionally
        if (this.shootTimer <= 0 && this.x < CONSTANTS.CANVAS_WIDTH - 50) {
            this.shoot(Math.PI);
            this.shootTimer = 1.5 + Math.random();
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Diamond shape
            ctx.fillStyle = CONSTANTS.COLOR_ENEMY_DRONE;
            ctx.beginPath();
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x, this.y - this.radius);
            ctx.lineTo(this.x - this.radius, this.y);
            ctx.lineTo(this.x, this.y + this.radius);
            ctx.closePath();
            ctx.fill();
            
            // Core
            ctx.fillStyle = '#FF6600';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius/3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Turret enemy - stationary, fires aimed shots
class TurretEnemy extends Enemy {
    constructor(x, y, onCeiling) {
        super(x, y, 3, CONSTANTS.SCORE_ENEMY_TURRET);
        this.radius = 18;
        this.onCeiling = onCeiling;
        this.vx = 0;
    }
    
    update(dt, scrollSpeed) {
        super.update(dt, scrollSpeed);
        
        // Fire aimed shots at player
        if (this.shootTimer <= 0 && GameInstance && GameInstance.player) {
            const dx = GameInstance.player.x - this.x;
            const dy = GameInstance.player.y - this.y;
            const angle = Math.atan2(dy, dx);
            this.shoot(angle);
            this.shootTimer = 2;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Box shape with turret
            ctx.fillStyle = CONSTANTS.COLOR_ENEMY_TURRET;
            ctx.fillRect(this.x - this.radius, this.y - this.radius/2, this.radius * 2, this.radius);
            
            // Turret barrel pointing at player
            if (GameInstance && GameInstance.player) {
                const angle = Math.atan2(GameInstance.player.y - this.y, GameInstance.player.x - this.x);
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(angle);
                ctx.fillStyle = '#AA44FF';
                ctx.fillRect(0, -5, this.radius + 10, 10);
                ctx.restore();
            }
            
            // Eye
            ctx.fillStyle = '#FF00FF';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Swarm enemy - fast, low HP
class SwarmEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 1, CONSTANTS.SCORE_ENEMY_SWARM);
        this.radius = 12;
        this.vx = -100;
        this.targetY = y;
    }
    
    update(dt, scrollSpeed) {
        super.update(dt, scrollSpeed);
        
        // Move toward player's Y position slowly
        if (GameInstance && GameInstance.player) {
            const dy = GameInstance.player.y - this.y;
            this.vy = Math.sign(dy) * 50;
        }
        
        // Don't shoot, just ram
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Arrow/triangle shape pointing left
            ctx.fillStyle = CONSTANTS.COLOR_ENEMY_SWARM;
            ctx.beginPath();
            ctx.moveTo(this.x - this.radius, this.y);
            ctx.lineTo(this.x + this.radius, this.y - this.radius/2);
            ctx.lineTo(this.x + this.radius, this.y + this.radius/2);
            ctx.closePath();
            ctx.fill();
            
            // Engine trail effect
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(this.x + this.radius/2, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Mid-boss worm enemy
class MidBossEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 30, CONSTANTS.SCORE_ENEMY_MIDBOSS);
        this.radius = 40;
        this.width = 80;
        this.height = 60;
        this.startY = y;
        this.time = 0;
        this.segmentCount = 5;
        this.segments = [];
        
        for (let i = 0; i < this.segmentCount; i++) {
            this.segments.push({ x: x - i * 30, y: y });
        }
    }
    
    update(dt, scrollSpeed) {
        this.time += dt;
        
        // Weaving vertical movement
        this.y = this.startY + Math.sin(this.time * 0.5) * 100;
        this.x -= scrollSpeed * dt * 0.5; // Slower scroll
        
        // Update segments to follow head
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            const targetX = this.x - (i + 1) * 30;
            const targetY = this.y + Math.sin(this.time * 0.5 + i * 0.5) * 50;
            seg.x += (targetX - seg.x) * 5 * dt;
            seg.y += (targetY - seg.y) * 5 * dt;
        }
        
        // Shoot slow orbs
        if (this.shootTimer <= 0) {
            // Fire 3-way spread
            for (let i = -1; i <= 1; i++) {
                const angle = Math.PI + i * 0.3;
                EnemyBullets.get(this.x - this.width/2, this.y, angle, 150, false);
            }
            this.shootTimer = 1.5;
        }
        
        // Deactivate when off screen
        if (this.x < -this.width) {
            this.active = false;
        }
    }
    
    takeDamage(amount) {
        super.takeDamage(amount);
        // Flash effect handled by hit sound
    }
    
    destroy() {
        this.active = false;
        Particles.emitExplosion(this.x, this.y, 'large');
        GameInstance.addScore(this.scoreValue);
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        } else {
            // Draw worm segments
            for (let i = this.segments.length - 1; i >= 0; i--) {
                const seg = this.segments[i];
                const size = this.radius * (1 - i * 0.15);
                
                ctx.fillStyle = i === 0 ? '#8800FF' : '#6600AA';
                ctx.beginPath();
                ctx.arc(seg.x, seg.y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Eyes on head
                if (i === 0) {
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath();
                    ctx.arc(seg.x + 10, seg.y - 15, 8, 0, Math.PI * 2);
                    ctx.arc(seg.x + 10, seg.y + 15, 8, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Mouth
                    ctx.fillStyle = '#440044';
                    ctx.beginPath();
                    ctx.arc(seg.x + 20, seg.y, 15, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
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

// Enemy spawner manager
class EnemySpawner {
    constructor() {
        this.enemies = [];
        this.spawnTimer = 0;
        this.waveTime = 0;
    }
    
    update(dt, scrollSpeed) {
        this.waveTime += dt;
        
        // Spawn enemies based on wave timing
        this.spawnWave(dt);
        
        // Update all enemies
        for (const enemy of this.enemies) {
            enemy.update(dt, scrollSpeed);
        }
        
        // Remove inactive enemies
        this.enemies = this.enemies.filter(e => e.active);
    }
    
    spawnWave(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer > 0) return;
        
        const time = this.waveTime;
        
        // Wave 1: Drones (0-10s)
        if (time >= CONSTANTS.WAVE_DRONE_START && time < CONSTANTS.WAVE_DRONE_END) {
            this.spawnTimer = 0.8;
            const y = 50 + Math.random() * (CONSTANTS.CANVAS_HEIGHT - 100);
            this.enemies.push(new DroneEnemy(CONSTANTS.CANVAS_WIDTH + 50, y));
        }
        // Wave 2: Turrets (10-20s)
        else if (time >= CONSTANTS.WAVE_TURRET_START && time < CONSTANTS.WAVE_TURRET_END) {
            this.spawnTimer = 1.5;
            const onCeiling = Math.random() > 0.5;
            const y = onCeiling ? 40 : CONSTANTS.CANVAS_HEIGHT - 40;
            this.enemies.push(new TurretEnemy(CONSTANTS.CANVAS_WIDTH + 50, y, onCeiling));
        }
        // Wave 3: Swarm (20-35s)
        else if (time >= CONSTANTS.WAVE_SWARM_START && time < CONSTANTS.WAVE_SWARM_END) {
            this.spawnTimer = 0.3;
            const y = 50 + Math.random() * (CONSTANTS.CANVAS_HEIGHT - 100);
            this.enemies.push(new SwarmEnemy(CONSTANTS.CANVAS_WIDTH + 50, y));
            
            // Occasionally spawn a group
            if (Math.random() > 0.7) {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        this.enemies.push(new SwarmEnemy(CONSTANTS.CANVAS_WIDTH + 50, y + (i - 1) * 40));
                    }, i * 200);
                }
            }
        }
        // Wave 4: Mid-boss (35-50s)
        else if (time >= CONSTANTS.WAVE_MIDBOSS_START && time < CONSTANTS.WAVE_MIDBOSS_END) {
            if (time - CONSTANTS.WAVE_MIDBOSS_START < 0.1) {
                this.enemies.push(new MidBossEnemy(CONSTANTS.CANVAS_WIDTH + 100, CONSTANTS.CANVAS_HEIGHT / 2));
            }
        }
        // Wave 5: Calm (50-65s) - no spawns, just warning at end
    }
    
    render(ctx) {
        for (const enemy of this.enemies) {
            enemy.render(ctx);
        }
    }
    
    clear() {
        this.enemies = [];
        this.waveTime = 0;
        this.spawnTimer = 0;
    }
}
