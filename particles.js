// Bio-Force: Parasite Dawn - Particle System

class Particle {
    constructor(x, y, vx, vy, life, color, size) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = size;
        this.alpha = 1;
        // TODO: Replace with sprite image
        this.sprite = null;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
        this.alpha = this.life / this.maxLife;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.sprite) {
            // TODO: Replace with sprite image
            ctx.drawImage(this.sprite, this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.pool = [];
        this.maxPoolSize = 500;
    }
    
    // Get a particle from pool or create new
    getParticle(x, y, vx, vy, life, color, size) {
        let particle;
        if (this.pool.length > 0) {
            particle = this.pool.pop();
            particle.x = x;
            particle.y = y;
            particle.vx = vx;
            particle.vy = vy;
            particle.life = life;
            particle.maxLife = life;
            particle.color = color;
            particle.size = size;
            particle.alpha = 1;
        } else {
            particle = new Particle(x, y, vx, vy, life, color, size);
        }
        return particle;
    }
    
    // Return particle to pool
    releaseParticle(particle) {
        if (this.pool.length < this.maxPoolSize) {
            this.pool.push(particle);
        }
    }
    
    emit(x, y, count, options = {}) {
        const vxMin = options.vxMin || -50;
        const vxMax = options.vxMax || 50;
        const vyMin = options.vyMin || -50;
        const vyMax = options.vyMax || 50;
        const lifeMin = options.lifeMin || 0.3;
        const lifeMax = options.lifeMax || 0.8;
        const color = options.color || '#FFFFFF';
        const sizeMin = options.sizeMin || 2;
        const sizeMax = options.sizeMax || 4;
        
        for (let i = 0; i < count; i++) {
            const vx = vxMin + Math.random() * (vxMax - vxMin);
            const vy = vyMin + Math.random() * (vyMax - vyMin);
            const life = lifeMin + Math.random() * (lifeMax - lifeMin);
            const size = sizeMin + Math.random() * (sizeMax - sizeMin);
            
            const particle = this.getParticle(x, y, vx, vy, life, color, size);
            this.particles.push(particle);
        }
    }
    
    emitExplosion(x, y, size = 'medium') {
        let count, colors, speed;
        
        switch (size) {
            case 'small':
                count = 15;
                colors = ['#FF6600', '#FFAA00', '#FFFF00'];
                speed = 100;
                break;
            case 'large':
                count = 50;
                colors = ['#FF0000', '#FF6600', '#FFAA00', '#FFFF00', '#FFFFFF'];
                speed = 200;
                break;
            case 'boss':
                count = 100;
                colors = ['#8800FF', '#FF0000', '#FF6600', '#FFAA00', '#FFFFFF'];
                speed = 300;
                break;
            default:
                count = 30;
                colors = ['#FF6600', '#FFAA00', '#FFFF00'];
                speed = 150;
        }
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (Math.random() * 0.5 + 0.5) * speed;
            const vx = Math.cos(angle) * spd;
            const vy = Math.sin(angle) * spd;
            const life = 0.5 + Math.random() * 0.5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const sizeVal = 2 + Math.random() * 4;
            
            const particle = this.getParticle(x, y, vx, vy, life, color, sizeVal);
            this.particles.push(particle);
        }
    }
    
    emitTrail(x, y, color, speed = 50) {
        const vx = (Math.random() - 0.5) * speed;
        const vy = (Math.random() - 0.5) * speed;
        const particle = this.getParticle(x, y, vx, vy, 0.2, color, 2 + Math.random() * 2);
        this.particles.push(particle);
    }
    
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(dt);
            
            if (particle.isDead()) {
                this.releaseParticle(particle);
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }
    
    clear() {
        while (this.particles.length > 0) {
            this.releaseParticle(this.particles.pop());
        }
    }
}

// Global particle system instance
const Particles = new ParticleSystem();
