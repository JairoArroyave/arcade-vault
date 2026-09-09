# SPEC ranaria 01 — Ranaria: diseño

> **Status:** Implemented
> **Depends on:** —
> **Date:** 2026-08-26
> **Objective:** Fijar el diseño completo de Ranaria, el juego de cruzar tráfico y río a saltos contra reloj, con todos sus números cerrados para que el spec 02 pueda implementarlo sin inventar nada.

---

## Por qué existe este spec

La jam J01 tenía por tema **"cruzar el tráfico y el río"**: un mundo hecho de carriles en
movimiento que hay que atravesar a saltos, con reloj en contra. De ese tema salieron tres
candidatos y ganó **Ranaria**.

**Los dos descartados:**

- **Hora Punta** (el jugador es el semáforo, no el que cruza: gestiona cuatro carriles de luces
  mientras una cola de peatones cruza sola). Descartado porque el río desaparece del diseño —
  encarna media mitad del tema —, porque su puntaje es de hitos discretos ("turnos sin
  atropello") y premia jugar lento, que es exactamente lo contrario de lo que alimenta un salón
  de la fama, y porque sin avatar el jugador no _cruza_ nada: observa. La tensión del tema es
  corporal, y esa mecánica la disuelve.
- **Balsero** (endless de río puro: vas de pie sobre un tronco que baja, saltando de tronco a
  tronco mientras la corriente arrastra y la cámara sube sin parar). Descartado por solape: su
  mecánica —plataformas móviles que arrastran— es un subconjunto exacto de la mitad fluvial de
  Ranaria, así que implementarlo primero dejaría a Ranaria sin nada nuevo que aportar. Su único
  mérito propio, el score infinito por distancia, se rescata aquí como puntaje por fila nueva
  alcanzada. Queda como posible ampliación futura ("modo río"), nunca como juego aparte.

Gana **Ranaria** porque es el único de los tres cuya mecánica _es_ el tema completo: el mundo
entero está hecho de carriles que se mueven, la carretera te mata al tocarte y el río te mata si
_no_ te toca nada, y el reloj empuja. Además aporta al catálogo tres cosas que ningún juego real
tiene hoy —verificado leyendo los cuatro motores de `lib/games/`—: evasión pura sin disparo,
plataformas móviles que arrastran al jugador, y presión de temporizador.

Ocupa el slot decorativo **`ranaria`**, que ya existe en la tabla `games` y cuya descripción
larga describe literalmente este juego: _"Salta entre carriles de coches a toda velocidad y
troncos a la deriva en el río. Llega a los nenúfares antes de que se acabe el tiempo."_ Cero SQL,
cero CSS nuevo.

Ese slot tiene una reserva previa del agente `game-planner`: la entrada **S01** de
`reference/game-sugestions-todo.md`, en estado `Pendiente`, que propone exactamente el mismo
juego (Frogger) para exactamente el mismo slot. **No hay desplazamiento: hay convergencia.** Dos
caminos independientes —el del catálogo y el de la jam— llegaron al mismo sitio, lo que refuerza
la elección en vez de invalidarla. Este spec absorbe y cierra el trabajo pendiente de S01: cuando
estos dos specs pasen a `Approved`, la entrada S01 debe marcarse a mano como
`En spec (specs/game-jam/ranaria/…)` para que `game-planner` no la vuelva a proponer.

---

## Scope

**In:**

- Concepto y fantasía del juego, y por qué encarna el tema de la jam.
- El loop de juego completo: intento, cruce, muerte, tanda de nenúfares, nivel.
- Las mecánicas una por una: salto discreto, carriles de carretera, carriles de río, arrastre por
  plataforma, tortugas que se sumergen, nenúfares, mosca bonus, temporizador.
- La geometría exacta: resolución lógica, grilla, reparto de filas, posiciones de los nenúfares.
- Las tablas de carriles con dirección, velocidad, longitud y separación de cada uno.
- La curva de dificultad: multiplicador de velocidad y reducción de tiempo por nivel.
- La paleta completa en valores hex concretos.
- La fórmula de puntaje, incluida la regla anti-farmeo.
- Controles, condiciones de muerte y condición de fin de partida.
- Capacidades declaradas (`hasLives`, `hasLevel`) y el slot de catálogo elegido.

**Out of scope (para specs futuros):**

- Todo el código de producción: el motor, el wrapper y la entrada del registro viven en
  `specs/game-jam/ranaria/02-ranaria-implementacion.md`.
- Cualquier ampliación del juego más allá de esta v1: cocodrilos, nutrias, la rana que hay que
  rescatar, el modo río infinito heredado de Balsero.
- Cambios en el catálogo (`games`), en `app/globals.css` o en el chrome del reproductor.
- Sonido y assets externos: este juego se dibuja entero por código.

---

## Data model

Constantes de diseño. Son **datos cerrados**: quien implemente el spec 02 no debe inventar
ninguno de estos números.

```ts
// lib/games/ranaria/engine.ts — constantes de diseño fijadas por este spec

// --- Geometría ---
const W = 640; // resolución lógica: 4:3 exacto, la proporción nativa de .crt-screen
const H = 480;
const CELL = 40; // grilla de 16 columnas × 12 filas
const COLS = 16;
const ROWS = 12;

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
const START_COL = 7; // x inicial = 7 * 40 + 20 = 300

// --- Nenúfares: 5 huecos de 2 celdas (80 px) en la fila 0, simétricos respecto de x=320 ---
const LILY_COUNT = 5;
const LILY_WIDTH = 80;
const LILY_X = [40, 160, 280, 400, 520]; // borde izquierdo de cada nenúfar
// celdas ocupadas: {1,2} {4,5} {7,8} {10,11} {13,14}
// agua letal en la fila 0: celdas 0, 3, 6, 9, 12, 15 (40 px de margen y 40 px entre nenúfares)

// --- Rana ---
const FROG_SIZE = 28; // hitbox y sprite, centrados en la celda de 40 px
const JUMP_MS = 90; // duración de la animación de salto
const JUMP_COOLDOWN_MS = 110; // tiempo mínimo entre saltos
const FROG_X_MIN = 20; // centro de la rana acotado al canvas
const FROG_X_MAX = 620;

// --- Carriles de carretera: dir +1 hacia la derecha, -1 hacia la izquierda ---
// speed en px/s a nivel 1; period = len + gap; los vehículos se reciclan por módulo
const ROAD_LANES = [
  { row: 10, dir: 1, speed: 60, len: 60, gap: 200, kind: "coche", color: "#ff4040" },
  { row: 9, dir: -1, speed: 90, len: 100, gap: 300, kind: "camion", color: "#dcdcdc" },
  { row: 8, dir: 1, speed: 130, len: 50, gap: 210, kind: "coche", color: "#ffcc00" },
  { row: 7, dir: -1, speed: 170, len: 40, gap: 160, kind: "coche", color: "#cc44ff" },
];

// --- Carriles de río ---
// "tronco" es sólido siempre; "tortugas" es un grupo de units × 40 px que se sumerge por ciclo
const RIVER_LANES = [
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
const TURTLE_SUNK = 0.25; // hundidas: no sostienen a la rana

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
```

Capacidades declaradas para el registro: `{ hasLives: true, hasLevel: true }`.

---

## Implementation plan

Este plan **fija diseño**, no escribe código. Cada paso deja un número o una regla cerrada.

1. **Fijar la resolución lógica y la grilla.** 640 × 480 (4:3 exacto), celda de 40 px, 16 columnas
   × 12 filas, con el reparto de filas del bloque `Data model`: fila 0 meta, filas 1–5 río, fila 6
   mediana, filas 7–10 carretera, fila 11 base. La barra de tiempo se dibuja en los 8 px
   inferiores de la fila 11.
   _Verificación:_ 16 × 40 = 640 y 12 × 40 = 480; ninguna franja se solapa y la suma de las
   franjas cubre el canvas entero sin huecos.

2. **Fijar la posición de los cinco nenúfares.** Cinco huecos de 80 px con bordes izquierdos en
   `LILY_X`, separados por agua letal. Aterrizar en la fila 0 fuera de un nenúfar, o sobre uno ya
   ocupado, es muerte.
   _Verificación:_ el conjunto de nenúfares es simétrico respecto de x = 320, y ninguna columna de
   la grilla queda a caballo entre nenúfar y agua.

3. **Fijar las tablas de carriles.** Dirección, velocidad base, longitud y separación de cada uno
   de los 4 carriles de carretera y los 5 de río, según `ROAD_LANES` y `RIVER_LANES`. Los carriles
   contiguos alternan dirección para que el cruce exija leer dos ritmos a la vez.
   _Verificación:_ en cada carril, `gap` es mayor que el ancho de la rana (28 px) más margen, de
   modo que siempre existe un hueco por el que pasar; y en cada carril de río, `gap` es menor que
   el ancho de un salto doble (80 px) más margen, de modo que siempre haya un tronco alcanzable.

4. **Fijar el ciclo de las tortugas.** 60 % sólidas, 15 % parpadeando (todavía sólidas, es el
   aviso), 25 % hundidas (letales), con desfase de un tercio de ciclo entre grupos del mismo
   carril.
   _Verificación:_ en cualquier instante, al menos un grupo de tortugas de cada carril está en
   fase sólida; el jugador nunca se queda sin plataforma disponible en ese carril.

5. **Fijar la curva de dificultad.** Multiplicador de velocidad
   `min(1 + 0.12 × (nivel − 1), 2.2)` aplicado a todos los carriles, y tiempo por cruce
   `max(45000 − 3000 × (nivel − 1), 20000)` ms. El nivel sube al completar los cinco nenúfares.
   _Verificación:_ el multiplicador toca su techo en el nivel 11 y el temporizador toca su suelo
   en el nivel 10, así que a partir del nivel 11 el juego deja de acelerar y la dificultad se
   estabiliza en vez de volverse imposible.

6. **Fijar la fórmula de puntaje y su regla anti-farmeo.** +10 por cada fila nueva alcanzada hacia
   arriba, contabilizada **sólo contra el récord de fila del intento actual** (bajar y volver a
   subir no puntúa); +50 por nenúfar ocupado; +10 × segundos enteros restantes al llegar; +100 si
   la mosca estaba en ese nenúfar; +500 al completar la tanda de cinco.
   _Verificación:_ una partida que suba y baje entre la base y la mediana indefinidamente no suma
   ni un punto; el máximo teórico de un cruce perfecto en el nivel 1 es
   `11 × 10 + 50 + 10 × 44 + 100 = 700` puntos, y el de una tanda completa,
   `5 × 700 + 500 = 4000`.

7. **Fijar las muertes y la condición de fin.** Muere la rana si: la toca un vehículo; termina un
   salto en una fila de río sin tronco ni tortuga sólida debajo de su centro; la plataforma que la
   lleva la saca del canvas; aterriza en la fila 0 fuera de un nenúfar o sobre uno ocupado; o se
   agota el temporizador. Cada muerte cuesta una vida, devuelve la rana a la casilla de salida y
   reinicia el temporizador y el récord de fila del intento. Con 0 vidas, la partida termina.
   _Verificación:_ las cinco causas son mutuamente excluyentes en un mismo frame y todas
   desembocan en el mismo procedimiento de "perder una vida"; no existe ninguna otra forma de
   perder ni ninguna de ganar la partida (el juego es endless).

---

## Acceptance criteria

- [ ] El diseño es implementable sin inventar ningún número: geometría, carriles, ciclos,
      dificultad, puntaje, vidas y tiempos están todos en el bloque `Data model`.
- [ ] Cada mecánica tiene una regla numérica asociada: salto (`JUMP_MS`, `JUMP_COOLDOWN_MS`),
      carriles (`ROAD_LANES` / `RIVER_LANES`), tortugas (`TURTLE_*`), nenúfares (`LILY_X`),
      mosca (`FLY_*`), reloj (`TIME_*`).
- [ ] La paleta está fijada en hex concretos y es una paleta arcade propia: no reutiliza las
      variables neon del sitio (`--cyan`, `--magenta`, …) ni recolorea el juego al tema.
- [ ] El puntaje es monotónico —nunca baja— y no es farmeable: existe una regla explícita que
      impide sumar repitiendo el mismo tramo.
- [ ] La resolución lógica está fijada en 640 × 480 y toda la geometría se deriva de una celda de
      40 px.
- [ ] Las capacidades declaradas son `{ hasLives: true, hasLevel: true }` y el diseño define de
      dónde sale cada una: vidas iniciales 3 (tope 5), nivel = tandas de nenúfares completadas + 1.
- [ ] El slot de catálogo está decidido (`ranaria`, fila existente) y el diseño no requiere fila
      nueva en `games`, SQL nuevo ni CSS nuevo.
- [ ] El juego no necesita ningún asset externo: todo se dibuja por código.

---

## Decisions

- **Sí:** capacidades `{ hasLives: true, hasLevel: true }`. Razón: el juego tiene vidas literales
  (3 ranas, +1 por tanda, tope 5) y una progresión real por nivel (cada tanda de cinco nenúfares
  acelera los carriles y acorta el reloj); ambas estadísticas del HUD compartido muestran valores
  reales reportados por el motor, no la fórmula decorativa.
- **Sí:** ocupar el slot `ranaria` sin tocar `supabase/schema.sql`. Razón: la fila ya existe
  (`ARCADE`, `cover-rana`, `green`, `6.4K`) y su texto largo describe este juego palabra por
  palabra; además `cover-rana` ya está definida en `app/globals.css:491`, así que no hace falta
  ninguna clase `.cover-*` nueva. Es la opción de coste cero del contrato §6.
- **Sí:** documentar la convergencia con la entrada **S01** de
  `reference/game-sugestions-todo.md` (Frogger → `ranaria`, `Pendiente`). Razón: la regla de la
  jam obliga a justificar cualquier slot ya reservado por `game-planner`. Aquí no se desplaza una
  reserva por otra idea: es el mismo juego y el mismo slot al que se llegó por otro camino, y
  estos specs son el paso siguiente que S01 dejaba pendiente. S01 debe pasar a `En spec` a mano
  cuando estos specs se aprueben.
- **Sí:** resolución 640 × 480. Razón: es 4:3 exacto, la proporción que `.crt-screen` fija en
  `app/globals.css:625`; evita la deformación que hoy sufren `caida` (450 × 600) y
  `bloque-buster` (480 × 640), porque `.game-arena canvas` estira a `width:100%; height:100%` sin
  `object-fit`.
- **Sí:** paleta arcade propia en hex fijos, sin reutilizar las variables neon del sitio. Razón:
  el contrato §1 prohíbe recolorear un juego al tema, y el contraste carretera oscura / río azul /
  césped verde es lo que hace legible de un vistazo en qué tipo de franja está la rana.
- **Sí:** dibujar la barra de tiempo dentro del canvas, en los 8 px inferiores. Razón: el HUD
  compartido tiene slots para Jugador, Puntuación, Vidas y Nivel, pero no para tiempo; el contrato
  sólo prohíbe duplicar score/vidas/nivel dentro del canvas y el overlay de game over, no un
  indicador de una magnitud que el HUD no muestra. Va pegada al borde inferior para no competir
  con la zona de juego.
- **Sí:** posición horizontal de la rana en float, aunque el movimiento sea por celdas. Razón: sin
  eso, un tronco no puede arrastrar a la rana de forma continua y la mitad fluvial del juego —el
  corazón del tema— deja de funcionar. El salto lateral suma o resta exactamente 40 px a la `x`
  actual, sin re-encajar en la grilla.
- **Sí:** evaluar colisiones sólo con el salto ya terminado. Razón: con `JUMP_MS` de 90 ms, chequear
  a mitad de vuelo produce muertes que el jugador percibe como injustas ("me mató en el aire");
  esperar al aterrizaje hace el juego legible sin volverlo fácil.
- **No:** modo de dos ranas / dos jugadores en el mismo teclado. Razón: el ranking es de un solo
  nombre y el contrato prohíbe la pantalla previa de selección de modo — el mismo motivo por el
  que Pong quedó descartado en la memoria de `game-planner`.
- **No:** pantalla previa de selección de dificultad dentro del canvas. Razón: el contrato la
  prohíbe. Existe un precedente en el repo (`lib/games/arkanoid/engine.ts:92` tiene una fase
  `"start"` con "Choose difficulty" dibujada en el canvas), pero es una desviación heredada del
  original portado, no un permiso: aquí la dificultad la fija el nivel, que sube solo.
- **No:** tecla de reinicio propia ni overlay de fin de partida dibujado en el canvas. Razón:
  contrato §1 — el fin se notifica con `onGameOver(finalScore)` y el reinicio lo controla React
  vía `resetKey`.
- **No:** cocodrilos, nutrias, serpientes en la mediana ni la rana rescatable del original. Razón:
  recorte deliberado de alcance para mantener el motor en el rango de los existentes (238–558
  líneas); las tortugas que se sumergen ya aportan el eje "plataforma que deja de serlo", que es
  la única de esas mecánicas que el diseño necesita.
- **No:** puntuar el descenso de filas ni el tiempo consumido. Razón: cualquiera de las dos
  convierte el leaderboard en una medida de paciencia; el score sólo sube por progreso real hacia
  la meta.

---

## Risks

| Riesgo                                                                                                                                     | Mitigación                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Balance: con velocidades y separaciones mal elegidas, un carril puede quedar sin hueco atravesable a niveles altos y el juego se vuelve injusto. | Las separaciones (`gap`) están fijadas con margen sobre el ancho de la rana, el multiplicador de velocidad tiene techo (2.2) y el paso 3 del plan exige verificar hueco atravesable en cada carril.                                    |
| Farmeo del puntaje subiendo y bajando entre filas seguras.                                                                                     | El avance sólo puntúa contra el récord de fila del intento actual; el paso 6 del plan lo verifica explícitamente.                                                                                                                     |
| Legibilidad: distinguir una tortuga a punto de hundirse de una sólida es la información más crítica del juego y la más fácil de perder.         | Fase de parpadeo del 15 % del ciclo con color propio (`turtleBlink`) antes de hundirse, y desfase entre grupos para que el patrón sea leíble en vez de aleatorio.                                                                     |
| El temporizador es invisible para el HUD compartido: si el jugador no lo percibe, morir por tiempo se siente arbitrario.                        | Barra de tiempo dentro del canvas, en la franja inferior, con interpolación de color de `timeFull` a `timeEmpty` para que el peligro se vea sin leer números.                                                                        |
| La muerte por arrastre (el tronco te saca del canvas) es la menos intuitiva de las cinco.                                                       | La rana queda acotada a `[FROG_X_MIN, FROG_X_MAX]` sólo por salto propio, nunca por arrastre; el tronco sí la saca, y el diseño lo compensa con velocidades de río moderadas (55–110 px/s) que dan tiempo de reacción sobrado.        |
| El juego arranca demasiado fácil y el primer minuto aburre.                                                                                    | Cuatro carriles de carretera con direcciones alternas ya desde el nivel 1, y 45 s de reloj que obligan a cruzar sin esperar el hueco perfecto.                                                                                        |

---

## What is **not** in this spec

- El código del motor, del wrapper y de la entrada del registro.
- Ampliaciones del juego: cocodrilos, nutrias, rana rescatable, modo río infinito.
- Sonido y cualquier asset externo.
- Cambios en el catálogo (`games`), en `app/globals.css` o en el chrome del reproductor.

Cada uno de estos, si se necesita, va en su propio spec.
