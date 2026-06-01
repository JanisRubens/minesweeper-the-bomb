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
 * megaMineIndex: flat index of the single mega-mine (null before mines placed).
 * revealed: Set of cell indices that have been revealed.
 * flagged: Set of cell indices that have been flagged by the player.
 * firstClickDone: flag to ensure mines are placed only on the first click.
 * gameState: "playing" | "loss" | "big-explosion" | "win"
 */
const state = {
  mines: new Set(),
  megaMineIndex: null,
  revealed: new Set(),
  flagged: new Set(),
  firstClickDone: false,
  gameState: "playing",
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

  // Randomly designate one of the placed mines as the mega-mine.
  const mineArray = Array.from(state.mines);
  state.megaMineIndex = mineArray[Math.floor(Math.random() * mineArray.length)];
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
 * Return true if the cell at (row, col) is adjacent to the mega-mine.
 * @param {number} row
 * @param {number} col
 * @returns {boolean}
 */
function isAdjacentToMegaMine(row, col) {
  if (state.megaMineIndex === null) return false;
  const mr = Math.floor(state.megaMineIndex / COLS);
  const mc = state.megaMineIndex % COLS;
  return Math.abs(row - mr) <= 1 && Math.abs(col - mc) <= 1 &&
    !(row === mr && col === mc);
}

/**
 * Reveal a single cell in the DOM, showing its adjacent mine count.
 * Cells adjacent to the mega-mine display their digit in red (#d32f2f).
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
    // Cells adjacent to the mega-mine always show their digit in red.
    cell.style.color = isAdjacentToMegaMine(row, col)
      ? "#d32f2f"
      : DIGIT_COLORS[adjacentCount];
  }
}

/**
 * Trigger the mega-mine chain reaction.
 * Reveals the mega-mine cell itself with a 💥 icon and red background,
 * then instantly reveals all 8 adjacent neighbors.
 * Neighbor cells that contain mines are shown as detonated (💣) but do
 * not trigger further chain reactions.
 * Sets state.gameState to "big-explosion".
 *
 * @param {number} megaRow - row of the mega-mine
 * @param {number} megaCol - col of the mega-mine
 */
function triggerMegaMineDetonation(megaRow, megaCol) {
  // Mark the mega-mine cell itself
  const megaCell = document.querySelector(
    `.cell[data-row="${megaRow}"][data-col="${megaCol}"]`
  );
  if (megaCell) {
    megaCell.classList.add("revealed", "mega-mine-detonated");
    megaCell.textContent = "💥";
  }
  state.revealed.add(toIndex(megaRow, megaCol));

  // Reveal all 8 neighbors simultaneously
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = megaRow + dr;
      const nc = megaCol + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;

      const ni = toIndex(nr, nc);
      const neighborCell = document.querySelector(
        `.cell[data-row="${nr}"][data-col="${nc}"]`
      );
      if (!neighborCell) continue;

      state.revealed.add(ni);
      neighborCell.classList.add("revealed");

      if (state.mines.has(ni)) {
        // Neighbor is a mine — show as detonated, no further chain
        neighborCell.classList.add("mine-detonated");
        neighborCell.textContent = "💣";
      } else {
        // Normal cell — show adjacent mine count
        const adjacentCount = countAdjacentMines(nr, nc);
        if (adjacentCount > 0) {
          neighborCell.textContent = adjacentCount;
          neighborCell.style.color = isAdjacentToMegaMine(nr, nc)
            ? "#d32f2f"
            : DIGIT_COLORS[adjacentCount];
        }
      }
    }
  }

  state.gameState = "big-explosion";
  console.log("BIG EXPLOSION");
  revealAllMines();
  showGameOver("big-explosion");
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

  // Ignore clicks if the game has already ended
  if (state.gameState !== "playing") return;

  if (state.mines.has(index)) {
    if (index === state.megaMineIndex) {
      // Mega-mine clicked — trigger chain reaction detonation
      triggerMegaMineDetonation(row, col);
    } else {
      // Regular mine — standard loss
      const cell = document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
      );
      if (cell) {
        cell.classList.add("revealed", "mine-detonated");
        cell.textContent = "💣";
      }
      state.revealed.add(index);
      state.gameState = "loss";
      console.log("game over");
      revealAllMines();
      showGameOver("loss");
    }
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
 * Update the mine counter display: total mines minus flags placed.
 */
