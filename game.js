// game.js — Minesweeper game module (files live at repo root)
// This module will contain all game logic.

const ROWS = 16;
const COLS = 16;
const MINE_COUNT = 40;

/** Digit colors per standard Minesweeper convention. */
const DIGIT_COLORS = {
  1: "#0000ff",
  2: "#007b00",
  3: "#ff0000",
  4: "#00007b",
  5: "#7b0000",
  6: "#007b7b",
  7: "#000000",
  8: "#7b7b7b",
};

/**
 * Game state.
 * mines: Set of cell indices (row * COLS + col) that contain mines.
 * revealed: Set of cell indices that have been revealed.
 * firstClickDone: flag to ensure mines are placed only on the first click.
 */
const state = {
  mines: new Set(),
  revealed: new Set(),
  firstClickDone: false,
};

/**
 * Convert (row, col) to a flat cell index.
 * @param {number} row
 * @param {number} col
 * @returns {number}
 */
function toIndex(row, col) {
  return row * COLS + col;
}

/**
 * Place MINE_COUNT mines randomly on the grid, guaranteeing that the
 * cell at firstClickIndex is always mine-free.
 *
 * Uses a Fisher-Yates partial shuffle over the pool of eligible indices.
 *
 * @param {number} firstClickIndex - flat index of the first-clicked cell
 */
function placeMines(firstClickIndex) {
  // Build pool of all indices except the safe first-click cell
  const pool = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    if (i !== firstClickIndex) {
      pool.push(i);
    }
  }

  // Fisher-Yates partial shuffle: pick MINE_COUNT elements
  for (let i = 0; i < MINE_COUNT; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    // Swap pool[i] and pool[j]
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  state.mines = new Set(pool.slice(0, MINE_COUNT));
}

/**
 * Count the number of mines in the 8 neighbours of (row, col).
 * @param {number} row
 * @param {number} col
 * @returns {number}
 */
function countAdjacentMines(row, col) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        if (state.mines.has(toIndex(r, c))) count++;
      }
    }
  }
  return count;
}

/**
 * Reveal a single cell in the DOM, showing its adjacent mine count.
 * @param {number} row
 * @param {number} col
 * @param {number} adjacentCount
 */
function revealCellDOM(row, col, adjacentCount) {
  const cell = document.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`
  );
  if (!cell) return;
  cell.classList.add("revealed");
  if (adjacentCount > 0) {
    cell.textContent = adjacentCount;
    cell.style.color = DIGIT_COLORS[adjacentCount];
  }
}

/**
 * Reveal the cell at (row, col).
 * - If it is already revealed, do nothing.
 * - If it is a mine, log "game over" to the console.
 * - Otherwise reveal it; if it has 0 adjacent mines, BFS-flood all
 *   connected zero-cells and their numbered borders.
 *
 * @param {number} row
 * @param {number} col
 */
function revealCell(row, col) {
  const index = toIndex(row, col);

  if (state.revealed.has(index)) return;

  if (state.mines.has(index)) {
    console.log("game over");
    return;
  }

  const adjacentCount = countAdjacentMines(row, col);
  state.revealed.add(index);
  revealCellDOM(row, col, adjacentCount);

  if (adjacentCount === 0) {
    // BFS flood-fill for connected empty cells
    const queue = [[row, col]];
    while (queue.length > 0) {
      const [r, c] = queue.shift();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
          const ni = toIndex(nr, nc);
          if (state.revealed.has(ni) || state.mines.has(ni)) continue;
          const neighborCount = countAdjacentMines(nr, nc);
          state.revealed.add(ni);
          revealCellDOM(nr, nc, neighborCount);
          if (neighborCount === 0) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }
}

/**
 * Handle a left-click on a cell after mines have been placed.
 * @param {Event} event
 */
function handleCellClick(event) {
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  revealCell(row, col);
}

/**
 * Handle the first click on any cell.
 * Places mines (guaranteeing the clicked cell is safe) and marks
 * firstClickDone so subsequent clicks skip mine placement.
 *
 * @param {Event} event
 */
function handleFirstClick(event) {
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  const index = toIndex(row, col);

  placeMines(index);
  state.firstClickDone = true;

  // Remove the one-time first-click listeners from every cell and wire up
  // the normal reveal handler.
  document.querySelectorAll(".cell").forEach((c) => {
    c.removeEventListener("click", handleFirstClick);
    c.addEventListener("click", handleCellClick);
  });

  // Reveal the first-clicked cell now that mines are placed.
  revealCell(row, col);
}

/**
 * Render a 16×16 grid of unrevealed cells into the #board element.
 * Each cell carries data-row and data-col attributes.
 */
function renderBoard() {
  const board = document.getElementById("board");
  // Clear any existing cells (supports new-game resets)
  board.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;
      // Wire up the first-click safety handler
      cell.addEventListener("click", handleFirstClick);
      fragment.appendChild(cell);
    }
  }

  board.appendChild(fragment);
}

/**
 * Reset the game state and re-render the board.
 * Mines will be placed fresh on the next first click.
 */
function newGame() {
  state.mines = new Set();
  state.revealed = new Set();
  state.firstClickDone = false;
  renderBoard();
}

newGame();
