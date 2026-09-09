// Motor de Ranaria: cruzar carriles de tráfico y de río a saltos, contra reloj.
// Juego original diseñado desde cero para la game jam J01 — ver
// specs/game-jam/ranaria/01-ranaria-diseno.md, que fija todos los números de este archivo.

import type { GameCallbacks, GameEngine } from "@/lib/games/types";

// --- Geometría ---
const CELL = 40; // grilla de 16 columnas × 12 filas
const COLS = 16;
const ROWS = 12;
const W = COLS * CELL; // 640: resolución lógica 4:3 exacta, la proporción nativa de .crt-screen
const H = ROWS * CELL; // 480

// Reparto de filas (fila 0 arriba, fila 11 abajo)
// 0        y   0–40   meta: orilla con 5 nenúfares
// 1–5      y  40–240  río (5 carriles)
// 6        y 240–280  mediana (segura)
// 7–10     y 280–440  carretera (4 carriles)
// 11       y 440–480  base de salida (segura); la barra de tiempo ocupa y 472–480
const GOAL_ROW = 0;
const RIVER_ROWS = [1, 2, 3, 4, 5];
const MEDIAN_ROW = 6;
const ROAD_ROWS = [7, 8, 9, 10];
const START_ROW = 11;

// --- Nenúfares: 5 huecos de 2 celdas (80 px) en la fila 0, simétricos respecto de x=320 ---
const LILY_COUNT = 5;
const LILY_WIDTH = 80;
const LILY_X = [40, 160, 280, 400, 520]; // borde izquierdo de cada nenúfar

// --- Rana ---
const FROG_SIZE = 28; // hitbox y sprite, centrados en la celda de 40 px
const JUMP_MS = 90; // duración de la animación de salto
const JUMP_COOLDOWN_MS = 110; // tiempo mínimo entre saltos
const FROG_X_MIN = 20; // centro de la rana acotado al canvas
const FROG_X_MAX = 620;
const START_COL = 7; // x inicial = 7 * 40 + 20 = 300
const JUMP_ARC = 10; // altura del arco visual del salto, en px

// --- Barra de tiempo: los 8 px inferiores del canvas ---
const TIME_BAR_H = 8;

// --- Dificultad por nivel ---
const SPEED_MULT_STEP = 0.12; // mult = min(1 + 0.12 * (level - 1), 2.2)
const SPEED_MULT_MAX = 2.2;
const TIME_BASE_MS = 45000; // tiempo por cruce en el nivel 1
const TIME_STEP_MS = 3000; // se descuenta por nivel
const TIME_MIN_MS = 20000; // suelo del temporizador

// --- Vidas ---
const LIVES_START = 3;
const LIVES_MAX = 5;
const LIVES_PER_LEVEL = 1; // +1 vida al completar una tanda de nenúfares, tope LIVES_MAX

// --- Puntaje ---
const PTS_ROW_ADVANCE = 10; // por cada fila nueva hacia arriba (sólo récord del intento)
const PTS_LILY = 50; // por ocupar un nenúfar
const PTS_TIME_PER_SEC = 10; // × segundos enteros restantes al llegar al nenúfar
const PTS_FLY = 100; // por llegar a un nenúfar con la mosca posada
const PTS_LEVEL_CLEAR = 500; // por completar los cinco nenúfares

// --- Mosca bonus ---
const FLY_PERIOD_MS = 12000; // cada cuánto reaparece
const FLY_VISIBLE_MS = 6000; // cuánto se queda en un nenúfar libre elegido al azar

// --- Paleta arcade propia (nunca recoloreada al tema neon del sitio) ---
const COLORS = {
  bg: "#0a0a12",
  water: "#1b3a6b",
  waterLine: "#244d88", // ondas del río
  road: "#2a2a2a",
  roadLine: "#4a4a4a", // separación entre carriles
  grass: "#1e5a2e", // mediana y base de salida
  shore: "#123d24", // orilla de la fila de meta
  frog: "#7fdb3f",
  frogEye: "#0a0a12",
  lilyFree: "#2f8f4f",
  lilyTaken: "#7fdb3f",
  log: "#8a5a2b",
  logGrain: "#6d4520",
  turtle: "#3fa08a",
  turtleBlink: "#1f5f55",
  truckBody: "#dcdcdc",
  truckBox: "#9a9a9a",
  fly: "#ffe94a",
  timeFull: "#7fdb3f", // barra de tiempo llena
  timeEmpty: "#ff4040", // barra de tiempo agotándose
};

