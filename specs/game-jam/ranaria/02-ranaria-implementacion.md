# SPEC ranaria 02 — Ranaria: implementación

> **Status:** Implemented
> **Depends on:** specs/game-jam/ranaria/01-ranaria-diseno.md, SPEC 05, SPEC 06
> **Date:** 2026-08-26
> **Objective:** Implementar Ranaria como juego real —motor, wrapper y entrada de registro— sobre el slot de catálogo `ranaria` ya existente, sin tocar el esquema ni el CSS.

---

## Por qué existe este spec

`specs/game-jam/ranaria/01-ranaria-diseno.md` fija **qué es** Ranaria, con todos sus números
cerrados. Este spec fija **cómo se construye** dentro de este repo, respetando el contrato
motor/wrapper/registro de `.claude/skills/integrar-juego/contract.md`.

El estado real verificado del proyecto (leyendo el código, no la documentación):

- `components/games/registry.ts` declara cuatro juegos reales —`rocas`, `caida`,
  `bloque-buster`, `serpentina`— y `ranaria` no está entre ellos: hoy cae en la arena decorativa
  de `GamePlayerClient.tsx` con su puntaje simulado por `setInterval`.
- La fila `ranaria` **ya existe** en el bloque `insert into games (...) values (...)` de
  `supabase/schema.sql` (`ARCADE`, `cover-rana`, `green`, `6.4K`), y `.cover-rana` ya está
  definida en `app/globals.css:491`. No hace falta SQL nuevo ni CSS nuevo.
- El refactor único de la sección 4 del contrato **ya está hecho**: existen `lib/games/types.ts`,
  `components/games/types.ts`, `components/games/registry.ts` y la regla genérica
  `.game-arena canvas` en `app/globals.css:714`. Por tanto este porte es estrictamente **un
  motor + un wrapper + una línea en `REAL_GAMES`**, sin tocar `GamePlayerClient.tsx`.
- La tabla `scores` ya es genérica por `game` id, así que el leaderboard funciona en cuanto el
  motor reporte puntaje: no se introduce persistencia nueva.

---

## Scope

**In:**

- `lib/games/ranaria/engine.ts` — el motor completo, con la factory
  `createRanariaEngine(canvas, callbacks): GameEngine`.
- `components/games/RanariaGame.tsx` — el wrapper `"use client"` que monta el canvas de
  640 × 480 y conecta los callbacks.
- La entrada nueva de `ranaria` en `components/games/registry.ts`, con sus `capabilities`.
- La verificación funcional en `/games/ranaria/play`: controles, HUD, pausa, fin de partida,
  guardado de puntuación y "JUGAR DE NUEVO".

**Out of scope (para specs futuros):**

- Controles táctiles o de móvil: el motor es de teclado puro.
- Recolorear el juego al tema neon del sitio: la paleta del spec 01 se preserva tal cual.
- Supabase Auth, CLI de Supabase, migraciones y cliente admin/service-role.
- Tests automatizados.
- Cualquier chrome de juego nuevo más allá del HUD, la pausa y el modal de fin de partida ya
  compartidos.
- Cambios en `supabase/schema.sql` y en `app/globals.css`: este juego no los necesita.
- Sonido y assets externos.

---

## Data model

**Firma del motor.**

```ts
// lib/games/ranaria/engine.ts
import type { GameCallbacks, GameEngine } from "@/lib/games/types";

// Callbacks que este motor usa:
//   onScoreChange(score)    — en cada suma de puntos (avance de fila, nenúfar, bonus de tiempo,
//                             mosca, tanda completada)
//   onLivesChange(lives)    — al perder una vida y al ganar una por completar la tanda
//   onLevelChange(level)    — al completar los cinco nenúfares (nivel = tandas + 1)
//   onGameOver(finalScore)  — cuando se pierde la última vida; el motor no dibuja overlay alguno
// Callbacks que este motor nunca llama: ninguno — usa los cuatro.
export function createRanariaEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameEngine;
```

