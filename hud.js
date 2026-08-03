// Bio-Force: Parasite Dawn - HUD (Heads Up Display)

class HUD {
    constructor() {
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('bioforce_highscore')) || 0;
        this.lives = CONSTANTS.INITIAL_LIVES;
        this.bossHpVisible = false;
        this.bossHp = 100;
        this.bossMaxHp = CONSTANTS.BOSS_HP;
        this.podAttached = true;
        this.warningTimer = 0;
        this.message = '';
        this.messageTimer = 0;
    }
    
    update(dt) {
        if (this.warningTimer > 0) {
            this.warningTimer -= dt;
        }
        if (this.messageTimer > 0) {
            this.messageTimer -= dt;
        }
    }
    
    setScore(score) {
        this.score = score;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('bioforce_highscore', this.highScore);
        }
    }
    
    setLives(lives) {
        this.lives = lives;
    }
    
    showBossHealth(hp, maxHp) {
        this.bossHpVisible = true;
        this.bossHp = hp;
        this.bossMaxHp = maxHp;
    }
    
    hideBossHealth() {
        this.bossHpVisible = false;
    }
    
    setPodAttached(attached) {
        this.podAttached = attached;
    }
    
    showWarning(duration = 3) {
        this.warningTimer = duration;
        Sound.playBossWarning();
    }
    
    showMessage(text, duration = 2) {
        this.message = text;
        this.messageTimer = duration;
    }
    
    render(ctx) {
        // Score (top left)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = CONSTANTS.FONT_MAIN;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score.toString().padStart(6, '0')}`, 20, 30);
        
        // High Score (below score)
        ctx.fillStyle = '#888888';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText(`HI: ${this.highScore.toString().padStart(6, '0')}`, 20, 50);
        
        // Lives (top right)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = CONSTANTS.FONT_MAIN;
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${this.lives}`, CONSTANTS.CANVAS_WIDTH - 20, 30);
        
        // Pod status indicator (below lives)
        const podStatus = this.podAttached ? 'ATTACHED' : 'DETACHED';
        const podColor = this.podAttached ? '#00FF00' : '#FF8800';
        ctx.fillStyle = podColor;
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText(`FORCE: ${podStatus}`, CONSTANTS.CANVAS_WIDTH - 20, 50);
        
        // Boss health bar (top center, appears during boss fight)
        if (this.bossHpVisible) {
            const barWidth = 400;
            const barHeight = 20;
            const barX = (CONSTANTS.CANVAS_WIDTH - barWidth) / 2;
            const barY = 10;
            
            // Background
            ctx.fillStyle = '#330033';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Health fill
            const hpPercent = this.bossHp / this.bossMaxHp;
            const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            gradient.addColorStop(0, '#FF0000');
            gradient.addColorStop(0.5, '#FFFF00');
            gradient.addColorStop(1, '#00FF00');
            ctx.fillStyle = gradient;
            ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * hpPercent, barHeight - 4);
            
            // Border
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            // Label
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GOLIATH PARASITE', CONSTANTS.CANVAS_WIDTH / 2, barY + barHeight + 15);
        }
        
        // Warning message (before boss)
        if (this.warningTimer > 0) {
            const alpha = Math.min(1, this.warningTimer / 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FF0000';
            ctx.font = CONSTANTS.FONT_HUGE;
            ctx.textAlign = 'center';
            ctx.fillText('WARNING', CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2);
            ctx.restore();
        }
        
        // Custom messages
        if (this.message && this.messageTimer > 0) {
            const alpha = Math.min(1, this.messageTimer / 0.5);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFFF00';
            ctx.font = CONSTANTS.FONT_LARGE;
            ctx.textAlign = 'center';
            ctx.fillText(this.message, CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 3);
            ctx.restore();
        }
    }
    
    clear() {
        this.score = 0;
        this.lives = CONSTANTS.INITIAL_LIVES;
        this.bossHpVisible = false;
        this.warningTimer = 0;
        this.message = '';
        this.messageTimer = 0;
    }
}

// Global HUD instance
const GameHUD = new HUD();
