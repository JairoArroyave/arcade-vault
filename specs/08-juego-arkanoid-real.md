# SPEC 08 — Juego real de Arkanoid en el reproductor

> **Status:** Implemented
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-08-24
> **Objective:** Reemplazar la arena decorativa del reproductor simulado en `/games/bloque-buster/play` por el juego real de Arkanoid (adaptado de `reference/juegos/04/arkanoid/js/game.js`), integrado al HUD/pausa/modal ya existentes y al leaderboard real de Supabase.

---

## Por qué existe este spec

`bloque-buster` (`cat. ARCADE`, "Rebota la pelota y destruye muros de neón", `cover-bricks`) ya está pensado temáticamente como un Arkanoid/Breakout desde el spec 01/06, y `reference/juegos/04/arkanoid/js/game.js` es exactamente ese juego, completo y funcional (canvas HTML5 + JS vanilla), así que el porte entra en ese slot sin necesidad de fila nueva en `games`.

El refactor único de la sección 4 de `contract.md` (`registry.ts` + tipos compartidos) ya existe desde el spec 07 (`caida` → Tetris), así que este spec no lo repite: agrega directamente el motor, el wrapper y la entrada nueva en `REAL_GAMES`.

Dos particularidades de esta fuente respecto a Asteroids/Tetris, verificadas leyendo `game.js` directamente (no su documentación):

- `reference/juegos/04/arkanoid/CLAUDE.md` dice "no hay código todavía"; en realidad `js/game.js` (377 líneas) implementa el juego completo, con 4 specs propios (`01`–`04`) en su mayoría `Implemented`. Misma inconsistencia de documentación ya detectada en los specs 05/07 — se porta el código real, no lo que dice ese `CLAUDE.md`.
- A diferencia de Asteroids/Tetris (dibujo vectorial puro), este juego renderiza paddle/pelota/bloques/explosiones con un spritesheet (`assets/assets/spritesheet-breakout.png` + el mapa de coordenadas de `assets/assets/spritesheet.js`). Es el primer juego real del reproductor que depende de un asset de imagen — ver Decisions para cómo se resuelve sin salir del contrato (nunca `document`/`window` a nivel de módulo, sin tocar la fuente original).

---

## Scope

**In:**

- Copiar `reference/juegos/04/arkanoid/assets/assets/spritesheet-breakout.png` (sin tocar el original) a `public/games/bloque-buster/spritesheet-breakout.png`, servido como asset estático de Next.js.
- `lib/games/arkanoid/sprites.ts`: mapa de coordenadas `SPRITES`/`EXPLOSION_FRAMES` portado tal cual de `assets/assets/spritesheet.js` (solo los datos; sin `loadSpritesheet`/`drawFrame`/`drawSprite` globales, que pasan a vivir dentro del motor).
- `lib/games/arkanoid/engine.ts`: motor adaptado de `js/game.js`, encapsulado en `createArkanoidEngine(canvas, callbacks)` según el contrato de la sección 1 de `contract.md` — sin `document`/`window` a nivel de módulo, sin HUD propio (`drawHUD`), sin overlays propios (`drawStartOverlay`/`drawEndOverlay`), sin reinicio propio por tecla/click (`retryGame`/`handleInput`), con `paused` real y el listener de teclado (`ArrowLeft`/`ArrowRight`) gateado por el estado interno equivalente a `"playing"`.
- `components/games/ArkanoidGame.tsx` (`"use client"`), siguiendo el mismo patrón que `AsteroidsGame.tsx`/`TetrisGame.tsx` (sección 2 de `contract.md`).
- Entrada nueva en `components/games/registry.ts`: `"bloque-buster": { Component: ArkanoidGame, capabilities: { hasLives: true, hasLevel: false } }`.
- Física, colisiones, ángulo de rebote en el paddle, división de la pelota al salir por los bordes, destrucción de bloques con animación de explosión y puntaje (10 por bloque) — todo preservado tal como está en `game.js`.
- Pantalla previa de selección de dificultad (`1: Easy 2: Medium 3: Hard`, `drawStartOverlay` del original), dibujada dentro del mismo `<canvas>` — el motor arranca en un estado `"start"` y no pasa a `"playing"` hasta que se presiona `1`/`2`/`3` (ver Decisions, revierte la decisión inicial de este spec).
- Sonido (`ball-bounce.mp3` al rebotar, `break-sound.mp3` al romper un bloque), copiado a `public/games/bloque-buster/sounds/` y reproducido con `Audio()` dentro del motor (ver Decisions, revierte la decisión inicial de este spec).