`GameEngine` es el contrato ya existente: `setPaused(paused)` congela `update()` pero sigue
dibujando el último frame, `reset()` reinicia la partida desde cero, `destroy()` cancela el
`requestAnimationFrame` y remueve el listener de teclado. Todo el estado y los listeners viven
dentro del closure de la factory: nada a nivel de módulo.

**Resolución lógica.** `W = 640`, `H = 480` (4:3 exacto). El wrapper monta
`<canvas width={640} height={480} />` y el escalado lo resuelve `.game-arena canvas`, que ya
existe: **no se añade CSS**.

**Estado interno del motor** (todo dentro del closure):

```ts
// lib/games/ranaria/engine.ts
type Phase = "playing" | "over";

type Frog = {
  x: number; // centro en px, float: los troncos la arrastran de forma continua
  row: number; // fila lógica 0..11
  jumpT: number; // 0..1, progreso de la animación de salto
  from: { x: number; row: number }; // origen del salto, para interpolar
  to: { x: number; row: number }; // destino del salto
};

type Vehicle = { lane: number; x: number }; // x = borde izquierdo, en px
type Floater = { lane: number; x: number; phaseOffset: number }; // tronco o grupo de tortugas

// score, lives, level, timeLeftMs, bestRow (récord de fila del intento, para el anti-farmeo),
// lilies: boolean[5], fly: { lily: number; untilMs: number } | null, cooldownMs, phase
```

**Entrada del registro.**

```ts
// components/games/registry.ts
export const REAL_GAMES: Record<string, RealGameEntry> = {
  rocas: { Component: AsteroidsGame, capabilities: { hasLives: true, hasLevel: true } },
  caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } },
  "bloque-buster": { Component: ArkanoidGame, capabilities: { hasLives: true, hasLevel: false } },
  serpentina: { Component: SerpentinaGame, capabilities: { hasLives: false, hasLevel: true } },
  ranaria: { Component: RanariaGame, capabilities: { hasLives: true, hasLevel: true } },
};
```

**Catálogo y persistencia.** No hay `insert into games` nuevo: la fila `ranaria` ya está en
`supabase/schema.sql` y `cover-rana` ya está en `app/globals.css`. **No se introduce persistencia
nueva ni se toca la tabla `scores`**: ya es genérica por `game` id, y el guardado lo hace el modal
compartido con `saveScore({ game: "ranaria", score, name })` desde `GamePlayerClient.tsx`.

Todas las constantes numéricas y de paleta son las del bloque `Data model` del spec 01, copiadas
tal cual a la cabecera de `lib/games/ranaria/engine.ts`.

---

## Implementation plan

1. **Crear el esqueleto del motor y el fondo estático.** `lib/games/ranaria/engine.ts` con las
   constantes del spec 01, `getContext2D`, el bucle `requestAnimationFrame` con `delta` en ms, las
   banderas `paused` / `destroyed` / `phase`, y el dibujo de las franjas fijas: base y mediana en
   `grass`, carretera en `road` con separadores `roadLine`, río en `water` con ondas `waterLine`,
   orilla en `shore` y los cinco nenúfares vacíos en `lilyFree`.
   _Verificación:_ importado desde una página de prueba o desde el wrapper del paso 4, el canvas
   pinta el escenario completo de 640 × 480 sin entidades y sin errores en consola.

2. **Implementar carriles, entidades y sus movimientos.** Generación de vehículos y flotadores por
   carril con `period = len + gap` y `count = ceil((W + len) / period)`, avance
   `x += dir * speed * speedMult * dt`, reciclado por módulo del recorrido total, ciclo de
   inmersión de las tortugas con sus tres fases y el desfase por grupo, y el dibujo de coches,
   camión, troncos y tortugas con la paleta del spec 01.
   _Verificación:_ el tráfico y el río corren indefinidamente sin huecos irregulares ni saltos al
   reciclar, y las tortugas alternan sólidas → parpadeo → hundidas de forma desfasada entre grupos.

