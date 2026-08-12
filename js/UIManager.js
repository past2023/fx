// File: js/UIManager.js
/**
 * All 2D overlay drawing: HUD (score, lives, boost, ammo, missiles, combo),
 * wave banners, boss health bar, menu / pause / game-over screens and the
 * CRT scanline + vignette pass.
 *
 * UIManager is deliberately read-only with respect to game state: it takes
 * a snapshot object and draws it.
 */

import {
  GAME_W, GAME_H, COLORS, PLAYER, WEAPONS, RULES, POWERBAR, COURSE, clamp, lerp,
} from '#game/config.js';
import { px, pxBorder, glow, drawMatrix, SPR_PLAYER, PAL_PLAYER } from '#game/Sprite.js';

const FONT = '"Courier New", monospace';

export class UIManager {
  constructor() {
    this.bannerText = '';
    this.bannerSub = '';
    this.bannerTime = 0;
    this.notifyText = '';
    this.notifyTime = 0;
    this.scoreShown = 0;   // eased score for a satisfying rolling counter
    this.flashHit = 0;
    this.t = 0;
  }

  /** Show a big centred banner (wave start, boss warning...). */
  banner(text, sub = '', time = 2.2) {
    this.bannerText = text;
    this.bannerSub = sub;
    this.bannerTime = time;
    this.bannerMax = time;
  }

  /** Small pickup notification near the player. */
  notify(text, time = 1.1) { this.notifyText = text; this.notifyTime = time; }

  /** Red edge flash when the player is hit. */
  hitFlash() { this.flashHit = 0.45; }

  /** @param {number} dt @param {object} snap */
  update(dt, snap) {
    this.t += dt;
    if (this.bannerTime > 0) this.bannerTime -= dt;
    if (this.notifyTime > 0) this.notifyTime -= dt;
    if (this.flashHit > 0) this.flashHit -= dt;
    this.scoreShown = lerp(this.scoreShown, snap.score, 1 - Math.exp(-9 * dt));
    if (Math.abs(this.scoreShown - snap.score) < 1) this.scoreShown = snap.score;
  }

  /** Reset transient UI on state change. */
  reset() {
    this.bannerTime = 0; this.notifyTime = 0; this.flashHit = 0; this.scoreShown = 0;
  }

  /* ---------------- text helpers ---------------- */

  /**
   * Retro text with a hard drop shadow and optional neon glow.
   * @param {CanvasRenderingContext2D} ctx
   */
  text(ctx, str, x, y, {
    size = 14, color = COLORS.cyan, align = 'left', bold = true,
    shadow = true, glowAmt = 0, alpha = 1, spacing = 0,
  } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
    ctx.textAlign = spacing ? 'left' : align;
    ctx.textBaseline = 'alphabetic';

    const drawStr = (sx, sy, col) => {
      ctx.fillStyle = col;
      if (!spacing) { ctx.fillText(str, sx, sy); return; }
      // Manual letter tracking for that arcade look. Advances use the real
      // glyph width so proportional-ish fonts don't produce ragged gaps.
      const widths = [];
      let total = 0;
      for (const ch of str) {
        const w = ctx.measureText(ch).width;
        widths.push(w);
        total += w + spacing;
      }
      total -= spacing;
      let cx = align === 'center' ? sx - total / 2 : align === 'right' ? sx - total : sx;
      for (let i = 0; i < str.length; i++) {
        ctx.fillText(str[i], cx, sy);
        cx += widths[i] + spacing;
      }
    };

    if (shadow) drawStr(x + 2, y + 2, 'rgba(0,0,0,0.75)');
    if (glowAmt > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = glowAmt;
    }
    drawStr(x, y, color);
    ctx.restore();
  }

  /** Horizontal segmented gauge (boost / ammo). */
  gauge(ctx, x, y, w, h, value, color, { segments = 12, bg = '#101a36', label = '' } = {}) {
    px(ctx, x, y, w, h, bg);
    pxBorder(ctx, x, y, w, h, '#25335c', 2);
    const inner = w - 6;
    const filled = Math.round(segments * clamp(value, 0, 1));
    const sw = inner / segments;
    for (let i = 0; i < filled; i++) {
      px(ctx, x + 3 + i * sw, y + 3, Math.max(2, sw - 2), h - 6, color);
    }
    if (label) this.text(ctx, label, x + w + 6, y + h - 1, { size: 10, color: '#5f7bb5' });
  }

