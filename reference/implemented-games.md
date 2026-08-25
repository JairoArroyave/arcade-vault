# Estado de los juegos — Arcade Vault

> Generado el 2026-08-25 consultando la tabla `games` de Supabase (proyecto `dpxlyxhojfolbmjpcvky`, REST con la anon key de `.env.local`) y contrastando con `components/games/registry.ts`, `lib/games/<slug>/engine.ts` y los specs `05`–`09`.

El catálogo tiene **8 filas en la tabla `games`**, pero **solo 4 están realmente implementados** (motor de canvas propio, puntaje real, escritura en el leaderboard): `rocas`, `caida`, `bloque-buster`, `serpentina`.

Las otras **4 son solo un demo, no juegos implementados**: `gloton`, `invasores`, `ranaria`, `duelo-pixel`. Tienen fila en el catálogo y pantalla de reproductor, pero ningún motor real detrás — el "juego" es una simulación: el puntaje sube solo con un `setInterval` y la "arena" es puro CSS decorativo. No hay código en `lib/games/` para ellos ni entrada en `REAL_GAMES`.

---

## Resumen

| # | ID (`games.id`) | Título | Categoría | Estado | Motor | Spec |
| - | --- | --- | --- | --- | --- | --- |
| 1 | `rocas` | ROCAS | SHOOTER | ✅ Implementado | `lib/games/asteroids/engine.ts` | [05](../specs/05-juego-asteroids-real.md) |
| 2 | `caida` | CAÍDA | PUZZLE | ✅ Implementado | `lib/games/tetris/engine.ts` | [07](../specs/07-juego-tetris-real.md) |
| 3 | `bloque-buster` | BLOQUE BUSTER | ARCADE | ✅ Implementado | `lib/games/arkanoid/engine.ts` | [08](../specs/08-juego-arkanoid-real.md) |
| 4 | `serpentina` | SERPENTINA | ARCADE | ✅ Implementado | `lib/games/serpentina/engine.ts` | [09](../specs/09-juego-snake-real.md) |
| 5 | `gloton` | GLOTÓN | ARCADE | ⬜ Solo demo (sin motor) | — | — |
| 6 | `invasores` | INVASORES | SHOOTER | ⬜ Solo demo (sin motor) | — | — |
| 7 | `ranaria` | RANARIA | ARCADE | ⬜ Solo demo (sin motor) | — | — |
| 8 | `duelo-pixel` | DUELO PIXEL | VERSUS | ⬜ Solo demo (sin motor) | — | — |

---

## Juegos implementados

### 1. ROCAS (`rocas`) — Asteroids

- **Categoría:** SHOOTER · **Color:** `yellow` · **Cover:** `cover-rocas` · **Plays (dato de catálogo):** 15.6K
- **Descripción corta:** "Pulveriza asteroides en gravedad cero."
- **Larga:** "Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte."
- **Motor:** `lib/games/asteroids/engine.ts` (558 líneas) — `createAsteroidsEngine()`
- **Wrapper:** `components/games/AsteroidsGame.tsx`
- **Origen:** portado de `reference/juegos/02/claude-asteroids-main/claude-asteroids-main/game.js`
- **Canvas lógico:** 800 × 600 · dibujo vectorial puro (sin assets)
- **HUD:** vidas ✅ (3 iniciales) · nivel ✅ (sube al limpiar la oleada; `3 + level` asteroides por oleada)
- **Controles:** ← → rotar, ↑ propulsar, `Espacio` disparar
- **Puntaje:** 100 / 50 / 20 puntos por asteroide según tamaño (1 / 2 / 3)

### 2. CAÍDA (`caida`) — Tetris

- **Categoría:** PUZZLE · **Color:** `magenta` · **Cover:** `cover-tetro` · **Plays:** 31.8K
- **Descripción corta:** "Encaja las piezas antes de que el techo te aplaste."
- **Larga:** "Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas."
- **Motor:** `lib/games/tetris/engine.ts` (383 líneas) — `createTetrisEngine()`
- **Wrapper:** `components/games/TetrisGame.tsx`
- **Origen:** portado de `reference/juegos/03/claude-tetris/game.js` (paleta "retro" original preservada)
- **Canvas lógico:** 450 × 600 — tablero 10 × 20 de bloques de 30 px (300 × 600) + panel de "siguiente pieza" de 150 px
- **HUD:** vidas ❌ · nivel ✅ (`floor(líneas / 10) + 1`)
- **Controles:** ← → mover, ↓ soft drop, ↑ / `X` rotar, `Espacio` hard drop
- **Puntaje:** 100 / 300 / 500 / 800 por 1–4 líneas, multiplicado por el nivel
- **Descartado del original:** pantalla de inicio, selector de piel/tema, menú de pausa propio y leaderboard en `localStorage` (los reemplaza el reproductor compartido)

### 3. BLOQUE BUSTER (`bloque-buster`) — Arkanoid / Breakout

