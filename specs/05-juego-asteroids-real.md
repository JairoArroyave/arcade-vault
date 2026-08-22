# SPEC 05 — Juego real de Asteroids en el reproductor

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-08-22
> **Objective:** Reemplazar la arena decorativa del reproductor simulado en `/games/rocas/play` por el juego real de Asteroids (adaptado de `reference/juegos/02/claude-asteroids-main/claude-asteroids-main/game.js`), integrado con el HUD, pausa y modal de fin de partida ya existentes, sin tocar los otros 7 juegos ni el archivo de referencia original.

---

## Por qué existe este spec

El spec 01 implementó el "Reproductor" (`/games/[id]/play`) como una simulación genérica para las 8 pantallas de juego: el puntaje sube solo con un `setInterval`, la "arena" es puro CSS decorativo, y no hay ningún juego jugable de verdad. Uno de esos 8 mocks, `rocas` (`lib/games.ts`, cat. `SHOOTER`, "Pulveriza asteroides en gravedad cero"), coincide exactamente con un juego de Asteroids ya construido y funcional que vive en `reference/juegos/02/claude-asteroids-main/claude-asteroids-main/` (canvas HTML5 + JS vanilla, sin framework, ver su propio `CLAUDE.md`).

Este spec porta ese juego real a Next.js y lo conecta como el reproductor de `rocas`, mantiniendo intacto el resto del MVP (nav, HUD compartido, botones PAUSA/FIN/SALIR, modal de fin de partida con guardado de puntuación) y sin modificar el archivo de referencia original, que queda como fuente de solo lectura.

---

## Scope

**In:**

- Adaptar la lógica de `game.js` (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, colisiones, `wrap` toroidal, spawn de asteroides, niveles) a un motor desacoplado del DOM global, en `lib/games/asteroids/engine.ts`:
  - En vez de `document.getElementById("canvas")` y listeners en `window` a nivel de módulo, expone una función/clase que recibe el `<canvas>` real por parámetro y se puede crear/destruir varias veces (soporta montar y desmontar el componente React sin duplicar listeners).
  - Elimina el dibujado de HUD propio en canvas (`drawHUD`: SCORE, NIVEL, iconos de vida) — ese dato se expone hacia afuera vía callbacks, no se dibuja dentro del canvas.
  - Elimina el overlay interno de "GAME OVER" y el reinicio presionando Espacio (`drawOverlay`, la rama `state === "gameover"` en `update()`/`draw()` que espera Espacio) — el fin de partida se notifica hacia afuera vía callback, sin dibujarse ni reiniciarse solo.
  - Agrega un estado `paused` real: mientras está activo, `update()` no avanza (nave/asteroides/balas/partículas quedan congelados) pero el último frame se sigue mostrando; no existía ningún concepto de pausa en el original.
  - El listener de teclado (flechas + Espacio) solo actúa mientras el estado interno es `"playing"` — en `paused`, `dead` (respawn) o `gameover` no mueve la nave ni dispara, para no interferir con el input del modal de fin de partida.
  - Mantiene sin cambios: física, colisiones, división de asteroides, sistema de puntos (20/50/100), power-up de disparo triple, invencibilidad temporal al reaparecer, paleta de colores original (blanco/negro), tamaño lógico interno 800×600.
  - Expone callbacks: `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)`, `onGameOver(finalScore)`.
- `components/games/AsteroidsGame.tsx` (`"use client"`): monta el `<canvas>` vía `ref`, instancia el motor de `lib/games/asteroids/engine.ts` al montar, lo destruye (cancela el loop, remueve listeners) al desmontar, y traduce sus callbacks a estado/props de React. Recibe desde el padre al menos: `paused: boolean` y `onGameOver: (score: number) => void`; expone (vía prop callback o ref) el score/lives/level actuales para que el HUD compartido los muestre.
- El canvas mantiene su lógica interna en coordenadas fijas 800×600 (no se toca la matemática del juego), pero se escala visualmente por CSS al ancho disponible de `.crt-screen`, preservando la proporción 4:3, en vez de quedar fijo a 800×600px.
- Modificar `app/games/[id]/play/page.tsx`: cuando `game.id === "rocas"`, renderizar `<AsteroidsGame>` en el lugar de `.game-arena` (en vez de los `<div className="enemy">`/`.player-ship` decorativos), y:
  - Desactivar el `setInterval` que simula el puntaje solo para este `id` (los otros 7 juegos lo conservan sin cambios).
  - El HUD compartido (Jugador/Puntuación/Vidas/Nivel) muestra el score/vidas/nivel reales que reporta el motor, en vez de los `useState` simulados — para `rocas`, "Nivel" usa el nivel real del motor (`nextLevel()`), no la fórmula genérica `1 + score/2500` que siguen usando los demás juegos.
  - El botón PAUSA/REANUDAR ya existente controla el `paused` real del motor.
  - El botón FIN sigue forzando fin de partida manualmente (además del fin real por perder las 3 vidas) — ambos casos usan el mismo camino: se llama a `onGameOver`, se abre el modal ya existente.
  - El modal de fin de partida (input de iniciales, "GUARDAR PUNTUACIÓN") queda exactamente igual, incluyendo la llamada a `addStoredScore({ game: "rocas", score, name })`. "JUGAR DE NUEVO" reinstancia el motor desde cero (nuevo `initGame`).
