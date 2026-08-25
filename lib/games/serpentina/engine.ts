// Motor de Snake diseñado desde cero (sin fuente de código de partida, ver spec 09).
// Sprites de fruta cargados desde reference/snake-assets/, servidos vía public/games/serpentina/.

import type { GameCallbacks, GameEngine } from "@/lib/games/types";
import {
  FRUIT_NAMES,
  FRUIT_SHEET_SRC,
  FRUIT_SPRITES,
} from "@/lib/games/serpentina/sprites";

const BG_COLOR = "#050505";
const SNAKE_HEAD_COLOR = "#aaffaa";
const SNAKE_BODY_COLOR = "#33ff33";
const CELL_GAP = 1; // separación visual entre segmentos de la grilla

type Point = { x: number; y: number };
type Phase = "playing" | "over";

const COLS = 20;
const ROWS = 15;
const CELL = 30; // canvas lógico: 600x450
const TICK_MS_BASE = 150;
const TICK_MS_MIN = 60;
const TICK_MS_STEP = 12;
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;

function getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  return ctx;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const randomFruitName = () => FRUIT_NAMES[randInt(0, FRUIT_NAMES.length - 1)];

export function createSerpentinaEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const ctx = getContext2D(canvas);

  const fruitSheet = new Image();
  fruitSheet.src = FRUIT_SHEET_SRC;

  let paused = false;
  let destroyed = false;
  let phase: Phase = "playing";

  let snake: Point[] = [];
  let direction: Point = { x: 1, y: 0 };
  let nextDirection: Point = direction;
  let score = 0;
  let level = 1;
  let fruitsEaten = 0;
  let fruit: { pos: Point; sprite: string } = { pos: { x: 0, y: 0 }, sprite: randomFruitName() };

  function isOnSnake(p: Point): boolean {
    return snake.some((s) => s.x === p.x && s.y === p.y);
  }

  function spawnFruit() {
    let pos: Point;
    do {
      pos = { x: randInt(0, COLS - 1), y: randInt(0, ROWS - 1) };
    } while (isOnSnake(pos));
    fruit = { pos, sprite: randomFruitName() };
  }

  function reset() {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = direction;
    score = 0;
    level = 1;
    fruitsEaten = 0;
    phase = "playing";
    spawnFruit();
  }

  function tickIntervalMs(): number {
    return Math.max(TICK_MS_MIN, TICK_MS_BASE - (level - 1) * TICK_MS_STEP);
  }

  function endGame() {
    phase = "over";
    callbacks.onGameOver(score);
  }

  function step() {
    direction = nextDirection;
    const head = snake[0];
    const newHead: Point = { x: head.x + direction.x, y: head.y + direction.y };

    if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
      endGame();
      return;
    }

    const ateFruit = newHead.x === fruit.pos.x && newHead.y === fruit.pos.y;
    // La cola se libera este mismo paso si no come, así que no cuenta como colisión.
    const bodyToCheck = ateFruit ? snake : snake.slice(0, -1);
    if (bodyToCheck.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      endGame();
      return;
    }

    snake.unshift(newHead);
    if (ateFruit) {
      score += POINTS_PER_FRUIT;
      callbacks.onScoreChange(score);
      fruitsEaten += 1;
      const newLevel = 1 + Math.floor(fruitsEaten / FRUITS_PER_LEVEL);
      if (newLevel !== level) {
        level = newLevel;
        callbacks.onLevelChange?.(level);
      }
      spawnFruit();
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? SNAKE_HEAD_COLOR : SNAKE_BODY_COLOR;
      ctx.fillRect(
        seg.x * CELL + CELL_GAP,
        seg.y * CELL + CELL_GAP,
        CELL - CELL_GAP * 2,
        CELL - CELL_GAP * 2,
      );
    });

    const rect = FRUIT_SPRITES[fruit.sprite];
    if (rect && fruitSheet.complete) {
      const scale = Math.min(CELL / rect.w, CELL / rect.h);
      const dw = rect.w * scale;
      const dh = rect.h * scale;
      const dx = fruit.pos.x * CELL + (CELL - dw) / 2;
      const dy = fruit.pos.y * CELL + (CELL - dh) / 2;
      ctx.drawImage(fruitSheet, rect.x, rect.y, rect.w, rect.h, dx, dy, dw, dh);
    }
  }

  let rafId: number | null = null;
  let lastTime = 0;
  let accumulator = 0;

  function loop(time: number) {
    if (destroyed) return;
    const delta = lastTime === 0 ? 0 : time - lastTime;
    lastTime = time;

    if (!paused && phase === "playing") {
      accumulator += delta;
      const interval = tickIntervalMs();
      while (accumulator >= interval) {
        step();
        accumulator -= interval;
        if (phase !== "playing") {
          accumulator = 0;
          break;
        }
      }
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  const CAPTURED_CODES = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
  ];

  function directionForCode(code: string): Point | null {
    switch (code) {
      case "ArrowUp":
      case "KeyW":
        return { x: 0, y: -1 };
      case "ArrowDown":
      case "KeyS":
        return { x: 0, y: 1 };
      case "ArrowLeft":
      case "KeyA":
        return { x: -1, y: 0 };
      case "ArrowRight":
      case "KeyD":
        return { x: 1, y: 0 };
      default:
        return null;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (CAPTURED_CODES.includes(e.code)) e.preventDefault();
    if (paused || phase !== "playing") return;
    const requested = directionForCode(e.code);
    if (!requested) return;
    const isReversal =
      requested.x === -direction.x && requested.y === -direction.y;
    if (isReversal) return;
    nextDirection = requested;
  }
  window.addEventListener("keydown", onKeyDown);

  reset();
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(next: boolean) {
      paused = next;
    },
    reset,
    destroy() {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