3. **Implementar la rana, el input y la resolución de colisiones.** Salto discreto con
   interpolación de `JUMP_MS` y cooldown de `JUMP_COOLDOWN_MS`; captura de `ArrowUp` / `ArrowDown`
   / `ArrowLeft` / `ArrowRight` / `KeyW` / `KeyA` / `KeyS` / `KeyD` con `preventDefault` sobre esos
   códigos, ignorando el evento cuando `paused` o `phase !== "playing"` (mismo criterio que
   `lib/games/serpentina/engine.ts`); arrastre por la plataforma que sostiene a la rana; y las
   cinco muertes del paso 7 del spec 01, evaluadas sólo con el salto terminado.
   _Verificación:_ la rana cruza los cuatro carriles de carretera y los cinco de río, es arrastrada
   por los troncos, muere por atropello, por agua, por tortuga hundida, por salir del canvas
   arrastrada y por aterrizar en la fila 0 fuera de un nenúfar; las flechas no hacen scrollear la
   página.

4. **Implementar puntaje, vidas, nivel, temporizador y mosca, y cablear los callbacks.** Récord de
   fila por intento para el anti-farmeo, `onScoreChange` en cada suma, `onLivesChange` al perder y
   al ganar vida, `onLevelChange` al completar la tanda de cinco nenúfares (con reinicio de
   nenúfares, subida del multiplicador de velocidad y recorte del reloj), barra de tiempo en los
   8 px inferiores interpolando de `timeFull` a `timeEmpty`, y `onGameOver(finalScore)` al perder
   la última vida sin dibujar ningún overlay.
   _Verificación:_ subir y bajar repetidamente entre base y mediana no suma puntos; completar los
   cinco nenúfares suma los 500 y sube el nivel; agotar el reloj cuesta una vida; con 0 vidas se
   dispara `onGameOver` una sola vez y el motor deja de aceptar teclas.

5. **Crear el wrapper `components/games/RanariaGame.tsx`.** `"use client"`, copiando exactamente
   el patrón de `components/games/SerpentinaGame.tsx`: `callbacksRef` actualizado en un efecto sin
   dependencias, efecto principal con `[resetKey]` que crea el motor y llama `engine.destroy()` en
   el cleanup, efecto separado con `[paused]` que llama `setPaused`, y
   `<canvas ref={canvasRef} width={640} height={480} />`.
   _Verificación:_ navegar varias veces dentro y fuera de `/games/ranaria/play` no duplica
   listeners de teclado ni deja bucles de `requestAnimationFrame` en paralelo (la rana no se acelera
   ni responde dos veces a una misma tecla).

6. **Registrar el juego.** Añadir a `components/games/registry.ts` el import de `RanariaGame` y la
   entrada `ranaria: { Component: RanariaGame, capabilities: { hasLives: true, hasLevel: true } }`.
   No se toca `GamePlayerClient.tsx` ni ningún archivo de tipos.
   _Verificación:_ `/games/ranaria/play` muestra el canvas real en lugar de la arena decorativa, y
   el HUD muestra Puntuación, Vidas y Nivel con los valores reportados por el motor, no con la
   fórmula `1 + score/2500`.

7. **Verificación funcional completa en el navegador.** PAUSA congela el último frame y REANUDAR
   continúa la misma partida; perder la última vida y el botón FIN abren el mismo modal compartido;
   guardar la puntuación inserta una fila en `scores` con `game = 'ranaria'` y aparece en el top-10
   de `/games/ranaria` y en `/hall-of-fame`; "JUGAR DE NUEVO" reinicia con score 0, 3 vidas y nivel
   1; el canvas se ve completo y sin deformarse en ventana ancha y angosta; los otros siete juegos
   del catálogo no cambian.
   _Verificación:_ los ocho comportamientos anteriores se comprueban uno a uno en
   `/games/ranaria/play` y en el catálogo.

8. **Revisión final:** `npm run lint` y `npm run build` sin errores.
   _Verificación:_ ambos comandos terminan con código 0.

---

## Acceptance criteria

- [ ] `lib/games/ranaria/engine.ts` exporta `createRanariaEngine(canvas, callbacks): GameEngine`
      según el contrato de la sección 1, sin `document`/`window` fuera del closure de la factory.
