// Bio-Force: Parasite Dawn - Player Ship

class Player {
    constructor(game) {
        this.game = game;
        this.x = 150;
        this.y = CONSTANTS.CANVAS_HEIGHT / 2;
        this.width = 40;
        this.height = 30;
        this.radius = 15;
        this.lives = CONSTANTS.INITIAL_LIVES;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.fireTimer = 0;
        this.dead = false;
        // TODO: Replace with sprite image
        this.sprite = null;
        
        // Create the Force Pod
        this.pod = new ForcePod(this);
    }
    
    update(dt) {
        if (this.dead) return;
        
        // Handle movement input
        const moveX = Input.getHorizontalAxis();
        const moveY = Input.getVerticalAxis();
        
        this.x += moveX * CONSTANTS.PLAYER_SPEED * dt;
        this.y += moveY * CONSTANTS.PLAYER_SPEED * dt;
        
        // Clamp to screen bounds
        this.x = Math.max(CONSTANTS.PLAYER_MIN_X, Math.min(CONSTANTS.PLAYER_MAX_X, this.x));
        this.y = Math.max(this.radius, Math.min(CONSTANTS.CANVAS_HEIGHT - this.radius, this.y));
        
        // Update pod
        this.pod.update(dt);
        
        // Handle firing
        if (this.fireTimer > 0) {
            this.fireTimer -= dt;
        }
        
        if (Input.isFiring() && this.fireTimer <= 0) {
            this.fire();
        }
        
        // Handle pod toggle
        if (Input.isPodTogglePressed()) {
            this.pod.toggle();
        }
        
        // Update invincibility
        if (this.invincible) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }
        
        // Emit engine trail particles
        Particles.emitTrail(
            this.x - this.width/2, 
            this.y + (Math.random() - 0.5) * 10, 
            '#00AAAA', 
            30
        );
    }
    
    fire() {
        this.fireTimer = CONSTANTS.FIRE_RATE;
        Sound.playLaser();
        
        if (this.pod.attached) {
            // Double shot when pod is attached
            PlayerBullets.get(this.x + this.width/2, this.y - 8, CONSTANTS.PLAYER_BULLET_SPEED, 0, true);
            PlayerBullets.get(this.x + this.width/2, this.y + 8, CONSTANTS.PLAYER_BULLET_SPEED, 0, true);
            
            // Pod also fires
            Sound.playPodLaser();
            PlayerBullets.get(this.pod.x + this.pod.radius, this.pod.y, CONSTANTS.PLAYER_BULLET_SPEED, 0, true);
        } else {
            // Single shot when pod is detached
            PlayerBullets.get(this.x + this.width/2, this.y, CONSTANTS.PLAYER_BULLET_SPEED, 0, true);
            
            // Detached pod fires in its current direction (simplified: always forward)
            Sound.playPodLaser();
            PlayerBullets.get(this.pod.x + this.pod.radius, this.pod.y, CONSTANTS.PLAYER_BULLET_SPEED, 0, true);
        }
    }
    
    render(ctx) {
        if (this.dead) return;
        
        // Flicker when invincible
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            return;
        }
        
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        } else {
            // Draw player ship as a sleek triangle
            ctx.fillStyle = CONSTANTS.COLOR_PLAYER;
            
            // Main body
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.x - this.width/2, this.y - this.height/2);
            ctx.lineTo(this.x - this.width/4, this.y);
            ctx.lineTo(this.x - this.width/2, this.y + this.height/2);
            ctx.closePath();
            ctx.fill();
            
            // Cockpit
            ctx.fillStyle = '#006666';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Engine glow
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.moveTo(this.x - this.width/4, this.y - 5);
            ctx.lineTo(this.x - this.width/2 - 10 - Math.random() * 5, this.y);
            ctx.lineTo(this.x - this.width/4, this.y + 5);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
        
        // Render pod
        this.pod.render(ctx);
    }
    
    takeDamage() {
        if (this.invincible || this.dead) return;
        
        // Check if pod can block the damage (handled in collision detection)
        this.die();
    }
    
    die() {
        this.dead = true;
        this.lives--;
        Sound.playPlayerDeath();
        Particles.emitExplosion(this.x, this.y, 'large');
        
        if (this.lives > 0) {
            setTimeout(() => this.respawn(), 1000);
        } else {
            setTimeout(() => this.game.gameOver(), 1000);
        }
    }
    
    respawn() {
        this.x = 150;
        this.y = CONSTANTS.CANVAS_HEIGHT / 2;
        this.dead = false;
        this.invincible = true;
        this.invincibleTimer = CONSTANTS.PLAYER_INVINCIBILITY_TIME;
        this.pod.attached = true;
        this.pod.x = this.x + CONSTANTS.POD_OFFSET_ATTACHED;
        this.pod.y = this.y;
    }
    
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            radius: CONSTANTS.PLAYER_HITBOX_RADIUS
        };
    }
    
    // Check if player collides with enemy bullets
    checkBulletCollision(bullets) {
        if (this.invincible || this.dead) return false;
        
        for (let i = bullets.active.length - 1; i >= 0; i--) {
            const bullet = bullets.active[i];
            if (!bullet.isPlayer && bullet.active) {
                const dx = bullet.x - this.x;
                const dy = bullet.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < CONSTANTS.PLAYER_HITBOX_RADIUS + CONSTANTS.BULLET_HITBOX_RADIUS) {
                    bullet.active = false;
                    this.takeDamage();
                    return true;
                }
            }
        }
        return false;
    }
    
    // Check if player collides with enemies
    checkEnemyCollision(enemies) {
        if (this.invincible || this.dead) return false;
        
        for (const enemy of enemies) {
            if (enemy.active && !enemy.invulnerable) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < CONSTANTS.PLAYER_HITBOX_RADIUS + enemy.radius) {
                    this.takeDamage();
                    enemy.takeDamage(1);
                    return true;
                }
            }
        }
        return false;
    }
}
