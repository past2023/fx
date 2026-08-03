/**
 * background.js - Parallax starfield and bio-mechanical environment layers
 * Two-layer starfield plus organic foreground elements.
 */

(function() {
    'use strict';

    class Star {
        constructor(layer) {
            this.layer = layer; // 0 = far, 1 = near
            this.reset(true);
        }

        reset(initial) {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            const H = GAME_CONSTANTS.GAME_HEIGHT;

            if (this.layer === 0) {
                // Far stars: small, slow, dim
                this.size = 1 + Math.random() * 1.5;
                this.speed = 20 + Math.random() * 15;
                this.color = GAME_CONSTANTS.COLOR_STAR_2;
                this.brightness = 0.3 + Math.random() * 0.4;
            } else {
                // Near stars: bigger, faster, brighter
                this.size = 1.5 + Math.random() * 2;
                this.speed = 50 + Math.random() * 30;
                this.color = GAME_CONSTANTS.COLOR_STAR_1;
                this.brightness = 0.5 + Math.random() * 0.5;
            }

            this.x = initial ? Math.random() * W : W + Math.random() * 50;
            this.y = Math.random() * H;
        }
    }

    // Bio-mechanical foreground element
    class BioElement {
        constructor() {
            this.reset(true);
        }

        reset(initial) {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            const H = GAME_CONSTANTS.GAME_HEIGHT;

            this.type = Math.floor(Math.random() * 3); // 0=tube, 1=grid, 2=organic line
            this.x = initial ? Math.random() * W : W + Math.random() * 200;
            this.speed = 60 + Math.random() * 20;
            this.phase = Math.random() * Math.PI * 2;
            this.alpha = 0.15 + Math.random() * 0.15;

            if (this.type === 0) {
                // Horizontal tube
                this.y = Math.random() < 0.5 ? Math.random() * 40 : H - Math.random() * 40;
                this.width = 100 + Math.random() * 200;
                this.height = 6 + Math.random() * 8;
            } else if (this.type === 1) {
                // Grid segment
                this.y = Math.random() * H;
                this.width = 60 + Math.random() * 80;
                this.height = 60 + Math.random() * 80;
                this.cells = 3 + Math.floor(Math.random() * 3);
            } else {
                // Organic pulsing line
                this.y = 50 + Math.random() * (H - 100);
                this.length = 80 + Math.random() * 150;
                this.amplitude = 10 + Math.random() * 20;
            }
        }
    }

    class Background {
        constructor() {
            this.stars = [];
            this.bioElements = [];
            this.scrollOffset = 0;

            // Create star layers
            for (let i = 0; i < 80; i++) {
                this.stars.push(new Star(0)); // far
            }
            for (let i = 0; i < 40; i++) {
                this.stars.push(new Star(1)); // near
            }

            // Create bio elements
            for (let i = 0; i < 12; i++) {
                this.bioElements.push(new BioElement());
            }
        }

        update(dt, scrollSpeed) {
            this.scrollOffset += scrollSpeed * dt;

            // Update stars
            for (let i = 0; i < this.stars.length; i++) {
                const star = this.stars[i];
                star.x -= star.speed * dt;
                if (star.x < -5) {
                    star.reset(false);
                }
            }

            // Update bio elements
            for (let i = 0; i < this.bioElements.length; i++) {
                const el = this.bioElements[i];
                el.x -= el.speed * dt;
                el.phase += dt * 2;
                if (el.x < -250) {
                    el.reset(false);
                }
            }
        }

        render(ctx) {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            const H = GAME_CONSTANTS.GAME_HEIGHT;

            // Base dark background
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, W, H);

            // Subtle gradient overlay (deep space)
            const grad = ctx.createRadialGradient(W * 0.7, H * 0.5, 50, W * 0.7, H * 0.5, W * 0.6);
            grad.addColorStop(0, 'rgba(20, 0, 40, 0.3)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            // Far stars
            for (let i = 0; i < this.stars.length; i++) {
                const star = this.stars[i];
                if (star.layer !== 0) continue;
                ctx.globalAlpha = star.brightness;
                ctx.fillStyle = star.color;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }

            // Near stars
            for (let i = 0; i < this.stars.length; i++) {
                const star = this.stars[i];
                if (star.layer !== 1) continue;
                ctx.globalAlpha = star.brightness;
                ctx.fillStyle = star.color;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
            ctx.globalAlpha = 1;

            // Bio-mechanical elements
            for (let i = 0; i < this.bioElements.length; i++) {
                this._renderBioElement(ctx, this.bioElements[i]);
            }
        }

        _renderBioElement(ctx, el) {
            ctx.globalAlpha = el.alpha;

            if (el.type === 0) {
                // Metallic tube
                const pulse = Math.sin(el.phase) * 0.3 + 0.7;
                ctx.fillStyle = GAME_CONSTANTS.COLOR_BIO_LINE;
                ctx.fillRect(el.x, el.y - el.height / 2, el.width, el.height);

                // Pulse glow
                ctx.globalAlpha = el.alpha * pulse;
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(el.x, el.y - 1, el.width, 2);
            } else if (el.type === 1) {
                // Metallic grid
                ctx.strokeStyle = GAME_CONSTANTS.COLOR_BIO_GRID;
                ctx.lineWidth = 1;
                const cellW = el.width / el.cells;
                const cellH = el.height / el.cells;

                for (let gx = 0; gx <= el.cells; gx++) {
                    ctx.beginPath();
                    ctx.moveTo(el.x + gx * cellW, el.y);
                    ctx.lineTo(el.x + gx * cellW, el.y + el.height);
                    ctx.stroke();
                }
                for (let gy = 0; gy <= el.cells; gy++) {
                    ctx.beginPath();
                    ctx.moveTo(el.x, el.y + gy * cellH);
                    ctx.lineTo(el.x + el.width, el.y + gy * cellH);
                    ctx.stroke();
                }

                // Random cell glow
                const cellIdx = Math.floor((el.phase * 0.5) % (el.cells * el.cells));
                const cx = cellIdx % el.cells;
                const cy = Math.floor(cellIdx / el.cells);
                ctx.globalAlpha = el.alpha * (0.5 + Math.sin(el.phase * 2) * 0.3);
                ctx.fillStyle = '#003322';
                ctx.fillRect(el.x + cx * cellW + 1, el.y + cy * cellH + 1, cellW - 2, cellH - 2);
            } else {
                // Organic pulsing line
                ctx.strokeStyle = GAME_CONSTANTS.COLOR_BIO_LINE;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(el.x, el.y);
                for (let t = 0; t <= 1; t += 0.05) {
                    const px = el.x + t * el.length;
                    const py = el.y + Math.sin(el.phase + t * 8) * el.amplitude;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();

                // Vein glow
                ctx.globalAlpha = el.alpha * 0.5;
                ctx.strokeStyle = '#224422';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(el.x, el.y);
                for (let t = 0; t <= 1; t += 0.05) {
                    const px = el.x + t * el.length;
                    const py = el.y + Math.sin(el.phase + t * 8 + 1) * el.amplitude * 0.5;
                    ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
        }

        reset() {
            this.scrollOffset = 0;
            for (let i = 0; i < this.stars.length; i++) {
                this.stars[i].reset(true);
            }
            for (let i = 0; i < this.bioElements.length; i++) {
                this.bioElements[i].reset(true);
            }
        }
    }

    window.Background = Background;
})();
