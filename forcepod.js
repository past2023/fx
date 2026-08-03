/**
 * forcepod.js - The detachable Force pod
 * Implements R-Type-style pod behavior: attached, launched, hovering, returning.
 */

(function() {
    'use strict';

    // Pod states
    const POD_STATE = {
        ATTACHED: 0,
        LAUNCHING: 1,
        HOVERING: 2,
        RETURNING: 3
    };

    class ForcePod {
        constructor() {
            this.x = 0;
            this.y = 0;
            this.vx = 0;
            this.vy = 0;
            this.state = POD_STATE.ATTACHED;
            this.radius = GAME_CONSTANTS.POD_RADIUS;
            this.active = true;
            this.pulsePhase = 0;
            this.sprite = null; // For future sprite replacement
            this.powerLevel = 0; // 0 = basic, 1 = double, 2 = spread
        }

        /**
         * Attach pod to player
         */
        attach(playerX, playerY) {
            this.state = POD_STATE.ATTACHED;
            this.x = playerX + GAME_CONSTANTS.POD_ATTACH_OFFSET_X;
            this.y = playerY;
            this.vx = 0;
            this.vy = 0;
        }

        /**
         * Detach and launch pod forward
         */
        detach(playerX, playerY) {
            if (this.state !== POD_STATE.ATTACHED) return;
            
            this.state = POD_STATE.LAUNCHING;
            this.x = playerX + GAME_CONSTANTS.POD_ATTACH_OFFSET_X;
            this.y = playerY;
            this.vx = GAME_CONSTANTS.POD_LAUNCH_SPEED;
            this.vy = 0;
        }

        /**
         * Recall pod to player
         */
        recall(playerX, playerY) {
            if (this.state === POD_STATE.ATTACHED || this.state === POD_STATE.RETURNING) return;
            this.state = POD_STATE.RETURNING;
        }

        /**
         * Upgrade pod power level
         */
        upgrade() {
            this.powerLevel = Math.min(this.powerLevel + 1, 2);
        }

        /**
         * Reset to default state
         */
        reset() {
            this.powerLevel = 0;
            this.state = POD_STATE.ATTACHED;
            this.active = true;
        }

        update(dt, playerX, playerY) {
            if (!this.active) return;

            this.pulsePhase += dt * 3;

            switch (this.state) {
                case POD_STATE.ATTACHED:
                    // Follow player position
                    this.x = playerX + GAME_CONSTANTS.POD_ATTACH_OFFSET_X;
                    this.y = playerY;
                    break;

                case POD_STATE.LAUNCHING:
                    // Move forward at high speed
                    this.x += this.vx * dt;
                    
                    // Check if reached max range or off-screen
                    if (this.x > playerX + GAME_CONSTANTS.POD_DETACH_RANGE ||
                        this.x > GAME_CONSTANTS.GAME_WIDTH - 20) {
                        this.state = POD_STATE.HOVERING;
                        this.vx = 0;
                        this.vy = 0;
                    }
                    break;

                case POD_STATE.HOVERING:
                    // Hover in place but slowly drift toward player's Y
                    const dy = playerY - this.y;
                    if (Math.abs(dy) > 5) {
                        this.y += Math.sign(dy) * GAME_CONSTANTS.POD_SPEED * 0.3 * dt;
                    }
                    
                    // Auto-recall if player moves too far left
                    if (this.x > playerX + GAME_CONSTANTS.POD_DETACH_RANGE * 1.5) {
                        this.state = POD_STATE.RETURNING;
                    }
                    break;

                case POD_STATE.RETURNING:
                    // Move back to player with smooth interpolation
                    const targetX = playerX + GAME_CONSTANTS.POD_ATTACH_OFFSET_X;
                    const targetY = playerY;
                    
                    const dx = targetX - this.x;
                    const ddy = targetY - this.y;
                    const dist = Math.sqrt(dx * dx + ddy * ddy);
                    
                    if (dist < 10) {
                        // Snap to attached position
                        this.attach(playerX, playerY);
                    } else {
                        // Move toward player
                        const speed = GAME_CONSTANTS.POD_SPEED;
                        this.x += (dx / dist) * speed * dt;
                        this.y += (ddy / dist) * speed * dt;
                    }
                    break;
            }
        }

        /**
         * Check if pod is blocking a position (for bullet collision)
         */
        isBlocking(x, y, radius) {
            if (!this.active) return false;
            
            const dx = x - this.x;
            const dy = y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            return dist < (this.radius + radius);
        }

        /**
         * Get pod hitbox for enemy collision
         */
        getHitbox() {
            return {
                x: this.x,
                y: this.y,
                radius: this.radius
            };
        }

        render(ctx) {
            if (!this.active) return;

            // TODO: Replace with sprite image
            if (this.sprite) {
                ctx.drawImage(this.sprite, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                return;
            }

            // Pulsing orange sphere with glow
            const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
            const r = this.radius * pulse;

            // Outer glow
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = GAME_CONSTANTS.COLOR_POD_GLOW;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Main sphere
            ctx.fillStyle = GAME_CONSTANTS.COLOR_POD;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Highlight
            ctx.fillStyle = GAME_CONSTANTS.COLOR_POD_GLOW;
            ctx.beginPath();
            ctx.arc(this.x - r * 0.3, this.y - r * 0.3, r * 0.4, 0, Math.PI * 2);
            ctx.fill();

            // Power level indicator (small rings)
            if (this.powerLevel > 0) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                for (let i = 0; i < this.powerLevel; i++) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, r + 3 + i * 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
    }

    window.ForcePod = ForcePod;
    window.POD_STATE = POD_STATE;
})();
