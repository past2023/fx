// Bio-Force: Parasite Dawn - Input Handler

class InputHandler {
    constructor() {
        this.keys = {};
        this.keyPressed = {}; // Tracks keys pressed this frame
        this.keyReleased = {}; // Tracks keys released this frame
        
        // Bind event listeners
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Prevent default behavior for game keys
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyZ', 'KeyX', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        gameKeys.forEach(key => {
            document.addEventListener('keydown', (e) => {
                if (e.code === key) e.preventDefault();
            });
        });
    }
    
    onKeyDown(e) {
        if (!this.keys[e.code]) {
            this.keyPressed[e.code] = true;
        }
        this.keys[e.code] = true;
    }
    
    onKeyUp(e) {
        this.keys[e.code] = false;
        this.keyReleased[e.code] = true;
    }
    
    // Called at the start of each frame to reset transient states
    endFrame() {
        this.keyPressed = {};
        this.keyReleased = {};
    }
    
    // Check if a key is currently held
    isKeyDown(code) {
        return this.keys[code] === true;
    }
    
    // Check if a key was just pressed this frame
    isKeyPressed(code) {
        return this.keyPressed[code] === true;
    }
    
    // Check if a key was just released this frame
    isKeyReleased(code) {
        return this.keyReleased[code] === true;
    }
    
    // Get movement direction (-1, 0, or 1)
    getHorizontalAxis() {
        let axis = 0;
        if (this.isKeyDown('ArrowLeft') || this.isKeyDown('KeyA')) axis -= 1;
        if (this.isKeyDown('ArrowRight') || this.isKeyDown('KeyD')) axis += 1;
        return axis;
    }
    
    getVerticalAxis() {
        let axis = 0;
        if (this.isKeyDown('ArrowUp') || this.isKeyDown('KeyW')) axis -= 1;
        if (this.isKeyDown('ArrowDown') || this.isKeyDown('KeyS')) axis += 1;
        return axis;
    }
    
    // Fire button (Z or Space)
    isFiring() {
        return this.isKeyDown('KeyZ') || this.isKeyDown('Space');
    }
    
    // Pod toggle button (X)
    isPodTogglePressed() {
        return this.isKeyPressed('KeyX');
    }
}

// Global input instance
const Input = new InputHandler();