type RoadKind = "coche" | "camion";

type RoadLaneDef = {
  row: number;
  dir: 1 | -1;
  speed: number;
  len: number;
  gap: number;
  kind: RoadKind;
  color: string;
};

type RiverLaneDef = {
  row: number;
  dir: 1 | -1;
  speed: number;
  len: number;
  gap: number;
} & ({ kind: "tronco" } | { kind: "tortugas"; units: number; cycleMs: number });

type LaneDef = RoadLaneDef | RiverLaneDef;

// Estado vivo de un carril: las entidades son un enrejado uniforme de paso `period`
// que se recicla restando o sumando `span`, de modo que la separación nunca se deforma.
type LaneState = {
  def: LaneDef;
  xs: number[];
  period: number;
  span: number;
  elapsed: number; // ms acumulados, sólo lo usan las tortugas
};

type TurtlePhase = "solid" | "blink" | "sunk";

// --- Carriles de carretera: dir +1 hacia la derecha, -1 hacia la izquierda ---
// speed en px/s a nivel 1; period = len + gap; los vehículos se reciclan por módulo
const ROAD_LANES: RoadLaneDef[] = [
  { row: 10, dir: 1, speed: 60, len: 60, gap: 200, kind: "coche", color: "#ff4040" },
  { row: 9, dir: -1, speed: 90, len: 100, gap: 300, kind: "camion", color: "#dcdcdc" },
  { row: 8, dir: 1, speed: 130, len: 50, gap: 210, kind: "coche", color: "#ffcc00" },
  { row: 7, dir: -1, speed: 170, len: 40, gap: 160, kind: "coche", color: "#cc44ff" },
];

// --- Carriles de río ---
// "tronco" es sólido siempre; "tortugas" es un grupo de units × 40 px que se sumerge por ciclo
const RIVER_LANES: RiverLaneDef[] = [
  { row: 5, dir: 1, speed: 70, len: 120, gap: 140, kind: "tronco" },
  { row: 4, dir: -1, speed: 90, len: 120, gap: 120, kind: "tortugas", units: 3, cycleMs: 8000 },
  { row: 3, dir: 1, speed: 55, len: 200, gap: 140, kind: "tronco" },
  { row: 2, dir: -1, speed: 110, len: 80, gap: 140, kind: "tronco" },
  { row: 1, dir: 1, speed: 100, len: 80, gap: 120, kind: "tortugas", units: 2, cycleMs: 6500 },
];

// Ciclo de las tortugas, en fracción de cycleMs. El desfase de cada grupo es
// (índice del grupo × 0.33) del ciclo, para que nunca se sumerjan todos a la vez.
const TURTLE_VISIBLE = 0.6; // sólidas
const TURTLE_BLINK = 0.15; // sólidas pero parpadeando (aviso)
const TURTLE_BLINK_MS = 150; // periodo del parpadeo de aviso
const ENTITY_PAD = 6; // margen vertical de las entidades dentro de su fila

type Jump = {
  active: boolean;
  t: number;
  fromX: number;
  fromRow: number;
  toX: number;
  toRow: number;
};

type Phase = "playing" | "over";

const rowY = (row: number) => row * CELL;

// Interpolación lineal entre dos colores #rrggbb, para el degradado de la barra de tiempo.
function lerpHex(from: string, to: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * k);
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
}

function makeLane(def: LaneDef): LaneState {
  const period = def.len + def.gap;
  const count = Math.ceil((W + def.len) / period);
  const xs = Array.from({ length: count }, (_, i) => -def.len + i * period);
  return { def, xs, period, span: count * period, elapsed: 0 };
}

// Fase del grupo `index` de un carril de tortugas, según su desfase de un tercio de ciclo.
function turtlePhaseOf(lane: LaneState, index: number): TurtlePhase {
  const def = lane.def;
  if (def.kind !== "tortugas") return "solid";
  const t = (((lane.elapsed / def.cycleMs + index * 0.33) % 1) + 1) % 1;
  if (t < TURTLE_VISIBLE) return "solid";
  if (t < TURTLE_VISIBLE + TURTLE_BLINK) return "blink";
  return "sunk";
}

function getContext2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
  return ctx;
}

