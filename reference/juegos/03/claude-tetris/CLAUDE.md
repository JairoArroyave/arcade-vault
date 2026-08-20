# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page Tetris implementation in vanilla JavaScript (ES6+), HTML5 Canvas, and CSS. No dependencies, no build step, no package manager — just three files: `index.html`, `style.css`, `game.js`.

## Running the game

There is no build/lint/test tooling. To run:

```bash
start index.html        # Windows — open directly, or:
npx serve .              # local static server (recommended for consistent canvas behavior)
```

Then open the served URL (e.g. `http://localhost:3000`) in a browser. To verify a change works, actually open the page and play — there are no automated tests.

## Architecture

Everything lives in `game.js` (~300 lines), organized as global state + functions operating on it (no classes, no modules):

- **Board model**: `board` is a `ROWS × COLS` matrix (20×10). Each cell is `0` (empty) or an integer 1–7 identifying which piece color occupies it (`COLORS` array).
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. `current` and `next` are piece objects (`{ type, shape, x, y }`); `spawn()` promotes `next` into `current` and generates a new `next`.
- **Rotation**: `rotateCW(shape)` transposes + reverses rows. `tryRotate()` wraps it with wall-kick offsets `[0, -1, 1, -2, 2]`, trying each until one doesn't collide.
- **Collision**: `collide(shape, ox, oy)` is the single source of truth for whether a shape at a given offset is out of bounds or overlaps locked board cells. Movement, rotation, and ghost-piece projection all route through it.
- **Locking/scoring pipeline**: `lockPiece()` → `merge()` (bakes the current piece into `board`) → `clearLines()` (removes full rows, updates `score`/`lines`/`level`/`dropInterval`) → `spawn()` (brings in the next piece; if it immediately collides, calls `endGame()`).
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulating elapsed time (`dropAccum`) against `dropInterval`; when exceeded, the piece drops one row or locks. `draw()` renders grid, locked board, ghost piece (`ghostY()`, alpha 0.2), and the current piece, in that order, every frame.
- **Input**: a single `keydown` listener switches on `e.code` (arrows + `KeyX` + `Space` + `KeyP`) and is gated by `paused`/`gameOver`.

Tunable constants at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).
