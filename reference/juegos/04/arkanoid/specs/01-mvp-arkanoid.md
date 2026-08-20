# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Implemented
> **Depends on:** (ninguno)
> **Date:** 2026-08-12
> **Objective:** Construir un MVP jugable de Arkanoid en el navegador: paleta controlada por teclado, bola con física de rebote, un único layout de bloques, puntaje, vidas y pantallas de inicio/game over/victoria.

## Scope

**In:**

- Canvas fijo de 480x640 px, sin build, HTML/CSS/JS vanilla.
- Un único layout de bloques: 7 filas x 8 columnas (56 bloques), una fila por cada color disponible en el spritesheet (`red`, `yellow`, `green`, `cyan`, `magenta`, `hotpink`, `gray`).
- Movimiento de la paleta con teclado (flechas izquierda/derecha), acotado a los límites del canvas.
- Física de la bola: rebote en paredes izquierda/derecha/superior y en la paleta; rebote y destrucción de bloques al impactarlos.
- Puntaje: cada bloque roto suma una cantidad fija de puntos, sin importar el color.
- Vidas: 3 vidas iniciales. Perder la bola (cae debajo de la paleta) resta una vida y reinicia la posición de la bola/paleta.
- Pantalla de inicio ("Start") que espera input del jugador antes de mover la bola.
- Pantalla de "Game Over" al llegar a 0 vidas, con score final y opción de reintentar.
- Pantalla de "You Win" al romper los 56 bloques, con score final y opción de reintentar.
- HUD visible durante la partida con score y vidas actuales.
- Reutilizar los assets existentes: `assets/assets/spritesheet.js` y `assets/assets/spritesheet-breakout.png` (sprites de `paddle`, `ball` y `blocks.<color>`).

**Out of scope (for future specs):**

- Niveles múltiples o progresión de niveles.
- Sonidos (`assets/assets/sounds/ball-bounce.mp3`, `break-sound.mp3`).
- Persistencia de high scores (localStorage u otro medio).
- Controles por mouse/touch.
- Power-ups.
- Diseño responsive / versión móvil.
- Puntaje variable por color de bloque.

## Data model

```js
// Estado global del juego, vive en memoria (sin persistencia)
const state = {
  screen: "start", // 'start' | 'playing' | 'gameover' | 'win'
  score: 0,
  lives: 3,
  paddle: { x: 159, y: 610, w: 162, h: 14, speed: 6 },
  ball: { x: 240, y: 596, radius: 8, dx: 3, dy: -3 },
  bricks: [
    // { x, y, w: 32, h: 16, color: 'red' | 'yellow' | 'green' | 'cyan' | 'magenta' | 'hotpink' | 'gray', alive: true }
  ],
};

const POINTS_PER_BRICK = 10;
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const BRICK_ROWS = 7;
const BRICK_COLS = 8;
```

Conventions:

- Origen de coordenadas: esquina superior izquierda del canvas.
- Velocidades de `paddle` y `ball` en píxeles/frame.
- Tamaños de sprites tomados de `SPRITES` en `assets/assets/spritesheet.js` (`paddle`: 162x14, `ball`: 16x16, bloques: 32x16 cada uno).
- El color de cada bloque determina qué sprite se dibuja (`SPRITES.blocks[color]`), pero no afecta el puntaje.

## Implementation plan

