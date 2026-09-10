# Contrato compartido para juegos reales

Este archivo es la referencia que consulta el skill `integrar-juego` al escribir la sección
**Data model** y el esqueleto de **Implementation plan**/**Acceptance criteria** de cada spec
que genera. **No se copia literal en cada spec** — es la forma que el spec debe respetar,
adaptando nombres (`<slug>`, `<PascalName>`) al juego concreto. Mantenerlo actualizado es lo
que evita que el contrato derive entre specs sucesivos.

Está basado en el patrón ya implementado y verificado para Asteroids (`rocas`, spec 05) y en
cómo debe generalizarse la primera vez que se porta un segundo juego real.

---

## 1. Contrato del motor (`lib/games/<slug>/engine.ts`)

Cada motor es una factory que recibe el `<canvas>` real y devuelve un controlador — nunca
estado a nivel de módulo, para poder crearse/destruirse varias veces sin duplicar listeners
al montar/desmontar el componente React (SPA).

```ts
// lib/games/types.ts (ya existe una vez se hace el refactor de la sección 4;
// hasta entonces, cada motor define su propio alias local equivalente, como hoy
// hace lib/games/asteroids/engine.ts con AsteroidsCallbacks/AsteroidsEngine)
export type GameCallbacks = {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onLivesChange?: (lives: number) => void; // opcional: no todos los juegos tienen vidas (p. ej. Tetris)
  onLevelChange?: (level: number) => void; // opcional: no todos tienen progresión por nivel
};

export type GameEngine = {
  setPaused(paused: boolean): void; // congela update() mientras paused===true; el último frame se sigue dibujando
  reset(): void;                    // reinicia la partida desde cero (equivalente a un initGame() interno)
  destroy(): void;                  // cancela el loop de animación y remueve listeners de teclado
};

export function createXEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin?: Skin, // "clasico" (default) | "neon" | "retro" — lib/games/types.ts; el default deja el render idéntico al de antes del sistema de skins
): GameEngine;
```

Reglas del motor (verificadas en `lib/games/asteroids/engine.ts`, se preservan igual para
cualquier juego nuevo):

- Sin `document.getElementById`/listeners de `window` a nivel de módulo — todo vive dentro
  del closure de `createXEngine`.
- Sin HUD propio dibujado en el canvas (score/vidas/nivel) — se reporta solo vía callbacks.
- Sin overlay propio de "game over" ni reinicio por tecla — el fin de partida se notifica
  hacia afuera con `onGameOver(finalScore)`; el reinicio lo controla React vía `resetKey`
  (ver sección 2), no una tecla capturada dentro del motor.
- El listener de teclado del juego solo debe actuar mientras el estado interno equivalente a
  `"playing"` esté activo — nunca mientras está pausado, en game over, o en cualquier estado
  de espera intermedio (p. ej. respawn) — para no interferir con inputs de la UI de React
  (como el input de iniciales del modal de fin de partida).
- Resolución lógica interna fija (ancho×alto propios del juego original); el escalado visual
  se resuelve por CSS (sección 5), no cambiando la resolución interna.
- El skin por defecto (`clasico`) preserva la paleta original del motor byte por byte; `neon`
  y `retro` son skins opcionales que el motor expone vía el 3er parámetro `skin: Skin`
  (`lib/games/types.ts`). El default deja el render idéntico al de antes del sistema de skins.

## 2. Contrato del wrapper de React (`components/games/<PascalName>Game.tsx`)

```ts
// components/games/types.ts (idem: existe tras el refactor de la sección 4)
export type RealGameProps = GameCallbacks & {
  paused: boolean;
  resetKey: number; // cambiar este valor fuerza destroy()+create() del motor (usado por "JUGAR DE NUEVO")
  skin: Skin;       // skin activa (lib/games/types.ts); cambiarla también fuerza destroy()+create() y se pasa como 3er arg a createXEngine
};
```

Patrón de implementación (idéntico al ya usado por `components/games/AsteroidsGame.tsx`):

- `"use client"`, monta `<canvas ref width={W} height={H} />` con la resolución lógica fija
  del motor.
- `callbacksRef`: los callbacks más recientes se guardan en un ref, actualizado en cada
  render vía un efecto sin dependencias — así el efecto que crea el motor no necesita los
  callbacks en su lista de dependencias y no recrea el motor en cada render del padre.
- Efecto principal con `[resetKey, skin]` como dependencias: crea el motor con
  `createXEngine(canvas, { ...forward a callbacksRef.current }, skin)`, lo guarda en un ref, y
  en el cleanup llama a `engine.destroy()`. Cambiar `resetKey` **o** `skin` destruye y recrea
  el motor entero (reset completo, no se usa `engine.reset()` desde aquí).
- Efecto separado con `[paused]` como dependencia: llama a `engineRef.current?.setPaused(paused)`.

## 3. Capacidades declaradas por juego

```ts
export type GameCapabilities = { hasLives: boolean; hasLevel: boolean };
```

No todos los juegos reales tienen los mismos conceptos. El motor simplemente no llama el
callback opcional que no le aplica (`onLivesChange`/`onLevelChange` son opcionales en
`GameCallbacks`, sección 1); `GamePlayerClient.tsx` usa `capabilities` para decidir qué
estadística del HUD mostrar, no para decidir si el callback existe.

Ejemplos ya identificados en `reference/juegos/`:

- **Asteroids (`rocas`, ya portado):** `{ hasLives: true, hasLevel: true }`.
- **Tetris (`reference/juegos/03/claude-tetris`):** `{ hasLives: false, hasLevel: true }` — no
  hay vidas (un solo game-over al apilarse el tablero), sí hay nivel (sube cada 10 líneas).
- **Arkanoid (`reference/juegos/04/arkanoid`):** `{ hasLives: true, hasLevel: true }` — tiene
  vidas y una progresión en partida (bloques destruidos), pero también tiene una pantalla de
  selección de dificultad previa a empezar que **no** encaja en `RealGameProps` ni en el
  chrome actual del reproductor — si se necesita, es un spec futuro aparte (ver Reglas en
  `SKILL.md`), no algo que este contrato deba forzar a inventar.

Un juego sin ninguno de los dos (p. ej. un endless runner solo por puntaje) declara
`{ hasLives: false, hasLevel: false }` — el HUD muestra solo Jugador/Puntuación.

## 4. Registro de juegos reales (`components/games/registry.ts`)

Hoy `components/games/GamePlayerClient.tsx` decide juego real vs. arena decorativa con un
único booleano hardcodeado: `const isAsteroids = game.id === "rocas"`. Esto no escala a un
segundo juego real. **La primera vez que un spec generado por este skill porte un segundo
juego real**, su plan de implementación debe incluir este refactor, una sola vez:

```ts
// components/games/registry.ts
import type { ComponentType } from "react";
import type { RealGameProps, GameCapabilities } from "@/components/games/types";
import AsteroidsGame from "@/components/games/AsteroidsGame";

type RealGameEntry = {
  Component: ComponentType<RealGameProps>;
  capabilities: GameCapabilities;
};

export const REAL_GAMES: Record<string, RealGameEntry> = {
  rocas: { Component: AsteroidsGame, capabilities: { hasLives: true, hasLevel: true } },
  // cada porte nuevo agrega una entrada aquí — nada más cambia en GamePlayerClient.tsx
};
```

Cambios que conlleva ese refactor único (a incluir como pasos explícitos del `Implementation
plan` del spec que lo dispare):

1. Crear `lib/games/types.ts` y `components/games/types.ts` con los tipos de las secciones 1-3.
2. Crear `components/games/registry.ts` con la entrada inicial de `rocas` apuntando a
   `AsteroidsGame`.
3. Migrar `lib/games/asteroids/engine.ts` para usar `GameCallbacks`/`GameEngine` en vez de sus
   alias locales `AsteroidsCallbacks`/`AsteroidsEngine` (o mantenerlos como
   `export type { GameCallbacks as AsteroidsCallbacks }` si se prefiere no tocar el archivo —
   decisión del spec concreto).
4. Migrar `components/games/AsteroidsGame.tsx` para usar `RealGameProps` en vez de su tipo
   local `AsteroidsGameProps`, con `onLivesChange`/`onLevelChange` invocados con `?.` por ser
   ahora opcionales.
5. En `GamePlayerClient.tsx`: reemplazar `const isAsteroids = game.id === "rocas"` por
   `const realGame = REAL_GAMES[game.id]`; la fórmula de nivel decorativo, el early-return del
   `setInterval` simulado, y el branch de la arena pasan a comprobar `realGame` (truthy) en vez
   de `isAsteroids`; los `hud-stat` de Vidas y Nivel se condicionan a
   `!realGame || realGame.capabilities.hasLives` / `...hasLevel` respectivamente (para que las
   arenas decorativas, que hoy siempre muestran ambas, sigan mostrándolas igual que antes).
6. Añadir el nuevo motor/wrapper del juego que se está portando y su entrada en `REAL_GAMES`.

Los portes **posteriores** a este refactor (el tercer juego real en adelante) ya no tocan
`GamePlayerClient.tsx` ni los archivos de tipos — son estrictamente: un archivo de motor, un
wrapper, y una entrada nueva en `REAL_GAMES`.

## 5. Escalado del canvas (CSS)

El motor mantiene su resolución lógica interna fija; el escalado visual es puro CSS, dentro de
`.crt-screen` (que ya mantiene proporción 4:3). Hoy existe una regla puntual para Asteroids:

```css
.asteroids-arena canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

En el mismo refactor único de la sección 4, generalizar el selector a `.game-arena canvas`
(las arenas decorativas nunca contienen un `<canvas>`, así que ampliar el selector es seguro)
y quitar la clase `asteroids-arena` del JSX de `GamePlayerClient.tsx`. Con eso, los portes
futuros no necesitan agregar CSS nuevo — cualquier `<canvas>` dentro de `.game-arena` escala
automáticamente.

## 6. Catálogo y leaderboard (Supabase) — no requiere cambios de esquema por juego

La tabla `scores` (`supabase/schema.sql`) ya es genérica por `game` (FK a `games.id`): un
juego nuevo obtiene leaderboard funcional (`getScoresForGame`, `getBestScores`, `saveScore`)
en cuanto tiene una fila en `games`. El único trabajo posible por juego es:

- Si el juego encaja temáticamente en uno de los slots decorativos restantes de `games`
  (siempre y cuando ese slot no tenga ya una entrada en `REAL_GAMES`): **no hace falta tocar
  `supabase/schema.sql`**, el spec solo agrega la entrada de motor/wrapper/registro.
- Si no encaja en ningún slot existente: el spec agrega una fila nueva al bloque
  `insert into games (...) values (...) on conflict (id) do nothing;` de
  `supabase/schema.sql`, preservando `on conflict do nothing`, y el paso final del
  `Implementation plan` le indica al usuario correr ese SQL actualizado a mano en el SQL
  Editor del dashboard de Supabase (nunca CLI, nunca cliente admin/service-role — mismo
  enfoque manual que spec 06).

## 7. Ejemplo de referencia ya implementado

`lib/games/asteroids/engine.ts` + `components/games/AsteroidsGame.tsx` + el branch de
`rocas` en `components/games/GamePlayerClient.tsx` son el ejemplo trabajado y verificado de
todo este contrato. Ante cualquier ambigüedad al escribir un spec nuevo, ese es el código a
leer como referencia concreta antes de improvisar una variante distinta.

## 8. Checklist de Acceptance criteria (plantilla)

Todo spec que este skill genera debe incluir, adaptados al juego concreto, al menos estos
criterios verificables:

- [ ] `lib/games/<slug>/engine.ts` exporta `create<X>Engine(canvas, callbacks): GameEngine`
      según el contrato de la sección 1, sin `document`/`window` fuera del closure de la
      factory.
- [ ] `components/games/<PascalName>Game.tsx` monta y desmonta sin duplicar listeners de
      teclado ni dejar loops de `requestAnimationFrame` corriendo en paralelo al navegar
      dentro y fuera de `/games/<id>/play` repetidamente.
- [ ] Los controles funcionan según lo especificado para este juego.
- [ ] El HUD respeta las capacidades declaradas: oculta "Vidas"/"Nivel" cuando
      `hasLives`/`hasLevel` es `false`; cuando `hasLevel` es `true`, usa el valor real
      reportado por el motor, nunca la fórmula decorativa `1 + score/2500`.
- [ ] El botón PAUSA congela el último frame (sin avanzar `update()`); REANUDAR continúa sin
      reiniciar la partida.
- [ ] Tanto perder (condición de fin propia del juego) como el botón FIN manual abren
      únicamente el modal de fin de partida ya existente — sin overlay de game over dibujado
      en el canvas ni reinicio propio por tecla.
- [ ] Guardar la puntuación en el modal inserta una fila en la tabla `scores` de Supabase con
      el `game` correcto.
- [ ] "JUGAR DE NUEVO" reinicia la partida completamente vía `resetKey` (score/vidas/nivel
      iniciales correctos).
- [ ] El canvas se ve completo y sin deformarse tanto en una ventana ancha como en una angosta.
- [ ] Los demás juegos (decorativos y, si ya existen, otros reales) no cambian visual ni
      funcionalmente — chequeo de regresión explícito, sobre todo en el spec que dispara el
      refactor único de la sección 4.
- [ ] Si el juego fue portado desde una fuente externa: esa carpeta fuente no muestra diff en
      `git status` (queda de solo lectura).
- [ ] Si se agregó una fila nueva a `games`: el seed de `supabase/schema.sql` queda
      actualizado con `on conflict (id) do nothing` preservado, y el spec le indica al usuario
      correrlo a mano en el dashboard.
- [ ] `npm run lint` y `npm run build` terminan sin errores.
