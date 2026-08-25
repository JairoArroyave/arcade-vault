# SPEC 09 — Juego real de Snake en el reproductor

> **Status:** Implemented  
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-08-24
> **Objective:** Reemplazar la arena decorativa del reproductor simulado en `/games/serpentina/play` por un juego real de Snake diseñado desde cero (sin código fuente de partida, usando los sprites de fruta de `reference/snake-assets/`), integrado al HUD/pausa/modal ya existentes y al leaderboard real de Supabase.

---

## Por qué existe este spec

`serpentina` (`cat. ARCADE`, "Crece sin morder tu propia cola") ya está pensado temáticamente
como Snake desde el spec 01/06, y no tiene todavía una entrada en `REAL_GAMES`
(`components/games/registry.ts`), que hoy solo cubre `rocas`, `caida` y `bloque-buster`.

A diferencia de los tres juegos reales ya portados, **no hay código fuente de Snake en
`reference/juegos/`** — el usuario solo aportó una hoja de sprites de frutas
(`reference/snake-assets/fruits.png` + `sprites.js` con las coordenadas de recorte de 22
frutas). Por lo tanto este spec no es un port: es el diseño de un juego nuevo, con esos
sprites como único material de apoyo visual. Todas las reglas de gameplay (velocidad,
puntaje, umbral de subida de nivel, comportamiento en el borde) son decisiones de diseño
tomadas explícitamente en este spec (ver Decisions), no extraídas de ningún `game.js`.

El refactor único de la sección 4 de `contract.md` (`registry.ts` + tipos compartidos) ya
ocurrió en el spec 07 (Tetris) y sigue vigente para Arkanoid (spec 08); este spec es el cuarto
juego real y por lo tanto **no** lo repite — solo agrega motor, wrapper y una entrada nueva en
`REAL_GAMES`.

---

## Scope

**In:**

- `lib/games/serpentina/sprites.ts`: atlas de coordenadas de las 22 frutas, portado desde
  `reference/snake-assets/sprites.js` (mismos `x`/`y`/`w`/`h`), como constante tipada — sin
  depender de `window.SPRITE_ATLAS`.
- `public/games/serpentina/fruits.png`: copia estática del spritesheet de frutas, para que el
  motor pueda cargarlo con `new Image()` desde el navegador (mismo patrón que
  `public/games/bloque-buster/spritesheet-breakout.png`).
- `lib/games/serpentina/engine.ts`: motor nuevo, `createSerpentinaEngine(canvas, callbacks)` —
  sin `document`/`window` a nivel de módulo, sin HUD propio, sin overlay de game over, sin
  reinicio propio, con `paused` real y listener de teclado gateado por el estado interno
  `"playing"`.
- `components/games/SerpentinaGame.tsx` (`"use client"`), siguiendo el mismo patrón que
  `AsteroidsGame.tsx`/`TetrisGame.tsx`.
- Entrada nueva en `REAL_GAMES`: `serpentina: { Component: SerpentinaGame, capabilities: { hasLives: false, hasLevel: true } }`.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles. Solo teclado.
- Recoloreo al tema neon del sitio. Paleta retro propia (verde fósforo), ver Decisions.
- Wrap-around en los bordes. Chocar con cualquier borde termina la partida.
- Selección de fruta específica o power-ups — solo crecimiento + puntaje fijo por fruta.
- Pantalla de inicio propia, menú de pausa propio, leaderboard local — reemplazados por el
  HUD/pausa/modal/leaderboard real ya compartidos.
- Supabase Auth, CLI/migraciones de Supabase, cliente admin/service-role.
- Adaptación jugable real de los demás juegos mock que sigan pendientes (`gloton`,
  `invasores`, `ranaria`, `duelo-pixel`).
- Sonido/música.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Data model

No se introduce persistencia nueva: `serpentina` reutiliza la tabla `scores` ya genérica por
`game` (sección 6 de `contract.md`), sin cambios de esquema — la fila `serpentina` ya existe
en el seed de `games`.

```ts
// lib/games/types.ts (ya existe, sin cambios)
export type GameCallbacks = {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onLivesChange?: (lives: number) => void; // no se usa: hasLives false
  onLevelChange?: (level: number) => void;
};

export type GameEngine = {
  setPaused(paused: boolean): void;
  reset(): void;
  destroy(): void;
};
```

