// ============================================================================
//  GAME / PIECES (Lógica de las piezas: formas, rotación, asignación de verbos)
//  ----------------------------------------------------------------------------
//  Define las 7 formas clásicas de tetrominó, los temas de color y la
//  generación de piezas. Cada celda de la pieza contiene un verbo conjugado;
//  una de esas celdas (la "celda respuesta") contiene el verbo correcto y el
//  resto, verbos distractores.
// ============================================================================

// --- Colores base por forma (tema por defecto "default") --------------------

const BASE_COLORS = {
  I: '#00e5ff',
  O: '#ffd700',
  T: '#ff2d95',
  S: '#aaff00',
  Z: '#ff9100',
  J: '#9d4dff',
  L: '#00ffc8',
};

// --- Temas estéticos (se desbloquean al completar ciertas misiones) ---------

export const THEMES = {
  default: BASE_COLORS,
  retro: {
    I: '#ff5e6c', O: '#ffb84d', T: '#ffd166', S: '#06d6a0', Z: '#f4a261',
    J: '#9b5de5', L: '#00bbf9',
  },
  fiesta: {
    I: '#ff595e', O: '#ffca3a', T: '#8ac926', S: '#1982c4', Z: '#6a4c93',
    J: '#ff6d00', L: '#ff9e00',
  },
  neon: {
    I: '#00fff9', O: '#ffff00', T: '#ff00ff', S: '#00ff88', Z: '#ff5e00',
    J: '#9d00ff', L: '#00ffd5',
  },
};

// --- Formas de los tetrominós (matrices n×n, 1 = celda ocupada) -------------

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const SHAPE_NAMES = Object.keys(SHAPES);

// --- Rotación (90° en sentido horario) sobre una matriz de objetos ----------

function rotateMatrix(matrix) {
  const n = matrix.length;
  const res = Array.from({ length: n }, () => Array(n).fill(null));
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n; r++) {
      res[r][n - 1 - c] = matrix[c][r];
    }
  }
  return res;
}

// --- Construcción de una pieza a partir de una forma y una frase ------------

// Elige un índice de columna de la celda-respuesta dentro de la pieza de modo
// que SIEMPRE sea posible colocar la respuesta en la columna resaltada.
// pieceWidth es el ancho de la pieza en su orientación de aparición.
function pickAnswerCol(pieceWidth, highlightCol) {
  const min = Math.max(0, highlightCol + pieceWidth - 4);
  const max = Math.min(pieceWidth - 1, highlightCol);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Genera una pieza aleatoria con sus verbos asignados.
// phrase: datos de la frase actual (answer, distractors, column 0-3)
export function generatePiece(phrase, themeName = 'default') {
  const shapeName = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
  const raw = SHAPES[shapeName];
  const n = raw.length;
  const highlightCol = phrase.column - 1; // frase.column es 1-4
  const theme = THEMES[themeName] || BASE_COLORS;
  const color = theme[shapeName] || BASE_COLORS[shapeName];

  // Convertimos la matriz de 0/1 en una matriz de objetos de celda
  const matrix = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      row.push(
        raw[r][c]
          ? { col: c, row: r, word: null, isCorrect: false, color }
          : null
      );
    }
    matrix.push(row);
  }

  // Elegimos la celda-respuesta y le asignamos el verbo correcto
  const answerCol = pickAnswerCol(n, highlightCol);
  const candidates = [];
  for (let r = 0; r < n; r++) {
    if (matrix[r][answerCol]) candidates.push(matrix[r][answerCol]);
  }
  const answerCell = candidates[Math.floor(Math.random() * candidates.length)];
  answerCell.word = phrase.answer;
  answerCell.isCorrect = true;

  // El resto de celdas reciben verbos distractores (al azar)
  const distractors = phrase.distractors || [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = matrix[r][c];
      if (cell && !cell.isCorrect) {
        cell.word = distractors[Math.floor(Math.random() * distractors.length)];
      }
    }
  }

  // Reunimos las celdas ocupadas en una lista plana
  const cells = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) cells.push(matrix[r][c]);
    }
  }

  // Posición de aparición alineada para que la respuesta caiga en la columna
  // resaltada si se deja caer en vertical.
  return {
    shapeName,
    matrix,
    cells,
    color,
    // Posición en el tablero (columna superior-izquierda del bounding box)
    x: highlightCol - answerCol,
    y: -1,
    width: n,
  };
}

// Rota la pieza 90° en sentido horario (devuelve un nuevo objeto de matriz)
export function rotatePiece(piece) {
  const newMatrix = rotateMatrix(piece.matrix);
  const cells = [];
  for (let r = 0; r < newMatrix.length; r++) {
    for (let c = 0; c < newMatrix.length; c++) {
      if (newMatrix[r][c]) {
        newMatrix[r][c].col = c;
        newMatrix[r][c].row = r;
        cells.push(newMatrix[r][c]);
      }
    }
  }
  return { ...piece, matrix: newMatrix, cells };
}
