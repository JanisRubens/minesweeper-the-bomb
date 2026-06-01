// game.js — Minesweeper game module (files live at repo root)
// This module will contain all game logic.

const ROWS = 16;
const COLS = 16;

/**
 * Render a 16×16 grid of unrevealed cells into the #board element.
 * Each cell carries data-row and data-col attributes.
 */
function renderBoard() {
  const board = document.getElementById("board");
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;
      fragment.appendChild(cell);
    }
  }

  board.appendChild(fragment);
}

renderBoard();