```ts
// components/games/registry.ts (una entrada nueva, el resto sin cambios)
export const REAL_GAMES: Record<string, RealGameEntry> = {
  rocas: { Component: AsteroidsGame, capabilities: { hasLives: true, hasLevel: true } },
  caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } },
  "bloque-buster": { Component: ArkanoidGame, capabilities: { hasLives: true, hasLevel: false } },
  serpentina: { Component: SerpentinaGame, capabilities: { hasLives: false, hasLevel: true } },
};
```

```ts
// lib/games/serpentina/sprites.ts
export const FRUIT_SHEET_SRC = "/games/serpentina/fruits.png";

export const FRUIT_SPRITES: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  // ... las 22 frutas de reference/snake-assets/sprites.js, mismas coordenadas
};
```

```ts
// lib/games/serpentina/engine.ts — constantes propias del motor
const COLS = 20;
const ROWS = 15;
const CELL = 30; // canvas lógico: 600×450
const TICK_MS_BASE = 150; // duración de un paso de la serpiente en nivel 1
const TICK_MS_MIN = 60; // piso de velocidad máxima
const TICK_MS_STEP = 12; // reducción del tick por cada nivel
const FRUITS_PER_LEVEL = 5; // frutas comidas para subir un nivel
const POINTS_PER_FRUIT = 10;
```

Resolución lógica interna del canvas: **600×450** (grilla 20×15 celdas de 30px). Paleta: verde
fósforo propio (`#33ff33` cuerpo, `#aaffaa` cabeza) sobre fondo negro (`#050505`), sin usar las
variables de color del tema neon del sitio; las frutas se dibujan con su sprite a color real,
único elemento no monocromático del tablero.

---

## Implementation plan

1. Copiar `reference/snake-assets/fruits.png` a `public/games/serpentina/fruits.png`. No se
   modifica `reference/snake-assets/` (queda de solo lectura). Verificación: el archivo existe
   en `public/`, `git status` no muestra cambios en `reference/snake-assets/`.
2. Crear `lib/games/serpentina/sprites.ts` con `FRUIT_SHEET_SRC` y las 22 entradas de
   `FRUIT_SPRITES`, portadas de `reference/snake-assets/sprites.js`. Verificación: compila, sin
   usarse aún en ningún archivo.
3. Crear `lib/games/serpentina/engine.ts` con el esqueleto de `createSerpentinaEngine(canvas, callbacks): GameEngine` (`setPaused`/`reset`/`destroy` mínimos) y la carga asíncrona de
   `fruits.png` vía `new Image()`. Verificación: compila.
4. Implementar el estado del juego dentro del closure de la factory: grilla `COLS×ROWS`,
   serpiente inicial de 3 segmentos centrada en el tablero moviendo a la derecha, spawn de la
   primera fruta (posición aleatoria libre + sprite aleatorio entre las 22 de `FRUIT_SPRITES`).
   Verificación: compila, aún no dibuja ni actualiza.
5. Implementar el loop de actualización (acumulador de tiempo sobre `requestAnimationFrame`,
   avanzando la serpiente cada `TICK_MS_BASE - (level-1)*TICK_MS_STEP` ms, con piso
   `TICK_MS_MIN`): detecta colisión con el borde del tablero o con la propia cola (ambas
   terminan la partida vía `onGameOver(finalScore)`, sin overlay propio) y colisión con la
   fruta (crece un segmento, suma `POINTS_PER_FRUIT` vía `onScoreChange`, re-spawnea fruta en
   posición libre con sprite aleatorio, sube de nivel cada `FRUITS_PER_LEVEL` frutas comidas
   vía `onLevelChange`). Verificación manual: los cambios de score/nivel se reflejan
   correctamente antes de tener aún render visual.
6. Implementar el dibujo: fondo `#050505`, cuerpo de la serpiente en verde fósforo (cabeza más
   clara que el resto), fruta dibujada con `drawImage` recortando el sprite del atlas y
   escalándolo dentro de la celda de 30px. Verificación visual manual en `/games/serpentina/play`.
