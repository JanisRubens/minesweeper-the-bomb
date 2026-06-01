# Minesweeper — The Bomb

Classic Minesweeper on a 16×16 grid with one twist: **one of the 40 mines is a mega-mine**. Trigger it and it takes out all 8 surrounding cells in a chain explosion.

## Deploy (GitHub Pages)

The game is live at:

```
https://janisrubens.github.io/minesweeper-the-bomb/
```

## The twist

- Adjacent cells show their numbers in **red** — a warning that the mega-mine is nearby
- Trigger it: instant loss with a distinct "💥 BIG EXPLOSION" screen
- Flag it correctly before winning: earn the **⭐ Big one found!** bonus

## How to play

| Action | Result |
|--------|--------|
| Left-click | Reveal cell |
| Right-click | Place / remove flag 🚩 |
| Smiley button | New game |

- First click is always safe
- Reveal all 216 non-mine cells to win
- Timer tracks your best time (saved across sessions)

## Run locally

No build step needed — open `index.html` in any browser.

```bash
open index.html
```
