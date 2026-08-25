# SPEC 07 — Juego real de Tetris en el reproductor

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-08-24
> **Objective:** Reemplazar la arena decorativa del reproductor simulado en `/games/caida/play` por el juego real de Tetris (adaptado de `reference/juegos/03/claude-tetris/game.js`), integrado al HUD/pausa/modal ya existentes y al leaderboard real de Supabase, disparando en el mismo spec el refactor único que generaliza el reproductor para soportar más de un juego real.

---

## Por qué existe este spec

`caida` (`lib/games.ts`, cat. `PUZZLE`, "Encaja las piezas antes de que el techo te aplaste") ya está pensado temáticamente como Tetris desde el spec 01/06, y `reference/juegos/03/claude-tetris/` tiene un Tetris completo y funcional (canvas HTML5 + JS vanilla) que encaja ahí sin necesidad de fila nueva en `games`.

Este es el **segundo** juego real que se porta (después de `rocas`, spec 05), así que dispara el refactor único descrito en la sección 4 de `contract.md`: hoy `GamePlayerClient.tsx` decide juego real vs. arena decorativa con `const isAsteroids = game.id === "rocas"`, un booleano que no escala a un segundo juego. Este spec lo reemplaza por `components/games/registry.ts` (`REAL_GAMES`), sin cambiar el comportamiento ya verificado de `rocas`.

Además, la fuente trae bastante más "chrome" propio que Asteroids no tenía: pantalla de inicio con selector de nivel inicial, selector de piel (retro/neon/pastel/pixel), interruptor de tema claro/oscuro, un menú de pausa propio con una subvista de controles, y un leaderboard local en `localStorage` (top 5, con nombre/combo/líneas). Ninguno de estos encaja en el contrato del reproductor compartido (que ya tiene su propio HUD, pausa, modal de fin de partida y leaderboard real en Supabase), así que este spec documenta explícitamente qué se descarta y por qué (ver Decisions).

También se confirma, leyendo el código y no su documentación, una inconsistencia conocida: el `CLAUDE.md` de `reference/juegos/03/claude-tetris/` describe `game.js` como "~300 lines"; el archivo real tiene 696 líneas. Se porta el código tal como está, no como lo describe ese `CLAUDE.md` (mismo criterio que ya aplicó el spec 05 con la documentación de Asteroids/Arkanoid).

---

## Scope

**In:**

- **Refactor único de la sección 4 de `contract.md`** (primer spec que porta un segundo juego real):
  - `lib/games/types.ts` y `components/games/types.ts` con `GameCallbacks`/`GameEngine`/`RealGameProps`/`GameCapabilities`.
  - `components/games/registry.ts` con `REAL_GAMES`, empezando con la entrada de `rocas` apuntando a `AsteroidsGame`.
  - Migrar `lib/games/asteroids/engine.ts` para usar `GameCallbacks`/`GameEngine` (en vez de sus alias locales `AsteroidsCallbacks`/`AsteroidsEngine`).
  - Migrar `components/games/AsteroidsGame.tsx` para usar `RealGameProps`, invocando `onLivesChange`/`onLevelChange` con `?.` por ser ahora opcionales.
  - `GamePlayerClient.tsx`: reemplazar `isAsteroids` por `const realGame = REAL_GAMES[game.id]`; la fórmula de nivel decorativo, el `setInterval` simulado y el branch de la arena pasan a comprobar `realGame`; los `hud-stat` de Vidas/Nivel se condicionan a `!realGame || realGame.capabilities.hasLives` / `...hasLevel`.
  - CSS: generalizar `.asteroids-arena canvas` a `.game-arena canvas` en `app/globals.css`, quitar la clase `asteroids-arena` del JSX.
