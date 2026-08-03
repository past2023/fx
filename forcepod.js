// Bio-Force: Parasite Dawn - Force Pod

class ForcePod {
    constructor(player) {
        this.player = player;
        this.x = player.x + CONSTANTS.POD_OFFSET_ATTACHED;
        this.y = player.y;
        this.attached = true;
        this.targetX = this.x;
        this.targetY = this.y;
        this.radius = 15;
        this.toggleCooldown = 0;
        this.angle = 0; // For orbital movement when detached
        // TODO: Replace with sprite image
        this.sprite = null;
    }
    
    update(dt) {
        if (this.toggleCooldown > 0) {
            this.toggleCooldown -= dt;
        }
        
        if (this.attached) {
            // When attached, pod stays in front of player
            this.targetX = this.player.x + CONSTANTS.POD_OFFSET_ATTACHED;
            this.targetY = this.player.y;
            
            // Smooth follow for slight delay effect
            this.x += (this.targetX - this.x) * 10 * dt;
            this.y += (this.targetY - this.y) * 10 * dt;
        } else {
            // When detached, pod follows with delay and can orbit
            const offsetX = Math.cos(this.angle) * 40;
            const offsetY = Math.sin(this.angle) * 40;
            
            this.targetX = this.player.x + offsetX;
            this.targetY = this.player.y + offsetY;
            
            // Slower follow when detached
            this.x += (this.targetX - this.x) * 3 * dt;
            this.y += (this.targetY - this.y) * 3 * dt;
            
            // Slowly rotate around player
            this.angle += dt * 0.5;
        }
        
        // Keep pod in bounds
        this.x = Math.max(this.radius, Math.min(CONSTANTS.CANVAS_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONSTANTS.CANVAS_HEIGHT - this.radius, this.y));
    }
    
    render(ctx) {
        ctx.save();
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else {
            // Draw spherical pod with glow effect
            // Outer glow
            const gradient = ctx.createRadialGradient(
                this.x, this.y, this.radius * 0.5,
                this.x, this.y, this.radius * 1.5
            );
            gradient.addColorStop(0, CONSTANTS.COLOR_POD);
            gradient.addColorStop(0.5, 'rgba(255, 136, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Core sphere
            ctx.fillStyle = CONSTANTS.COLOR_POD;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Energy ring when detached
            if (!this.attached) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    toggle() {
        if (this.toggleCooldown > 0) return;
        
        this.attached = !this.attached;
        this.toggleCooldown = CONSTANTS.POD_TOGGLE_COOLDOWN;
        Sound.playPodToggle();
    }
    
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            radius: CONSTANTS.POD_HITBOX_RADIUS
        };
    }
    
    // Check collision with enemy bullets (pod blocks bullets)
    checkBulletCollision(bullets) {
        for (let i = bullets.active.length - 1; i >= 0; i--) {
            const bullet = bullets.active[i];
            if (!bullet.isPlayer && bullet.active) {
                const dx = bullet.x - this.x;
                const dy = bullet.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.radius + CONSTANTS.BULLET_HITBOX_RADIUS) {
                    bullet.active = false;
                    Particles.emit(bullet.x, bullet.y, 5, {
                        color: '#FF8800',
                        vxMin: -30, vxMax: 30,
                        vyMin: -30, vyMax: 30
                    });
                    return true;
                }
            }
        }
        return false;
    }
    
    // Check collision with enemies (pod damages enemies on contact)
    checkEnemyCollision(enemies) {
        for (const enemy of enemies) {
            if (enemy.active && !enemy.invulnerable) {
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.radius + enemy.radius) {
                    enemy.takeDamage(1);
                    return true;
                }
            }
        }
        return false;
    }
}
