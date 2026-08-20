# SPEC 03 — Efectos de sonido

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-13
> **Objective:** Reproducir efectos de sonido (rebote de la pelota en paleta y bordes, rotura de bloque) en los tres momentos de contacto de la pelota, sin bloquear la física del juego.

## Scope

**In:**

- Reproducir `assets/assets/sounds/ball-bounce.mp3` cuando la pelota rebota contra la paleta (en `checkPaddleCollision()`) y cuando rebota contra los bordes izquierdo, derecho o superior del canvas (en `updateBall()`). No suena al golpear bloques ni al caer por debajo de la paleta.
- Reproducir `assets/assets/sounds/break-sound.mp3` cuando la pelota rompe un bloque (en `checkBrickCollision()`), en el mismo instante en que se marca `brick.alive = false`, se suma el puntaje y se dispara la animación de explosión (SPEC02).
- Reproducción mediante `new Audio(path).play()` en cada evento, para permitir sonidos solapados (ej. varios bloques rotos en sucesión rápida, o un rebote de borde justo después de golpear la paleta).
- Los archivos de audio se referencian desde el momento en que ocurre cada evento; la primera reproducción real ocurre recién cuando el jugador presiona/hace click para iniciar la partida (`startGame()`), respetando la política de autoplay del navegador.
- Volumen fijo por defecto (1.0), sin control de mute ni de volumen.

**Out of scope (for future specs):**

- Música de fondo / soundtrack.
- Control de volumen o mute.
- Sonidos en las pantallas de Start, Game Over o You Win.
- Sonidos distintos para el rebote en la paleta vs. el rebote en los bordes (ambos comparten `ball-bounce.mp3`).
- Nuevos assets de audio.

## Data model

No se introducen estructuras de datos nuevas en `state`. Se agregan constantes y una función helper en `js/game.js`:

```js
const SOUND_PATHS = {
  bounce: "assets/assets/sounds/ball-bounce.mp3",
  break: "assets/assets/sounds/break-sound.mp3",
};

function playSound(name) {
  const audio = new Audio(SOUND_PATHS[name]);
  audio.play().catch(() => {});
}
```

Conventions:

- `playSound(name)` crea una instancia nueva de `Audio` en cada llamada (no se reutiliza ni se cachea), para que los sonidos puedan sonar superpuestos.
- El `.catch(() => {})` evita errores de promesa no manejada si el navegador bloquea la reproducción (ej. si `playSound` se llamara antes del primer gesto de usuario).

## Implementation plan

1. Agregar `SOUND_PATHS` y la función `playSound(name)` en `js/game.js`. Prueba manual: recargar el juego, sin errores en consola.
2. Llamar `playSound('bounce')` dentro de `checkPaddleCollision()` inmediatamente después de confirmar `hitsPaddle`. Prueba manual: dejar que la pelota golpee la paleta y escuchar el sonido de rebote.
3. Llamar `playSound('bounce')` dentro de `updateBall()` en cada uno de los 3 rebotes de borde (izquierdo, derecho, superior), sin incluir el caso en que la pelota cae por debajo de la paleta (`loseLife()`). Prueba manual: la pelota rebota contra cada borde y se escucha el mismo sonido de rebote; al perder la pelota no suena nada.
4. Llamar `playSound('break')` dentro de `checkBrickCollision()`, en el mismo punto donde se marca `brick.alive = false` y se agrega la entrada a `state.explosions`. Prueba manual: romper un bloque y escuchar el sonido de rotura junto con la animación de explosión.
5. Verificar reproducción solapada: romper 2 o más bloques en sucesión rápida y confirmar que ambos sonidos se escuchan completos, sin cortarse entre sí. Prueba manual: mismo test manual, sin cambios de código adicionales (ya cubierto por `new Audio()` por llamada).

## Acceptance criteria

- [ ] Al golpear la paleta con la pelota, se escucha `ball-bounce.mp3`.
- [ ] Al rebotar contra el borde izquierdo, derecho o superior del canvas, se escucha `ball-bounce.mp3`.
- [ ] Al caer la pelota por debajo de la paleta (perder vida), no se reproduce ningún sonido de rebote.
- [ ] Al romper un bloque, se escucha `break-sound.mp3` en el mismo instante en que el bloque desaparece.
- [ ] Romper 2 o más bloques en sucesión rápida reproduce sus sonidos superpuestos, sin cortar el anterior.
- [ ] No suena ningún efecto antes de presionar Start, ni en las pantallas Game Over o You Win.
- [ ] No aparecen errores de autoplay en la consola durante el flujo normal (Start → jugar).

## Decisions

- **Sí:** `new Audio()` por reproducción en vez de reutilizar un único elemento `<audio>` por sonido. Permite solapar sonidos (rebotes rápidos, bloques rotos en cadena), lo cual pesa más que el ahorro de memoria en un juego de esta duración.
- **Sí:** mismo archivo (`ball-bounce.mp3`) para el rebote en la paleta y en los bordes. Solo existen 2 assets de audio en el repo, y conceptualmente ambos casos son "rebote de la pelota".
- **No:** agregar un tercer archivo de sonido distinto para el paddle. Fuera de alcance — se reutilizan los assets ya existentes en `assets/assets/sounds/`.
- **No:** control de volumen o mute. Mantiene el alcance acotado a los 3 eventos pedidos; se puede agregar en un spec futuro si se necesita.
- **Sí:** la reproducción real de audio comienza recién en `startGame()` (primer gesto de usuario), aunque los eventos que la disparan (`playSound`) queden definidos desde antes. Evita warnings de autoplay del navegador.

## What is **not** in this spec

- Música de fondo / soundtrack.
- Control de volumen o mute.
- Sonidos en las pantallas de Start, Game Over o You Win.
- Nuevos assets de audio.

Cada uno de estos, si se implementa, va en su propio spec.
