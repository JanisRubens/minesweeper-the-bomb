// game.js — Minesweeper game module (files live at repo root)
// This module will contain all game logic.

const ROWS = 16;
const COLS = 16;
const MINE_COUNT = 40;

/**
 * Game state.
 * mines: Set of cell indices (row * COLS + col) that contain mines.
 * firstClickDone: flag to ensure mines are placed only on the first click.
 */
const state = {
  mines: new Set(),
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

  // Remove the one-time first-click listeners from every cell so future
  // clicks go through the normal (not-yet-implemented) reveal logic.
  document.querySelectorAll(".cell").forEach((c) => {
    c.removeEventListener("click", handleFirstClick);
  });
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
  state.firstClickDone = false;
  renderBoard();
}

newGame();