- CSS aditivo en `app/globals.css` si hace falta para el escalado/centrado del canvas dentro de `.crt-screen` (mantener proporción 4:3, sin romper el marco CRT ya existente).

**Out of scope (para specs futuros):**

- Controles táctiles/móviles para Asteroids. El juego original solo soporta teclado (flechas + Espacio); en móvil el reproductor de `rocas` queda sin forma de jugar por ahora, igual que documenta el riesgo abajo.
- Adaptar los otros 7 juegos mock (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a implementaciones jugables reales. Siguen exactamente igual que en el spec 01 (arena decorativa + puntaje simulado).
- Recolorear el juego al tema neon/CRT del resto del sitio. Se mantiene la paleta original blanco/negro de `game.js`.
- Cualquier cambio a `reference/juegos/02/claude-asteroids-main/`. Ese directorio queda como fuente de solo lectura; toda la adaptación vive en archivos nuevos bajo `lib/` y `components/`.
- Mostrar los puntajes guardados de Asteroids en el leaderboard real. `app/games/[id]/page.tsx` y `app/hall-of-fame/page.tsx` siguen usando `seededScores` (generador mock determinístico) sin leer `localStorage["av_scores"]` — ese gap ya existía desde el spec 01 para los 8 juegos y no se cierra acá.
- Power-ups adicionales o el "shooting star" que menciona el `README.md` original del juego pero que no existen en su `game.js` real (documentado como inconsistencia conocida en el `CLAUDE.md` de esa referencia). Se porta el juego tal como está en el código, no como lo describe ese README.
- Sonido/música.
- Tests automatizados (no hay test runner configurado en el proyecto).

---

## Data model

No se introduce persistencia nueva: se reutiliza `lib/storage.ts` (`addStoredScore`) tal como ya lo usan los otros 7 juegos. Se documenta el contrato del motor adaptado:

```ts
// lib/games/asteroids/engine.ts
export type AsteroidsCallbacks = {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type AsteroidsEngine = {
  setPaused(paused: boolean): void;
  reset(): void;       // reinicia la partida (equivalente a initGame())
  destroy(): void;     // cancela el loop y remueve listeners de teclado
};

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine;
```

```ts
// components/games/AsteroidsGame.tsx
type AsteroidsGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  resetKey: number; // cambiar este valor fuerza reset() (usado por "JUGAR DE NUEVO")
};
```

---

## Implementation plan

1. Crear `lib/games/asteroids/engine.ts` portando las clases y funciones de `game.js` (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, `wrap`, `dist`, `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, `update`, `draw`), encapsuladas dentro de `createAsteroidsEngine(canvas, callbacks)` en vez de estado a nivel de módulo. Quitar `drawHUD` y el overlay de game over de `draw()`; en su lugar, llamar a los callbacks correspondientes cuando cambian `score`/`lives`/`level`, y a `onGameOver(score)` cuando `lives <= 0`. Agregar el estado `paused` (gatear `update()`, no `draw()`) y el método `setPaused`. Gatear el listener de teclado para que solo mueva/dispare cuando el estado interno sea `"playing"`. Verificación: el archivo compila (`npx tsc --noEmit` o `npm run build`) sin usarse aún en ninguna pantalla.
2. Crear `components/games/AsteroidsGame.tsx` (`"use client"`): monta un `<canvas width={800} height={600}>` con `ref`, instancia `createAsteroidsEngine` en un `useEffect` al montar (y en cada cambio de `resetKey`, destruyendo la instancia previa y creando una nueva), llama `engine.destroy()` en el cleanup del efecto, y llama `engine.setPaused(props.paused)` en un efecto separado que reacciona a la prop `paused`. Verificación: compila sin errores de tipos.
3. Modificar `app/games/[id]/play/page.tsx`: cuando `game.id === "rocas"`, no correr el `setInterval` de puntaje simulado; en su lugar, mantener `score`/`lives`/`level`/`over` en estado de React actualizados por los callbacks de `<AsteroidsGame>`, y renderizar `<AsteroidsGame>` en el lugar de `.game-arena` (dentro de `.crt-screen`, conservando `.crt-bottom` tal cual). El botón FIN sigue disponible y fuerza `over=true` sin pasar por el motor (comportamiento ya existente, sin cambios). "JUGAR DE NUEVO" incrementa `resetKey`. Verificación: `/games/rocas/play` carga el canvas real, la nave rota/propulsa/dispara con el teclado, y el HUD de React muestra el score/vidas/nivel reales cambiando en vivo.
4. Escalado del canvas: en `app/globals.css` (aditivo) o vía estilos inline del componente, escalar el `<canvas>` de 800×600 al ancho de `.crt-screen` preservando proporción 4:3 (p. ej. `width: 100%; height: auto;` sobre el elemento canvas, que mantiene su resolución interna de dibujo en 800×600). Verificación visual: el canvas se ve completo y sin recortes en desktop y en una ventana angosta, sin deformarse.
5. Verificación de pausa y fin de partida: con el juego corriendo, PAUSA congela nave/asteroides/balas (el último frame se mantiene visible) y REANUDAR continúa exactamente desde ahí; perder las 3 vidas dispara `onGameOver` y abre el modal de React existente (sin overlay de "GAME OVER" dibujado en el canvas y sin que Espacio reinicie solo); FIN manual también abre el mismo modal. Guardar la puntuación en el modal escribe una entrada en `localStorage["av_scores"]` con `game: "rocas"`, igual que los demás juegos.
6. Confirmar que `reference/juegos/02/claude-asteroids-main/` no fue modificado (`git status` no debe mostrar cambios ahí) y que los otros 7 juegos en `/games/[id]/play` siguen mostrando la arena decorativa simulada sin cambios.
7. Revisión final: `npm run lint` y `npm run build` sin errores.

---

## Acceptance criteria

- [ ] `lib/games/asteroids/engine.ts` existe y expone `createAsteroidsEngine(canvas, callbacks)` según el contrato descrito, sin depender de `document`/`window` a nivel de módulo (solo dentro de la función/clase creada por llamada).
- [ ] `components/games/AsteroidsGame.tsx` monta y desmonta el motor correctamente: navegar a `/games/rocas/play`, salir, y volver a entrar no deja listeners de teclado duplicados ni loops de animación corriendo en paralelo.
- [ ] En `/games/rocas/play`, la nave se controla con ←/→ (rotar), ↑ (propulsar) y Espacio (disparar); los asteroides se dividen al ser destruidos según el tamaño (grande → mediano → pequeño) con los puntos originales (20/50/100).
- [ ] El HUD compartido (Jugador/Puntuación/Vidas/Nivel) refleja en vivo el score, las vidas y el nivel reales del motor — no hay ningún texto de HUD dibujado dentro del canvas.
- [ ] El botón PAUSA congela el juego (nave/asteroides/balas dejan de moverse, último frame visible) y REANUDAR continúa la partida sin reiniciarla.
- [ ] Perder la tercera vida abre el modal de fin de partida ya existente (input de iniciales + "GUARDAR PUNTUACIÓN") con el puntaje final correcto; no aparece ningún overlay de "GAME OVER" dibujado en el canvas ni el juego se reinicia solo al presionar Espacio.
- [ ] El botón FIN también abre ese mismo modal con el puntaje acumulado hasta ese momento.
- [ ] Guardar la puntuación en el modal escribe una entrada en `localStorage["av_scores"]` con `game: "rocas"`.
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva desde cero (score 0, 3 vidas, nivel 1).
- [ ] El canvas se ve completo (sin recortes ni deformación) tanto en una ventana ancha como en una angosta, escalado a `.crt-screen` en proporción 4:3.
- [ ] Mientras el modal de fin de partida está abierto o el juego está en pausa, escribir en el input de iniciales no mueve la nave ni dispara.
- [ ] Los otros 7 juegos (`/games/bloque-buster/play`, etc.) siguen mostrando la arena decorativa simulada exacta del spec 01, sin ningún cambio visual ni funcional.
- [ ] `reference/juegos/02/claude-asteroids-main/` no tiene ninguna modificación (`git status` limpio en ese path).
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** reutilizar la ruta genérica `/games/rocas/play` en vez de crear una ruta dedicada. Razón: decisión explícita del usuario; `rocas` ya es el mock que representa este juego, y el HUD/pausa/modal compartidos ya resuelven el flujo de puntuación sin duplicar UI.
- **Sí:** quitar el HUD dibujado dentro del canvas (`drawHUD` de `game.js`) y depender solo del HUD de React ya existente. Razón: decisión explícita del usuario; evita mostrar dos HUD redundantes (uno en canvas, otro en React) con estilos inconsistentes.
- **Sí:** implementar pausa real en el motor (nuevo estado `paused`, no existía en el original). Razón: decisión explícita del usuario; el botón PAUSA/REANUDAR ya es parte del reproductor compartido de todos los juegos.
- **Sí:** desactivar el overlay interno de "GAME OVER" y el reinicio con Espacio de `game.js`, dejando el modal de React como único flujo de fin de partida. Razón: decisión explícita del usuario; evita dos flujos de cierre de partida compitiendo (uno dentro del canvas, otro en React) y mantiene consistencia con los demás 7 juegos, que ya usan ese modal.
- **No:** controles táctiles/móviles en este spec. Razón: decisión explícita del usuario; el juego original solo soporta teclado, agregar controles táctiles es un trabajo de diseño e implementación aparte que queda para un spec futuro si se decide soportar Asteroids en móvil.
- **Sí:** escalar el canvas por CSS al ancho de `.crt-screen` manteniendo proporción 4:3, sin tocar la resolución lógica interna de 800×600. Razón: decisión explícita del usuario; mantiene intacta toda la matemática del juego (posiciones, colisiones, `wrap`) mientras se adapta visualmente al contenedor responsive ya existente.
- **Sí:** motor separado en `lib/games/asteroids/engine.ts` + wrapper `"use client"` en `components/games/AsteroidsGame.tsx`. Razón: decisión explícita del usuario; separa la lógica de juego (portable, sin JSX) de la integración con React/DOM, siguiendo la convención ya usada en el proyecto de separar `lib/` (datos/lógica) de `app/`/`components/` (UI).
- **Sí:** usar el nivel real del motor (`nextLevel()`) en el HUD de "Nivel" para `rocas`, en vez de la fórmula genérica `1 + score/2500` que usan los demás juegos simulados. Razón: decisión explícita del usuario; con un juego real ya existe una noción de nivel genuina, no hace falta aproximarla.
- **Sí:** mantener la paleta de colores original del juego (blanco/negro), sin recolorear al tema neon del sitio. Razón: decisión explícita del usuario; es la identidad visual propia del juego y ya queda enmarcada por el `.crt-screen` con tema neon alrededor; recolorear implicaría tocar más código del motor sin que ningún spec lo haya pedido.
- **No:** tocar `reference/juegos/02/claude-asteroids-main/`. Razón: es material de referencia de solo lectura; toda adaptación vive en archivos nuevos.
- **No:** mostrar los puntajes reales guardados en el leaderboard (`app/games/[id]/page.tsx`, `app/hall-of-fame/page.tsx`). Razón: ese gap (guardar en `localStorage` pero mostrar solo datos mock `seededScores`) ya existía desde el spec 01 para los 8 juegos; cerrarlo es un cambio más amplio que no fue pedido para este spec.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El juego solo funciona con teclado; en dispositivos táctiles (móvil) queda sin forma de jugar | Documentado como fuera de alcance explícito; queda para un spec futuro de controles táctiles si se decide soportarlo |
| `game.js` original asigna listeners de teclado y arranca su loop a nivel de módulo/script, asumiendo una sola carga de página; al portarlo a un componente React que se monta/desmonta con la navegación (SPA), un manejo descuidado del ciclo de vida podría duplicar listeners o dejar loops de `requestAnimationFrame` corriendo tras salir de la pantalla | `createAsteroidsEngine`/`destroy()` diseñados explícitamente para crearse y destruirse por instancia; `AsteroidsGame.tsx` llama `destroy()` en el cleanup del `useEffect` de montaje |
| Escalar el canvas por CSS (`width: 100%; height: auto`) sin ajustar su resolución interna puede verse borroso en pantallas de alta densidad de píxeles | Aceptado como limitación conocida del alcance; el juego original ya renderiza a una resolución fija de 800×600, el escalado CSS es solo para que quepa en el contenedor responsive |
| Al desactivar el reinicio-con-Espacio propio del motor, cualquier código que dependiera de esa tecla para reiniciar quedaría roto | No hay tal dependencia fuera de `game.js` mismo; el reinicio pasa a ser exclusivamente el botón "JUGAR DE NUEVO" del modal de React |

---

## What is **not** in this spec

- Controles táctiles/móviles para Asteroids.
- Adaptación jugable real de los otros 7 juegos mock.
- Recoloreado del juego al tema neon del sitio.
- Cambios a `reference/juegos/02/claude-asteroids-main/`.
- Mostrar puntajes reales guardados en el leaderboard (`seededScores` sigue siendo el único origen de datos ahí).
- Power-ups adicionales o el "shooting star" mencionado solo en el README original, ausentes del `game.js` real.
- Sonido/música.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.