function updateMineCounter() {
  const countEl = document.getElementById("mine-count");
  if (countEl) {
    countEl.textContent = MINE_COUNT - state.flagged.size;
  }
}

/**
 * Handle a right-click (contextmenu) on a cell to toggle a flag.
 * Flagging already-revealed cells does nothing.
 * @param {Event} event
 */
function handleCellRightClick(event) {
  event.preventDefault();
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  const index = toIndex(row, col);

  // Do nothing on already-revealed cells
  if (state.revealed.has(index)) return;

  if (state.flagged.has(index)) {
    state.flagged.delete(index);
    cell.textContent = "";
    cell.classList.remove("flagged");
  } else {
    state.flagged.add(index);
    cell.textContent = "🚩";
    cell.classList.add("flagged");
  }

  updateMineCounter();
}

/**
 * Handle a left-click on a cell after mines have been placed.
 * Flagged cells cannot be revealed by left-click.
 * @param {Event} event
 */
function handleCellClick(event) {
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  const index = toIndex(row, col);

  // Flagged cells cannot be accidentally revealed
  if (state.flagged.has(index)) return;

  revealCell(row, col);
}

/**
 * Handle the first click on any cell.
 * Places mines (guaranteeing the clicked cell is safe) and marks
 * firstClickDone so subsequent clicks skip mine placement.
 * Flagged cells are not triggerable as the first click.
 *
 * @param {Event} event
 */
function handleFirstClick(event) {
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);
  const index = toIndex(row, col);

  // Flagged cells cannot be revealed
  if (state.flagged.has(index)) return;

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
      // Wire up the first-click safety handler and right-click flag handler
      cell.addEventListener("click", handleFirstClick);
      cell.addEventListener("contextmenu", handleCellRightClick);
      fragment.appendChild(cell);
    }
  }

  board.appendChild(fragment);
}

/**
 * Reveal all mines on the board after game over.
 * - Unflagged mines are shown as mines (💣).
 * - The mega-mine (if not already detonated) gets the mega-mine-revealed style with 💥.
 * - Incorrectly flagged non-mine cells are shown with ✗.
 */
function revealAllMines() {
  // Show all mines that haven't been revealed yet
  state.mines.forEach((mi) => {
    if (state.revealed.has(mi)) return; // already shown (detonated cell)
    const row = Math.floor(mi / COLS);
    const col = mi % COLS;
    const cell = document.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`
    );
    if (!cell) return;

    if (mi === state.megaMineIndex) {
      // Mega-mine gets a distinct red highlight + larger icon
      cell.classList.remove("flagged");
      cell.classList.add("mega-mine-revealed");
      cell.textContent = "💥";
    } else {
      cell.classList.remove("flagged");
      cell.classList.add("mine-revealed");
      cell.textContent = "💣";
    }
    state.revealed.add(mi);
  });

  // Mark incorrectly flagged non-mine cells with ✗
  state.flagged.forEach((fi) => {
    if (state.mines.has(fi)) return; // correct flag — leave it
    const row = Math.floor(fi / COLS);
    const col = fi % COLS;
    const cell = document.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`
    );
    if (!cell) return;
    cell.classList.remove("flagged");
    cell.classList.add("wrong-flag");
    cell.textContent = "✗";
  });
}

/**
 * Display the game-over overlay with the appropriate message.
 * @param {"loss"|"big-explosion"} type - which kind of game-over occurred
 */
function showGameOver(type) {
  const overlay = document.getElementById("game-over-overlay");
  const message = document.getElementById("game-over-message");
  if (!overlay || !message) return;

  if (type === "big-explosion") {
    message.textContent = "💥 BIG EXPLOSION! The mega-mine got you.";
  } else {
    message.textContent = "BOOM! You hit a mine.";
  }

  overlay.classList.remove("hidden");
}

/**
 * Reset the game state and re-render the board.
 * Mines will be placed fresh on the next first click.
 */
function newGame() {
  state.mines = new Set();
  state.megaMineIndex = null;
  state.revealed = new Set();
  state.flagged = new Set();
  state.firstClickDone = false;
  state.gameState = "playing";

  // Hide the game-over overlay if it was showing
  const overlay = document.getElementById("game-over-overlay");
  if (overlay) overlay.classList.add("hidden");

  updateMineCounter();
  renderBoard();
}

// Wire up the "Play Again" button
document.getElementById("play-again-btn").addEventListener("click", newGame);

newGame();
