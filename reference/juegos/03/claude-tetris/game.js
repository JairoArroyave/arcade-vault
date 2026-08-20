"use strict";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#64b5f6", // J - light blue
  "#ffb74d", // L - orange
];

const PIECES = [
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

const NEON_COLORS = [
  null,
  "#00fff7", // I
  "#faff00", // O
  "#ff00e6", // T
  "#00ff85", // S
  "#ff2d55", // Z
  "#3db4ff", // J
  "#ff9100", // L
];

const PASTEL_COLORS = [
  null,
  "#a8dadc", // I
  "#ffe8a3", // O
  "#d8bfd8", // T
  "#b5ead7", // S
  "#ffb3ba", // Z
  "#bcd4ff", // J
  "#ffdfba", // L
];

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function renderBlockRetro(context, x, y, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function renderBlockNeon(context, x, y, color, size, alpha) {
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  context.save();
  context.globalAlpha = alpha ?? 1;
  context.shadowColor = color;
  context.shadowBlur = size * 0.7;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  context.shadowBlur = 0;
  context.fillStyle = "rgba(255,255,255,0.35)";
  context.fillRect(px + s * 0.15, py + s * 0.15, s * 0.3, s * 0.3);
  context.restore();
}

function renderBlockPastel(context, x, y, color, size, alpha) {
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  const r = s * 0.28;
  context.globalAlpha = alpha ?? 1;
  roundRectPath(context, px, py, s, s, r);
  context.fillStyle = color;
  context.fill();
  roundRectPath(context, px, py, s, s * 0.4, r);
  context.fillStyle = "rgba(255,255,255,0.4)";
  context.fill();
  context.globalAlpha = 1;
}

function renderBlockPixel(context, x, y, color, size, alpha) {
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px, py, s, s);
  const cell = Math.max(2, Math.floor(s / 6));
  for (let ry = 0; ry < s; ry += cell) {
    for (let rx = 0; rx < s; rx += cell) {
      const dark = (rx / cell + ry / cell) % 2 === 0;
      context.fillStyle = dark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
      context.fillRect(px + rx, py + ry, cell, cell);
    }
  }
  context.strokeStyle = "rgba(0,0,0,0.25)";
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  context.globalAlpha = 1;
}

const SKINS = {
  retro: { palette: COLORS, gridColor: null, render: renderBlockRetro },
  neon: {
    palette: NEON_COLORS,
    gridColor: "rgba(0,255,255,0.15)",
    render: renderBlockNeon,
  },
  pastel: {
    palette: PASTEL_COLORS,
    gridColor: null,
    render: renderBlockPastel,
  },
  pixel: { palette: COLORS, gridColor: null, render: renderBlockPixel },
};

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next-canvas");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayScore = document.getElementById("overlay-score");
const restartBtn = document.getElementById("restart-btn");
const themeSwitch = document.getElementById("theme-switch");
const startOverlay = document.getElementById("start-overlay");
const startRecords = document.getElementById("start-records");
const playBtn = document.getElementById("play-btn");
const nameEntry = document.getElementById("name-entry");
const playerNameInput = document.getElementById("player-name");
const saveRecordBtn = document.getElementById("save-record-btn");
const gameoverRecords = document.getElementById("gameover-records");

const pauseOverlay = document.getElementById("pause-overlay");
const pauseMenuMain = document.getElementById("pause-menu-main");
const pauseControlsView = document.getElementById("pause-controls-view");
const resumeBtn = document.getElementById("resume-btn");
const pauseRestartBtn = document.getElementById("pause-restart-btn");
const showControlsBtn = document.getElementById("show-controls-btn");
const backToMenuBtn = document.getElementById("back-to-menu-btn");
const startLevelSelect = document.getElementById("start-level");
const skinSelect = document.getElementById("skin-select");

const THEME_KEY = "tetris-theme";
const SKIN_KEY = "tetris-skin";
const MAX_START_LEVEL = 10;
let gridColor = "#22222e";
let startLevel = 1;
let currentSkin = "retro";

const RECORDS_KEY = "tetris-records";
const MAX_RECORDS = 5;

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isTopScore(value) {
  const records = loadRecords();
  return (
    records.length < MAX_RECORDS || value > records[records.length - 1].score
  );
}

function addRecord(name, value, linesCleared, comboValue) {
  const records = loadRecords();
  const entry = { name, score: value, lines: linesCleared, combo: comboValue };
  records.push(entry);
  records.sort((a, b) => b.score - a.score);
  const trimmed = records.slice(0, MAX_RECORDS);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(trimmed));
  return trimmed.indexOf(entry);
}

function resetRecords() {
  localStorage.removeItem(RECORDS_KEY);
}

