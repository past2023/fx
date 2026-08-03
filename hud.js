/**
 * hud.js - Score, lives, boss health bar, pod status
 * Renders all UI elements on top of the game.
 */

(function() {
    'use strict';

    class HUD {
        constructor() {
            this.warningTimer = 0;
            this.warningActive = false;
            this.warningPhase = 0;
            this.stageClearTimer = 0;
            this.stageClearActive = false;
        }

        update(dt) {
            if (this.warningActive) {
                this.warningPhase += dt * 8;
                this.warningTimer -= dt;
                if (this.warningTimer <= 0) {
                    this.warningActive = false;
                }
            }
            if (this.stageClearActive) {
                this.stageClearTimer += dt;
            }
        }

        showWarning(duration) {
            this.warningActive = true;
            this.warningTimer = duration || GAME_CONSTANTS.WARNING_DURATION;
            this.warningPhase = 0;
        }

        showStageClear() {
            this.stageClearActive = true;
            this.stageClearTimer = 0;
        }

        reset() {
            this.warningActive = false;
            this.warningTimer = 0;
            this.stageClearActive = false;
            this.stageClearTimer = 0;
        }

        render(ctx, game) {
            const W = GAME_CONSTANTS.GAME_WIDTH;
            const H = GAME_CONSTANTS.GAME_HEIGHT;

            ctx.save();

            // ---- Score (top left) ----
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = GAME_CONSTANTS.COLOR_HUD_TEXT;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('SCORE', 16, 12);

            ctx.font = 'bold 22px monospace';
            const scoreStr = game.score.toString().padStart(8, '0');
            ctx.fillText(scoreStr, 16, 30);

            // High score
            ctx.font = '12px monospace';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('HI ' + game.highScore.toString().padStart(8, '0'), 16, 56);

            // ---- Lives (top right) ----
            ctx.fillStyle = GAME_CONSTANTS.COLOR_HUD_TEXT;
            ctx.textAlign = 'right';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('LIVES', W - 16, 12);

            // Draw ship icons for lives
            for (let i = 0; i < game.player.lives - 1; i++) {
                const lx = W - 30 - i * 24;
                const ly = 36;
                ctx.fillStyle = GAME_CONSTANTS.COLOR_PLAYER;
                ctx.beginPath();
                ctx.moveTo(lx + 8, ly);
                ctx.lineTo(lx - 6, ly - 5);
                ctx.lineTo(lx - 4, ly);
                ctx.lineTo(lx - 6, ly + 5);
                ctx.closePath();
                ctx.fill();
            }

            // ---- Pod status indicator ----
            const podStateNames = ['DOCKED', 'FORWARD', 'FREE', 'RETURN'];
            const podState = game.player.pod.state;
            ctx.textAlign = 'left';
            ctx.font = '11px monospace';
            ctx.fillStyle = GAME_CONSTANTS.COLOR_POD;
            ctx.fillText('POD: ' + (podStateNames[podState] || 'DOCKED'), 16, H - 30);

            // Power level
            const pwr = game.player.pod.powerLevel;
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('PWR: ' + (pwr === 0 ? 'BASIC' : pwr === 1 ? 'DOUBLE' : 'SPREAD'), 16, H - 16);

            // ---- Boss HP bar ----
            if (game.boss && game.boss.active && game.boss.entered) {
                const barW = W * 0.4;
                const barH = 12;
                const barX = (W - barW) / 2;
                const barY = 10;
                const ratio = Math.max(0, game.boss.hp / game.boss.maxHp);

                // Background
                ctx.fillStyle = GAME_CONSTANTS.COLOR_HUD_BAR_BG;
                ctx.fillRect(barX, barY, barW, barH);

                // HP fill
                ctx.fillStyle = GAME_CONSTANTS.COLOR_HUD_BAR;
                ctx.fillRect(barX, barY, barW * ratio, barH);

                // Border
                ctx.strokeStyle = '#660022';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barW, barH);

                // Boss name
                ctx.fillStyle = GAME_CONSTANTS.COLOR_HUD_TEXT;
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('GOLIATH PARASITE', W / 2, barY + barH + 14);

                // Phase indicator
                const phaseNames = ['', 'PHASE 1', 'PHASE 2', 'PHASE 3'];
                const phaseNum = game.boss.phase;
                if (phaseNum > 0) {
                    ctx.fillStyle = '#ff8888';
                    ctx.font = '10px monospace';
                    ctx.fillText(phaseNames[phaseNum], W / 2, barY + barH + 26);
                }
            }

            // ---- WARNING text ----
            if (this.warningActive) {
                const flashAlpha = (Math.sin(this.warningPhase) + 1) / 2;
                ctx.globalAlpha = 0.3 + flashAlpha * 0.7;
                ctx.fillStyle = GAME_CONSTANTS.COLOR_WARNING;
                ctx.font = 'bold 48px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('WARNING', W / 2, H / 2);

                ctx.font = 'bold 16px monospace';
                ctx.fillStyle = '#ff6666';
                ctx.fillText('!! LARGE OBJECT APPROACHING !!', W / 2, H / 2 + 35);
                ctx.globalAlpha = 1;
            }

            // ---- STAGE CLEAR ----
            if (this.stageClearActive) {
                ctx.globalAlpha = Math.min(1, this.stageClearTimer * 2);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 40px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('STAGE CLEAR', W / 2, H / 2);

                ctx.font = '16px monospace';
                ctx.fillStyle = '#aaffaa';
                ctx.fillText('SCORE: ' + game.score.toString().padStart(8, '0'), W / 2, H / 2 + 40);
                ctx.globalAlpha = 1;
            }

            ctx.restore();
        }
    }

    window.HUD = HUD;
})();
