const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const BRICK_ROWS = 7;
const BRICK_COLS = 8;
const BRICK_W = 32;
const BRICK_H = 16;
const BRICK_GAP = 4;
const BRICK_COLORS = [
  "red",
  "yellow",
  "green",
  "cyan",
  "magenta",
  "hotpink",
  "gray",
];
const POINTS_PER_BRICK = 10;

const SOUND_PATHS = {
  bounce: "assets/assets/sounds/ball-bounce.mp3",
  break: "assets/assets/sounds/break-sound.mp3",
};

function playSound(name) {
  const audio = new Audio(SOUND_PATHS[name]);
  audio.play().catch(() => {});
}

const INITIAL_PADDLE = { x: 159, y: 610, w: 162, h: 14, speed: 6 };
const INITIAL_BALL = { x: 240, y: 596, radius: 8, dx: 3, dy: -3 };

const DIFFICULTY_LEVELS = {
  easy: { dx: 3, dy: -3 },
  medium: { dx: 4.5, dy: -4.5 },
  hard: { dx: 6, dy: -6 },
};

const state = {
  screen: "start", // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: 3,
  difficulty: null, // 'easy' | 'medium' | 'hard' | null antes de elegir
  paddle: { ...INITIAL_PADDLE },
  ball: { ...INITIAL_BALL },
  bricks: [],
  explosions: [],
};

function resetBallAndPaddle() {
  state.paddle = { ...INITIAL_PADDLE };
  state.ball = { ...INITIAL_BALL, ...DIFFICULTY_LEVELS[state.difficulty] };
}

function loseLife() {
  state.lives -= 1;
  resetBallAndPaddle();
  if (state.lives === 0) {
    state.screen = "gameover";
  }
}

function createBricks() {
  const bricks = [];
  const gridWidth = BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP;
  const offsetX = (CANVAS_WIDTH - gridWidth) / 2;
  const offsetY = 60;

  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: offsetX + col * (BRICK_W + BRICK_GAP),
        y: offsetY + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        color: BRICK_COLORS[row],
        alive: true,
      });
    }
  }

  return bricks;
}

function drawBricks() {
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    drawSprite(ctx, "block_" + brick.color, brick.x, brick.y, brick.w, brick.h);
  }
}

function drawExplosions() {
  const now = performance.now();
  for (const explosion of state.explosions) {
    const frames = EXPLOSION_FRAMES[explosion.color];
    const elapsed = now - explosion.startTime;
    const frameIndex = Math.min(
      frames.length - 1,
      Math.floor((elapsed / EXPLOSION_DURATION) * frames.length),
    );
    drawFrame(
      ctx,
      frames[frameIndex],
      explosion.x,
      explosion.y,
      explosion.w,
      explosion.h,
    );
  }
}

function drawPaddle() {
  const paddle = state.paddle;
  drawSprite(ctx, "paddle", paddle.x, paddle.y, paddle.w, paddle.h);
}

function drawBall() {
  const ball = state.ball;
  drawSprite(
    ctx,
    "ball",
    ball.x - ball.radius,
    ball.y - ball.radius,
    ball.radius * 2,
    ball.radius * 2,
  );
}

function drawStartOverlay() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "32px sans-serif";
  ctx.fillText("Choose difficulty", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
  ctx.font = "20px sans-serif";
  ctx.fillText(
    "1: Easy   2: Medium   3: Hard",
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 10,
  );
}

function drawEndOverlay(title) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "32px sans-serif";
  ctx.fillText(title, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
  ctx.font = "20px sans-serif";
  ctx.fillText(
    "Score: " + state.score,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 10,
  );
  ctx.fillText(
    "Press any key or click to retry",
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 45,
  );
}

function drawHUD() {
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + state.score, 10, 10);
  ctx.textAlign = "right";
  ctx.fillText("Lives: " + state.lives, CANVAS_WIDTH - 10, 10);
}

function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBricks();
  drawExplosions();
  drawPaddle();
  drawBall();
  if (state.screen === "start") {
    drawStartOverlay();
  } else if (state.screen === "gameover") {
    drawEndOverlay("Game Over");
  } else if (state.screen === "win") {
    drawEndOverlay("You Win!");
  } else if (state.screen === "playing") {
    drawHUD();
  }
}

function startGame(difficulty) {
  if (state.screen !== "start") return;
  state.difficulty = difficulty;
  resetBallAndPaddle();
  state.screen = "playing";
  render();
}

function retryGame() {
  state.score = 0;
  state.lives = 3;
  state.difficulty = null;
  state.bricks = createBricks();
  state.explosions = [];
  resetBallAndPaddle();
  state.screen = "start";
  render();
}

function handleInput() {
  if (state.screen === "gameover" || state.screen === "win") {
    retryGame();
  }
}

const DIFFICULTY_KEYS = { 1: "easy", 2: "medium", 3: "hard" };

const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (state.screen === "start") {
    const difficulty = DIFFICULTY_KEYS[e.key];
    if (difficulty) startGame(difficulty);
    return;
  }
  handleInput();
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

canvas.addEventListener("click", handleInput);

function updatePaddle() {
  const paddle = state.paddle;
  if (keys["ArrowLeft"]) paddle.x -= paddle.speed;
  if (keys["ArrowRight"]) paddle.x += paddle.speed;
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x > CANVAS_WIDTH - paddle.w) paddle.x = CANVAS_WIDTH - paddle.w;
}

function updateBall() {
  if (state.screen !== "playing") return;
  const ball = state.ball;

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.dx *= -1;
    playSound("bounce");
  } else if (ball.x + ball.radius > CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - ball.radius;
    ball.dx *= -1;
    playSound("bounce");
  }

  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.dy *= -1;
    playSound("bounce");
  }
  if (ball.y - ball.radius > CANVAS_HEIGHT) {
    loseLife();
    return;
  }

  checkPaddleCollision();
  checkBrickCollision();
  checkWinCondition();
}

function checkWinCondition() {
  const allBricksDestroyed = state.bricks.every((brick) => !brick.alive);
  if (allBricksDestroyed && state.explosions.length === 0) {
    state.screen = "win";
  }
}

function checkPaddleCollision() {
  const ball = state.ball;
  const paddle = state.paddle;

  const hitsPaddle =
    ball.dy > 0 &&
    ball.y + ball.radius >= paddle.y &&
    ball.y + ball.radius <= paddle.y + paddle.h &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.w;

  if (!hitsPaddle) return;

  playSound("bounce");

  ball.y = paddle.y - ball.radius;

  const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2); // -1 (left edge) .. 1 (right edge)
  const speed = Math.hypot(ball.dx, ball.dy);
  const maxAngle = Math.PI / 3; // 60 degrees
  const angle = hitPos * maxAngle;

  ball.dx = speed * Math.sin(angle);
  ball.dy = -Math.abs(speed * Math.cos(angle));
}

function checkBrickCollision() {
  const ball = state.ball;

  for (const brick of state.bricks) {
    if (!brick.alive) continue;

    const hitsBrick =
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.w &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.h;

    if (!hitsBrick) continue;

    brick.alive = false;
    state.score += POINTS_PER_BRICK;
    playSound("break");
    state.explosions.push({
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

function updateExplosions() {
  const now = performance.now();
  state.explosions = state.explosions.filter(
    (explosion) => now - explosion.startTime < EXPLOSION_DURATION,
  );
}

function loop() {
  updatePaddle();
  updateBall();
  updateExplosions();
  render();
  requestAnimationFrame(loop);
}

state.bricks = createBricks();

loadSpritesheet(() => {
  loop();
});
