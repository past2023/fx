// Bio-Force: Parasite Dawn - Background System

class Background {
    constructor() {
        this.stars = [];
        this.starCount = 100;
        this.organicOffset = 0;
        this.metalOffset = 0;
        
        // Initialize stars with different layers for parallax
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * CONSTANTS.CANVAS_WIDTH,
                y: Math.random() * CONSTANTS.CANVAS_HEIGHT,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
    }
    
    update(dt, scrollSpeed) {
        // Update stars with parallax effect
        for (const star of this.stars) {
            star.x -= star.speed * scrollSpeed * dt * 0.5;
            
            // Wrap around
            if (star.x < 0) {
                star.x = CONSTANTS.CANVAS_WIDTH;
                star.y = Math.random() * CONSTANTS.CANVAS_HEIGHT;
            }
        }
        
        // Update organic layer animation
        this.organicOffset += scrollSpeed * dt * 0.3;
        if (this.organicOffset > CONSTANTS.CANVAS_WIDTH) {
            this.organicOffset = 0;
        }
        
        // Update metal grid layer
        this.metalOffset += scrollSpeed * dt * 0.2;
        if (this.metalOffset > CONSTANTS.CANVAS_WIDTH) {
            this.metalOffset = 0;
        }
    }
    
    render(ctx) {
        // Clear with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT);
        
        // Render starfield (back layer)
        this.renderStars(ctx);
        
        // Render bio-mechanical environment (front layer)
        this.renderOrganicLayer(ctx);
        this.renderMetalGrid(ctx);
    }
    
    renderStars(ctx) {
        for (const star of this.stars) {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderOrganicLayer(ctx) {
        ctx.strokeStyle = CONSTANTS.COLOR_BG_ORGANIC;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        
        // Draw pulsing organic lines/tubes
        const tubeSpacing = 150;
        const pulseAmount = Math.sin(Date.now() / 500) * 5;
        
        for (let i = 0; i < CONSTANTS.CANVAS_WIDTH + tubeSpacing; i += tubeSpacing) {
            const x = i - this.organicOffset;
            
            // Vertical organic tubes
            ctx.beginPath();
            ctx.moveTo(x, 0);
            
            // Wavy line
            for (let y = 0; y < CONSTANTS.CANVAS_HEIGHT; y += 20) {
                const wave = Math.sin(y * 0.05 + Date.now() / 1000) * 10 + pulseAmount;
                ctx.lineTo(x + wave, y);
            }
            
            ctx.stroke();
            
            // Connecting horizontal veins
            if (i % (tubeSpacing * 2) === 0) {
                for (let y = 100; y < CONSTANTS.CANVAS_HEIGHT; y += 200) {
                    ctx.beginPath();
                    const startX = x;
                    const endX = x + tubeSpacing - this.organicOffset % tubeSpacing;
                    
                    ctx.moveTo(startX, y);
                    ctx.quadraticCurveTo(
                        (startX + endX) / 2,
                        y + Math.sin(Date.now() / 500 + y) * 20,
                        endX, y
                    );
                    ctx.stroke();
                }
            }
        }
        
        ctx.globalAlpha = 1;
    }
    
    renderMetalGrid(ctx) {
        ctx.strokeStyle = CONSTANTS.COLOR_BG_METAL;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        
        const gridSize = 80;
        
        // Horizontal grid lines
        for (let y = 0; y < CONSTANTS.CANVAS_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CONSTANTS.CANVAS_WIDTH, y);
            ctx.stroke();
        }
        
        // Vertical grid lines (scrolling)
        for (let i = 0; i < CONSTANTS.CANVAS_WIDTH + gridSize; i += gridSize) {
            const x = i - this.metalOffset;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONSTANTS.CANVAS_HEIGHT);
            ctx.stroke();
        }
        
        // Add some metallic panels
        ctx.fillStyle = 'rgba(68, 68, 68, 0.2)';
        for (let i = 0; i < 5; i++) {
            const panelX = ((i * 200) - this.metalOffset * 0.5) % (CONSTANTS.CANVAS_WIDTH + 200) - 100;
            const panelY = 50 + i * 100;
            ctx.fillRect(panelX, panelY, 150, 60);
            
            // Panel details
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            ctx.strokeRect(panelX + 10, panelY + 10, 130, 40);
        }
        
        ctx.globalAlpha = 1;
    }
}
