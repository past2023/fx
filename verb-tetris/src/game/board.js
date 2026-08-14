// ============================================================================
//  GAME / BOARD (Lógica del tablero: matriz, colisiones, eliminación de filas)
//  ----------------------------------------------------------------------------
//  El tablero tiene 4 columnas de ancho y 10 filas de alto. Cada celda puede
//  estar vacía (null) o contener una palabra (un verbo conjugado). Aquí se
//  gestiona el movimiento de la pieza actual, las colisiones, el bloqueo y la
//  eliminación de filas.
// ============================================================================

export const COLS = 4;
export const ROWS = 10;

function makeRow() {
  return Array(COLS).fill(null);
}

export class Board {
  constructor() {
    this.cols = COLS;
    this.rows = ROWS;
    this.grid = [];
    this.topOut = false;
    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: this.rows }, () => makeRow());
    this.topOut = false;
  }

  // Devuelve true si la pieza colisiona si se desplaza (dx, dy)
  collides(piece, dx = 0, dy = 0) {
    for (const cell of piece.cells) {
      const col = piece.x + cell.col + dx;
      const row = piece.y + cell.row + dy;
      if (col < 0 || col >= this.cols) return true; // pared lateral
      if (row >= this.rows) return true; // fondo
      if (row >= 0 && this.grid[row][col]) return true; // celda ocupada
    }
    return false;
  }

  // Intenta mover la pieza (dx, dy). Devuelve true si pudo moverse.
  tryMove(piece, dx, dy) {
    if (this.collides(piece, dx, dy)) return false;
    piece.x += dx;
    piece.y += dy;
    return true;
  }

  // Rota la pieza con pequeños ajustes ("wall kicks") para bordes y obstáculos
  rotate(piece) {
    const kicks = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, -1],
      [-2, 0],
      [2, 0],
    ];
    for (const [kx, ky] of kicks) {
      const rotated = rotateCopy(piece);
      if (!this.collides({ ...rotated, x: piece.x + kx, y: piece.y + ky })) {
        piece.matrix = rotated.matrix;
        piece.cells = rotated.cells;
        piece.width = rotated.width;
        piece.x += kx;
        piece.y += ky;
        return true;
      }
    }
    return false;
  }

  // Bloquea la pieza en el tablero y evalúa el resultado de la jugada.
  // Devuelve { placed, outcome, answerCell }
  lockAndEvaluate(piece, highlightCol) {
    const placed = [];
    for (const cell of piece.cells) {
      const col = piece.x + cell.col;
      const row = piece.y + cell.row;
      if (row >= 0) {
        this.grid[row][col] = {
          word: cell.word,
          isCorrect: cell.isCorrect,
          color: cell.color,
        };
        placed.push({ col, row, isCorrect: cell.isCorrect, word: cell.word });
      } else {
        // La pieza se bloqueó por encima del borde superior: fin de partida
        this.topOut = true;
      }
    }

    // Evaluación: ¿qué celda cayó en la columna resaltada?
    const inC = placed.filter((p) => p.col === highlightCol);
    const answerInC = inC.find((p) => p.isCorrect) || null;

    let outcome = 'neutral';
    if (answerInC) outcome = 'correct';
    else if (inC.length > 0) outcome = 'wrong';

    return { placed, outcome, answerCell: answerInC };
  }

  // Calcula las filas a eliminar: la fila donde cayó la respuesta correcta
  // + cualquier fila completamente llena (permite combos de apilamiento).
  computeClearRows(placed, outcome, highlightCol) {
    if (outcome !== 'correct') return [];
    const answerCell = placed.find((p) => p.col === highlightCol && p.isCorrect);
    if (!answerCell) return [];

    const rows = new Set([answerCell.row]);
    for (let r = 0; r < this.rows; r++) {
      if (this.grid[r].every((cell) => cell !== null)) rows.add(r);
    }
    return [...rows];
  }

  // Elimina las filas indicadas y deja caer las superiores. Devuelve la cuenta.
  clearRows(rowList) {
    if (rowList.length === 0) return 0;
    const rowSet = new Set(rowList);
    const kept = this.grid.filter((_, r) => !rowSet.has(r));
    while (kept.length < this.rows) kept.unshift(makeRow());
    this.grid = kept;
    return rowList.length;
  }

  // Eliminador de Errores: elimina una celda concreta y deja caer las de arriba
  removeCell(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    if (!this.grid[row][col]) return false;
    for (let r = row; r >= 1; r--) {
      this.grid[r][col] = this.grid[r - 1][col];
    }
    this.grid[0][col] = null;
    return true;
  }
}

// Crea una copia de la pieza con la matriz rotada (sin mutar el original)
function rotateCopy(piece) {
  const n = piece.matrix.length;
  const newMatrix = Array.from({ length: n }, () => Array(n).fill(null));
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n; r++) {
      if (piece.matrix[c][r]) {
        // copia superficial de la celda (los objetos se reutilizan en el pieza)
        const cell = { ...piece.matrix[c][r] };
        newMatrix[r][n - 1 - c] = cell;
        cell.col = n - 1 - c;
        cell.row = r;
      }
    }
  }
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (newMatrix[r][c]) cells.push(newMatrix[r][c]);
    }
  }
  return { matrix: newMatrix, cells, width: n };
}