7. Implementar el listener de teclado: flechas y WASD equivalentes, ignorando cualquier intento
   de giro de 180° instantáneo (dirección opuesta a la actual), activo solo mientras el estado
   interno equivalente a `"playing"` está activo (no en pausa/game over). Verificación: los
   controles no responden mientras el juego está pausado o terminado.
8. Crear `components/games/SerpentinaGame.tsx` (`"use client"`) con el mismo patrón que
   `AsteroidsGame.tsx`: `<canvas ref width={600} height={450}>`, `callbacksRef` actualizado sin
   dependencias, efecto `[resetKey]` que crea/destruye `createSerpentinaEngine`, efecto
   `[paused]` que llama `setPaused`. Verificación: compila sin errores de tipos.
9. Registrar `serpentina: { Component: SerpentinaGame, capabilities: { hasLives: false, hasLevel: true } }` en `components/games/registry.ts`. Verificación:
   `/games/serpentina/play` muestra el tablero real de Snake en vez de la arena decorativa; el
   HUD oculta "Vidas" (`hasLives` false) y muestra el "Nivel" real reportado por el motor.
10. Verificación funcional completa: PAUSA congela el último frame (sin avanzar la serpiente);
    REANUDAR continúa sin reiniciar; chocar con el borde o con la propia cola dispara
    `onGameOver` y abre únicamente el modal de fin de partida compartido; el botón FIN también
    abre ese modal con el puntaje acumulado; guardar la puntuación inserta una fila en `scores`
    con `game: "serpentina"`; "JUGAR DE NUEVO" reinicia serpiente/score/nivel iniciales vía
    `resetKey`; escribir en el input de iniciales del modal no mueve la serpiente.
11. Confirmar que `reference/snake-assets/` no tiene ninguna modificación (`git status` limpio
    en ese path) y que `rocas`, `caida`, `bloque-buster` y los juegos decorativos restantes no
    cambian visual ni funcionalmente.
12. Revisión final: `npm run lint` y `npm run build` sin errores.

---

## Acceptance criteria

- [ ] `lib/games/serpentina/engine.ts` exporta `createSerpentinaEngine(canvas, callbacks): GameEngine` según el contrato, sin `document`/`window` fuera del closure de la factory.
- [ ] `components/games/SerpentinaGame.tsx` monta y desmonta sin duplicar listeners de teclado
      ni dejar loops de `requestAnimationFrame` corriendo en paralelo al navegar dentro y fuera
      de `/games/serpentina/play` repetidamente.
- [ ] Controles: flechas y WASD mueven la serpiente en las 4 direcciones; un giro de 180°
      instantáneo (dirección opuesta a la actual) se ignora.
- [ ] Chocar con cualquier borde del tablero termina la partida.
- [ ] Chocar con la propia cola termina la partida.
- [ ] Comer una fruta suma `10` puntos, hace crecer la serpiente un segmento y hace aparecer
      una nueva fruta con sprite aleatorio entre las 22 de `FRUIT_SPRITES`, en una celda libre.
- [ ] El nivel sube cada 5 frutas comidas y la velocidad de la serpiente aumenta en
      consecuencia (hasta el piso `TICK_MS_MIN`).
- [ ] El HUD respeta las capacidades declaradas: oculta "Vidas" (`hasLives` false), muestra
      "Nivel" con el valor real reportado por el motor, nunca la fórmula decorativa
      `1 + score/2500`.
- [ ] El botón PAUSA congela el último frame (sin avanzar la serpiente); REANUDAR continúa sin
      reiniciar la partida.
- [ ] Tanto perder (choque con borde o cola) como el botón FIN manual abren únicamente el modal
      de fin de partida ya existente — sin overlay de game over dibujado en el canvas ni
      reinicio propio por tecla.
- [ ] Guardar la puntuación en el modal inserta una fila en la tabla `scores` de Supabase con
      `game: "serpentina"`.
- [ ] "JUGAR DE NUEVO" reinicia la partida completamente vía `resetKey` (serpiente de 3
      segmentos, score 0, nivel 1).