  /* ---------------- HUD ---------------- */

  /**
   * Draw the in-game HUD.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} s snapshot: { score, hiScore, lives, boost, ammo, missiles,
   *   spreadTime, combo, comboTimer, wave, waveTimer, metres, boss }
   */
  drawHUD(ctx, s) {
    // Top bar backing.
    ctx.globalAlpha = 0.72;
    px(ctx, 0, 0, GAME_W, 56, '#050912');
    ctx.globalAlpha = 1;
    px(ctx, 0, 56, GAME_W, 2, '#1b2b55');

    // Score + hi-score.
    this.text(ctx, 'SCORE', 12, 18, { size: 10, color: '#5f7bb5', spacing: 1 });
    this.text(ctx, String(Math.floor(this.scoreShown)).padStart(7, '0'), 12, 38, {
      size: 20, color: COLORS.white, glowAmt: 8, spacing: 1,
    });
    this.text(ctx, `HI ${String(s.hiScore).padStart(7, '0')}`, GAME_W - 12, 16, {
      size: 10, color: COLORS.yellow, align: 'right',
    });
    // Race position — the headline race stat.
    const placeCol = s.place === 1 ? COLORS.yellow : s.place === 2 ? '#dfe9ef' : COLORS.orange;
    this.text(ctx, s.placeText ?? '1ST', GAME_W - 12, 40, {
      size: 24, color: placeCol, align: 'right', glowAmt: 10, spacing: 1,
    });
    this.text(ctx, `/ ${s.rivalCount ?? 4}`, GAME_W - 12, 52, {
      size: 9, color: '#9fd8ef', align: 'right',
    });
    // Race clock.
    const rt = s.raceTime ?? 0;
    const mm = String(Math.floor(rt / 60)).padStart(2, '0');
    const ss = String(Math.floor(rt % 60)).padStart(2, '0');
    this.text(ctx, `${mm}:${ss}`, GAME_W / 2, 16, {
      size: 12, color: '#cdefff', align: 'center', spacing: 1,
    });

    // Lives as little boat icons.
    for (let i = 0; i < Math.min(s.lives, 6); i++) {
      const lx = 214 + i * 20, ly = 26;
      ctx.save();
      ctx.globalAlpha = 0.95;
      drawMatrix(ctx, SPR_PLAYER, PAL_PLAYER, lx, ly, 1.6);
      ctx.restore();
    }
    if (s.lives > 6) this.text(ctx, `x${s.lives}`, 214 + 6 * 20, 32, { size: 11, color: COLORS.cyan });

    /* --- Bottom HUD panel ---------------------------------------------
     * Three stacked rows in a fixed 74px strip so nothing can overlap:
     *   y-72  spread timer (only while active)
     *   y-60  gauges: BOOST | AMMO | MSL
     *   y-30  Gradius power-up bar
     * ------------------------------------------------------------------ */
    ctx.globalAlpha = 0.6;
    px(ctx, 0, GAME_H - 74, GAME_W, 74, '#03222f');
    ctx.globalAlpha = 1;
    px(ctx, 0, GAME_H - 74, GAME_W, 2, 'rgba(111,221,222,0.5)');

    const gy = GAME_H - 66;
    const gaugeW = 116, gaugeH = 12;
    this.text(ctx, 'BOOST', 12, gy - 3, { size: 8, color: '#9fd8ef', spacing: 1 });
    const boostCol = s.boost > 30 ? COLORS.cyan : (Math.floor(this.t * 8) % 2 ? COLORS.red : '#5a1020');
    this.gauge(ctx, 12, gy, gaugeW, gaugeH, s.boost / PLAYER.boostMax, boostCol, { segments: 10 });

    this.text(ctx, 'AMMO', 140, gy - 3, { size: 8, color: '#9fd8ef', spacing: 1 });
    const ammoCol = s.spreadTime > 0 ? COLORS.yellow : COLORS.green;
    this.gauge(ctx, 140, gy, gaugeW, gaugeH, s.ammo / WEAPONS.ammoMax, ammoCol, { segments: 12 });

    // Missiles as pips.
    this.text(ctx, 'MSL', GAME_W - 92, gy - 3, { size: 8, color: '#9fd8ef', spacing: 1 });
    for (let i = 0; i < WEAPONS.missileMax; i++) {
      const mx = GAME_W - 92 + i * 26;
      const have = i < s.missiles;
      px(ctx, mx, gy, 20, gaugeH, have ? COLORS.magenta : 'rgba(0,0,0,0.35)');
      pxBorder(ctx, mx, gy, 20, gaugeH, have ? COLORS.white : '#2c4a63', 2);
    }

    // Spread timer bar sits in its own row above the gauges.
    if (s.spreadTime > 0) {
      const w = 130;
      const frac = clamp(s.spreadTime / WEAPONS.spreadTime, 0, 1);
      this.text(ctx, 'SPREAD', GAME_W / 2 - w / 2 - 6, GAME_H - 78, {
        size: 8, color: COLORS.yellow, align: 'right', spacing: 1,
      });
      px(ctx, GAME_W / 2 - w / 2, GAME_H - 84, w, 5, 'rgba(0,0,0,0.4)');
      px(ctx, GAME_W / 2 - w / 2, GAME_H - 84, w * frac, 5, COLORS.yellow);
    }

    // Combo meter.
    this.drawCombo(ctx, s);

    // Course progress track along the top edge.
    this.drawCourseTrack(ctx, s);

    // Gradius-style power-up bar.
    this.drawPowerBar(ctx, s);

    // Rescue-zone counter.
    if (s.rescueZone) {
      this.text(ctx, `SURVIVORS ${s.rescueZone.saved}/${s.rescueZone.total}`, GAME_W / 2, 52, {
        size: 12, color: COLORS.green, align: 'center', spacing: 2, glowAmt: 8,
      });
    }

    // DRIFT indicator — rewards the player for holding a slide.
    if (s.drifting) {
      const a = 0.6 + Math.sin(this.t * 20) * 0.4;
      this.text(ctx, 'DRIFT!', 74, 150, {
        size: 20, color: COLORS.yellow, align: 'center', glowAmt: 14, spacing: 2, alpha: a,
      });
      if (s.driftTime > 0.4) {
        this.text(ctx, `+${Math.floor(s.driftTime * 10) * 10} BOOST`, 74, 166, {
          size: 9, color: COLORS.white, align: 'center', spacing: 1,
        });
      }
    }

    // Boss health bar.
    if (s.boss) this.drawBossBar(ctx, s.boss);

    // Pickup notification.
    if (this.notifyTime > 0) {
      const a = clamp(this.notifyTime / 0.4, 0, 1);
      this.text(ctx, this.notifyText, GAME_W / 2, GAME_H - 116, {
        size: 16, color: COLORS.white, align: 'center', alpha: a, glowAmt: 10, spacing: 3,
      });
    }

    // Banner.
    if (this.bannerTime > 0) this.drawBanner(ctx);

    // Damage vignette.
    if (this.flashHit > 0) {
      const a = clamp(this.flashHit / 0.45, 0, 1) * 0.55;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(0, 0, GAME_W, 14);
      ctx.fillRect(0, GAME_H - 14, GAME_W, 14);
      ctx.fillRect(0, 0, 14, GAME_H);
      ctx.fillRect(GAME_W - 14, 0, 14, GAME_H);
      ctx.restore();
    }
  }