- [ ] `components/games/RanariaGame.tsx` monta y desmonta sin duplicar listeners de teclado ni
      dejar loops de `requestAnimationFrame` corriendo en paralelo al navegar dentro y fuera de
      `/games/ranaria/play` repetidamente.
- [ ] Los controles funcionan según lo especificado para este juego.
- [ ] El HUD respeta las capacidades declaradas: oculta "Vidas"/"Nivel" cuando `hasLives`/`hasLevel`
      es `false`; cuando `hasLevel` es `true`, usa el valor real reportado por el motor, nunca la
      fórmula decorativa `1 + score/2500`.
- [ ] El botón PAUSA congela el último frame (sin avanzar `update()`); REANUDAR continúa sin
      reiniciar la partida.
- [ ] Tanto perder (agotar las tres vidas) como el botón FIN manual abren únicamente el modal de
      fin de partida ya existente — sin overlay de game over dibujado en el canvas ni reinicio
      propio por tecla.
- [ ] Guardar la puntuación en el modal inserta una fila en la tabla `scores` de Supabase con
      `game = 'ranaria'`.
- [ ] "JUGAR DE NUEVO" reinicia la partida completamente vía `resetKey` (score 0, 3 vidas, nivel 1,
      temporizador a 45 s).
- [ ] El canvas se ve completo y sin deformarse tanto en una ventana ancha como en una angosta.
- [ ] Los demás juegos (decorativos y reales) no cambian visual ni funcionalmente.
- [ ] No se añadió ninguna fila a `games`, ningún bloque a `app/globals.css` ni ninguna columna a
      `scores`: el slot `ranaria` y la clase `cover-rana` ya existían.
- [ ] Las teclas ← ↑ → ↓ y `W` `A` `S` `D` mueven la rana una celda por salto, con
      `JUMP_COOLDOWN_MS` de separación, y las flechas no hacen scrollear la página.
- [ ] La rana es arrastrada por troncos y tortugas emergidas, y muere si la plataforma la saca del
      canvas.
- [ ] Las tortugas hundidas no sostienen a la rana y avisan con la fase de parpadeo antes de
      hundirse.
- [ ] Ocupar los cinco nenúfares suma 500 puntos, sube el nivel, reinicia los nenúfares, acelera
      los carriles y acorta el temporizador; ocupar un nenúfar ya ocupado o caer al agua de la fila
      0 cuesta una vida.
- [ ] El puntaje nunca baja y subir y bajar repetidamente entre filas ya visitadas del mismo
      intento no suma puntos.
- [ ] La barra de tiempo se dibuja en la franja inferior del canvas y agotarla cuesta una vida; el
      canvas no dibuja score, vidas ni nivel.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** motor separado del wrapper, con todo el estado y los listeners en el closure de
  `createRanariaEngine`. Razón: es el contrato §1-2 heredado de SPEC 05, y lo que permite montar y
  desmontar el juego en una SPA sin duplicar listeners.
- **Sí:** copiar el patrón de `components/games/SerpentinaGame.tsx` literalmente para el wrapper.
  Razón: es el porte más reciente y el más simple de los cuatro; replicarlo evita variantes del
  patrón que después divergen entre juegos.
- **Sí:** reutilizar el slot `ranaria` sin tocar `supabase/schema.sql` ni `app/globals.css`. Razón:
  la fila y la clase `cover-rana` ya existen y encajan; el contrato §6 marca esta como la opción de
  coste cero.
- **Sí:** 640 × 480 como resolución lógica. Razón: 4:3 exacto, la proporción que `.crt-screen`
  impone; evita la deformación que hoy sufren `caida` y `bloque-buster`.
- **Sí:** `{ hasLives: true, hasLevel: true }` en `REAL_GAMES`. Razón: el motor reporta vidas y
  nivel reales; el HUD compartido debe mostrar ambos.
- **Sí:** `preventDefault` sobre los ocho códigos capturados y listener inactivo mientras
  `paused` o `phase !== "playing"`. Razón: contrato §1 — el teclado del juego no debe interferir
  con el input de iniciales del modal de fin de partida, y las flechas no deben scrollear la página.