export function createRanariaEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine {
  const ctx = getContext2D(canvas);

  let paused = false;
  let destroyed = false;
  let phase: Phase = "playing";

  let rafId: number | null = null;
  let lastTime = 0;

  let speedMult = 1; // lo mueve el nivel, en el paso 4 del plan
  let roadLanes: LaneState[] = [];
  let riverLanes: LaneState[] = [];

  let frogRow = START_ROW;
  let frogX = START_COL * CELL + CELL / 2;
  let cooldown = 0;
  const jump: Jump = {
    active: false,
    t: 0,
    fromX: frogX,
    fromRow: frogRow,
    toX: frogX,
    toRow: frogRow,
  };
  let lilies: boolean[] = []; // true = nenúfar ya ocupado

  let score = 0;
  let lives = LIVES_START;
  let level = 1;
  let bestRow = START_ROW; // récord de fila del intento actual, para el anti-farmeo
  let timeLeft = TIME_BASE_MS;
  let flyLily: number | null = null; // nenúfar donde está posada la mosca
  let flyTimer = 0;

  function reset() {
    phase = "playing";
    lastTime = 0;
    speedMult = 1;
    roadLanes = ROAD_LANES.map(makeLane);
    riverLanes = RIVER_LANES.map(makeLane);
    lilies = Array.from({ length: LILY_COUNT }, () => false);
    score = 0;
    lives = LIVES_START;
    level = 1;
    flyLily = null;
    flyTimer = 0;
    respawn();
  }

  const timeForLevel = () =>
    Math.max(TIME_MIN_MS, TIME_BASE_MS - TIME_STEP_MS * (level - 1));

  // Devuelve la rana a la casilla de salida. El reloj y el récord de fila del
  // intento se reinician aquí también, en el paso 4 del plan.
  function respawn() {
    frogRow = START_ROW;
    frogX = START_COL * CELL + CELL / 2;
    cooldown = 0;
    jump.active = false;
    jump.t = 0;
    bestRow = START_ROW;
    timeLeft = timeForLevel();
  }

  function addScore(points: number) {
    score += points;
    callbacks.onScoreChange(score);
  }

  function endGame() {
    phase = "over";
    callbacks.onGameOver(score);
  }

  // Una muerte cuesta una vida y devuelve la rana a la salida; sin vidas, se acaba la partida.
  function loseLife() {
    lives -= 1;
    callbacks.onLivesChange?.(lives);
    if (lives <= 0) {
      endGame();
      return;
    }
    respawn();
  }

  // --- Rana: salto, plataformas y muertes ------------------------------------------

  const clampX = (x: number) => Math.min(FROG_X_MAX, Math.max(FROG_X_MIN, x));

  function startJump(dCol: number, dRow: number) {
    if (jump.active || cooldown > 0) return;
    const toRow = Math.min(START_ROW, Math.max(GOAL_ROW, frogRow + dRow));
    const toX = dCol === 0 ? frogX : clampX(frogX + dCol * CELL);
    if (toRow === frogRow && toX === frogX) return;
    jump.active = true;
    jump.t = 0;
    jump.fromX = frogX;
    jump.fromRow = frogRow;
    jump.toX = toX;
    jump.toRow = toRow;
    cooldown = JUMP_COOLDOWN_MS;
  }

  function laneAtRow(lanes: LaneState[], row: number): LaneState | undefined {
    return lanes.find((lane) => lane.def.row === row);
  }

  // Plataforma de río bajo el centro de la rana, o null si sólo hay agua.
  // Una tortuga hundida no sostiene: cuenta como agua.
  function platformUnderFrog(): { lane: LaneState; index: number } | null {
    const lane = laneAtRow(riverLanes, frogRow);
    if (!lane) return null;
    for (let i = 0; i < lane.xs.length; i++) {
      const x = lane.xs[i];
      if (frogX < x || frogX > x + lane.def.len) continue;
      if (lane.def.kind === "tortugas" && turtlePhaseOf(lane, i) === "sunk") continue;
      return { lane, index: i };
    }
    return null;
  }

  function hitByVehicle(): boolean {
    const lane = laneAtRow(roadLanes, frogRow);
    if (!lane) return false;
    const half = FROG_SIZE / 2;
    return lane.xs.some((x) => frogX + half > x && frogX - half < x + lane.def.len);
  }

  // Índice del nenúfar bajo el centro de la rana, o -1 si ahí sólo hay agua.
  function lilyUnderFrog(): number {
    return LILY_X.findIndex((x) => frogX >= x && frogX <= x + LILY_WIDTH);
  }

  function clearLevel() {
    addScore(PTS_LEVEL_CLEAR);
    level += 1;
    callbacks.onLevelChange?.(level);
    lives = Math.min(LIVES_MAX, lives + LIVES_PER_LEVEL);
    callbacks.onLivesChange?.(lives);
    lilies = Array.from({ length: LILY_COUNT }, () => false);
    speedMult = Math.min(1 + SPEED_MULT_STEP * (level - 1), SPEED_MULT_MAX);
    flyLily = null;
    flyTimer = 0;
  }

  // La fila 0 se resuelve al aterrizar: o se ocupa un nenúfar libre, o se muere.
  function resolveGoalRow() {
    const index = lilyUnderFrog();
    if (index === -1 || lilies[index]) {
      loseLife();
      return;
    }
    lilies[index] = true;

    let gain = PTS_LILY + PTS_TIME_PER_SEC * Math.floor(timeLeft / 1000);
    if (flyLily === index) {
      gain += PTS_FLY;
      flyLily = null;
      flyTimer = 0;
    }
    addScore(gain);

    if (lilies.every(Boolean)) clearLevel();
    respawn();
  }

  function finishJump() {
    jump.active = false;
    frogRow = jump.toRow;
    frogX = jump.toX;

    // Anti-farmeo: sólo puntúa superar el récord de fila de este intento.
    if (frogRow < bestRow) {
      addScore(PTS_ROW_ADVANCE * (bestRow - frogRow));
      bestRow = frogRow;
    }

    if (frogRow === GOAL_ROW) resolveGoalRow();
  }

  function updateFrog(dt: number) {
    if (cooldown > 0) cooldown = Math.max(0, cooldown - dt);

    if (jump.active) {
      jump.t += dt;
      // En el aire no se evalúa nada: las colisiones sólo cuentan con el salto terminado.
      if (jump.t >= JUMP_MS) finishJump();
      return;
    }

    if (frogRow === MEDIAN_ROW || frogRow === START_ROW) return;

    if (RIVER_ROWS.includes(frogRow)) {
      const platform = platformUnderFrog();
      if (!platform) {
        loseLife();
        return;
      }
      const { def } = platform.lane;
      frogX += def.dir * def.speed * speedMult * (dt / 1000);
      // La plataforma sí puede sacarla del canvas: el arrastre no se acota.
      if (frogX + FROG_SIZE / 2 <= 0 || frogX - FROG_SIZE / 2 >= W) loseLife();
      return;
    }

    if (ROAD_ROWS.includes(frogRow) && hitByVehicle()) loseLife();
  }

  function advanceLane(lane: LaneState, dt: number) {
    const { def } = lane;
    const step = def.dir * def.speed * speedMult * (dt / 1000);
    lane.elapsed += dt;
    for (let i = 0; i < lane.xs.length; i++) {
      let x = lane.xs[i] + step;
      if (def.dir > 0 && x >= W) x -= lane.span;
      else if (def.dir < 0 && x <= -def.len) x += lane.span;
      lane.xs[i] = x;
    }
  }

  // La mosca aparece cada FLY_PERIOD_MS en un nenúfar libre al azar y se queda
  // FLY_VISIBLE_MS, o hasta que ese nenúfar sea ocupado.
  function updateFly(dt: number) {
    flyTimer += dt;
    if (flyLily === null) {
      if (flyTimer < FLY_PERIOD_MS) return;
      flyTimer = 0;
      const free = lilies
        .map((taken, i) => (taken ? -1 : i))
        .filter((i) => i >= 0);
      if (free.length === 0) return;
      flyLily = free[Math.floor(Math.random() * free.length)];
      return;
    }
    if (lilies[flyLily] || flyTimer >= FLY_VISIBLE_MS) {
      flyLily = null;
      flyTimer = 0;
    }
  }

  function updateTimer(dt: number) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      loseLife();
    }
  }

  function update(dt: number) {
    roadLanes.forEach((lane) => advanceLane(lane, dt));
    riverLanes.forEach((lane) => advanceLane(lane, dt));
    updateFrog(dt);
    if (phase !== "playing") return;
    updateTimer(dt);
    if (phase !== "playing") return;
    updateFly(dt);
  }

  // --- Dibujo del escenario fijo -------------------------------------------------

  function drawShore() {
    ctx.fillStyle = COLORS.shore;
    ctx.fillRect(0, rowY(GOAL_ROW), W, CELL);
  }

  function drawLilies() {
    const y = rowY(GOAL_ROW);
    for (let i = 0; i < LILY_COUNT; i++) {
      ctx.fillStyle = lilies[i] ? COLORS.lilyTaken : COLORS.lilyFree;
      ctx.fillRect(LILY_X[i] + 4, y + 4, LILY_WIDTH - 8, CELL - 8);
      // muesca del nenúfar, para que se lea como hoja y no como bloque
      ctx.fillStyle = COLORS.shore;
      ctx.beginPath();
      ctx.moveTo(LILY_X[i] + LILY_WIDTH / 2, y + CELL / 2);
      ctx.lineTo(LILY_X[i] + LILY_WIDTH / 2 + 12, y + CELL - 4);
      ctx.lineTo(LILY_X[i] + LILY_WIDTH / 2 - 12, y + CELL - 4);
      ctx.closePath();
      ctx.fill();

      if (flyLily === i) {
        const cx = LILY_X[i] + LILY_WIDTH / 2;
        ctx.fillStyle = COLORS.fly;
        ctx.fillRect(cx - 4, y + 12, 8, 6);
        ctx.fillRect(cx - 8, y + 11, 4, 2); // alas
        ctx.fillRect(cx + 4, y + 11, 4, 2);
      }
    }
  }

  function drawRiver() {
    const top = rowY(RIVER_ROWS[0]);
    const height = RIVER_ROWS.length * CELL;
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, top, W, height);

    // ondas: trazos cortos alternados, dos por fila de río
    ctx.fillStyle = COLORS.waterLine;
    RIVER_ROWS.forEach((row, i) => {
      const y = rowY(row);
      const offset = i % 2 === 0 ? 0 : CELL;
      for (let x = offset; x < W; x += CELL * 2) {
        ctx.fillRect(x + 6, y + 12, 16, 2);
        ctx.fillRect(x + 6, y + 26, 10, 2);
      }
    });
  }

  function drawMedian() {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, rowY(MEDIAN_ROW), W, CELL);
  }

  function drawRoad() {
    const top = rowY(ROAD_ROWS[0]);
    const height = ROAD_ROWS.length * CELL;
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(0, top, W, height);

    // separadores discontinuos entre carriles contiguos (no en los bordes exteriores)
    ctx.fillStyle = COLORS.roadLine;
    for (let i = 1; i < ROAD_ROWS.length; i++) {
      const y = rowY(ROAD_ROWS[i]) - 1;
      for (let x = 0; x < W; x += CELL) {
        ctx.fillRect(x + 8, y, 24, 2);
      }
    }
  }

  function drawBase() {
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, rowY(START_ROW), W, CELL);
  }

  function drawCar(x: number, y: number, len: number, color: string, dir: number) {
    const top = y + ENTITY_PAD;
    const h = CELL - ENTITY_PAD * 2;
    ctx.fillStyle = color;
    ctx.fillRect(x, top, len, h);
    // parabrisas hacia el lado del avance, para que se lea la dirección
    ctx.fillStyle = COLORS.bg;
    const glassW = Math.min(10, len / 3);
    ctx.fillRect(dir > 0 ? x + len - glassW - 3 : x + 3, top + 4, glassW, h - 8);
  }

  function drawTruck(x: number, y: number, len: number, dir: number) {
    const top = y + ENTITY_PAD;
    const h = CELL - ENTITY_PAD * 2;
    const cabW = Math.min(28, len / 3);
    const boxW = len - cabW;
    const cabX = dir > 0 ? x + boxW : x;
    const boxX = dir > 0 ? x : x + cabW;
    ctx.fillStyle = COLORS.truckBox;
    ctx.fillRect(boxX, top, boxW, h);
    ctx.fillStyle = COLORS.truckBody;
    ctx.fillRect(cabX, top, cabW, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(dir > 0 ? cabX + cabW - 9 : cabX + 3, top + 4, 6, h - 8);
  }

  function drawLog(x: number, y: number, len: number) {
    const top = y + ENTITY_PAD;
    const h = CELL - ENTITY_PAD * 2;
    ctx.fillStyle = COLORS.log;
    ctx.fillRect(x, top, len, h);
    ctx.fillStyle = COLORS.logGrain;
    ctx.fillRect(x, top + 6, len, 2);
    ctx.fillRect(x, top + h - 9, len, 2);
    // tapas de los extremos, para que se lea como tronco y no como tabla
    ctx.fillRect(x, top, 3, h);
    ctx.fillRect(x + len - 3, top, 3, h);
  }

  function drawTurtles(lane: LaneState, x: number, y: number, index: number) {
    const def = lane.def;
    if (def.kind !== "tortugas") return;
    const phaseNow = turtlePhaseOf(lane, index);
    const r = (CELL - ENTITY_PAD * 2) / 2;
    const cy = y + CELL / 2;

    for (let u = 0; u < def.units; u++) {
      const cx = x + u * CELL + CELL / 2;

      if (phaseNow === "sunk") {
        // hundida: sólo la onda en el agua, para que se vea que ahí no hay plataforma
        ctx.strokeStyle = COLORS.waterLine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      const blinkOn =
        phaseNow === "blink"
          ? Math.floor(lane.elapsed / TURTLE_BLINK_MS) % 2 === 0
          : true;
      ctx.fillStyle = blinkOn ? COLORS.turtle : COLORS.turtleBlink;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // caparazón
      ctx.fillStyle = COLORS.turtleBlink;
      ctx.beginPath();
      ctx.arc(cx, cy, r / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLane(lane: LaneState) {
    const { def } = lane;
    const y = rowY(def.row);
    lane.xs.forEach((x, i) => {
      switch (def.kind) {
        case "coche":
          drawCar(x, y, def.len, def.color, def.dir);
          break;
        case "camion":
          drawTruck(x, y, def.len, def.dir);
          break;
        case "tronco":
          drawLog(x, y, def.len);
          break;
        case "tortugas":
          drawTurtles(lane, x, y, i);
          break;
      }
    });
  }

  function drawFrog() {
    let x = frogX;
    let y = rowY(frogRow) + CELL / 2;
    let lift = 0;

    if (jump.active) {
      const k = Math.min(1, jump.t / JUMP_MS);
      x = jump.fromX + (jump.toX - jump.fromX) * k;
      y = rowY(jump.fromRow) + CELL / 2 + (jump.toRow - jump.fromRow) * CELL * k;
      lift = Math.sin(k * Math.PI) * JUMP_ARC; // arco visual, no afecta a las colisiones
    }

    const cy = y - lift;
    const half = FROG_SIZE / 2;

    ctx.fillStyle = COLORS.frog;
    ctx.fillRect(x - half, cy - half, FROG_SIZE, FROG_SIZE);
    // patas traseras, para que la silueta no sea un cuadrado liso
    ctx.fillRect(x - half - 4, cy - 2, 4, 10);
    ctx.fillRect(x + half, cy - 2, 4, 10);

    ctx.fillStyle = COLORS.frogEye;
    ctx.fillRect(x - 9, cy - 10, 5, 5);
    ctx.fillRect(x + 4, cy - 10, 5, 5);
  }

  function drawTimeBar() {
    const ratio = Math.min(1, Math.max(0, timeLeft / timeForLevel()));
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, H - TIME_BAR_H, W, TIME_BAR_H);
    // se vacía hacia la derecha y vira de timeFull a timeEmpty conforme se agota
    ctx.fillStyle = lerpHex(COLORS.timeEmpty, COLORS.timeFull, ratio);
    ctx.fillRect(0, H - TIME_BAR_H, W * ratio, TIME_BAR_H);
  }

  function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    drawShore();
    drawLilies();
    drawRiver();
    drawMedian();
    drawRoad();
    drawBase();

    riverLanes.forEach(drawLane);
    roadLanes.forEach(drawLane);
    drawFrog();

    drawTimeBar();
  }

  function loop(time: number) {
    if (destroyed) return;
    const delta = lastTime === 0 ? 0 : time - lastTime;
    lastTime = time;

    if (!paused && phase === "playing") update(delta);

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

  function onKeyDown(e: KeyboardEvent) {
    if (CAPTURED_CODES.includes(e.code)) e.preventDefault();
    if (paused || phase !== "playing") return;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        startJump(0, -1);
        break;
      case "ArrowDown":
      case "KeyS":
        startJump(0, 1);
        break;
      case "ArrowLeft":
      case "KeyA":
        startJump(-1, 0);
        break;
      case "ArrowRight":
      case "KeyD":
        startJump(1, 0);
        break;
    }
  }
  window.addEventListener("keydown", onKeyDown);

  reset();
  rafId = requestAnimationFrame(loop);

  return {
    setPaused(next: boolean) {
      paused = next;
      // Al reanudar, el delta del primer frame no debe incluir el tiempo en pausa.
      if (!next) lastTime = 0;
    },
    reset,
    destroy() {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