  /** Big juicy combo readout on the right-hand side. */
  drawCombo(ctx, s) {
    if (s.combo < 2) return;
    const step = RULES.comboSteps.indexOf(s.multiplier);
    const pop = clamp(1 - (s.comboPop ?? 0), 0, 1);
    const scale = 1 + (1 - pop) * 0.6;
    const y = 130;
    const frac = clamp(s.comboTimer / RULES.comboWindow, 0, 1);

    ctx.save();
    ctx.translate(GAME_W - 58, y);
    ctx.scale(scale, scale);
    const col = [COLORS.cyan, COLORS.green, COLORS.yellow, COLORS.orange, COLORS.magenta][clamp(step, 0, 4)];
    this.text(ctx, `x${s.multiplier}`, 0, 0, {
      size: 30, color: col, align: 'center', glowAmt: 14,
    });
    this.text(ctx, `${s.combo} HITS`, 0, 16, { size: 10, color: '#8fb4e6', align: 'center', spacing: 1 });
    ctx.restore();

    // Combo decay ring.
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(GAME_W - 58, y - 8, 30, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Course progress track: a thin route line with a marker per section and a
   * boat pip showing how far along the player is.
   */
  drawCourseTrack(ctx, s) {
    const y = 60, x0 = 10, w = GAME_W - 20;
    px(ctx, x0, y, w, 4, 'rgba(0,0,0,0.45)');
    const frac = clamp(s.courseFraction ?? 0, 0, 1);
    px(ctx, x0, y, w * frac, 4, COLORS.cyan);

    // Section boundary ticks.
    let acc = 0;
    const total = COURSE.sections.reduce((a, sec) => a + sec.len, 0);
    for (const sec of COURSE.sections) {
      acc += sec.len;
      const tx = x0 + w * clamp(acc / total, 0, 1);
      px(ctx, tx - 1, y - 2, 2, 8, sec.rescue ? COLORS.green : '#9fd8ef');
    }
    // Finish flag.
    px(ctx, x0 + w - 3, y - 5, 3, 14, COLORS.yellow);
    // Player pip.
    const pxPos = x0 + w * frac;
    px(ctx, pxPos - 3, y - 4, 6, 12, COLORS.white);

    this.text(ctx, s.sectionLabel ?? '', GAME_W / 2, 34, {
      size: 10, color: '#cdefff', align: 'center', spacing: 2,
    });
  }

  /**
   * The Gradius power-up bar: a row of slots, lit up to whatever the banked
   * tokens can afford. The rightmost lit slot is what ACTIVATE will spend on.
   */
  drawPowerBar(ctx, s) {
    const pb = s.powerBar;
    if (!pb) return;
    const slots = POWERBAR.slots;
    const gap = 3;
    const sw = Math.floor((GAME_W - 24 - gap * (slots.length - 1)) / slots.length);
    const sh = 18;
    const totalW = slots.length * sw + (slots.length - 1) * gap;
    const x0 = (GAME_W - totalW) / 2;
    const y = GAME_H - 24;

    const cursor = pb.affordableIndex();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const x = x0 + i * (sw + gap);
      const affordable = pb.tokens >= slot.cost;
      const isCursor = i === cursor;

      // Slot body.
      px(ctx, x, y, sw, sh, affordable ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.32)');
      // The active choice pulses so it's unmistakable.
      if (isCursor) {
        const pulse = 0.55 + Math.sin(this.t * 9) * 0.45;
        ctx.save();
        ctx.globalAlpha = pulse;
        px(ctx, x, y, sw, sh, slot.color);
        ctx.restore();
      }
      pxBorder(ctx, x, y, sw, sh, affordable ? slot.color : '#2c4a63', 2);

      this.text(ctx, slot.label, x + sw / 2, y + 13, {
        size: 9,
        color: isCursor ? '#04202e' : affordable ? slot.color : '#3f6478',
        align: 'center', spacing: 0, shadow: !isCursor,
      });
      // Cost pip.
      this.text(ctx, String(slot.cost), x + sw - 4, y + 8, {
        size: 7, color: affordable ? '#ffffff' : '#3f6478', align: 'right',
      });
    }

    // Banked token readout + the prompt.
    const flash = pb.flash > 0 ? 1 : 0;
    this.text(ctx, `TOKENS ${pb.tokens}`, x0, y - 4, {
      size: 9, color: flash ? COLORS.white : '#cdefff', spacing: 1,
      glowAmt: flash ? 10 : 0,
    });
    if (cursor >= 0) {
      const blink = Math.floor(this.t * 3) % 2 === 0;
      this.text(ctx, blink ? '[Z] ACTIVATE' : '', x0 + totalW, y - 4, {
        size: 9, color: COLORS.yellow, align: 'right', spacing: 1, glowAmt: 6,
      });
    }

    // Active upgrade timers.
    const badges = [];
    if (pb.speedStacks > 0) badges.push([`SPD x${pb.speedStacks}`, COLORS.cyan]);
    if (pb.fireActive) badges.push([`FIRE ${pb.fireTime.toFixed(0)}`, COLORS.yellow]);
    if (pb.turboActive) badges.push([`TURBO ${pb.turboTime.toFixed(0)}`, COLORS.orange]);
    badges.forEach((b, i) => {
      this.text(ctx, b[0], GAME_W - 12, 196 + i * 15, {
        size: 11, color: b[1], spacing: 1, glowAmt: 5, align: 'right',
      });
    });
  }

  /** Boss HP bar pinned under the top HUD. */
  drawBossBar(ctx, boss) {
    const w = GAME_W - 80, x = 40, y = 68;
    this.text(ctx, 'DESTROYER', GAME_W / 2, y - 4, {
      size: 11, color: COLORS.red, align: 'center', spacing: 3, glowAmt: 8,
    });
    px(ctx, x, y, w, 12, '#1a0a14');
    pxBorder(ctx, x, y, w, 12, COLORS.red, 2);
    const frac = clamp(boss.hp / boss.maxHp, 0, 1);
    const col = frac > 0.5 ? COLORS.green : frac > 0.22 ? COLORS.yellow : COLORS.red;
    px(ctx, x + 3, y + 3, (w - 6) * frac, 6, col);
  }

  /** Centre banner with a slide/fade. */
  drawBanner(ctx) {
    const t = this.bannerTime / this.bannerMax;
    const a = clamp(t * 3, 0, 1) * clamp((1 - t) * 6, 0, 1);
    const yOff = (1 - clamp(t * 4, 0, 1)) * -20;
    ctx.save();
    ctx.globalAlpha = a * 0.5;
    px(ctx, 0, GAME_H / 2 - 52 + yOff, GAME_W, 74, '#05070f');
    ctx.globalAlpha = 1;
    this.text(ctx, this.bannerText, GAME_W / 2, GAME_H / 2 - 12 + yOff, {
      size: 30, color: COLORS.magenta, align: 'center', alpha: a, glowAmt: 18, spacing: 4,
    });
    if (this.bannerSub) {
      this.text(ctx, this.bannerSub, GAME_W / 2, GAME_H / 2 + 12 + yOff, {
        size: 13, color: COLORS.cyan, align: 'center', alpha: a, spacing: 2,
      });
    }
    ctx.restore();
  }

  /* ---------------- screens ---------------- */

  /** Attract / title screen. */
  drawMenu(ctx, s) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    px(ctx, 0, 0, GAME_W, GAME_H, '#053349');
    ctx.restore();

    const bob = Math.sin(this.t * 2) * 4;
    this.text(ctx, 'NEON', GAME_W / 2, 190 + bob, {
      size: 62, color: COLORS.cyan, align: 'center', glowAmt: 26, spacing: 8,
    });
    this.text(ctx, 'WAKE', GAME_W / 2, 248 + bob, {
      size: 62, color: COLORS.magenta, align: 'center', glowAmt: 26, spacing: 8,
    });
    this.text(ctx, 'HYDROFOIL ASSAULT', GAME_W / 2, 276 + bob, {
      size: 12, color: COLORS.yellow, align: 'center', spacing: 5,
    });

    const blink = Math.floor(this.t * 2) % 2 === 0;
    if (blink) {
      this.text(ctx, 'PRESS SPACE TO RACE', GAME_W / 2, 400, {
        size: 18, color: COLORS.white, align: 'center', glowAmt: 12, spacing: 2,
      });
    }

    // Controls card.
    const cx = GAME_W / 2;
    ctx.globalAlpha = 0.62;
    px(ctx, 52, 434, GAME_W - 104, 156, '#062435');
    ctx.globalAlpha = 1;
    pxBorder(ctx, 52, 434, GAME_W - 104, 156, COLORS.crest, 2);
    const rows = [
      ['ARROWS / WASD', 'STEER'],
      ['UP / W (HOLD)', 'BOOST'],
      ['SHIFT (HOLD)', 'DRIFT'],
      ['SPACE', 'GUNS'],
      ['X', 'MISSILE'],
      ['Z / ENTER', 'ACTIVATE UPGRADE'],
    ];
    rows.forEach((r, i) => {
      const y = 458 + i * 22;
      this.text(ctx, r[0], 68, y, { size: 11, color: COLORS.cyan });
      this.text(ctx, r[1], GAME_W - 68, y, { size: 11, color: '#cdefff', align: 'right' });
    });

    this.text(ctx, `HI-SCORE  ${String(s.hiScore).padStart(7, '0')}`, cx, 610, {
      size: 14, color: COLORS.yellow, align: 'center', spacing: 2, glowAmt: 6,
    });
    this.text(ctx, 'RACE 3 RIVALS · SAVE SWIMMERS · BANK TOKENS', cx, 636, {
      size: 9, color: '#9fd8ef', align: 'center', spacing: 1,
    });
    this.text(ctx, 'DRIFT THROUGH TURNS · BEAT THE FINAL BOSS', cx, 652, {
      size: 9, color: '#9fd8ef', align: 'center', spacing: 1,
    });
  }

