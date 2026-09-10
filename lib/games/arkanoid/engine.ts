// Motor adaptado de reference/juegos/04/arkanoid/js/game.js:
// en vez de document/window a nivel de módulo, todo vive dentro de createArkanoidEngine()
// para poder crear y destruir instancias al montar/desmontar el componente React.
//
// A diferencia de Asteroids/Tetris (dibujo vectorial puro), este juego depende de un
// spritesheet servido desde public/games/bloque-buster/spritesheet-breakout.png; el loop
// de requestAnimationFrame arranca recién cuando esa imagen termina de cargar, igual que
// loadSpritesheet(() => loop()) en el original. Se preserva la pantalla de selección de
// dificultad (1/2/3, dibujada dentro del canvas) y el sonido del original; se descartan el
// HUD/overlay de fin de partida y el reinicio propio por tecla/click — ver
// specs/08-juego-arkanoid-real.md, sección Decisions.

import type { GameCallbacks, GameEngine, Skin } from "@/lib/games/types";
import {
  SPRITES,
  EXPLOSION_FRAMES,
  EXPLOSION_DURATION,
  type BlockColor,
} from "@/lib/games/arkanoid/sprites";

const W = 480;
const H = 640;
const BRICK_ROWS = 7;
const BRICK_COLS = 8;
const BRICK_W = 32;
const BRICK_H = 16;
const BRICK_GAP = 4;
const BRICK_COLORS: BlockColor[] = [
  "red",
  "yellow",
  "green",
  "cyan",
  "magenta",
  "hotpink",
  "gray",
];
const POINTS_PER_BRICK = 10;

const INITIAL_PADDLE = { x: 159, y: 610, w: 162, h: 14, speed: 6 };
const INITIAL_BALL = { x: 240, y: 596, radius: 8, dx: 3, dy: -3 };

const DIFFICULTY_LEVELS: Record<"Digit1" | "Digit2" | "Digit3", { dx: number; dy: number }> = {
  Digit1: { dx: 3, dy: -3 }, // easy
  Digit2: { dx: 4.5, dy: -4.5 }, // medium
  Digit3: { dx: 6, dy: -6 }, // hard
};

const SPRITE_PATH = "/games/bloque-buster/spritesheet-breakout.png";
const SOUND_PATHS = {
  bounce: "/games/bloque-buster/sounds/ball-bounce.mp3",
  break: "/games/bloque-buster/sounds/break-sound.mp3",
};

type Paddle = { x: number; y: number; w: number; h: number; speed: number };
type Ball = { x: number; y: number; radius: number; dx: number; dy: number };
type Brick = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  startTime: number;
};

// ── Paletas por skin ──────────────────────────────────────────────────────
// El motor de Arkanoid no dibuja nada vectorial: paleta, pelota, ladrillos y
// explosiones salen del spritesheet. clasico (tint: null) lo dibuja sin tocar;
// neon/retro tiñen el spritesheet una sola vez (ver "atlas teñido", más abajo).
type ArkanoidTint = {
  blocks: Record<BlockColor, string>; // un hex por fila del tablero
  paddle: string;
  ball: string;
  // las explosiones heredan el tinte de blocks[color] (mismo color que su ladrillo)
};

type ArkanoidPalette = {
  tint: ArkanoidTint | null; // null = spritesheet original (clasico)
  overlayScrim: string; // fillRect de drawStartOverlay (dim, no color)
  overlayText: string; // color del texto "Choose difficulty" / "1: Easy ..."
  glow: number; // ctx.shadowBlur de sprites y texto (0 = sin glow); shadowColor = color del rol
};