- [ ] El canvas se ve completo y sin deformarse tanto en una ventana ancha como en una angosta.
- [ ] `rocas`, `caida`, `bloque-buster` y los juegos decorativos restantes no cambian visual ni
      funcionalmente (chequeo de regresión explícito).
- [ ] `reference/snake-assets/` no muestra diff en `git status` (queda de solo lectura).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** slot `serpentina` (`ARCADE`, `cover-snake`, `green`). Razón: ya está temáticamente
  diseñado como Snake desde el spec 01/06 y todavía no tiene entrada en `REAL_GAMES`; no hace
  falta fila nueva en `games`.
- **Sí:** sin fuente de código — juego nuevo diseñado desde una descripción, usando únicamente
  los sprites de fruta de `reference/snake-assets/` como material de apoyo visual. Razón:
  confirmado explícitamente por el usuario, no hay ningún `game.js` de Snake en
  `reference/juegos/`.
- **Sí:** `capabilities: { hasLives: false, hasLevel: true }`. Razón: Snake clásico no tiene
  vidas (un solo choque termina la partida, igual que Tetris); sí tiene progresión de
  velocidad/nivel conforme la serpiente come.
- **Sí:** paleta retro propia en verde fósforo, con las frutas mostrando su color real vía
  sprite. Razón: no hay paleta original de la cual partir (a diferencia de los 3 juegos
  portados); el verde fósforo es la estética reconocible de Snake, y el contrato prohíbe
  recolorear al tema neon del sitio.
- **Sí:** muere al tocar el borde (sin wrap-around). Razón: comportamiento clásico más simple y
  consistente con "un solo choque termina la partida" (`hasLives: false`); wrap-around queda
  fuera de alcance para una futura variante si se pide.
- **Sí:** fruta aleatoria entre las 22 disponibles en cada aparición, sin progresión ni fruta
  fija. Razón: aprovecha todo el atlas de `fruits.png` sin agregar lógica de rotación
  innecesaria para el gameplay.
- **Sí:** grilla 20×15 celdas de 30px → canvas lógico 600×450. Razón: celdas holgadas para que
  los sprites de fruta (hasta 170px de ancho en la hoja original) se vean nítidos al
  reescalarse dentro de cada celda.
- **Sí:** controles flechas + WASD simultáneos, ignorando reversa de 180°. Razón: esquema común
  en juegos de navegador; evita que una doble pulsación mate la serpiente por accidente contra
  su propio segundo segmento.
- **No:** repetir el refactor único de la sección 4 de `contract.md`. Razón: ya ocurrió en el
  spec 07 (Tetris) y `registry.ts`/`components/games/types.ts`/`lib/games/types.ts` ya existen
  y cubren `rocas`, `caida` y `bloque-buster`; este spec solo agrega motor, wrapper y una
  entrada nueva.
- **No:** tocar `reference/snake-assets/`. Razón: material de solo lectura; el spritesheet se
  copia a `public/games/serpentina/` y las coordenadas se portan a un archivo TS nuevo bajo
  `lib/games/serpentina/`.
- **No:** controles táctiles/móviles, recoloreo al tema neon, Supabase Auth, CLI/migraciones de
  Supabase. Razón: mismas decisiones heredadas de los specs 05/06/07/08.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Las coordenadas de `reference/snake-assets/sprites.js` fueron "detectadas por análisis de píxeles" según su propio comentario — algún recorte podría no ser exacto | Verificación visual manual del render de cada fruta al probar el juego (paso 6/10 del plan); un desajuste menor de recorte no bloquea el gameplay |
| Al no haber código fuente, todos los valores de balance (velocidad base, paso por nivel, puntos por fruta, frutas por nivel) son decisiones de diseño de este spec, no un port verificado | Quedan fijados explícitamente en Data model y Decisions para que la implementación no improvise valores distintos a los documentados aquí |

---

## What is **not** in this spec

- Controles táctiles/móviles.
- Recoloreo al tema neon del sitio.
- Wrap-around en los bordes.
- Power-ups o frutas con efectos especiales.
- Pantalla de inicio propia, menú de pausa propio, leaderboard local.
- Supabase Auth, CLI/migraciones de Supabase, cliente admin/service-role.
- Adaptación jugable real de los demás juegos mock pendientes.
- Sonido/música.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.