**Out of scope (para specs futuros):**

- Controles táctiles/móviles. El original solo soporta teclado.
- Recoloreo al tema neon del sitio. Se mantiene la paleta original del spritesheet.
- Distinción visual entre "ganar" (tablero limpio) y "perder" (0 vidas). Ambos casos convergen en el mismo `onGameOver(finalScore)` y el mismo modal genérico de fin de partida — ver Decisions.
- Niveles/tableros adicionales tras limpiar el tablero actual. El original no tiene ninguno (una sola grilla de 7×8 bloques).
- Adaptación jugable real de los 4 juegos mock restantes (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Supabase Auth, CLI/migraciones de Supabase, cliente admin/service-role.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Data model

No se introduce persistencia nueva: `bloque-buster` reutiliza la tabla `scores` ya genérica por `game` (sección 6 de `contract.md`) y ya tiene su fila en `games` desde el seed original del spec 06 — no hace falta tocar `supabase/schema.sql`. Tampoco se agregan tipos nuevos a `lib/games/types.ts`/`components/games/types.ts` (ya existen desde el spec 07).

```ts
// lib/games/arkanoid/sprites.ts (datos, portados de assets/assets/spritesheet.js)
export const SPRITES: {
  paddle: { sx: number; sy: number; sw: number; sh: number };
  ball: { sx: number; sy: number; sw: number; sh: number };
  blocks: Record<"red" | "yellow" | "green" | "cyan" | "magenta" | "hotpink" | "gray",
    { sx: number; sy: number; sw: number; sh: number }>;
};
export const EXPLOSION_FRAMES: Record<
  "red" | "yellow" | "green" | "cyan" | "magenta" | "hotpink" | "gray",
  { sx: number; sy: number; sw: number; sh: number }[]
>;
export const EXPLOSION_DURATION: number; // 150ms, tal cual el original
```

```ts
// lib/games/arkanoid/engine.ts
import type { GameCallbacks, GameEngine } from "@/lib/games/types";

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks, // usa onScoreChange, onLivesChange, onGameOver — hasLevel false, nunca llama onLevelChange
): GameEngine;
```

```ts
// components/games/registry.ts (una entrada nueva, el resto queda igual)
export const REAL_GAMES: Record<string, RealGameEntry> = {
  rocas: { Component: AsteroidsGame, capabilities: { hasLives: true, hasLevel: true } },
  caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } },
  "bloque-buster": { Component: ArkanoidGame, capabilities: { hasLives: true, hasLevel: false } },
};
```

Resolución lógica interna del canvas: **480×640** (idéntica al original: `CANVAS_WIDTH`/`CANVAS_HEIGHT` de `game.js`), escalada por el mismo CSS ya generalizado (`.game-arena canvas { width:100%; height:100%; }`) dentro de `.crt-screen` — ver Riesgos por la relación de aspecto. Paleta: la original del spritesheet (colores de bloque `red`/`yellow`/`green`/`cyan`/`magenta`/`hotpink`/`gray`), sin recolorear.

Sonido, portado tal cual de `SOUND_PATHS` en `game.js`:

```ts
// dentro de lib/games/arkanoid/engine.ts
const SOUND_PATHS = {
  bounce: "/games/bloque-buster/sounds/ball-bounce.mp3",
  break: "/games/bloque-buster/sounds/break-sound.mp3",
};
```

---

## Implementation plan

1. Copiar `reference/juegos/04/arkanoid/assets/assets/spritesheet-breakout.png` a `public/games/bloque-buster/spritesheet-breakout.png`, y `assets/assets/sounds/ball-bounce.mp3`/`break-sound.mp3` a `public/games/bloque-buster/sounds/` (nuevos archivos, la fuente no se toca). Verificación: los tres archivos existen en `public/` y son servibles con `npm run dev`.
2. Crear `lib/games/arkanoid/sprites.ts` con `SPRITES`/`EXPLOSION_FRAMES`/`EXPLOSION_DURATION` portados literalmente de `assets/assets/spritesheet.js` (solo los datos de coordenadas, sin las funciones de carga/dibujo). Verificación: compila (`npx tsc --noEmit`), sin usarse aún en ninguna pantalla.
3. Crear `lib/games/arkanoid/engine.ts` portando de `js/game.js`, dentro del closure de `createArkanoidEngine(canvas, callbacks)`:
   - Estado: `paddle`, `ball`, `bricks`, `explosions`, `score`, `lives`, `paused`, `state: "start" | "playing" | "gameover"` (a diferencia de Asteroids/Tetris, este motor sí conserva una pantalla de inicio — ver más abajo).
   - Carga de imagen: `new Image()` apuntando a `/games/bloque-buster/spritesheet-breakout.png`, arranca el loop de `requestAnimationFrame` en `onload` (igual que `loadSpritesheet(() => loop())` del original, pero sin estado ni callbacks a nivel de módulo).
   - `createBricks`, `checkPaddleCollision`, `checkBrickCollision` (con el cálculo de rebote por ángulo y el `minOverlapX`/`minOverlapY` para decidir eje de rebote), `updateExplosions`: preservados tal cual.
   - `playSound(name)`: porta `SOUND_PATHS`/`playSound` del original — crea un `new Audio(path)` y llama `.play().catch(() => {})` (mismo patrón que el original, ignora el rechazo si el navegador bloquea el autoplay). Se llama en rebote de pared/paddle (`"bounce"`) y al romper un bloque (`"break"`), igual que `game.js`.
   - Pantalla de inicio: el motor arranca en `state = "start"`; se dibuja `drawStartOverlay` (portado de `game.js`, mismo texto "Choose difficulty" / "1: Easy 2: Medium 3: Hard") sobre el tablero ya armado (bricks visibles, paddle/pelota en su posición inicial pero sin moverse). Un listener de teclado adicional, activo solo mientras `state === "start"`, mapea `1`/`2`/`3` a `DIFFICULTY_LEVELS.easy/medium/hard` (con los mismos `dx`/`dy` que el original), fija esa velocidad en la pelota y pasa `state = "playing"`. Ya no hay dificultad fija por defecto (revierte esa decisión inicial del spec).
   - `loseLife`: al llegar a 0 vidas, en vez de `state.screen = "gameover"`, pasa `state = "gameover"` y llama `callbacks.onGameOver(score)`.
   - `checkWinCondition` (tablero limpio): en vez de `state.screen = "win"`, también pasa `state = "gameover"` y llama `callbacks.onGameOver(score)` — mismo camino de salida que perder (ver Decisions).
   - Sin `drawHUD`, sin `drawEndOverlay` ("Game Over"/"You Win"), sin `handleInput`/`retryGame`/el listener de `click` del canvas (el reinicio sigue siendo exclusivamente `resetKey` desde React, incluso para volver a la pantalla de inicio).
   - `score`/`lives` se reportan vía `callbacks.onScoreChange`/`callbacks.onLivesChange` cada vez que cambian (al romper un bloque, al perder una vida); nunca se llama `onLevelChange` (`hasLevel` es `false`).
   - Listener de teclado de movimiento (`ArrowLeft`/`ArrowRight` para el paddle) activo en `window`, pero `updatePaddle` solo mueve el paddle mientras `!paused && state === "playing"` (en `"start"` el paddle no se mueve, igual que el original antes de elegir dificultad).
   - `setPaused(p)`: gatea `updateBall`/`updatePaddle`/`updateExplosions` (el loop de `requestAnimationFrame` sigue vivo para redibujar el último frame, igual que Asteroids/Tetris). Pausar durante `"start"` simplemente congela el overlay de selección.
   - `reset()`: reinicia `score=0`, `lives=3`, `bricks=createBricks()`, `explosions=[]`, `paddle`/`ball` a sus valores iniciales (sin velocidad de dificultad todavía), `state="start"`.
   - `destroy()`: cancela el `requestAnimationFrame` pendiente (o evita que arranque si la imagen aún no cargó) y remueve los listeners de teclado.
   Verificación: el archivo compila sin usarse aún en ninguna pantalla.
4. Crear `components/games/ArkanoidGame.tsx` (`"use client"`) con el mismo patrón que `AsteroidsGame.tsx`/`TetrisGame.tsx`: `<canvas width={480} height={640}>` por `ref`, `callbacksRef` actualizado sin dependencias, efecto `[resetKey]` que crea/destruye `createArkanoidEngine`, efecto `[paused]` que llama `setPaused`. Verificación: compila sin errores de tipos.
5. Registrar `"bloque-buster": { Component: ArkanoidGame, capabilities: { hasLives: true, hasLevel: false } }` en `components/games/registry.ts`. Verificación: `/games/bloque-buster/play` muestra el tablero de Arkanoid real (spritesheet cargado, bloques de colores, overlay "Choose difficulty") en vez de la arena decorativa; el HUD muestra "Vidas" y oculta "Nivel" (`hasLevel` false).
6. Verificación funcional completa: al entrar se ve el overlay de selección de dificultad y el paddle/pelota no se mueven hasta presionar `1`/`2`/`3`; una vez elegida, el paddle se mueve con ←/→; la pelota rebota en paredes/paddle/bloques con el ángulo de rebote original, reproduciendo el sonido de rebote; romper un bloque suma 10 puntos, dispara la animación de explosión y reproduce el sonido de rotura; PAUSA congela el último frame (paddle/pelota/explosiones dejan de moverse, incluso durante la pantalla de dificultad) y REANUDAR continúa sin reiniciar; perder la 3ª vida y limpiar todo el tablero abren, cada uno, únicamente el modal de fin de partida compartido (sin overlay propio de "Game Over"/"You Win" dibujado en el canvas ni reinicio por click/tecla); el botón FIN también abre ese modal con el puntaje acumulado; guardar la puntuación inserta una fila en `scores` con `game: "bloque-buster"`; "JUGAR DE NUEVO" reinicia partida completa vía `resetKey`, volviendo a la pantalla de selección de dificultad (score 0, 3 vidas, tablero completo); escribir en el input de iniciales del modal no mueve el paddle ni elige dificultad.
7. Confirmar que `reference/juegos/04/arkanoid/` no tiene ninguna modificación (`git status` limpio en ese path) y que `rocas`, `caida` y los 5 juegos decorativos restantes (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) no cambiaron visual ni funcionalmente.
8. Revisión final: `npm run lint` y `npm run build` sin errores.

---

## Acceptance criteria

- [ ] `lib/games/arkanoid/sprites.ts` exporta `SPRITES`/`EXPLOSION_FRAMES`/`EXPLOSION_DURATION` portados de `assets/assets/spritesheet.js`.
- [ ] `lib/games/arkanoid/engine.ts` exporta `createArkanoidEngine(canvas, callbacks): GameEngine` según el contrato, sin `document`/`window` fuera del closure de la factory.
- [ ] `public/games/bloque-buster/spritesheet-breakout.png` y `public/games/bloque-buster/sounds/{ball-bounce,break-sound}.mp3` existen y el motor los carga desde esa ruta (no desde `reference/juegos/04/arkanoid/`).
- [ ] `components/games/ArkanoidGame.tsx` monta y desmonta sin duplicar listeners de teclado ni dejar loops de `requestAnimationFrame` corriendo en paralelo al navegar dentro y fuera de `/games/bloque-buster/play` repetidamente.
- [ ] Al crear el motor (o tras "JUGAR DE NUEVO"), se ve el overlay de selección de dificultad y el juego no avanza hasta presionar `1`, `2` o `3`.
- [ ] Controles: ←/→ mueven el paddle; la pelota rebota en paredes, paddle (con ángulo según punto de impacto) y bloques, reproduciendo el sonido correspondiente (rebote / rotura de bloque).
- [ ] El HUD respeta las capacidades: muestra "Vidas" (`hasLives` true, 3 vidas iniciales), oculta "Nivel" (`hasLevel` false).
- [ ] El botón PAUSA congela el último frame (sin avanzar paddle/pelota/explosiones); REANUDAR continúa sin reiniciar.
- [ ] Tanto perder la 3ª vida como limpiar todo el tablero, como el botón FIN manual, abren únicamente el modal de fin de partida ya existente — sin overlay de "Game Over"/"You Win" dibujado en el canvas ni reinicio propio por tecla o click.
- [ ] Guardar la puntuación en el modal inserta una fila en la tabla `scores` de Supabase con `game: "bloque-buster"`.
- [ ] "JUGAR DE NUEVO" reinicia la partida completamente vía `resetKey` (score 0, 3 vidas, tablero completo de bloques).
- [ ] El canvas se ve completo y sin recortes tanto en una ventana ancha como en una angosta (puede verse estirado dado que 480×640 no es 4:3 — ver Riesgos).
- [ ] `rocas`, `caida` y los 5 juegos decorativos restantes no cambian visual ni funcionalmente (chequeo de regresión explícito).
- [ ] `reference/juegos/04/arkanoid/` no muestra diff en `git status` (queda de solo lectura).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** slot `bloque-buster` (`ARCADE`, `cover-bricks`) para este porte. Razón: decisión explícita del usuario; su descripción actual ("Rebota la pelota y destruye muros de neón") ya describe un Arkanoid/Breakout, encaje temático perfecto, y ningún otro juego real lo ocupa todavía — no hace falta fila nueva en `games` ni tocar `supabase/schema.sql`.
- **Sí:** fuente `reference/juegos/04/arkanoid/js/game.js`, confirmada (venía dada en el argumento del comando).
- **Sí:** `capabilities: { hasLives: true, hasLevel: false }`. Razón: leyendo el código real (no `contract.md`, que especulaba `hasLevel: true` por "progresión en partida"), `state` no tiene ningún campo de nivel — hay una sola grilla de 7×8 bloques y el juego termina en `"win"` al limpiarla, sin pasar a un tablero siguiente. `contract.md` sección 3 se corrige implícitamente con esta decisión para cualquier spec futuro que lo consulte.
- **Sí:** portar la pantalla de selección de dificultad `1/2/3` (`drawStartOverlay`) dibujada dentro del propio `<canvas>`, en vez de fijar `medium` por defecto. Razón: decisión explícita del usuario, pedida durante la implementación — revierte la decisión inicial de este spec (que seguía el precedente de Tetris/`contract.md` sección 3 de no agregar chrome de pre-partida). A diferencia del HUD/overlay de fin de partida (que si compite con el modal de React), una pantalla de inicio dibujada una sola vez, antes de que el motor entre en `"playing"`, no interfiere con ningún flujo del reproductor compartido.
- **Sí:** portar el sonido (`playSound`, `SOUND_PATHS`) tal cual el original, copiando los `.mp3` a `public/games/bloque-buster/sounds/`. Razón: decisión explícita del usuario, pedida durante la implementación — revierte la decisión inicial de este spec (que seguía el precedente de los specs 05/07, sin sonido). Es el primer juego real del reproductor con audio; no hay controles de mute/volumen en el HUD compartido, así que el sonido se reproduce siempre que el navegador lo permita (ver Riesgos).
- **Sí:** "ganar" (tablero limpio, `screen: "win"` del original) y "perder" (0 vidas, `screen: "gameover"`) convergen en el mismo `onGameOver(finalScore)` y el mismo modal genérico "FIN DEL JUEGO". Razón: `GameCallbacks`/el modal compartido no distinguen victoria de derrota (ni Asteroids ni Tetris tienen ese concepto); agregar esa distinción sería chrome nuevo no pedido.
- **Sí:** copiar `spritesheet-breakout.png` a `public/games/bloque-buster/` y portar el mapa de coordenadas a `lib/games/arkanoid/sprites.ts`, en vez de recrear el arte vectorialmente. Razón: a diferencia de Asteroids/Tetris (dibujo vectorial puro), este juego depende enteramente del spritesheet para render (paddle/pelota/bloques/explosiones) — no hay fallback vectorial en `game.js` del que partir; copiarlo a `public/` es la única forma de servirlo sin modificar `reference/juegos/04/arkanoid/` (que queda de solo lectura).
- **No:** portar niveles/tableros adicionales tras limpiar el actual. Razón: el original no tiene ninguno; con un solo tablero, `hasLevel: false` es consistente con el propio código fuente.
- **No:** tocar `reference/juegos/04/arkanoid/`. Razón: es material de referencia de solo lectura; toda la adaptación vive en archivos nuevos bajo `lib/games/arkanoid/`, `components/games/` y `public/games/bloque-buster/`.
- **No:** tocar `supabase/schema.sql`. Razón: `bloque-buster` ya tiene fila sembrada en `games` desde el spec 06; la tabla `scores` ya es genérica por `game` (sección 6 de `contract.md`).
- **Sí:** se porta el código real de `game.js` (377 líneas, juego completo), no lo que dice `reference/juegos/04/arkanoid/CLAUDE.md` ("no hay código todavía"). Razón: inconsistencia de documentación ya detectada al leer el archivo; el código fuente es la única fuente de verdad (mismo criterio que ya aplicaron los specs 05 y 07).

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El canvas lógico es 480×640 (relación 3:4, portrait), mientras `.crt-screen` fuerza `aspect-ratio: 4/3` y `.game-arena canvas` lo estira a `width:100%; height:100%` | Mismo riesgo ya aceptado en el spec 07 para el canvas 450×600 de Tetris; se reutiliza el mismo mecanismo ya generalizado sin CSS nuevo. Verificación visual en ventana ancha y angosta (criterio de aceptación) |
| Cargar la imagen del spritesheet es asíncrono (`Image.onload`); si el motor arrancara su loop antes de que cargue, `drawSprite` no dibujaría nada hasta que termine | El loop de `requestAnimationFrame` arranca recién en el callback `onload` (igual que `loadSpritesheet(() => loop())` del original); `destroy()` antes de que cargue debe evitar que el loop arranque igual, no solo cancelar un `rafId` inexistente |
| Es el primer juego real del reproductor que necesita un asset estático fuera de `lib/`/`components/` (`public/games/bloque-buster/spritesheet-breakout.png`, `sounds/*.mp3`) | No hay convención previa de `public/games/<slug>/`; este spec la establece de forma explícita para que specs futuros con assets de imagen/audio la reutilicen en vez de improvisar una ruta distinta |
| Es el primer juego real del reproductor con sonido; algunos navegadores bloquean `Audio.play()` si no hubo interacción previa del usuario en la página, y no hay control de mute/volumen en el HUD compartido | Mismo patrón que el original: `playSound` ignora el `Promise` rechazado (`.catch(() => {})`), así que un bloqueo de autoplay no rompe el juego, solo se pierde ese sonido puntual; presionar `1`/`2`/`3` para elegir dificultad ya cuenta como interacción del usuario antes de que se reproduzca cualquier sonido |

---

## What is **not** in this spec

- Controles táctiles/móviles.
- Recoloreo al tema neon del sitio.
- Distinción visual entre ganar y perder.
- Niveles/tableros adicionales tras el actual.
- Adaptación jugable real de `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`.
- Supabase Auth, CLI/migraciones de Supabase, cliente admin/service-role.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.