const PALETTES: Record<Skin, ArkanoidPalette> = {
  clasico: {
    tint: null,
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#ffffff",
    glow: 0,
  },
  neon: {
    tint: {
      blocks: {
        red: "#ff3355",
        yellow: "#f5ff00",
        green: "#00b3ff",
        cyan: "#00f5ff",
        magenta: "#b26bff",
        hotpink: "#ff8a00",
        gray: "#e6e9ff",
      },
      paddle: "#00ff88",
      ball: "#ffffff",
    },
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#00f5ff",
    glow: 8,
  },
  retro: {
    tint: {
      blocks: {
        red: "#40d840",
        yellow: "#40d840",
        green: "#40d840",
        cyan: "#40d840",
        magenta: "#40d840",
        hotpink: "#40d840",
        gray: "#40d840",
      },
      paddle: "#b6ffb6",
      ball: "#e6ffe6",
    },
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#66ff66",
    glow: 4,
  },
};

function getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  return ctx;
}

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks, // hasLevel es false para este juego: nunca llama onLevelChange
  skin: Skin = "clasico",
): GameEngine {
  const ctx = getContext2D(canvas);
  const pal = PALETTES[skin];

  let paddle: Paddle = { ...INITIAL_PADDLE };
  let ball: Ball = { ...INITIAL_BALL };
  let bricks: Brick[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = 3;
  let paused = false;
  // "start": esperando que se elija dificultad (1/2/3); "playing"; "gameover".
  let state: "start" | "playing" | "gameover" = "start";

  function setScore(value: number) {
    score = value;
    callbacks.onScoreChange(score);
  }
  function setLives(value: number) {
    lives = value;
    callbacks.onLivesChange?.(lives);
  }

  function playSound(name: keyof typeof SOUND_PATHS) {
    const audio = new Audio(SOUND_PATHS[name]);
    audio.play().catch(() => {});
  }

  function resetBallAndPaddle() {
    paddle = { ...INITIAL_PADDLE };
    ball = { ...INITIAL_BALL };
  }

  function createBricks(): Brick[] {
    const result: Brick[] = [];
    const gridWidth = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP;
    const offsetX = (W - gridWidth) / 2;
    const offsetY = 60;

    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        result.push({
          x: offsetX + col * (BRICK_W + BRICK_GAP),
          y: offsetY + row * (BRICK_H + BRICK_GAP),
          w: BRICK_W,
          h: BRICK_H,
          color: BRICK_COLORS[row],
          alive: true,
        });
      }
    }
    return result;
  }

  function endGame() {
    state = "gameover";
    callbacks.onGameOver(score);
  }

  function loseLife() {
    setLives(lives - 1);
    resetBallAndPaddle();
    if (lives === 0) endGame();
  }

  function checkWinCondition() {
    if (state !== "playing") return;
    const allBricksDestroyed = bricks.every((brick) => !brick.alive);
    if (allBricksDestroyed && explosions.length === 0) endGame();
  }

  function checkPaddleCollision() {
    const hitsPaddle =
      ball.dy > 0 &&
      ball.y + ball.radius >= paddle.y &&
      ball.y + ball.radius <= paddle.y + paddle.h &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w;

    if (!hitsPaddle) return;

    playSound("bounce");
    ball.y = paddle.y - ball.radius;

    const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1 (borde izq) .. 1 (borde der)
    const speed = Math.hypot(ball.dx, ball.dy);
    const maxAngle = Math.PI / 3; // 60 grados
    const angle = hitPos * maxAngle;

    ball.dx = speed * Math.sin(angle);
    ball.dy = -Math.abs(speed * Math.cos(angle));
  }

  function checkBrickCollision() {
    for (const brick of bricks) {
      if (!brick.alive) continue;

      const hitsBrick =
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.w &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.h;

      if (!hitsBrick) continue;

      brick.alive = false;
      setScore(score + POINTS_PER_BRICK);
      playSound("break");
      explosions.push({
        x: brick.x,
        y: brick.y,
        w: brick.w,
        h: brick.h,
        color: brick.color,
        startTime: performance.now(),
      });

      const overlapLeft = ball.x + ball.radius - brick.x;
      const overlapRight = brick.x + brick.w - (ball.x - ball.radius);
      const overlapTop = ball.y + ball.radius - brick.y;
      const overlapBottom = brick.y + brick.h - (ball.y - ball.radius);

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapX < minOverlapY) {
        ball.dx *= -1;
      } else {
        ball.dy *= -1;
      }

      break;
    }
  }

  function updatePaddle() {
    if (keys["ArrowLeft"]) paddle.x -= paddle.speed;
    if (keys["ArrowRight"]) paddle.x += paddle.speed;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x > W - paddle.w) paddle.x = W - paddle.w;
  }

  function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.dx *= -1;
      playSound("bounce");
    } else if (ball.x + ball.radius > W) {
      ball.x = W - ball.radius;
      ball.dx *= -1;
      playSound("bounce");
    }

    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.dy *= -1;
      playSound("bounce");
    }
    if (ball.y - ball.radius > H) {
      loseLife();
      return;
    }

    checkPaddleCollision();
    checkBrickCollision();
    checkWinCondition();
  }

  function updateExplosions() {
    const now = performance.now();
    explosions = explosions.filter(
      (explosion) => now - explosion.startTime < EXPLOSION_DURATION,
    );
  }

  // ── Dibujo ───────────────────────────────────────────────────────────────
  const image = new Image();
  let imageLoaded = false;
  // Atlas teñido offscreen: se construye una sola vez en image.onload cuando la
  // skin trae tint (neon/retro). clasico deja tinted en null y se dibuja el PNG.
  let tinted: HTMLCanvasElement | null = null;

  type SpriteRect = { sx: number; sy: number; sw: number; sh: number };

  // Tiñe un sprite del spritesheet dentro del canvas offscreen: dibuja el sprite
  // original y luego, con "source-in", lo rellena de un color plano conservando
  // el alfa de los bordes. Se pierde el bisel/contorno del PNG (look neón plano).
  function tintRectInto(
    octx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    r: SpriteRect,
    color: string,
  ) {
    octx.save();
    octx.beginPath();
    octx.rect(r.sx, r.sy, r.sw, r.sh);
    octx.clip(); // limita la escritura a este sprite
    octx.globalCompositeOperation = "source-over";
    octx.drawImage(img, r.sx, r.sy, r.sw, r.sh, r.sx, r.sy, r.sw, r.sh);
    octx.globalCompositeOperation = "source-in"; // relleno solo donde el sprite es opaco
    octx.fillStyle = color;
    octx.fillRect(r.sx, r.sy, r.sw, r.sh);
    octx.restore();
  }

  function buildTintedAtlas(
    img: HTMLImageElement,
    tint: ArkanoidTint,
  ): HTMLCanvasElement {
    const off = document.createElement("canvas");
    off.width = img.naturalWidth;
    off.height = img.naturalHeight;
    const octx = off.getContext("2d");
    if (!octx) return off;
    tintRectInto(octx, img, SPRITES.paddle, tint.paddle);
    tintRectInto(octx, img, SPRITES.ball, tint.ball);
    for (const c of Object.keys(SPRITES.blocks) as BlockColor[]) {
      tintRectInto(octx, img, SPRITES.blocks[c], tint.blocks[c]);
      for (const fr of EXPLOSION_FRAMES[c]) {
        tintRectInto(octx, img, fr, tint.blocks[c]);
      }
    }
    return off;
  }

  function drawSprite(
    name: "paddle" | "ball" | `block_${BlockColor}`,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!imageLoaded) return;
    const sprite = name.startsWith("block_")
      ? SPRITES.blocks[name.slice(6) as BlockColor]
      : SPRITES[name as "paddle" | "ball"];
    if (!sprite) return;
    if (pal.glow > 0 && pal.tint) {
      ctx.save();
      ctx.shadowBlur = pal.glow;
      ctx.shadowColor =
        name === "paddle"
          ? pal.tint.paddle
          : name === "ball"
            ? pal.tint.ball
            : pal.tint.blocks[name.slice(6) as BlockColor];
    }
    ctx.drawImage(
      tinted ?? image,
      sprite.sx,
      sprite.sy,
      sprite.sw,
      sprite.sh,
      x,
      y,
      w,
      h,
    );
    if (pal.glow > 0 && pal.tint) ctx.restore();
  }

  function drawFrame(
    frame: { sx: number; sy: number; sw: number; sh: number },
    x: number,
    y: number,
    w: number,
    h: number,
    color: BlockColor,
  ) {
    if (!imageLoaded) return;
    if (pal.glow > 0 && pal.tint) {
      ctx.save();
      ctx.shadowBlur = pal.glow;
      ctx.shadowColor = pal.tint.blocks[color];
    }
    ctx.drawImage(
      tinted ?? image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x,
      y,
      w,
      h,
    );
    if (pal.glow > 0 && pal.tint) ctx.restore();
  }

  function drawBricks() {
    for (const brick of bricks) {
      if (!brick.alive) continue;
      drawSprite(`block_${brick.color}`, brick.x, brick.y, brick.w, brick.h);
    }
  }

  function drawExplosions() {
    const now = performance.now();
    for (const explosion of explosions) {
      const frames = EXPLOSION_FRAMES[explosion.color];
      const elapsed = now - explosion.startTime;
      const frameIndex = Math.min(
        frames.length - 1,
        Math.floor((elapsed / EXPLOSION_DURATION) * frames.length),
      );
      drawFrame(
        frames[frameIndex],
        explosion.x,
        explosion.y,
        explosion.w,
        explosion.h,
        explosion.color,
      );
    }
  }

  function drawPaddle() {
    drawSprite("paddle", paddle.x, paddle.y, paddle.w, paddle.h);
  }

  function drawBall() {
    drawSprite(
      "ball",
      ball.x - ball.radius,
      ball.y - ball.radius,
      ball.radius * 2,
      ball.radius * 2,
    );
  }

  function drawStartOverlay() {
    ctx.fillStyle = pal.overlayScrim;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal.overlayText;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (pal.glow > 0) {
      ctx.save();
      ctx.shadowBlur = pal.glow;
      ctx.shadowColor = pal.overlayText;
    }
    ctx.font = "32px sans-serif";
    ctx.fillText("Choose difficulty", W / 2, H / 2 - 40);
    ctx.font = "20px sans-serif";
    ctx.fillText("1: Easy   2: Medium   3: Hard", W / 2, H / 2 + 10);
    if (pal.glow > 0) ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBricks();
    drawExplosions();
    drawPaddle();
    drawBall();
    if (state === "start") drawStartOverlay();
  }

  // ── Teclado ──────────────────────────────────────────────────────────────
  // updatePaddle solo se llama desde el loop mientras el estado interno es
  // "playing" y no está en pausa (ver loop más abajo), para no interferir con
  // el input de iniciales del modal de fin de partida de React.
  const keys: Record<string, boolean> = {};

  function selectDifficulty(code: "Digit1" | "Digit2" | "Digit3") {
    if (paused || state !== "start") return;
    ball.dx = DIFFICULTY_LEVELS[code].dx;
    ball.dy = DIFFICULTY_LEVELS[code].dy;
    state = "playing";
  }

  function onKeyDown(e: KeyboardEvent) {
    keys[e.code] = true;
    if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
      selectDifficulty(e.code);
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // ── Loop principal ──────────────────────────────────────────────────────
  let rafId = 0;
  let destroyed = false;

  function loop() {
    if (!paused && state === "playing") {
      updatePaddle();
      updateBall();
      updateExplosions();
    }
    draw();
    if (!destroyed) rafId = requestAnimationFrame(loop);
  }

  function initGame() {
    setScore(0);
    setLives(3);
    bricks = createBricks();
    explosions = [];
    resetBallAndPaddle();
    state = "start";
  }

  initGame();
  image.onload = () => {
    imageLoaded = true;
    if (pal.tint) tinted = buildTintedAtlas(image, pal.tint);
    if (!destroyed) rafId = requestAnimationFrame(loop);
  };
  image.onerror = () => console.error("No se pudo cargar el spritesheet de Arkanoid");
  image.src = SPRITE_PATH;

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
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