  /** Pause overlay. */
  drawPause(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    px(ctx, 0, 0, GAME_W, GAME_H, '#04060f');
    ctx.restore();
    this.text(ctx, 'PAUSED', GAME_W / 2, GAME_H / 2, {
      size: 40, color: COLORS.cyan, align: 'center', glowAmt: 20, spacing: 6,
    });
    this.text(ctx, 'PRESS P TO RESUME', GAME_W / 2, GAME_H / 2 + 34, {
      size: 13, color: '#8fb4e6', align: 'center', spacing: 2,
    });
  }

  /** Game-over stats screen. */
  drawGameOver(ctx, s) {
    // Fade in the blackout so the wreck stays visible for a beat.
    ctx.save();
    ctx.globalAlpha = clamp(0.55 + s.overTime * 0.5, 0, 0.88);
    px(ctx, 0, 0, GAME_W, GAME_H, '#04060f');
    ctx.restore();

    // Panel behind the stats for legibility over the scrolling water.
    ctx.save();
    ctx.globalAlpha = 0.72;
    px(ctx, 44, 236, GAME_W - 88, 186, '#070d1e');
    ctx.restore();
    pxBorder(ctx, 44, 236, GAME_W - 88, 186, '#1d2b55', 2);

    const shake = Math.sin(this.t * 30) * (s.overTime < 0.5 ? 4 : 0);
    this.text(ctx, 'WRECKED', GAME_W / 2 + shake, 200, {
      size: 50, color: COLORS.red, align: 'center', glowAmt: 22, spacing: 6,
    });

    const rows = [
      ['SCORE', String(s.score)],
      ['PEOPLE SAVED', String(s.peopleSaved ?? 0)],
      ['COURSE', `${Math.round((s.courseFraction ?? 0) * 100)}%`],
      ['KILLS', String(s.kills)],
      ['BEST COMBO', `x${s.bestCombo}`],
    ];
    rows.forEach((r, i) => {
      const y = 268 + i * 30;
      this.text(ctx, r[0], 80, y, { size: 14, color: '#8fb4e6', spacing: 1 });
      this.text(ctx, r[1], GAME_W - 80, y, { size: 16, color: COLORS.white, align: 'right', spacing: 1 });
    });

    if (s.newHiScore) {
      const blink = Math.floor(this.t * 4) % 2 === 0;
      this.text(ctx, 'NEW HI-SCORE!', GAME_W / 2, 448, {
        size: 22, color: blink ? COLORS.yellow : COLORS.orange, align: 'center', glowAmt: 16, spacing: 3,
      });
    } else {
      this.text(ctx, `HI-SCORE ${String(s.hiScore).padStart(7, '0')}`, GAME_W / 2, 448, {
        size: 14, color: COLORS.yellow, align: 'center', spacing: 2,
      });
    }

    if (s.overTime > 1 && Math.floor(this.t * 2) % 2 === 0) {
      this.text(ctx, 'PRESS SPACE TO RETRY', GAME_W / 2, 540, {
        size: 16, color: COLORS.cyan, align: 'center', glowAmt: 12, spacing: 2,
      });
    }
    this.text(ctx, 'ESC / P FOR TITLE', GAME_W / 2, 570, {
      size: 11, color: '#5f7bb5', align: 'center', spacing: 1,
    });
  }

