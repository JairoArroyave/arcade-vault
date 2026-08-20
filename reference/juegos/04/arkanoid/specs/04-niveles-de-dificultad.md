# SPEC 04 — Niveles de dificultad

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-08-13
> **Objective:** Permitir elegir uno de 3 niveles de dificultad (Easy/Medium/Hard) desde la pantalla de inicio, donde cada nivel fija una velocidad inicial distinta y constante para la pelota durante toda la partida.

## Scope

**In:**

- Extender la pantalla de inicio (`state.screen === 'start'`) para mostrar las 3 opciones de dificultad (Easy, Medium, Hard) y esperar que el jugador presione la tecla `1`, `2` o `3` para elegir y comenzar la partida. Esto reemplaza el "cualquier tecla o click inicia" actual, pero solo en esta pantalla.
- Definir 3 niveles con distinta magnitud de velocidad de pelota: Easy (`dx: 3, dy: -3`, la actual), Medium (`dx: 4.5, dy: -4.5`), Hard (`dx: 6, dy: -6`).
- Guardar el nivel elegido en `state.difficulty` (`'easy' | 'medium' | 'hard'`).
- Usar la velocidad del nivel elegido como velocidad inicial de la pelota al arrancar la partida y también al reiniciar la pelota tras perder una vida (`resetBallAndPaddle()`), manteniendo la magnitud constante durante toda la partida — los rebotes en paleta, bordes y bloques solo cambian dirección, no magnitud, igual que hoy.
- Al presionar Retry desde Game Over o You Win, volver a la pantalla de selección de dificultad (`state.screen = 'start'`) en vez de arrancar directo con el último nivel usado.

**Out of scope (for future specs):**

- Cambiar la velocidad de la paleta según la dificultad.
- Aceleración progresiva de la pelota durante la partida.
- Persistir la dificultad elegida entre recargas de página (localStorage).
- Cambios al layout de bloques, puntaje o vidas según la dificultad.
- Selección de dificultad por mouse/click (solo teclado `1`/`2`/`3`).

## Data model

```js
const DIFFICULTY_LEVELS = {
  easy: { dx: 3, dy: -3 },
  medium: { dx: 4.5, dy: -4.5 },
  hard: { dx: 6, dy: -6 },
};

// Se agrega a `state` (definido en SPEC01, js/game.js)
state.difficulty = null; // 'easy' | 'medium' | 'hard' | null antes de elegir
```

Conventions:

- `state.difficulty` es `null` en la pantalla `'start'` antes de que el jugador elija; se fija al presionar `1`, `2` o `3`.
- El signo de `dy` siempre es negativo (la pelota arranca hacia arriba) y el de `dx` siempre positivo, igual que `INITIAL_BALL` hoy.
- `resetBallAndPaddle()` toma `dx`/`dy` de `DIFFICULTY_LEVELS[state.difficulty]` en vez de los valores fijos de `INITIAL_BALL`; `x`, `y` y `radius` siguen viniendo de `INITIAL_BALL`.

## Implementation plan

1. Agregar la constante `DIFFICULTY_LEVELS` y `state.difficulty = null` en `js/game.js`. Prueba manual: recargar el juego, sin errores en consola (el comportamiento no cambia todavía).
2. Modificar `drawStartOverlay()` para mostrar las 3 opciones (ej. "1: Easy 2: Medium 3: Hard") en vez del texto "Start". Prueba manual: al cargar la página se ven las 3 opciones en el overlay.
3. Modificar el manejo de `keydown` para que, solo cuando `state.screen === 'start'`, las teclas `'1'`/`'2'`/`'3'` fijen `state.difficulty` a `'easy'`/`'medium'`/`'hard'` respectivamente y llamen a `startGame()`; cualquier otra tecla no hace nada en esta pantalla (se quita el disparo genérico de `startGame()` en `handleInput()` para la pantalla `'start'`). Prueba manual: presionar `2` arranca la partida en dificultad Medium; presionar una tecla no numérica (o hacer click) en la pantalla de inicio no hace nada.
4. Modificar `resetBallAndPaddle()` para tomar `dx`/`dy` de `DIFFICULTY_LEVELS[state.difficulty]` en vez de los valores fijos de `INITIAL_BALL`. Prueba manual: elegir Hard, perder una vida, y confirmar que la pelota reaparece con la velocidad de Hard.
5. Modificar `retryGame()` para dejar `state.screen = 'start'` y `state.difficulty = null` en vez de ir directo a `'playing'`, de modo que Retry siempre vuelva a preguntar el nivel. Prueba manual: terminar una partida (Game Over o You Win) y presionar Retry: se ve la pantalla de selección de dificultad, no la partida arrancando de una.
6. Verificar las 3 velocidades jugando una partida en cada nivel y confirmando visualmente que Hard se ve más rápido que Medium, y este más rápido que Easy. Prueba manual: mismo test, sin cambios de código adicionales.

## Acceptance criteria

- [ ] La pantalla de inicio muestra las 3 opciones de dificultad (Easy/Medium/Hard) en vez de un único mensaje "Start".
- [ ] Presionar `1` arranca la partida con la pelota a velocidad Easy (`dx: 3, dy: -3`).
- [ ] Presionar `2` arranca la partida con la pelota a velocidad Medium (`dx: 4.5, dy: -4.5`).
- [ ] Presionar `3` arranca la partida con la pelota a velocidad Hard (`dx: 6, dy: -6`).
- [ ] Presionar cualquier otra tecla en la pantalla de inicio no arranca la partida.
- [ ] La magnitud de velocidad de la pelota se mantiene constante durante toda la partida (los rebotes cambian dirección, no velocidad), sin importar el nivel elegido.
- [ ] Perder una vida reinicia la pelota con la velocidad del nivel elegido, no con un valor por defecto distinto.
- [ ] Presionar Retry desde Game Over o You Win vuelve a la pantalla de selección de dificultad, no arranca directo la partida.

## Decisions

- **Sí:** selección por teclado (`1`/`2`/`3`) en la pantalla Start existente, sin agregar un estado `screen` nuevo. Reutiliza el flujo actual sin ampliar la máquina de estados.
- **Sí:** Easy = velocidad actual (`dx: 3, dy: -3`), Medium = x1.5, Hard = x2. Escala simple, predecible y fácil de verificar a simple vista.
- **Sí:** magnitud de velocidad constante durante toda la partida según el nivel elegido. Coincide con el comportamiento actual de `checkPaddleCollision()` (preserva magnitud, solo cambia el ángulo); no se pidió aceleración progresiva.
- **Sí:** Retry vuelve a preguntar la dificultad. Evita agregar un nuevo campo para "recordar" el último nivel entre partidas de la misma pestaña; consistente con que score y vidas ya se resetean en Retry.
- **No:** la dificultad afecta la velocidad de la paleta. El usuario pidió explícitamente que solo la pelota sea más rápida.
- **No:** persistencia del nivel entre recargas de página (localStorage). Mismo criterio que SPEC01: el estado vive solo en memoria.

## What is **not** in this spec

- Velocidad de la paleta según dificultad.
- Aceleración progresiva de la pelota durante la partida.
- Persistencia de la dificultad elegida (localStorage).
- Selección de dificultad con mouse/click.

Cada uno de estos, si se implementa, va en su propio spec.