- `lib/games/tetris/engine.ts`: motor adaptado de `game.js`, encapsulado en `createTetrisEngine(canvas, callbacks)` — sin `document`/`window` a nivel de módulo, sin HUD propio, sin overlay de game over, sin reinicio propio, con `paused` real y listener de teclado gateado por el estado interno `"playing"`.
- `components/games/TetrisGame.tsx` (`"use client"`), siguiendo el mismo patrón que `AsteroidsGame.tsx`.
- Entrada nueva en `REAL_GAMES`: `caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } }`.
- Panel de "siguiente pieza" conservado, integrado dentro del mismo `<canvas>` (ver Decisions) — no es HUD de estadísticas, es parte del gameplay central de Tetris.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles. El original solo soporta teclado.
- Recoloreo al tema neon del sitio. Se mantiene la paleta original del juego.
- Pantalla de inicio propia (selector de nivel inicial 1–10, botón "jugar"). El motor arranca jugando de inmediato al crearse, igual que Asteroids.
- Selector de piel (neon/pastel/pixel) e interruptor de tema claro/oscuro. Se fija una sola combinación (ver Decisions).
- Menú de pausa propio (con su subvista de controles) y leaderboard local en `localStorage` (`tetris-records`, top 5 con combo/líneas). Reemplazados por la pausa y el modal de fin de partida ya compartidos, y por el leaderboard real de Supabase.
- Tracking de combo/máximo combo — solo alimentaba el leaderboard local que se elimina; no afecta el puntaje.
- Supabase Auth, CLI/migraciones de Supabase, cliente admin/service-role.
- Adaptar los 5 juegos mock restantes (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a implementaciones jugables reales.
- Sonido/música.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Data model

No se introduce persistencia nueva: `caida` reutiliza la tabla `scores` ya genérica por `game` (sección 6 de `contract.md`), sin cambios de esquema.

```ts
// lib/games/types.ts
export type GameCallbacks = {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
};

export type GameEngine = {
  setPaused(paused: boolean): void;
  reset(): void;
  destroy(): void;
};
```

```ts
// components/games/types.ts
export type RealGameProps = GameCallbacks & {
  paused: boolean;
  resetKey: number;
};

export type GameCapabilities = { hasLives: boolean; hasLevel: boolean };
```

```ts
// components/games/registry.ts
export const REAL_GAMES: Record<string, RealGameEntry> = {
  rocas: { Component: AsteroidsGame, capabilities: { hasLives: true, hasLevel: true } },
  caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } },
};
```

```ts
// lib/games/tetris/engine.ts
export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks, // solo usa onScoreChange, onLevelChange, onGameOver — hasLives false, nunca llama onLivesChange
): GameEngine;
```

Resolución lógica interna del canvas: **450×600** — tablero de Tetris (10×20 celdas de 30px = 300×600) a la izquierda + panel de 150×600 a la derecha con la vista de la siguiente pieza (solo bloques, sin texto). Paleta: la original `retro` de `game.js` (`COLORS`/`renderBlockRetro`) sobre fondo oscuro fijo.

---

## Implementation plan

1. Crear `lib/games/types.ts` y `components/games/types.ts` con los tipos de arriba. Verificación: `npx tsc --noEmit` sin errores, sin usarse aún en ningún archivo.
2. Crear `components/games/registry.ts` con `REAL_GAMES` conteniendo solo la entrada de `rocas` apuntando a `AsteroidsGame`. Verificación: compila, sin usarse aún.
3. Migrar `lib/games/asteroids/engine.ts` para usar `GameCallbacks`/`GameEngine` de `lib/games/types.ts` en vez de sus alias locales `AsteroidsCallbacks`/`AsteroidsEngine`. Verificación: compila sin errores de tipos.
4. Migrar `components/games/AsteroidsGame.tsx` para usar `RealGameProps` en vez de `AsteroidsGameProps`, con `onLivesChange?.(...)`/`onLevelChange?.(...)`. Verificación: compila; `/games/rocas/play` sigue funcionando exactamente igual (chequeo manual de regresión).
5. En `GamePlayerClient.tsx`: reemplazar `const isAsteroids = game.id === "rocas"` por `const realGame = REAL_GAMES[game.id]`; ajustar la fórmula de nivel decorativo, el early-return del `setInterval` simulado, el branch `.game-arena`/`.asteroids-arena` y los `hud-stat` de Vidas/Nivel para usar `realGame`/`realGame.capabilities`. Verificación: `/games/rocas/play` sin cambios de comportamiento; los 7 juegos decorativos restantes siguen mostrando Vidas y Nivel simulados como antes.
6. En `app/globals.css`: generalizar el selector `.asteroids-arena canvas` a `.game-arena canvas`, quitar la clase `asteroids-arena` del JSX de `GamePlayerClient.tsx`. Verificación: el canvas de `rocas` escala exactamente igual que antes del refactor.
7. Crear `lib/games/tetris/engine.ts` portando de `game.js`: `COLS`/`ROWS`/`BLOCK`/`PIECES`/`COLORS` (paleta `retro` únicamente), `createBoard`, `randomPiece`, `collide`, `rotateCW`/`tryRotate` (wall kicks `[0,-1,1,-2,2]`), `merge`, `clearLines` (`LINE_SCORES` × `level`, sin combo), `ghostY`, `hardDrop` (+2 por fila), `softDrop` (+1), `spawn`/`lockPiece`, el loop de `dropAccum`/`dropInterval` (`Math.max(100, 1000 - (level-1)*90)`), y el dibujo del tablero + pieza + ghost + panel de siguiente pieza, todo dentro de `createTetrisEngine(canvas, callbacks)`. Canvas lógico 450×600 (ver Data model). Siempre arranca en `level = 1` (sin selector de nivel inicial). Sin `combo`/`maxCombo`. El listener de teclado (`ArrowLeft`/`ArrowRight`/`ArrowDown`/`ArrowUp`/`KeyX`/`Space`) solo actúa mientras el estado interno equivalente a `"playing"` está activo — reemplaza el chequeo `e.target.tagName === "INPUT"` del original, ya innecesario. Sin `togglePause` propio (`KeyP`/`Escape`) — la pausa la controla `setPaused(paused)` desde afuera. Sin overlay de "GAME OVER", sin pantalla de inicio (`startOverlay`/`playBtn`), sin menú de pausa propio, sin leaderboard local (`localStorage["tetris-records"]`, `loadRecords`/`addRecord`/`renderRecordsSection`/`isTopScore`) — el fin de partida se notifica solo con `onGameOver(finalScore)`; el reinicio es exclusivamente `reset()`/`resetKey`. Verificación: el archivo compila sin usarse en ninguna pantalla.
8. Crear `components/games/TetrisGame.tsx` (`"use client"`) con el mismo patrón que `AsteroidsGame.tsx`: `<canvas width={450} height={600}>` por `ref`, `callbacksRef` actualizado sin dependencias, efecto `[resetKey]` que crea/destruye `createTetrisEngine`, efecto `[paused]` que llama `setPaused`. Verificación: compila sin errores de tipos.
9. Registrar `caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } }` en `components/games/registry.ts`. Verificación: `/games/caida/play` muestra el tablero de Tetris real en vez de la arena decorativa; el HUD oculta "Vidas" (`hasLives` false) y muestra el "Nivel" real reportado por el motor (no la fórmula `1 + score/2500`).
10. Verificación funcional completa: PAUSA congela el tablero (último frame visible) y REANUDAR continúa sin reiniciar; apilar piezas hasta colisionar en `spawn` dispara `onGameOver` y abre el modal compartido (sin overlay propio dibujado ni reinicio por tecla); el botón FIN también abre ese modal con el puntaje acumulado; guardar la puntuación inserta una fila en `scores` con `game: "caida"`; "JUGAR DE NUEVO" reinicia tablero vacío, score 0 y nivel 1 vía `resetKey`; escribir en el input de iniciales del modal no mueve piezas ni rota.
11. Confirmar que `reference/juegos/03/claude-tetris/` no tiene ninguna modificación (`git status` limpio en ese path) y que `rocas` y los 6 juegos decorativos restantes (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) no cambiaron visual ni funcionalmente.
12. Revisión final: `npm run lint` y `npm run build` sin errores.

---

## Acceptance criteria

- [ ] `lib/games/types.ts` y `components/games/types.ts` existen con `GameCallbacks`/`GameEngine`/`RealGameProps`/`GameCapabilities`; `components/games/registry.ts` existe con `REAL_GAMES` conteniendo `rocas` y `caida`.
- [ ] `lib/games/asteroids/engine.ts` y `components/games/AsteroidsGame.tsx` usan los tipos compartidos; `/games/rocas/play` no cambia de comportamiento (regresión).
- [ ] `GamePlayerClient.tsx` decide juego real vs. arena decorativa vía `REAL_GAMES[game.id]`, sin ningún booleano hardcodeado por juego.
- [ ] `lib/games/tetris/engine.ts` exporta `createTetrisEngine(canvas, callbacks): GameEngine` según el contrato, sin `document`/`window` fuera del closure de la factory.
- [ ] `components/games/TetrisGame.tsx` monta y desmonta sin duplicar listeners de teclado ni dejar loops de `requestAnimationFrame` corriendo al navegar dentro y fuera de `/games/caida/play` repetidamente.
- [ ] Controles: ←/→ mueven la pieza, ↓ hace soft drop, ↑/X rotan (con wall kicks), Espacio hace hard drop.
- [ ] El HUD respeta las capacidades: oculta "Vidas" (`hasLives` false), muestra "Nivel" con el valor real del motor (sube cada 10 líneas), no la fórmula decorativa.
- [ ] El botón PAUSA congela el último frame (sin avanzar el drop); REANUDAR continúa sin reiniciar.
- [ ] Tanto apilar el tablero hasta el game over como el botón FIN manual abren únicamente el modal de fin de partida compartido — sin overlay de "GAME OVER" dibujado en el canvas ni reinicio propio por tecla.
- [ ] Guardar la puntuación en el modal inserta una fila en `scores` con `game: "caida"`.
- [ ] "JUGAR DE NUEVO" reinicia la partida completamente vía `resetKey` (tablero vacío, score 0, nivel 1).
- [ ] El canvas se ve completo y sin deformarse tanto en una ventana ancha como en una angosta.
- [ ] `rocas` y los 6 juegos decorativos restantes no cambian visual ni funcionalmente (chequeo de regresión explícito sobre el refactor único de la sección 4).
- [ ] `reference/juegos/03/claude-tetris/` no muestra diff en `git status` (queda de solo lectura).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** slot `caida` (`PUZZLE`, `cover-tetro`) para este porte. Razón: decisión explícita del usuario; ya está temáticamente diseñado como Tetris desde el spec 01/06 y ningún otro juego real lo ocupa todavía; no hace falta fila nueva en `games`.
- **Sí:** fuente `reference/juegos/03/claude-tetris/`, confirmada (venía dada en el argumento del comando).
- **Sí:** `capabilities: { hasLives: false, hasLevel: true }`. Razón: el original no tiene vidas (un solo game-over al apilarse el tablero), sí tiene nivel real que sube cada 10 líneas.
- **Sí:** incluir en este spec el refactor único de la sección 4 de `contract.md` (`registry.ts` + tipos compartidos + migración de Asteroids). Razón: este es el primer spec que porta un segundo juego real; sin el refactor, `GamePlayerClient.tsx` necesitaría un segundo booleano hardcodeado que no escala a futuros juegos.
- **Sí:** una sola paleta (`retro`, la que ya es el valor por defecto del original) y un solo tema (oscuro, también el valor por defecto). Se elimina el selector de piel (neon/pastel/pixel) y el interruptor de tema claro/oscuro. Razón: el contrato prohíbe recolorear al tema neon del sitio pero también evita agregar chrome de UI nuevo; fijar los valores por defecto del propio original preserva su identidad visual sin introducir un selector que ningún otro juego del reproductor tiene.
- **Sí:** conservar el panel de "siguiente pieza" integrado dentro del mismo `<canvas>` (450×600), en vez de agregar un segundo `<canvas>` o eliminarlo. Razón: `RealGameProps`/el wrapper solo contemplan un `<canvas>`; a diferencia del HUD de score/vidas/nivel (que si se elimina del canvas), la vista de la siguiente pieza es parte del gameplay central de Tetris, no una estadística — se conserva ampliando la resolución lógica del motor.
- **No:** pantalla de inicio propia (selector de nivel inicial 1–10, botón "jugar"). Razón: mismo precedente documentado en `contract.md` sección 3 para Arkanoid — un chrome de pre-partida no encaja en `RealGameProps` ni en el reproductor compartido; el motor arranca jugando de inmediato al crearse, igual que Asteroids.
- **No:** menú de pausa propio (con subvista de controles) ni leaderboard local en `localStorage` (`tetris-records`). Razón: quedan reemplazados exactamente por la pausa y el modal de fin de partida ya compartidos, y por el leaderboard real de `scores` en Supabase (sección 6 del contrato); mantener ambos sería duplicar UI con datos inconsistentes entre sí.
- **No:** tracking de `combo`/`maxCombo`. Razón: en el original solo alimentaban las estadísticas del leaderboard local que se elimina; no afectan el cálculo del puntaje (`LINE_SCORES` no depende del combo).
- **No:** tocar `reference/juegos/03/claude-tetris/`. Razón: es material de referencia de solo lectura; toda la adaptación vive en archivos nuevos bajo `lib/games/tetris/` y `components/games/`.
- **Sí:** se porta el código real de `game.js` (696 líneas), no lo que describe su propio `CLAUDE.md` ("~300 lines"). Razón: inconsistencia de documentación ya detectada al leer el archivo; el código fuente es la única fuente de verdad (mismo criterio que ya aplicó el spec 05).

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El refactor único de la sección 4 (`registry.ts`, migración de tipos) toca `GamePlayerClient.tsx` y `AsteroidsGame.tsx`, que ya funcionan y están verificados para `rocas` | Pasos 3–6 del plan incluyen verificación explícita de que `/games/rocas/play` no cambia de comportamiento antes de agregar Tetris |
| Ampliar la resolución lógica del canvas a 450×600 (en vez de 300×600 puro del tablero) podría verse desproporcionado si el escalado CSS asume una proporción distinta | Se reutiliza el mismo mecanismo ya generalizado en el paso 6 (`.game-arena canvas { width:100%; height:100%; }` dentro de `.crt-screen`, que ya mantiene proporción 4:3); verificación visual en ventana ancha y angosta (criterio de aceptación) |
| El `CLAUDE.md` de la fuente describe `game.js` como "~300 lines" cuando en realidad tiene 696; confiar en esa documentación en vez de leer el código podría llevar a portar una versión incompleta o desactualizada | Mitigado: este spec se escribió leyendo `game.js` directamente, no su documentación |

---

## What is **not** in this spec

- Controles táctiles/móviles.
- Recoloreo al tema neon del sitio.
- Pantalla de inicio propia (selector de nivel inicial, botón "jugar").
- Selector de piel e interruptor de tema claro/oscuro.
- Menú de pausa propio y leaderboard local en `localStorage`.
- Tracking de combo/máximo combo.
- Supabase Auth, CLI/migraciones de Supabase, cliente admin/service-role.
- Adaptación jugable real de los 5 juegos mock restantes (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Sonido/música.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.