  /**
   * Victory results screen shown when the final boss goes down.
   */
  drawFinish(ctx, s) {
    ctx.save();
    ctx.globalAlpha = clamp(0.4 + s.overTime * 0.45, 0, 0.82);
    px(ctx, 0, 0, GAME_W, GAME_H, '#04304a');
    ctx.restore();

    const bob = Math.sin(this.t * 3) * 3;
    this.text(ctx, 'FINISH!', GAME_W / 2, 150 + bob, {
      size: 52, color: COLORS.yellow, align: 'center', glowAmt: 24, spacing: 5,
    });

    const place = s.finishPlace ?? 1;
    const placeText = ['1ST PLACE', '2ND PLACE', '3RD PLACE', '4TH PLACE'][place - 1] ?? `${place}TH`;
    const placeCol = place === 1 ? COLORS.yellow : place === 2 ? '#dfe9ef' : COLORS.orange;
    this.text(ctx, placeText, GAME_W / 2, 196, {
      size: 26, color: placeCol, align: 'center', glowAmt: 16, spacing: 3,
    });

    ctx.save();
    ctx.globalAlpha = 0.7;
    px(ctx, 44, 226, GAME_W - 88, 210, '#062435');
    ctx.restore();
    pxBorder(ctx, 44, 226, GAME_W - 88, 210, COLORS.crest, 2);

    const rt = s.raceTime ?? 0;
    const mm = String(Math.floor(rt / 60)).padStart(2, '0');
    const ss = String(Math.floor(rt % 60)).padStart(2, '0');
    const rows = [
      ['TIME', `${mm}:${ss}`],
      ['PEOPLE SAVED', String(s.peopleSaved ?? 0)],
      ['CHECKPOINTS', `${s.gatesHit ?? 0}/${s.gateTotal ?? 0}`],
      ['KILLS', String(s.kills)],
      ['BEST COMBO', `x${s.bestCombo}`],
      ['SCORE', String(s.score)],
    ];
    rows.forEach((r, i) => {
      const y = 256 + i * 30;
      const big = r[0] === 'SCORE';
      this.text(ctx, r[0], 66, y, { size: 12, color: '#9fd8ef', spacing: 1 });
      this.text(ctx, r[1], GAME_W - 66, y, {
        size: big ? 18 : 15,
        color: big ? COLORS.yellow : COLORS.white,
        align: 'right', spacing: 1, glowAmt: big ? 8 : 0,
      });
    });

    if (s.newHiScore) {
      const blink = Math.floor(this.t * 4) % 2 === 0;
      this.text(ctx, 'NEW HI-SCORE!', GAME_W / 2, 470, {
        size: 20, color: blink ? COLORS.yellow : COLORS.orange, align: 'center', glowAmt: 14, spacing: 3,
      });
    }

    if (s.overTime > 1.2 && Math.floor(this.t * 2) % 2 === 0) {
      this.text(ctx, 'PRESS SPACE TO RACE AGAIN', GAME_W / 2, 540, {
        size: 15, color: COLORS.white, align: 'center', glowAmt: 12, spacing: 1,
      });
    }
    this.text(ctx, 'ESC / P FOR TITLE', GAME_W / 2, 570, {
      size: 11, color: '#9fd8ef', align: 'center', spacing: 1,
    });
  }

  /**
   * CRT pass: scanlines, subtle RGB shift bars and a rolling bright band.
   * Always drawn last, in unshaken screen space.
   */
  drawCRT(ctx) {
    ctx.save();
    // Scanlines.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000';
    for (let y = 0; y < GAME_H; y += 3) ctx.fillRect(0, y, GAME_W, 1);

    // Rolling refresh band.
    const bandY = (this.t * 90) % (GAME_H + 120) - 60;
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, bandY, GAME_W, 46);

    // Vignette corners (cheap: four gradient-less rects with alpha).
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_W, 6);
    ctx.fillRect(0, GAME_H - 6, GAME_W, 6);
    ctx.fillRect(0, 0, 6, GAME_H);
    ctx.fillRect(GAME_W - 6, 0, 6, GAME_H);
    ctx.restore();
  }
}
