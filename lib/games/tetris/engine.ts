// Motor adaptado de reference/juegos/03/claude-tetris/game.js:
// en vez de document/window a nivel de módulo, todo vive dentro de createTetrisEngine()
// para poder crear y destruir instancias al montar/desmontar el componente React.
//
// Se preserva la paleta original "retro" del juego fuente; se descartan la pantalla de
// inicio, el selector de piel/tema, el menú de pausa propio y el leaderboard local en
// localStorage — reemplazados por el HUD/pausa/modal y el leaderboard real ya compartidos
// por el reproductor (ver specs/07-juego-tetris-real.md, sección Decisions).

import type { GameCallbacks, GameEngine } from "@/lib/games/types";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_W = COLS * BLOCK; // 300
const BOARD_H = ROWS * BLOCK; // 600
const PANEL_W = 150;
const W = BOARD_W + PANEL_W; // 450 — tablero + panel de "siguiente pieza"
const H = BOARD_H; // 600

const BG_COLOR = "#0a0a12";
const GRID_COLOR = "#22222e";

// Paleta "retro" original de game.js (única paleta preservada, sin selector de piel).
const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I
  "#ffd54f", // O
  "#ba68c8", // T
  "#81c784", // S
  "#e57373", // Z
  "#64b5f6", // J
  "#ffb74d", // L
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type Piece = { type: number; shape: number[][]; x: number; y: number };

function getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  return ctx;
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = (PIECES[type] as number[][]).map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks, // hasLives es false para este juego: nunca llama onLivesChange
): GameEngine {
  const ctx = getContext2D(canvas);

  let board: number[][] = [];
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropAccum = 0;
  let dropInterval = 1000;
  let state: "playing" | "gameover" = "playing";
  let paused = false;
  let destroyed = false;

  function setScore(value: number) {
    score = value;
    callbacks.onScoreChange(score);
  }
  function setLevel(value: number) {
    level = value;
    callbacks.onLevelChange?.(level);
  }

  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      setScore(score + (LINE_SCORES[cleared] || 0) * level);
      setLevel(Math.floor(lines / 10) + 1);
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    setScore(score + (gy - current.y) * 2);
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      setScore(score + 1);
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      endGame();
    }
  }

  function endGame() {
    state = "gameover";
    callbacks.onGameOver(score);
  }

  function initGame() {
    board = createBoard();
    setScore(0);
    lines = 0;
    setLevel(1);
    dropInterval = 1000;
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
  }

  // ── Dibujo ───────────────────────────────────────────────────────────────
  function drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    alpha = 1,
  ) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex];
    if (!color) return;
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    context.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, BOARD_H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(BOARD_W, r * BLOCK);
      ctx.stroke();
    }
  }

  function drawBoard() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }

  function drawNextPanel() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(BOARD_W, 0, PANEL_W, H);
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(BOARD_W + 0.5, 0.5, PANEL_W - 1, H - 1);

    const PANEL_CELLS = PANEL_W / BLOCK; // 5
    const shape = next.shape;
    const offX = Math.floor((PANEL_CELLS - shape[0].length) / 2);
    const offY = 1;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, COLS + offX + c, offY + r, shape[r][c], BLOCK);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBoard();
    drawNextPanel();
  }

  // ── Teclado ──────────────────────────────────────────────────────────────
  // Solo actúa mientras el estado interno es "playing" y no está en pausa, para
  // no interferir con el input de iniciales del modal de fin de partida de React.
  function onKeyDown(e: KeyboardEvent) {
    if (paused || state !== "playing") return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        e.preventDefault();
        hardDrop();
        break;
    }
  }
  window.addEventListener("keydown", onKeyDown);

  // ── Loop principal ───────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId = 0;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;

    if (!paused && state === "playing") {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
    }

    draw();
    if (!destroyed) rafId = requestAnimationFrame(loop);
  }

  initGame();
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(value: boolean) {
      paused = value;
    },
    reset() {
      initGame();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