- **Sí:** todo el movimiento y los temporizadores por `delta` en milisegundos, nunca por conteo de
  frames. Razón: la dificultad depende de velocidades en px/s y de un reloj en segundos; contarlos
  por frames los ataría a la tasa de refresco del monitor.
- **No:** recolorear el juego al tema neon del sitio. Razón: contrato §1 y decisión heredada de
  SPEC 05 — cada juego preserva su paleta.
- **No:** Supabase Auth ni CLI/migraciones de Supabase ni cliente service-role. Razón: decisión
  heredada de SPEC 06 — la sesión sigue siendo el nombre en `localStorage` y el esquema se cambia
  a mano en el dashboard, y aquí ni siquiera hace falta cambiarlo.
- **No:** tocar `components/games/GamePlayerClient.tsx` ni los archivos de tipos. Razón: el
  refactor único del contrato §4 ya está hecho y verificado en `registry.ts`; los portes
  posteriores son sólo motor + wrapper + una línea del registro.
- **No:** tests automatizados. Razón: el proyecto no tiene runner por decisión explícita; la
  verificación es `npm run lint && npm run build` más los chequeos manuales del plan.
- **No:** assets externos (sprites o sonido). Razón: todo el juego se dibuja con primitivas de
  canvas, así que no hay nada que copiar a `public/games/ranaria/`.

---

## Risks

| Riesgo                                                                                                                                                              | Mitigación                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Esfuerzo: el motor combina nueve carriles, arrastre, ciclo de tortugas, reloj, mosca y cinco causas de muerte; puede irse por encima del rango 238–558 líneas del repo. | Alcance recortado en el spec 01 (sin cocodrilos, nutrias ni rana rescatable) y plan dividido en cuatro pasos de motor, cada uno compilable por separado; estimación 320–420 líneas, entre `caida` y `bloque-buster`.   |
| El arrastre por plataforma exige llevar la `x` de la rana en float mientras el movimiento es por celdas; mezclar ambos modelos es el foco de bugs más probable.         | El spec 01 fija un único modelo: `x` siempre en float, el salto lateral suma o resta 40 px exactos y nunca re-encaja en la grilla; la fila sí es un entero discreto.                                                  |
| Evaluar colisiones a mitad de salto produciría muertes percibidas como injustas.                                                                                       | Regla explícita: las colisiones se resuelven sólo con `jumpT >= 1`, y `JUMP_MS` es de 90 ms para que la ventana de invulnerabilidad sea imperceptible.                                                                |
| La barra de tiempo dentro del canvas podría leerse como un HUD propio y chocar con el contrato.                                                                        | El contrato prohíbe duplicar score/vidas/nivel y el overlay de game over; el tiempo no tiene slot en el HUD compartido. Queda como una franja de 8 px pegada al borde inferior, sin texto ni números.                 |
| Resolución distinta de 640 × 480.                                                                                                                                      | No aplica: el diseño es 640 × 480, 4:3 exacto. Es justamente el riesgo que se evita, dado que `.crt-screen` fija `aspect-ratio: 4/3` y `.game-arena canvas` estira sin `object-fit`.                                  |
| Coste de una fila nueva en `games`.                                                                                                                                    | No aplica: `ranaria` ya existe en el `insert` de `supabase/schema.sql` y `.cover-rana` ya existe en `app/globals.css:491`. No hay SQL manual que correr en el dashboard.                                              |

---

## What is **not** in this spec

- Controles táctiles o de móvil.
- Recoloreado al tema neon del sitio.
- Supabase Auth, CLI/migraciones de Supabase y cliente admin/service-role.
- Tests automatizados.
- Chrome de juego nuevo más allá del HUD, la pausa y el modal ya compartidos.
- Cambios en `supabase/schema.sql`, en `app/globals.css` y en la tabla `scores`.
- Sonido y assets externos, y las ampliaciones de juego listadas en el spec 01.

Cada uno de estos, si se necesita, va en su propio spec.