1. Crear `index.html` en la raíz: un `<canvas id="game" width="480" height="640">`, link a `css/style.css`, y carga en orden de `assets/assets/spritesheet.js` y luego `js/game.js`. Prueba manual: abrir el archivo en el navegador, ver un canvas vacío sin errores en consola.
2. En `js/game.js`, generar el array `bricks` (7x8) y dibujarlo en el canvas una vez que `loadSpritesheet` confirme que la imagen cargó, usando `drawSprite(ctx, 'block_' + color, x, y, w, h)`. Prueba manual: recargar y ver las 56 bloques pintados en sus colores.
3. Dibujar la paleta y la bola en sus posiciones iniciales usando `drawSprite`. Prueba manual: paleta y bola visibles en la parte inferior del canvas.
4. Implementar la pantalla de inicio: overlay con texto "Start" sobre el canvas mientras `state.screen === 'start'`; una tecla o click cambia `state.screen` a `'playing'` y oculta el overlay. Prueba manual: al cargar se ve el mensaje; al presionar una tecla desaparece y el juego pasa a estado "playing".
5. Implementar movimiento de la paleta con `ArrowLeft`/`ArrowRight`, respetando los límites del canvas (`0` y `CANVAS_WIDTH - paddle.w`). Prueba manual: la paleta se mueve y se detiene en los bordes.
6. Implementar el bucle de física de la bola cuando `state.screen === 'playing'`: movimiento por frame y rebote en paredes izquierda/derecha/superior. Si la bola cruza el borde inferior, no rebota (se maneja en el paso 8). Prueba manual: la bola rebota en las tres paredes y cae por abajo del canvas.
7. Implementar colisión bola-paleta (rebote reflejando según el punto de impacto) y colisión bola-bloque (marca el bloque como `alive: false`, suma `POINTS_PER_BRICK` a `state.score`, invierte la componente de velocidad correspondiente de la bola). Prueba manual: la bola rebota en la paleta y rompe bloques, el score sube de a 10 en 10.
8. Implementar pérdida de vida: cuando la bola cruza el borde inferior del canvas, `state.lives -= 1` y se reinician las posiciones de `ball` y `paddle`. Si `state.lives === 0`, `state.screen = 'gameover'`. Prueba manual: dejar caer la bola 3 veces y ver la pantalla "Game Over".
9. Implementar condición de victoria: cuando todos los elementos de `bricks` tienen `alive: false`, `state.screen = 'win'`. Prueba manual: romper los 56 bloques y ver la pantalla "You Win".
10. Implementar los overlays de "Game Over" y "You Win": muestran el score final y un texto/botón "Reintentar" que, al presionarse (tecla o click), reinicia `state` completo (score, vidas, bricks, posiciones) y pasa a `state.screen = 'playing'`. Prueba manual: desde cualquiera de las dos pantallas, reintentar deja el juego listo para jugar desde cero.
11. Implementar el HUD (score y vidas) visible sobre el canvas durante `state.screen === 'playing'` y actualizado en cada frame. Prueba manual: el HUD refleja en vivo los cambios de score y vidas.

## Acceptance criteria

- [ ] Abrir `index.html` en el navegador carga el canvas sin errores en consola.
- [ ] La pantalla inicial muestra un mensaje "Start" y la bola no se mueve hasta que el jugador da input.
- [ ] Las flechas izquierda/derecha mueven la paleta sin salir de los límites del canvas.
- [ ] La bola rebota en las paredes izquierda, derecha y superior.
- [ ] La bola rebota en la paleta.
- [ ] Al golpear un bloque, este desaparece del canvas y el score aumenta en 10 puntos.
- [ ] Perder la bola (cae debajo de la paleta) resta una vida y reinicia la posición de la bola y la paleta.
- [ ] Al llegar a 0 vidas se muestra la pantalla "Game Over" con el score final y una opción para reintentar.
- [ ] Al romper los 56 bloques se muestra la pantalla "You Win" con el score final y una opción para reintentar.
- [ ] Reintentar desde "Game Over" o "You Win" reinicia score, vidas, bloques y posiciones al estado inicial.
- [ ] El HUD muestra el score y las vidas actuales durante la partida.

## Decisions

- **Sí:** HTML/CSS/JS vanilla + Canvas, sin build. Coincide con `assets/assets/spritesheet.js`, que ya usa la Canvas API pura.
- **No:** Framework con build (React/Vite). Innecesario para el estado y la complejidad de este MVP.
- **Sí:** Controles solo por teclado (flechas). Simplicidad para el MVP; mouse/touch queda para otro spec.
- **Sí:** Un único layout de bloques (7 filas x 8 columnas, una fila por color). Progresión de niveles queda fuera de este spec.
- **Sí:** 3 vidas con pantalla "Game Over" y reintentar. Estándar del género y verificable.
- **Sí:** Puntaje fijo (10) por bloque, sin importar el color. Más simple de verificar que una tabla de puntos por color.
- **No:** Integrar `ball-bounce.mp3` / `break-sound.mp3` en este MVP. Aunque los archivos ya existen en el repo, el audio queda para un spec futuro para no mezclar alcance visual/físico con alcance de audio.
- **Sí:** Pantalla de inicio que espera input antes de mover la bola. Evita que la partida arranque sin que el jugador esté listo, y sirve de patrón reutilizable para "reintentar".
- **No:** Persistencia de high score (localStorage). El score vive solo en memoria durante la partida; se pierde al recargar.
- **Sí:** `index.html` + `js/game.js` + `css/style.css` en la raíz del repo. Rutas relativas simples hacia `assets/assets/`.
- **Sí:** Canvas fijo de 480x640 px. Tamaño clásico vertical, sin necesidad de recalcular físicas al redimensionar.

## What is **not** in this spec

- Niveles múltiples o progresión de niveles.
- Sonidos (`ball-bounce.mp3`, `break-sound.mp3`).
- Persistencia de high scores.
- Controles por mouse/touch.
- Power-ups.
- Diseño responsive / versión móvil.
- Puntaje variable por color de bloque.

Cada uno de estos, si se implementa, va en su propio spec.
