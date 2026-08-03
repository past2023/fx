// Bio-Force: Parasite Dawn - Main Game Logic

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = CONSTANTS.CANVAS_WIDTH;
        this.canvas.height = CONSTANTS.CANVAS_HEIGHT;
        
        // Game state
        this.state = 'MENU'; // MENU, PLAYING, BOSS, GAMEOVER, STAGE_CLEAR
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDt = 1/60;
        
        // Game objects
        this.player = null;
        this.background = new Background();
        this.enemySpawner = new EnemySpawner();
        this.boss = null;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        
        // Level timing
        this.levelTime = 0;
        this.bossSpawned = false;
        
        // Global reference for enemy access to player
        GameInstance = this;
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }
    
    handleResize() {
        // Scale canvas while maintaining aspect ratio
        const scaleX = window.innerWidth / CONSTANTS.CANVAS_WIDTH;
        const scaleY = window.innerHeight / CONSTANTS.CANVAS_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        
        this.canvas.style.width = `${CONSTANTS.CANVAS_WIDTH * scale}px`;
        this.canvas.style.height = `${CONSTANTS.CANVAS_HEIGHT * scale}px`;
    }
    
    start() {
        // Initialize sound on first user interaction
        document.addEventListener('click', () => Sound.init(), { once: true });
        document.addEventListener('keydown', () => Sound.init(), { once: true });
        
        this.reset();
        this.state = 'MENU';
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    reset() {
        this.player = new Player(this);
        this.enemySpawner.clear();
        this.boss = null;
        this.bossSpawned = false;
        this.levelTime = 0;
        this.shakeTimer = 0;
        
        PlayerBullets.clear();
        EnemyBullets.clear();
        BossBullets.clear();
        Particles.clear();
        
        GameHUD.clear();
        GameHUD.setLives(this.player.lives);
    }
    
    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Cap delta time to avoid spiral of death
        const dt = Math.min(deltaTime, 0.1);
        
        this.update(dt);
        this.render();
        
        // Reset input transient states
        Input.endFrame();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt) {
        // Update background always
        this.background.update(dt, CONSTANTS.SCROLL_SPEED);
        
        switch (this.state) {
            case 'MENU':
                this.updateMenu(dt);
                break;
            case 'PLAYING':
                this.updatePlaying(dt);
                break;
            case 'BOSS':
                this.updateBoss(dt);
                break;
            case 'GAMEOVER':
            case 'STAGE_CLEAR':
                // Just render, no updates needed
                break;
        }
        
        // Update particles
        Particles.update(dt);
        
        // Update bullets
        PlayerBullets.update(dt);
        EnemyBullets.update(dt);
        BossBullets.update(dt);
        
        // Update HUD
        GameHUD.update(dt);
        if (this.player) {
            GameHUD.setPodAttached(this.player.pod.attached);
        }
        
        // Update screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }
    }
    
    updateMenu(dt) {
        // Check for start input
        if (Input.isKeyPressed('Space') || Input.isKeyPressed('KeyZ') || Input.isKeyPressed('Enter')) {
            this.startGame();
        }
    }
    
    startGame() {
        this.reset();
        this.state = 'PLAYING';
        this.levelTime = 0;
        Sound.init();
    }
    
    updatePlaying(dt) {
        this.levelTime += dt;
        
        // Update player
        this.player.update(dt);
        GameHUD.setLives(this.player.lives);
        
        // Update enemies
        this.enemySpawner.update(dt, CONSTANTS.SCROLL_SPEED);
        
        // Check for boss spawn time
        if (this.levelTime >= CONSTANTS.BOSS_SPAWN_TIME && !this.bossSpawned) {
            this.spawnBoss();
        }
        
        // Show warning before boss
        if (this.levelTime >= CONSTANTS.BOSS_SPAWN_TIME - 5 && 
            this.levelTime < CONSTANTS.BOSS_SPAWN_TIME &&
            !this.bossSpawned) {
            GameHUD.showWarning();
        }
        
        // Collision detection
        this.checkCollisions();
        
        // Check game over
        if (this.player.lives <= 0 && !this.player.dead) {
            this.gameOver();
        }
    }
    
    updateBoss(dt) {
        this.levelTime += dt;
        
        // Update player
        this.player.update(dt);
        
        // Update boss
        if (this.boss && this.boss.active) {
            this.boss.update(dt, 0); // Boss doesn't scroll
            GameHUD.showBossHealth(this.boss.hp, this.boss.maxHp);
        }
        
        // Clear regular enemies during boss fight
        this.enemySpawner.enemies = [];
        
        // Collision detection
        this.checkCollisions();
        
        // Check game over
        if (this.player.lives <= 0 && !this.player.dead) {
            this.gameOver();
        }
    }
    
    spawnBoss() {
        this.bossSpawned = true;
        this.boss = new Boss(CONSTANTS.CANVAS_WIDTH + 100, CONSTANTS.CANVAS_HEIGHT / 2);
        this.state = 'BOSS';
        Sound.playBossWarning();
    }
    
    bossDefeated() {
        this.state = 'STAGE_CLEAR';
        this.shake(1, 3);
        setTimeout(() => {
            GameHUD.showMessage('STAGE CLEAR', 5);
        }, 500);
    }
    
    checkCollisions() {
        // Player bullets vs enemies
        for (const bullet of PlayerBullets.active) {
            if (!bullet.active || !bullet.isPlayer) continue;
            
            // Vs regular enemies
            for (const enemy of this.enemySpawner.enemies) {
                if (enemy.active) {
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < bullet.width/2 + enemy.radius) {
                        bullet.active = false;
                        enemy.takeDamage(bullet.damage);
                        Particles.emit(bullet.x, bullet.y, 3, { color: '#FFFF00' });
                    }
                }
            }
            
            // Vs boss
            if (this.boss && this.boss.active) {
                const dx = bullet.x - this.boss.x;
                const dy = bullet.y - this.boss.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < bullet.width/2 + this.boss.radius) {
                    bullet.active = false;
                    this.boss.takeDamage(bullet.damage, bullet.x, bullet.y);
                    Particles.emit(bullet.x, bullet.y, 3, { color: '#FF00FF' });
                }
            }
        }
        
        // Enemy bullets vs player and pod
        if (this.player && !this.player.dead) {
            // Pod blocks bullets
            this.player.pod.checkBulletCollision(EnemyBullets);
            this.player.pod.checkBulletCollision(BossBullets);
            
            // Check player collision
            this.player.checkBulletCollision(EnemyBullets);
            this.player.checkBulletCollision(BossBullets);
            
            // Check enemy collision
            this.player.checkEnemyCollision(this.enemySpawner.enemies);
            
            // Pod damages enemies
            this.player.pod.checkEnemyCollision(this.enemySpawner.enemies);
            
            // Vs boss
            if (this.boss && this.boss.active) {
                const dx = this.player.x - this.boss.x;
                const dy = this.player.y - this.boss.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < CONSTANTS.PLAYER_HITBOX_RADIUS + this.boss.radius) {
                    this.player.takeDamage();
                }
            }
        }
    }
    
    gameOver() {
        this.state = 'GAMEOVER';
        GameHUD.showMessage('GAME OVER', 5);
    }
    
    addScore(points) {
        GameHUD.setScore(GameHUD.score + points);
    }
    
    shake(intensity = 5, duration = 0.5) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }
    
    render() {
        // Apply screen shake
        this.ctx.save();
        if (this.shakeTimer > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 20;
            const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 20;
            this.ctx.translate(shakeX, shakeY);
        }
        
        // Render background
        this.background.render(this.ctx);
        
        // Render game objects based on state
        switch (this.state) {
            case 'MENU':
                this.renderMenu();
                break;
            case 'PLAYING':
            case 'BOSS':
                this.renderGame();
                break;
            case 'GAMEOVER':
                this.renderGame();
                break;
            case 'STAGE_CLEAR':
                this.renderGame();
                break;
        }
        
        // Render HUD
        GameHUD.render(this.ctx);
        
        this.ctx.restore();
    }
    
    renderMenu() {
        const ctx = this.ctx;
        
        // Title
        ctx.fillStyle = '#00FFFF';
        ctx.font = CONSTANTS.FONT_HUGE;
        ctx.textAlign = 'center';
        ctx.fillText('BIO-FORCE', CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 3);
        
        ctx.fillStyle = '#FF8800';
        ctx.font = CONSTANTS.FONT_LARGE;
        ctx.fillText('PARASITE DAWN', CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 3 + 50);
        
        // Instructions
        ctx.fillStyle = '#FFFFFF';
        ctx.font = CONSTANTS.FONT_MAIN;
        ctx.fillText('Arrow Keys / WASD - Move', CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 + 20);
        ctx.fillText('Z / Space - Fire', CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 + 50);
        ctx.fillText('X - Force Pod Toggle', CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT / 2 + 80);
        
        // Start prompt
        ctx.fillStyle = '#FFFF00';
        ctx.font = CONSTANTS.FONT_LARGE;
        const blink = Math.sin(Date.now() / 300) > 0 ? '' : '...';
        ctx.fillText(`PRESS SPACE TO START${blink}`, CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT * 0.75);
        
        // Credits
        ctx.fillStyle = '#666666';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText('A Classic Side-Scrolling Shoot-em-up', CONSTANTS.CANVAS_WIDTH / 2, CONSTANTS.CANVAS_HEIGHT - 30);
    }
    
    renderGame() {
        const ctx = this.ctx;
        
        // Render enemies
        this.enemySpawner.render(ctx);
        
        // Render boss
        if (this.boss) {
            this.boss.render(ctx);
        }
        
        // Render player
        if (this.player) {
            this.player.render(ctx);
        }
        
        // Render bullets
        PlayerBullets.render(ctx);
        EnemyBullets.render(ctx);
        BossBullets.render(ctx);
        
        // Render particles
        Particles.render(ctx);
    }
}

// Global game instance reference
let GameInstance = null;
