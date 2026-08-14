// ============================================================================
//  UI / RENDERER (Dibujo en el <canvas>)
//  ----------------------------------------------------------------------------
//  Dibuja exclusivamente dentro del <canvas>: la cuadrícula del tablero, las
//  celdas colocadas, la pieza actual, la pieza fantasma (ghost), la columna
//  resaltada, las animaciones (flash de fila, partículas, temblor) y la vista
//  previa de la siguiente pieza. El resto de la interfaz se hace en HTML/CSS.
// ============================================================================

import { COLS, ROWS } from '../game/board.js';

export class Renderer {
  constructor(canvas, nextCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
    this.cellSize = 100;
    this.particles = [];
  }

  // Calcula el tamaño de celda de forma responsive y ajusta el <canvas>
  resize() {
    const parent = this.canvas.parentElement;
    const availableW = (parent ? parent.clientWidth : 360) - 8;
    const availableH = window.innerHeight * 0.56;
    this.cellSize = Math.floor(
      Math.min(availableW / COLS, availableH / ROWS, 130)
    );
    const w = COLS * this.cellSize;
    const h = ROWS * this.cellSize;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.nextCtx) {
      const n = 120;
      this.nextCanvas.width = n * dpr;
      this.nextCanvas.height = n * dpr;
      this.nextCanvas.style.width = n + 'px';
      this.nextCanvas.style.height = n + 'px';
      this.nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  getCellSize() {
    return this.cellSize;
  }

  // --- Partículas -----------------------------------------------------------

  spawnParticles(cellX, cellY, color, count = 18) {
    const cs = this.cellSize;
    const cx = (cellX + 0.5) * cs;
    const cy = (cellY + 0.5) * cs;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.8 + Math.random() * 2.4) * cs;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - cs * 0.6,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15 * this.cellSize; // gravedad
      if (p.life >= p.maxLife) this.particles.splice(i, 1);
    }
  }

  // --- Dibujado principal ---------------------------------------------------

  draw(view) {
    const { ctx, cellSize: cs } = this;
    const flash = view.flash || { rows: [], t: 0 };

    this.viewBoard = view.board; // guardado para la proyección de la pieza fantasma

    // Fondo del tablero
    ctx.clearRect(0, 0, COLS * cs, ROWS * cs);
    this.drawBackground(view.shake || 0);

    // Si aún no hay partida (p. ej. en el menú), solo mostramos el fondo
    if (!view.board) return;

    // Columna resaltada (por debajo de las celdas)
    this.drawHighlightColumn(view.highlightColumn);

    // Celdas ya colocadas
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = view.board.grid[r][c];
        if (cell) this.drawCell(c, r, cell);
      }
    }

    // Pieza fantasma (previsualización del punto de caída)
    if (view.piece && !view.gameOver) this.drawGhost(view.piece);

    // Pieza actual
    if (view.piece && !view.gameOver) {
      this.drawPiece(view.piece, view.pistaActive);
    }

    // Flash de fila eliminada
    this.drawFlash(flash);

    // Partículas
    this.drawParticles();

    // Columnas/tablero fuera si el juego ha terminado
    if (view.dim) {
      ctx.fillStyle = 'rgba(5,5,18,0.55)';
      ctx.fillRect(0, 0, COLS * cs, ROWS * cs);
    }
  }

  drawBackground(shake) {
    const { ctx, cellSize: cs } = this;
    ctx.save();
    if (shake > 0) {
      const dx = (Math.random() - 0.5) * shake * cs * 0.12;
      const dy = (Math.random() - 0.5) * shake * cs * 0.12;
      ctx.translate(dx, dy);
    }
    // Fondo con degradado espacial
    const g = ctx.createLinearGradient(0, 0, 0, ROWS * cs);
    g.addColorStop(0, '#0b0b22');
    g.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, COLS * cs, ROWS * cs);

    // Rejilla
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cs, 0);
      ctx.lineTo(c * cs, ROWS * cs);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cs);
      ctx.lineTo(COLS * cs, r * cs);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHighlightColumn(col) {
    const { ctx, cellSize: cs } = this;
    if (col === undefined || col === null) return;
    const blink = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    const x = col * cs;
    // Resplandor dorado de fondo
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 18;
    ctx.fillStyle = `rgba(255, 215, 0, ${0.16 + 0.08 * blink})`;
    ctx.fillRect(x + 2, 2, cs - 4, ROWS * cs - 4);
    ctx.shadowBlur = 0;
    // Borde brillante
    ctx.strokeStyle = `rgba(255, 224, 90, ${0.6 + 0.3 * blink})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, 1, cs - 2, ROWS * cs - 2);
    ctx.restore();
  }

  drawCell(col, row, cell, colorOverride) {
    const { ctx, cellSize: cs } = this;
    const x = col * cs;
    const y = row * cs;
    const pad = 2;
    const color = colorOverride || cell.color;
    const r = Math.round(cs * 0.16);

    ctx.save();
    // Cuerpo con degradado
    const grad = ctx.createLinearGradient(x, y, x, y + cs);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shade(color, -40));
    ctx.fillStyle = grad;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    this.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Borde
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    this.roundRect(x + pad, y + pad, cs - pad * 2, cs - pad * 2, r);
    ctx.stroke();
    // Texto (la palabra)
    if (cell.word) {
      ctx.fillStyle = 'rgba(10,10,25,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fs = this.fitFont(cell.word, cs - 8);
      ctx.font = `700 ${fs}px 'Segoe UI', Roboto, sans-serif`;
      ctx.fillText(cell.word, x + cs / 2, y + cs / 2 + fs * 0.08);
    }
    ctx.restore();
  }

  // Ajusta el tamaño de fuente para que la palabra quepa en la celda
  fitFont(text, maxWidth) {
    const { ctx } = this;
    let size = Math.floor(this.cellSize * 0.24);
    ctx.font = `700 ${size}px sans-serif`;
    while (size > 7 && ctx.measureText(text).width > maxWidth * 0.94) {
      size--;
      ctx.font = `700 ${size}px sans-serif`;
    }
    return size;
  }

  drawPiece(piece, pistaActive) {
    for (const cell of piece.cells) {
      const col = piece.x + cell.col;
      const row = piece.y + cell.row;
      if (row < 0 || row >= ROWS) continue;
      const color = pistaActive && cell.isCorrect ? '#ffd700' : cell.color;
      const glow = pistaActive && cell.isCorrect;
      if (glow) {
        this.drawCell(col, row, { ...cell, color }, '#ffd700');
      } else {
        this.drawCell(col, row, cell);
      }
    }
  }

  drawGhost(piece) {
    const { ctx, cellSize: cs } = this;
    const board = this.viewBoard; // tablero actual (asignado en draw)
    if (!board) return;
    // Proyectamos la pieza hasta el punto de aterrizaje
    let gy = piece.y;
    while (!board.collides(piece, 0, gy + 1 - piece.y)) gy++;
    ctx.save();
    ctx.globalAlpha = 0.16;
    for (const cell of piece.cells) {
      const col = piece.x + cell.col;
      const row = gy + cell.row;
      if (row < 0 || row >= ROWS) continue;
      ctx.fillStyle = cell.isCorrect ? '#ffd700' : '#ffffff';
      const pad = 3;
      this.roundRect(col * cs + pad, row * cs + pad, cs - pad * 2, cs - pad * 2, 8);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFlash(flash) {
    if (!flash || flash.rows.length === 0) return;
    const { ctx, cellSize: cs } = this;
    const t = flash.t / flash.duration;
    const alpha = 0.7 * (1 - t);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = '#00ff88';
    for (const row of flash.rows) {
      ctx.fillRect(0, row * cs, COLS * cs, cs);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const a = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Vista previa de la siguiente pieza en su propio <canvas>
  drawNext(piece) {
    if (!this.nextCtx || !piece) return;
    const ctx = this.nextCtx;
    const n = this.nextCanvas.width / Math.min(window.devicePixelRatio || 1, 2);
    ctx.clearRect(0, 0, n, n);
    const box = pieceBox(piece);
    const cw = box.w;
    const ch = box.h;
    const cs = Math.min((n * 0.7) / cw, (n * 0.7) / ch);
    const offX = (n - cw * cs) / 2 - box.minX * cs;
    const offY = (n - ch * cs) / 2 - box.minY * cs;
    ctx.save();
    for (const cell of piece.cells) {
      ctx.fillStyle = cell.isCorrect ? '#ffd700' : cell.color;
      ctx.shadowColor = cell.color;
      ctx.shadowBlur = 8;
      const x = offX + cell.col * cs + 1;
      const y = offY + cell.row * cs + 1;
      this.roundRect(x, y, cs - 2, cs - 2, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  roundRect(x, y, w, h, r) {
    const { ctx } = this;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

// --- Utilidades ----------------------------------------------------------

function shade(hex, amt) {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function pieceBox(piece) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const cell of piece.cells) {
    minX = Math.min(minX, cell.col);
    minY = Math.min(minY, cell.row);
    maxX = Math.max(maxX, cell.col);
    maxY = Math.max(maxY, cell.row);
  }
  return { minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
