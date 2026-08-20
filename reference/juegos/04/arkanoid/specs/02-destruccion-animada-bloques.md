# SPEC 02 — Animación de destrucción de bloques

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-08-13
> **Objective:** Reproducir una animación de explosión de 4 frames (reutilizando `EXPLOSION_FRAMES` del spritesheet) cuando un bloque es destruido, sin bloquear la física del juego.

## Scope

**In:**

- Al romperse un bloque en `checkBrickCollision()`, agregar una entrada a un array `state.explosions` con posición, color y timestamp de inicio.
- Reproducir la animación de 4 frames de `EXPLOSION_FRAMES[color]` a lo largo de `EXPLOSION_DURATION` (150ms, ya definido en `assets/assets/spritesheet.js`), calculada por timestamp (`performance.now()`), dibujada con `drawFrame()`.
- El rebote de la bola y la suma de puntaje al golpear un bloque siguen ocurriendo de inmediato, en el mismo frame del impacto (sin cambios respecto a SPEC01).
- Soporte para múltiples explosiones simultáneas (varias entradas activas en `state.explosions` a la vez).
- Eliminar cada explosión de `state.explosions` cuando termina su animación (transcurridos los 150ms).
- La condición de victoria ("You Win") espera a que `state.explosions` quede vacío antes de cambiar `state.screen` a `'win'`.
- Dibujar las explosiones activas en cada frame de `render()`, en la posición donde estaba el bloque destruido.

**Out of scope (for future specs):**

- Sonido de rotura de bloques (`break-sound.mp3`) — sigue diferido según SPEC01.
- Animación o efectos visuales para la bola o la paleta.
- Partículas o efectos adicionales no presentes en el spritesheet (`EXPLOSION_FRAMES` ya define los 4 frames por color; no se generan nuevos assets).
- Pausar o ralentizar el juego mientras hay explosiones activas (excepto el caso puntual de "You Win" descrito arriba).
- Cambios al layout de bloques, puntaje o vidas (ya definidos en SPEC01).

## Data model

```js
// Se agrega a `state` (definido en SPEC01, js/game.js)
state.explosions = [
  // { x, y, w: 32, h: 16, color: 'red' | 'yellow' | 'green' | 'cyan' | 'magenta' | 'hotpink' | 'gray', startTime: <performance.now()> }
];
```

Conventions:

- `x`, `y`, `w`, `h` coinciden con la posición y tamaño del bloque destruido, para que la explosión se dibuje en su lugar exacto.
- `color` selecciona el set de frames en `EXPLOSION_FRAMES[color]` (definido en `assets/assets/spritesheet.js`).
- El frame a mostrar se calcula como `Math.floor(((performance.now() - startTime) / EXPLOSION_DURATION) * EXPLOSION_FRAMES[color].length)`, acotado a `length - 1`.
- Una explosión se retira de `state.explosions` cuando `performance.now() - startTime >= EXPLOSION_DURATION`.

## Implementation plan

1. En `js/game.js`, agregar `state.explosions = []` a la definición de `state`, y reiniciarlo (junto a `bricks`) dentro de `retryGame()`. Prueba manual: recargar el juego, no hay errores en consola.
2. En `checkBrickCollision()`, al marcar `brick.alive = false` y sumar el puntaje, además hacer `push` a `state.explosions` de `{ x: brick.x, y: brick.y, w: brick.w, h: brick.h, color: brick.color, startTime: performance.now() }`. Prueba manual: romper un bloque; el bloque desaparece de inmediato del canvas.
3. Crear la función `updateExplosions()`, que filtra de `state.explosions` las entradas cuyo tiempo transcurrido ya superó `EXPLOSION_DURATION`, y llamarla desde `loop()` antes de `render()`. Prueba manual: sin más cambios, el juego sigue funcionando igual que antes (la animación todavía no se ve).
4. Crear la función `drawExplosions()`, que para cada entrada activa de `state.explosions` calcula su frame actual de `EXPLOSION_FRAMES[color]` según el tiempo transcurrido y lo dibuja con `drawFrame(ctx, frame, x, y, w, h)`; llamarla desde `render()` justo después de `drawBricks()`. Prueba manual: romper un bloque y ver la secuencia de 4 frames de explosión en el lugar donde estaba.
5. Modificar `checkWinCondition()` para que solo cambie `state.screen` a `'win'` cuando todos los bloques están destruidos **y** `state.explosions.length === 0`. Prueba manual: romper el último bloque y confirmar que su explosión termina de reproducirse antes de que aparezca la pantalla "You Win".

## Acceptance criteria

- [ ] Al romper un bloque, en su posición se reproduce una secuencia de 4 frames de explosión del color correspondiente (`EXPLOSION_FRAMES[color]`) a lo largo de ~150ms.
- [ ] El bloque desaparece de `drawBricks()` en el mismo instante en que se rompe (no espera a la animación).
- [ ] El rebote de la bola y la suma de puntaje ocurren en el mismo frame del impacto, sin demora por la animación.
- [ ] Romper dos o más bloques en sucesión rápida muestra sus explosiones simultáneamente, cada una en su propia posición.
- [ ] Cada explosión desaparece del canvas al finalizar sus 4 frames (no queda "pegada" en pantalla).
- [ ] Al romper el último bloque, la pantalla "You Win" aparece recién después de que termina la animación de esa última explosión.
- [ ] Reintentar ("Retry") desde "Game Over" o "You Win" deja `state.explosions` vacío para la nueva partida.

## Decisions

- **Sí:** usar `EXPLOSION_FRAMES` y `EXPLOSION_DURATION` ya definidos en `assets/assets/spritesheet.js`. Ya están armados 1:1 con los colores de bloques existentes; no hace falta crear ni ajustar assets.
- **Sí:** timing basado en `performance.now()` (timestamp) en vez de conteo de frames de `requestAnimationFrame`. Mantiene la duración de 150ms estable sin importar el framerate real.
- **Sí:** física de la bola (rebote, puntaje) inmediata y desacoplada de la animación. Mantiene el gameplay responsivo; la explosión es un efecto puramente visual.
- **Sí:** `state.explosions` como array, soporta múltiples explosiones simultáneas. Es posible romper bloques en frames consecutivos mientras una explosión anterior sigue activa.
- **Sí:** la pantalla "You Win" espera a que `state.explosions` quede vacío. Evita que el overlay tape la última explosión, que es el momento más satisfactorio de la partida.
- **No:** la pantalla "Game Over" no espera explosiones pendientes. Perder la última vida no depende del estado de los bloques, así que no aplica el mismo criterio de espera.
- **No:** sonido de rotura de bloques. Sigue diferido a un spec de audio futuro, tal como quedó definido en SPEC01.

## What is **not** in this spec

- Sonido de rotura de bloques (`break-sound.mp3`).
- Animaciones para la bola o la paleta.
- Nuevos efectos visuales fuera de los 4 frames ya provistos por el spritesheet.
- Cambios al layout de bloques, puntaje o vidas.

Cada uno de estos, si se implementa, va en su propio spec.