function renderRecordsSection(container, highlightIndex) {
  const records = loadRecords();
  const bestCombo = records.reduce((m, r) => Math.max(m, r.combo || 0), 0);
  const maxLines = records.reduce((m, r) => Math.max(m, r.lines || 0), 0);

  container.innerHTML = "";

  const title = document.createElement("p");
  title.className = "records-title";
  title.textContent = "TOP 5";
  container.appendChild(title);

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.className = "records-empty";
    empty.textContent = "Sin récords todavía";
    container.appendChild(empty);
  } else {
    const list = document.createElement("ol");
    list.className = "records-list";
    records.forEach((r, i) => {
      const li = document.createElement("li");
      if (i === highlightIndex) li.classList.add("highlight");
      const rank = document.createElement("span");
      rank.className = "rec-rank";
      rank.textContent = i + 1;
      const name = document.createElement("span");
      name.className = "rec-name";
      name.textContent = r.name;
      const value = document.createElement("span");
      value.className = "rec-score";
      value.textContent = r.score.toLocaleString();
      li.append(rank, name, value);
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  const stats = document.createElement("div");
  stats.className = "records-stats";
  const comboStat = document.createElement("span");
  comboStat.innerHTML = "Mejor combo: <b></b>";
  comboStat.querySelector("b").textContent = bestCombo;
  const linesStat = document.createElement("span");
  linesStat.innerHTML = "Líneas máx: <b></b>";
  linesStat.querySelector("b").textContent = maxLines;
  stats.append(comboStat, linesStat);
  container.appendChild(stats);

  const resetBtn = document.createElement("button");
  resetBtn.className = "reset-records-btn";
  resetBtn.textContent = "Resetear récords";
  resetBtn.addEventListener("click", () => {
    if (confirm("¿Borrar todos los récords guardados?")) {
      resetRecords();
      renderRecordsSection(container);
    }
  });
  container.appendChild(resetBtn);
}

let pendingRecord = null;
let started = false;
let board,
  current,
  next,
  score,
  lines,
  level,
  combo,
  maxCombo,
  paused,
  gameOver,
  lastTime,
  dropAccum,
  dropInterval,
  animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(shape, ox, oy) {
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

function rotateCW(shape) {
  const rows = shape.length,
    cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
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
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
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
    combo++;
    if (combo > maxCombo) maxCombo = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  } else {
    combo = 0;
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
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
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const skin = SKINS[currentSkin] || SKINS.retro;
  const color = skin.palette[colorIndex] || COLORS[colorIndex];
  skin.render(context, x, y, color, size, alpha);
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = "GAME OVER";
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove("hidden");

  if (isTopScore(score)) {
    pendingRecord = { score, lines, combo: maxCombo };
    nameEntry.classList.remove("hidden");
    gameoverRecords.classList.add("hidden");
    playerNameInput.value = "";
    requestAnimationFrame(() => playerNameInput.focus());
  } else {
    pendingRecord = null;
    nameEntry.classList.add("hidden");
    gameoverRecords.classList.remove("hidden");
    renderRecordsSection(gameoverRecords);
  }
}

function saveRecord() {
  if (!pendingRecord) return;
  const name = playerNameInput.value.trim().slice(0, 12) || "AAA";
  const index = addRecord(
    name,
    pendingRecord.score,
    pendingRecord.lines,
    pendingRecord.combo,
  );
  pendingRecord = null;
  nameEntry.classList.add("hidden");
  gameoverRecords.classList.remove("hidden");
  renderRecordsSection(gameoverRecords, index);
}

function showPauseMenu() {
  pauseMenuMain.classList.remove("hidden");
  pauseControlsView.classList.add("hidden");
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    pauseOverlay.classList.add("hidden");
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    showPauseMenu();
    pauseOverlay.classList.remove("hidden");
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = startLevel;
  combo = 0;
  maxCombo = 0;
  paused = false;
  gameOver = false;
  started = true;
  dropInterval = Math.max(100, 1000 - (startLevel - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add("hidden");
  pauseOverlay.classList.add("hidden");
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return;
  if (!started) return;
  if (e.code === "KeyP" || e.code === "Escape") {
    togglePause();
    return;
  }
  if (paused || gameOver) return;
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
  updateHUD();
});

restartBtn.addEventListener("click", init);

for (let l = 1; l <= MAX_START_LEVEL; l++) {
  const option = document.createElement("option");
  option.value = l;
  option.textContent = l;
  startLevelSelect.appendChild(option);
}
startLevelSelect.value = startLevel;

startLevelSelect.addEventListener("change", () => {
  startLevel = Number(startLevelSelect.value);
});

resumeBtn.addEventListener("click", () => {
  if (paused) togglePause();
});

pauseRestartBtn.addEventListener("click", () => {
  init();
});

showControlsBtn.addEventListener("click", () => {
  pauseMenuMain.classList.add("hidden");
  pauseControlsView.classList.remove("hidden");
});

backToMenuBtn.addEventListener("click", showPauseMenu);

saveRecordBtn.addEventListener("click", saveRecord);

playerNameInput.addEventListener("keydown", (e) => {
  if (e.code === "Enter") saveRecord();
});

playBtn.addEventListener("click", () => {
  startOverlay.classList.add("hidden");
  init();
});

function updateGridColor() {
  const skin = SKINS[currentSkin] || SKINS.retro;
  gridColor =
    skin.gridColor ||
    getComputedStyle(document.documentElement)
      .getPropertyValue("--grid-color")
      .trim();
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeSwitch.checked = theme === "light";
  updateGridColor();
  localStorage.setItem(THEME_KEY, theme);
  if (current) draw();
  if (next) drawNext();
}

function applySkin(skin) {
  currentSkin = SKINS[skin] ? skin : "retro";
  document.documentElement.setAttribute("data-skin", currentSkin);
  skinSelect.value = currentSkin;
  updateGridColor();
  localStorage.setItem(SKIN_KEY, currentSkin);
  if (current) draw();
  if (next) drawNext();
}

themeSwitch.addEventListener("change", () => {
  applyTheme(themeSwitch.checked ? "light" : "dark");
});

skinSelect.addEventListener("change", () => {
  applySkin(skinSelect.value);
});

applySkin(localStorage.getItem(SKIN_KEY) || "retro");
applyTheme(localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");

renderRecordsSection(startRecords);
