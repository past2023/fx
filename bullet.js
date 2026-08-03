// Bio-Force: Parasite Dawn - Bullet Classes

class Bullet {
    constructor(x, y, vx, vy, isPlayer, damage = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.isPlayer = isPlayer;
        this.damage = damage;
        this.width = 12;
        this.height = 6;
        this.active = true;
        // TODO: Replace with sprite image
        this.sprite = null;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Deactivate if off screen
        if (this.x < -50 || this.x > CONSTANTS.CANVAS_WIDTH + 50 ||
            this.y < -50 || this.y > CONSTANTS.CANVAS_HEIGHT + 50) {
            this.active = false;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        } else {
            // Draw pill-shaped bullet
            ctx.fillStyle = this.isPlayer ? CONSTANTS.COLOR_PLAYER_BULLET : CONSTANTS.COLOR_ENEMY_BULLET;
            ctx.beginPath();
            
            if (Math.abs(this.vx) > Math.abs(this.vy)) {
                // Horizontal bullet
                const radius = this.height / 2;
                ctx.roundRect(this.x - this.width/2, this.y - radius, this.width, this.height, radius);
            } else {
                // Vertical bullet
                const radius = this.width / 2;
                ctx.roundRect(this.x - radius, this.y - this.height/2, this.width, this.height, radius);
            }
            
            ctx.fill();
            
            // Inner glow
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.height/3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            radius: CONSTANTS.BULLET_HITBOX_RADIUS
        };
    }
}

class EnemyBullet extends Bullet {
    constructor(x, y, angle, speed = CONSTANTS.ENEMY_BULLET_SPEED) {
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        super(x, y, vx, vy, false);
    }
}

class BossBullet extends Bullet {
    constructor(x, y, angle, speed = CONSTANTS.BOSS_BULLET_SPEED, size = 1) {
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        super(x, y, vx, vy, false, size);
        this.size = size;
        this.width = 16 * size;
        this.height = 8 * size;
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        } else {
            // Larger boss bullets with different colors based on size
            ctx.fillStyle = this.size > 1 ? '#FF00FF' : CONSTANTS.COLOR_ENEMY_BULLET;
            ctx.beginPath();
            
            const radius = this.height / 2;
            ctx.roundRect(this.x - this.width/2, this.y - radius, this.width, this.height, radius);
            ctx.fill();
            
            // Outer ring for large bullets
            if (this.size > 1) {
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
}

// Object pool for bullets
class BulletPool {
    constructor() {
        this.pool = [];
        this.active = [];
        this.maxPoolSize = 200;
    }
    
    get(x, y, vx, vy, isPlayer, damage = 1) {
        let bullet;
        if (this.pool.length > 0) {
            bullet = this.pool.pop();
            bullet.x = x;
            bullet.y = y;
            bullet.vx = vx;
            bullet.vy = vy;
            bullet.isPlayer = isPlayer;
            bullet.damage = damage;
            bullet.active = true;
        } else {
            bullet = new Bullet(x, y, vx, vy, isPlayer, damage);
        }
        this.active.push(bullet);
        return bullet;
    }
    
    release(bullet) {
        bullet.active = false;
        const index = this.active.indexOf(bullet);
        if (index > -1) {
            this.active.splice(index, 1);
        }
        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(bullet);
        }
    }
    
    update(dt) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const bullet = this.active[i];
            bullet.update(dt);
            if (!bullet.active) {
                this.release(bullet);
            }
        }
    }
    
    render(ctx) {
        for (const bullet of this.active) {
            bullet.render(ctx);
        }
    }
    
    clear() {
        while (this.active.length > 0) {
            this.release(this.active[0]);
        }
    }
}

// Global bullet pools
const PlayerBullets = new BulletPool();
const EnemyBullets = new BulletPool();