- **Categoría:** ARCADE · **Color:** `cyan` · **Cover:** `cover-bricks` · **Plays:** 12.4K
- **Descripción corta:** "Rebota la pelota y destruye muros de neón."
- **Larga:** "Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?"
- **Motor:** `lib/games/arkanoid/engine.ts` (420 líneas) + `lib/games/arkanoid/sprites.ts` — `createArkanoidEngine()`
- **Wrapper:** `components/games/ArkanoidGame.tsx`
- **Origen:** portado de `reference/juegos/04/arkanoid/js/game.js`
- **Canvas lógico:** 480 × 640 · grilla de 7 filas × 8 columnas de ladrillos (32 × 16 px)
- **Assets:** `public/games/bloque-buster/spritesheet-breakout.png` + `sounds/ball-bounce.mp3`, `sounds/break-sound.mp3` (el loop arranca recién cuando carga el spritesheet)
- **HUD:** vidas ✅ (3 iniciales) · nivel ❌
- **Controles:** ← → mover la paleta · `1` / `2` / `3` elegir dificultad en la pantalla de selección dibujada dentro del canvas (fácil / media / difícil = velocidad inicial 3 / 4.5 / 6)
- **Puntaje:** 10 puntos por ladrillo

### 4. SERPENTINA (`serpentina`) — Snake

- **Categoría:** ARCADE · **Color:** `green` · **Cover:** `cover-snake` · **Plays:** 9.1K
- **Descripción corta:** "Crece sin morder tu propia cola."
- **Larga:** "Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma."
- **Motor:** `lib/games/serpentina/engine.ts` (238 líneas) + `lib/games/serpentina/sprites.ts` — `createSerpentinaEngine()`
- **Wrapper:** `components/games/SerpentinaGame.tsx`
- **Origen:** **diseñado desde cero** (único juego sin código fuente de partida); solo se reutilizan los sprites de fruta de `reference/snake-assets/`
- **Canvas lógico:** 600 × 450 — grilla de 20 × 15 celdas de 30 px
- **Assets:** `public/games/serpentina/fruits.png`
- **HUD:** vidas ❌ · nivel ✅ (sube cada 5 frutas)
- **Controles:** ← ↑ → ↓ o `W` `A` `S` `D`
- **Puntaje:** 10 puntos por fruta · velocidad: tick de 150 ms bajando 12 ms por nivel hasta un mínimo de 60 ms

---

## Juegos no implementados (solo demo)

Tienen fila en `games` y pantalla de detalle/reproductor, pero **no son juegos jugables de verdad**: no hay motor en `lib/games/` ni entrada en `REAL_GAMES`, así que `GamePlayerClient` cae en la arena simulada (puntaje con `setInterval`, sin lógica real).

| ID | Título | Categoría | Color | Cover | Plays | Descripción corta |
| --- | --- | --- | --- | --- | --- | --- |
| `gloton` | GLOTÓN | ARCADE | `yellow` | `cover-glot` | 27.2K | Devora puntos y escapa de los fantasmas. |
| `invasores` | INVASORES | SHOOTER | `green` | `cover-invaders` | 18.0K | Defiende el planeta de filas alienígenas. |
| `ranaria` | RANARIA | ARCADE | `green` | `cover-rana` | 6.4K | Cruza la autopista de pixeles. |
| `duelo-pixel` | DUELO PIXEL | VERSUS | `cyan` | `cover-duelo` | 4.2K | Dos paletas. Una pelota. Reflejos máximos. |

Candidatos naturales: Pac-Man (`gloton`), Space Invaders (`invasores`), Frogger (`ranaria`) y Pong (`duelo-pixel`).

---

## Estado del leaderboard (tabla `scores`)

Al momento de generar este documento la tabla `scores` tiene **1 sola fila**:

| game | score | name | created_at |
| --- | --- | --- | --- |
| `rocas` | 1880 | INVITADO | 2026-08-23 |

La tabla es genérica por `game` id (`id`, `game`, `score`, `name`, `created_at`), por eso un juego nuevo **no requiere cambio de esquema**: basta con la fila en `games` (si no encaja en un slot existente) y la llamada a `saveScore()`.

---

## Contrato compartido (recordatorio)

Cada juego real son exactamente dos archivos más una línea de registro:

1. `lib/games/<slug>/engine.ts` — factory `create<X>Engine(canvas, callbacks): GameEngine` (`setPaused` / `reset` / `destroy`). Todo el estado y los listeners viven en el closure; sin HUD ni overlay de game-over dentro del canvas, sin tecla de reinicio propia.
2. `components/games/<PascalName>Game.tsx` — wrapper `"use client"` que monta el `<canvas>` en la resolución lógica fija del motor.
3. `components/games/registry.ts` — `REAL_GAMES[gameId] = { Component, capabilities: { hasLives, hasLevel } }`.

Callbacks (`lib/games/types.ts`): `onScoreChange`, `onGameOver` (obligatorios), `onLivesChange`, `onLevelChange` (opcionales, según `capabilities`).

El escalado del canvas lo resuelve una sola vez `.game-arena canvas` en `app/globals.css` — un porte nuevo no necesita CSS nuevo.

---

## Nota

`specs/07-juego-tetris-real.md` estaba marcado como `Status: Approved` pese a que el juego ya estaba implementado y mergeado (PR #10 / merge `4dac1cd`). Se corrigió a **`Implemented`** al generar este documento, alineándolo con los specs 05, 08 y 09.
