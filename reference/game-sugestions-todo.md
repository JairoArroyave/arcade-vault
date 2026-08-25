# Sugerencias de juegos — Arcade Vault

> Memoria del agente `game-planner` (`.claude/agents/game-planner.md`). Cada entrada es una
> sugerencia ya emitida: el agente la lee antes de proponer nada para no repetirse, y actualiza
> su estado cuando avanza. No editar a mano salvo para cambiar un `Estado`.

Estados: `Pendiente` · `En spec (specs/NN-slug.md)` · `Implementada` · `Descartada (razón)`

## Coste real de una fila nueva en `games`

Verificado contra el código en la tanda del 2026-08-25. `contract.md` §5-6 y
`reference/implemented-games.md:122` se quedan cortos: además del SQL aditivo manual, toda fila
nueva necesita **un bloque `.cover-*` nuevo en `app/globals.css`** (~10 líneas), porque
`components/GameCard.tsx:37` pinta `"cover-bg " + game.cover` como clase CSS y sin ella la
portada sale en negro. Además `color` está tipado a `cyan | magenta | yellow | green` en
`lib/games.ts:15` (y `GameCard.tsx:52-55` sólo estiliza `magenta` y `yellow`; `green` y `cyan`
caen al estilo por defecto), y `CATS` es unión cerrada en `components/GameLibrary.tsx:7`.

## Índice

| #   | Juego                   | Slot                        | Estado    | Fecha      |
| --- | ----------------------- | --------------------------- | --------- | ---------- |
| S01 | Frogger                 | `ranaria`                   | Pendiente | 2026-08-25 |
| S02 | Pac-Man                 | `gloton`                    | Pendiente | 2026-08-25 |
| S03 | Space Invaders          | `invasores`                 | Pendiente | 2026-08-25 |
| S04 | Duelo de esgrima vs CPU | `duelo-pixel`               | Pendiente | 2026-08-25 |
| S05 | 2048                    | `fusion` (fila nueva)       | Pendiente | 2026-08-25 |
| S06 | Buggy endless           | `dunas` (fila nueva)        | Pendiente | 2026-08-25 |
| S07 | Lunar Lander            | `alunizaje` (fila nueva)    | Pendiente | 2026-08-25 |
| S08 | Buscaminas arcade       | `campo-minado` (fila nueva) | Pendiente | 2026-08-25 |
| S09 | Pengo                   | `glaciar` (fila nueva)      | Pendiente | 2026-08-25 |
| S10 | Pipe Mania              | `tuberias` (fila nueva)     | Pendiente | 2026-08-25 |
| S11 | Missile Command         | `escudo-final` (fila nueva) | Pendiente | 2026-08-25 |
| S12 | Q\*bert                 | `piramide` (fila nueva)     | Pendiente | 2026-08-25 |
| S13 | Dr. Mario               | `virus` (fila nueva)        | Pendiente | 2026-08-25 |
| S14 | Dig Dug                 | `excavador` (fila nueva)    | Pendiente | 2026-08-25 |
| S15 | Bomberman 1P            | `detonante` (fila nueva)    | Pendiente | 2026-08-25 |
| S16 | Centipede               | `ciempies` (fila nueva)     | Pendiente | 2026-08-25 |
| S17 | Panel de Pon            | `panel-neon` (fila nueva)   | Pendiente | 2026-08-25 |
| S18 | Robotron 2084           | `horda` (fila nueva)        | Pendiente | 2026-08-25 |
| S19 | Donkey Kong             | `andamios` (fila nueva)     | Pendiente | 2026-08-25 |
| S20 | Tempest                 | `vortice` (fila nueva)      | Pendiente | 2026-08-25 |
| S21 | Track & Field           | `decatlon` (fila nueva)     | Pendiente | 2026-08-25 |

## Sugerencias

### S01 — Frogger → `ranaria`

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Slot:** `ranaria` (ARCADE · green · cover-rana) — fila existente, sin SQL
- **Fuente:** sin fuente → diseño desde cero (no queda material portable libre en
  `reference/juegos/`: `02` Asteroids, `03` Tetris y `04` Arkanoid ya están portados)
- **Por qué encaja:** la fila del catálogo ya describe literalmente Frogger ("salta entre
  carriles de coches y troncos a la deriva, llega a los nenúfares antes de que se acabe el
  tiempo"). Aporta tres mecánicas que el catálogo no tiene: evasión pura sin disparo,
  plataformas móviles que arrastran al jugador, y presión de temporizador. Comparte grilla con
  `serpentina` pero el movimiento es salto discreto con cooldown, no serpiente continua.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto, la proporción nativa de `.crt-screen`) — grilla de
  40 px: 16 columnas × 12 filas (fila 0 nenúfares, 1-5 río, 6 mediana, 7-10 carretera, 11 base)
- **Controles:** ← ↑ → ↓ y `W` `A` `S` `D` (salto de una celda con cooldown, igual criterio de
  doble mapeo que `serpentina`)
- **Puntaje:** 10 por cada fila nueva alcanzada hacia arriba (sólo el máximo histórico de la
  vida actual, para que no sea farmeable subiendo y bajando), 50 por nenúfar ocupado, bonus por
  tiempo restante al llegar, 500 al completar los cinco nenúfares y subir de nivel
- **Riesgos / esfuerzo:** ~300-400 líneas, en el rango de `tetris` (383) y por debajo de
  `asteroids` (558). Cero assets nuevos: todo dibujable por código. Punto a fijar en el spec:
  el temporizador se dibuja dentro del canvas (barra en la franja inferior) porque el HUD
  compartido no tiene slot de tiempo; no viola el contrato, que sólo prohíbe duplicar
  score/vidas/nivel en canvas. Segundo punto: la colisión con troncos exige arrastrar la
  posición del jugador en píxeles aunque el movimiento sea por celdas — mantener la posición en
  float y redondear sólo al dibujar.
- **Paleta (decidida por el usuario):** retro propia arcade, nunca recoloreada al neon — fondo
  `#0a0a12`, río `#1b3a6b`, carretera `#2a2a2a` con bordes `#4a4a4a`, mediana `#1e5a2e`, rana
  `#7fdb3f`, nenúfar `#2f8f4f`, troncos `#8a5a2b`, coches `#ff4040` `#ffcc00` `#ff8800`
  `#cc44ff`, barra de tiempo `#7fdb3f → #ff4040`.
- **Descartados en esta ronda:** _Space Invaders_ (`invasores`) — buen candidato, pero repite el
  eje "mover en horizontal y disparar" que ya cubre `rocas`, y los búnkeres destructibles suman
  esfuerzo sin mecánica nueva; queda como primer candidato de la próxima ronda (reconsiderado y
  aceptado en S03). _Pac-Man_ (`gloton`) — mecánicamente el más valioso pero el más caro con
  diferencia; reservado para cuando queden menos slots (reconsiderado y aceptado en S02).
  _Pong_ (`duelo-pixel`) — descartado, no pospuesto: su score es acotado (se juega a 11) y no
  alimenta un leaderboard monotónico, el modo 1P/2P de la `long` exige una pantalla previa de
  configuración que el contrato prohíbe, y dos jugadores en el mismo teclado no encajan con un
  ranking de un solo nombre; rescatarlo obligaría a rediseñarlo a "rallies sobrevividos", que
  ya es paleta-pelota y lo cubre `bloque-buster`.
- **Siguiente paso:** `/integrar-juego "Frogger para el slot ranaria — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S02 — Pac-Man → `gloton`

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Slot:** `gloton` (ARCADE · yellow · cover-glot) — fila existente, sin SQL
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** la fila del catálogo describe literalmente Pac-Man ("un círculo glotón
  patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada
  cierto tiempo aparece una píldora que invierte los papeles"). Aporta las dos mecánicas que
  ningún juego real tiene: **IA que persigue con personalidades distintas** e **inversión de
  roles temporal** por power-up. Comparte grilla con `serpentina`, pero el movimiento es continuo
  en píxeles con encarrilado por tiles, no salto celda a celda.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto) — grilla propia de 20 × 15 tiles de 32 px, simétrica
  en horizontal, con túnel lateral en la fila central. **No** se copia el laberinto arcade
  original (28 × 31) porque obliga a un canvas vertical.
- **Controles:** ← ↑ → ↓ y `W` `A` `S` `D`, con cola de giro: la dirección pedida se guarda y se
  aplica al llegar al centro del tile
- **Puntaje:** 10 por punto, 50 por píldora, cadena 200/400/800/1600 por fantasma comido durante
  el mismo susto, 100/300 por fruta; el nivel sube al limpiar el laberinto y acelera fantasmas y
  acorta el susto
- **Riesgos / esfuerzo:** el más caro de la tanda: 500-650 líneas, en el techo de lo existente
  (`asteroids` 558). Recortes que el spec debe fijar: cuatro fantasmas con targeting simplificado
  (persecución directa, emboscada con offset de 4 tiles, aleatorio con sesgo, patrulla de
  esquina), ciclo scatter/chase de dos fases con temporizador fijo, sin frenado en túnel ni
  "Cruise Elroy". Cero assets. Riesgo técnico real: los fantasmas deben decidir **sólo en el
  centro de una intersección** y tener prohibido el giro de 180°, si no tiemblan; y el "comer
  punto" debe resolverse por el tile del centro del sprite, no por caja de colisión.
- **Descartados en esta ronda (carril laberinto):** _Lode Runner_ (guardias con pathfinding por
  escaleras y cuerdas, y sobre todo niveles autorizados a mano: es contenido, no código);
  _Rally-X_ (perseguido en laberinto otra vez, sin mecánica nueva, y suma cámara con scroll,
  minimapa y combustible); _Mouse Trap_ (Pac-Man con puertas conmutables, redundante);
  _Amidar_ (regla difícil de leer sin tutorial y el HUD compartido no tiene dónde explicarla);
  _Heiankyo Alien_ (versión más pobre y menos reconocible de Dig Dug).
- **Siguiente paso:** `/integrar-juego "Pac-Man para el slot gloton — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S03 — Space Invaders → `invasores`

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Slot:** `invasores` (SHOOTER · green · cover-invaders) — fila existente, sin SQL y sin CSS
  nuevo
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** la `long` del slot ya describe el juego palabra por palabra, y
  `cover-invaders` ya es la portada correcta. En S01 se pospuso por parecerse a `rocas`; revisado
  el motor, el solape es superficial: `rocas` es nave con inercia, rotación y disparo 360° con
  wraparound; aquí el cañón está anclado al suelo en 1 eje, sin inercia, y las mecánicas nuevas
  son la **formación que acelera al perder miembros**, el **fuego enemigo descendente** y los
  **búnkeres destructibles por erosión** (primera destrucción de terreno del catálogo).
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto; el original 224×256 se reencuadra en horizontal para
  llenar la pantalla en vez de dejar bandas)
- **Controles:** ← → y `A` `D` mueven el cañón; `Espacio` dispara (máximo 1 bala propia en vuelo,
  como el original — es lo que crea el ritmo del juego)
- **Puntaje:** 10 / 20 / 30 por alienígena según la fila que ocupa en la formación inicial,
  50-300 aleatorio por el OVNI de la franja superior, y bonus por oleada limpia (100 × nivel).
  Monotónico y sin techo: cada oleada arranca una fila más abajo.
- **Riesgos / esfuerzo:** ~320-400 líneas, entre `tetris` y `arkanoid`. Cero assets externos: los
  sprites clásicos se dibujan desde arrays de bits 11×8 en el propio motor (dos frames por tipo).
  Puntos a fijar en el spec: (1) los búnkeres son máscaras de bloques 4 px, no rectángulos —
  erosionan por impacto propio y enemigo; (2) la velocidad de la formación depende del número de
  invasores vivos, no de un temporizador; (3) fin de partida cuando la formación toca el suelo,
  aunque queden vidas.
- **Descartados en esta ronda (carril disparo):** _Galaga/Galaxian_ (aporta picados con
  trayectorias curvas y tractor beam, no un eje nuevo; mejor como oleada bonus dentro de este
  mismo motor); _Defender_ (nave con empuje e inercia repite `rocas`, y el mundo con scroll +
  minimapa añade un tercio de código sin mecánica nueva); _Time Pilot_ (es `rocas` con enemigos
  en vez de rocas); _Xevious_ (el único que pide assets de terreno que no hay en el repo);
  _Gyruss_ (versión débil de Tempest); _Duck Hunt sin pistola_ (repite el apuntado de Missile
  Command con menos profundidad y score de galería estancado); _Battlezone_ (3D wireframe:
  duplica el motor más grande que existe).
- **Siguiente paso:** `/integrar-juego "Space Invaders para el slot invasores — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S04 — Duelo de esgrima contra la CPU → `duelo-pixel`

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Slot:** `duelo-pixel` (VERSUS · cyan · cover-duelo) — fila existente, sin `insert`, pero
  **sí requiere un `update games set short = …, long = …` manual** en el dashboard: el texto
  actual promete Pong ("Dos paletas. Una pelota", "modo solitario contra la CPU o partida local a
  dos jugadores") y Pong está descartado en esta memoria. `on conflict (id) do nothing` no
  reescribe filas existentes. `id`, `title`, `cat`, `cover`, `color` y `plays` se conservan; la
  `cover-duelo` (dos barras verticales enfrentadas, cyan vs magenta) sigue siendo válida leída
  como dos esgrimistas encarados.
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** rescata el único slot VERSUS sin romper el contrato, que es lo que hundió a
  Pong: un solo jugador contra una CPU, sin pantalla previa de modo, y con score acumulativo en
  vez de marcador acotado a 11. Aporta **duelo de timing con ventanas de reacción** (estocada /
  parada / retroceso) contra un oponente que endurece su tiempo de reacción cada asalto. Nada que
  ver con `bloque-buster`: no hay pelota ni rebote, el eje es la lectura del rival.
- **Capacidades:** `{ hasLives: true, hasLevel: true }` (vidas = tocados recibidos, 3; nivel =
  número de asalto)
- **Canvas lógico:** 640 × 480 (4:3 exacto)
- **Controles:** ← → avanzar/retroceder por la pista, `Espacio` estocada, `X` parada (guardia con
  ventana corta y recuperación penalizada para que espamear no funcione)
- **Puntaje:** 100 por tocado limpio, +150 si el tocado llega tras una parada exitosa (premia
  leer al rival), 250 por asalto ganado, bonus 500 por asalto ganado sin recibir tocado. Sin
  techo: los asaltos son infinitos y la CPU acelera.
- **Riesgos / esfuerzo:** ~300-380 líneas. Cero assets: dos siluetas de rectángulos + florete
  como línea, paleta cyan/magenta de la propia cover. El riesgo real es el **diseño de la IA**:
  debe sentirse leíble, no aleatoria — el spec debe fijar una máquina de estados explícita
  (espera → amaga → ataca → recupera) con tiempos publicados por nivel, no un `Math.random()` por
  frame. Segundo riesgo: las ventanas de parada y estocada deben calibrarse con `dt`, no contando
  frames.
- **Descartados en esta ronda:** _Pong_ — no reconsiderado, sigue descartado desde S01; el slot
  se rescata sin él.
- **Siguiente paso:** `/integrar-juego "Duelo de esgrima contra la CPU para el slot duelo-pixel — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S05 — 2048 → `fusion` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-fusion` nueva en
  `app/globals.css`.
  - `id`: `fusion`
  - `title`: `FUSIÓN`
  - `short`: `Desliza, fusiona y duplica hasta el colapso.`
  - `long`: `Cuatro por cuatro celdas y una sola regla: dos núcleos iguales que chocan se funden en uno del doble de potencia. Cada movimiento invoca un núcleo nuevo en un hueco al azar. Cuando no queden ni huecos ni fusiones posibles, se acabó.`
  - `cat`: `PUZZLE`
  - `cover`: `cover-fusion`
  - `color`: `yellow`
  - `plays`: `3.9K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** el eje **deslizar y fusionar** no existe en el catálogo y no se parece a
  nada: un input mueve el tablero entero, no una pieza. Es el motor más barato y menos arriesgado
  de toda la tanda, ideal como porte de bajo coste entre dos specs grandes. Score nativo de
  leaderboard (suma de fusiones, estrictamente creciente).
- **Capacidades:** `{ hasLives: false, hasLevel: true }` — nivel = `log2(fichaMáxima) − 1`
  (ficha 4 → nivel 1, 2048 → 10), así el HUD marca progreso real sin inventar fórmulas
- **Canvas lógico:** 640 × 480 — tablero 4 × 4 de celdas de 100 px centrado en (120, 40)
- **Controles:** ← ↑ → ↓ o `W` `A` `S` `D`
- **Puntaje:** suma del valor de cada ficha resultante de una fusión (regla clásica)
- **Riesgos / esfuerzo:** ~200-250 líneas, sin assets. **El riesgo no es técnico sino de encaje
  temático:** es de 2014 y de móvil, el único candidato que no es un clásico de salón; la `long`
  y el cover deben vestirlo de reactor de neón. Segundo punto: sin presión de tiempo una partida
  buena dura mucho y el botón FIN pasa a ser la salida habitual — verificar que guardar por FIN
  manual funciona igual que por derrota. Pulido: sin interpolación corta del deslizamiento
  (~100 ms) se ve seco.
- **Descartados en esta ronda:** _Rubik plano_ — score acotado, sin presión y resoluble por
  algoritmo memorizable: el leaderboard mediría paciencia, no habilidad.
- **Siguiente paso:** `/integrar-juego "2048 para una fila nueva fusion — diseño desde cero, 640x480, hasLevel sin vidas"`

---

### S06 — Buggy endless (Moon Patrol sin disparo) → `dunas` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-dunas` nueva en
  `app/globals.css`.
  - `id`: `dunas`
  - `title`: `DUNAS`
  - `short`: `Acelera, salta y no beses el cráter.`
  - `long`: `Un buggy de neón cruza un desierto infinito que corre bajo sus ruedas. Cráteres, rocas y rampas aparecen cada vez más juntos: acelera para saltar más lejos o frena para salvar el hueco justo. La arena no se acaba nunca; tú sí.`
  - `cat`: `ARCADE`
  - `cover`: `cover-dunas`
  - `color`: `yellow`
  - `plays`: `5.3K`
- **Fuente:** sin fuente → diseño desde cero (Moon Patrol **sin la parte de disparo**)
- **Por qué encaja:** único **endless de scroll lateral** posible, y aporta un eje de control que
  nadie más tiene: **la velocidad como decisión** (acelerar alarga el salto pero acorta el tiempo
  de reacción). El score por distancia es el más natural de todos para un salón de la fama, e
  infinito por construcción. Parallax por código, cero assets.
- **Capacidades:** `{ hasLives: true, hasLevel: true }` (3 buggies; nivel = sector cada 1000 m)
- **Canvas lógico:** 640 × 480 (4:3)
- **Controles:** → acelerar, ← frenar, `Espacio` saltar (arco dependiente de la velocidad actual)
- **Puntaje:** 1 punto por metro recorrido escalado por la velocidad (correr rápido paga), 50 por
  cráter saltado limpio, 500 por sector completado
- **Riesgos / esfuerzo:** ~250-320 líneas. El riesgo clásico del género: **la generación
  procedural debe garantizar que todo obstáculo sea salvable a la velocidad máxima alcanzable** —
  el spec debe fijar una distancia mínima entre obstáculos derivada del arco de salto, o el juego
  se vuelve injusto y el leaderboard, ruido. Salto y scroll por `dt`, nunca por frames.
- **Descartados en esta ronda:** _Excitebike_ (su valor es el editor de circuitos, prohibido por
  el contrato; sin él se degrada a esto mismo); _Road Fighter_ (el esquive de carriles ya lo
  cubre S01 y su único eje propio queda mejor servido aquí); _flappy de una tecla_ (más barato
  pero mecánica más delgada por casi el mismo coste).
- **Siguiente paso:** `/integrar-juego "Endless runner de buggy con acelerador y salto como fila nueva dunas — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S07 — Lunar Lander → `alunizaje` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-luna` nueva en
  `app/globals.css`.
  - `id`: `alunizaje`
  - `title`: `ALUNIZAJE`
  - `short`: `Posa el módulo sin reventarlo.`
  - `long`: `La gravedad tira hacia abajo, el combustible se agota y el terreno es una sierra de picos. Inclina el módulo, dosifica el empuje y toca la plataforma con la suavidad justa. Cada descenso limpio te manda a una luna más hostil.`
  - `cat`: `ARCADE`
  - `cover`: `cover-luna`
  - `color`: `cyan`
  - `plays`: `4.9K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** aporta la única **física de gravedad + recurso agotable (combustible) +
  precisión de aterrizaje** del catálogo, y un score de multiplicadores muy leaderboard-friendly.
  Terreno generado por código, cero assets, dibujo vectorial que casa con el tema CRT.
- **Capacidades:** `{ hasLives: true, hasLevel: true }` (3 módulos; nivel = luna, sube gravedad y
  achica la plataforma)
- **Canvas lógico:** 800 × 600 (4:3, misma resolución que `rocas`)
- **Controles:** ← → rotar, ↑ empuje (consume combustible; sin combustible sólo queda caer)
- **Puntaje:** base 50 por alunizaje válido × multiplicador de plataforma (×2 / ×5 según lo
  angosta que sea), +1 por unidad de combustible sobrante, + bonus creciente por nivel.
  Estrellarse cuesta una vida, no puntos: el score nunca baja.
- **Riesgos / esfuerzo:** ~280-350 líneas. **Riesgo principal: solapamiento parcial con `rocas`**
  — ambos son rotar + empujar una nave vectorial. La diferencia sustancial (gravedad constante,
  combustible finito, terreno con colisión, tolerancia de velocidad/ángulo al tocar, cero
  disparo, cero wrap-around) debe quedar explícita en el spec; si se recorta a "volar y no
  chocar", se convierte en un `rocas` peor. Segundo riesgo: el chequeo de aterrizaje válido
  (|vy|, |vx| y ángulo bajo umbral **y** sobre plataforma) tiene que ser generoso al principio o
  frustra en el primer intento.
- **Descartados en esta ronda:** _Marble Madness_ (pide control analógico/inclinación que no
  existe con teclado); _golf/billar de físicas_ (ritmo demasiado lento para arcade).
- **Siguiente paso:** `/integrar-juego "Lunar Lander como fila nueva alunizaje — diseño desde cero, 800x600, hasLives + hasLevel"`

---

### S08 — Buscaminas arcade → `campo-minado` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-minas` nueva en
  `app/globals.css`.
  - `id`: `campo-minado`
  - `title`: `CAMPO MINADO`
  - `short`: `Deduce dónde no pisar, contrarreloj.`
  - `long`: `Una rejilla sembrada de cargas ocultas y un cronómetro que no perdona. Revela celdas, lee los números y marca las cargas antes de que se agote el tiempo. Cada campo despejado siembra el siguiente con más minas y menos margen.`
  - `cat`: `PUZZLE`
  - `cover`: `cover-minas`
  - `color`: `magenta`
  - `plays`: `2.8K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** único eje de **deducción con información oculta** del catálogo: no hay
  reflejos ni destreza, hay inferencia bajo reloj. Reciclado como arcade endless (campos
  encadenados, no una partida única) para que el score deje de ser binario.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 — grilla 16 × 12 de celdas de 32 px centrada en (64, 48); franja
  inferior con minas restantes y barra de tiempo
- **Controles:** ← ↑ → ↓ mueven el cursor (con repetición rápida al mantener) · `Espacio` revela
  · `F` marca/desmarca bandera · `Enter` acorde (revela vecinos de un número ya satisfecho)
- **Puntaje:** 10 por celda revelada + 25 por mina correctamente marcada, × nivel · bonus por
  segundos restantes al despejar. Nivel = campos despejados: +4 minas y −5 s cada vez.
- **Riesgos / esfuerzo:** ~280-330 líneas, sin assets. **Recortes explícitos frente al
  original:** primer descubrimiento siempre seguro (las minas se siembran después del primer
  `Espacio`) y **3 vidas** en vez de muerte súbita, porque el buscaminas clásico tiene posiciones
  50/50 no deducibles y morir por azar en un leaderboard es inaceptable. Riesgo de UX real:
  navegar 192 celdas con flechas es más lento que con ratón, y el contrato prohíbe ratón/táctil;
  si se siente pesado, reducir la grilla a 12 × 9 antes que ampliarla.
- **Descartados en esta ronda:** _Nonogramas_ (sesiones de diez minutos, score acotado, contenido
  autoral); _Sokoban_ (score acotado + autoría manual o procgen verificable, riesgo alto);
  _Lights Out_ (tablero finito, resoluble por algoritmo conocido); _Simon_ (el score sería la
  longitud de secuencia, ~15-25 para todo el mundo: top-10 empatado, mismo motivo de descarte que
  Pong).
- **Siguiente paso:** `/integrar-juego "Buscaminas arcade para una fila nueva campo-minado — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S09 — Pengo → `glaciar` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-glaciar` nueva en
  `app/globals.css`.
  - `id`: `glaciar`
  - `title`: `GLACIAR`
  - `short`: `Empuja bloques de hielo y aplasta a los bichos.`
  - `long`: `Un pingüino de neón patina por un laberinto de bloques de hielo. Empuja un bloque y saldrá disparado hasta chocar: si hay un bicho en su camino, deja de ser un problema. Alinea los tres bloques de diamante para el bonus máximo.`
  - `cat`: `ARCADE`
  - `cover`: `cover-glaciar`
  - `color`: `cyan`
  - `plays`: `4.9K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** el laberinto es **material de ataque**, no decorado: empujar un bloque lo
  dispara por el pasillo hasta chocar, así que cada muro es cobertura y arma a la vez. Es la
  mecánica más barata del carril de laberinto y aun así aporta algo inexistente (empuje con
  deslizamiento y reconfiguración del mapa en vivo). El bonus por alinear los tres diamantes da
  un objetivo secundario que premia jugar bien, no jugar mucho.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto) — grilla 16 × 12 de celdas de 40 px con muro
  perimetral electrificable
- **Controles:** ← ↑ → ↓ y `W` `A` `S` `D` para moverse; `Espacio` empuja el bloque adyacente en
  la dirección encarada (si no puede deslizarse, lo rompe); `Espacio` contra el muro exterior lo
  hace vibrar y aturde a los bichos pegados a él
- **Puntaje:** 30 por bicho aplastado con un bloque, 100 por bicho aturdido y pisado, 500 / 1000
  / 5000 por alinear los tres diamantes según su posición, bonus por tiempo restante al limpiar
- **Riesgos / esfuerzo:** 320-380 líneas, comparable a `tetris`. Lo delicado es que **el
  deslizamiento del bloque es un estado animado propio**: mientras viaja, su celda de origen ya
  está libre pero la de destino aún no está ocupada, y la colisión con un bicho ocurre a mitad de
  recorrido, no en la grilla lógica — si se modela como salto instantáneo de celda, el juego
  pierde toda su gracia. **Riesgo de catálogo:** es el candidato menos reconocible de la tanda;
  si hay que sacrificar uno, este es el primero.
- **Siguiente paso:** `/integrar-juego "Pengo como fila nueva glaciar — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S10 — Pipe Mania → `tuberias` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-tuberias` nueva en
  `app/globals.css`.
  - `id`: `tuberias`
  - `title`: `TUBERÍAS`
  - `short`: `Traza la ruta antes de que el fluido te alcance.`
  - `long`: `Un fluido fosforescente avanza por la rejilla sin freno ni marcha atrás. Coloca tramos de tubería a contrarreloj para alargar su recorrido y encadenar metros. Un tramo mal puesto y todo se derrama.`
  - `cat`: `PUZZLE`
  - `cover`: `cover-tuberias`
  - `color`: `cyan`
  - `plays`: `5.7K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** aporta el único eje de **planificación espacial anticipada** del catálogo:
  no encajas piezas que caen (`caida`) ni te mueves por la grilla (`serpentina`), sino que
  construyes por delante de una amenaza que avanza sola. El cursor libre + cola forzada de piezas
  es un esquema de input que no existe hoy. Clásico de época (1989).
- **Capacidades:** `{ hasLives: false, hasLevel: true }`
- **Canvas lógico:** 640 × 480 — columna de cola de 5 piezas a la izquierda (x 8-64), tablero
  10 × 7 de celdas de 56 px desde (76, 44), franja inferior de 44 px para la barra de demora
- **Controles:** ← ↑ → ↓ mueven el cursor · `Espacio` coloca la pieza de cabeza de la cola (sobre
  una tubería ya puesta y aún no inundada, la reemplaza con penalización) · `Enter` acelera el
  flujo para cobrar el bonus de tiempo
- **Puntaje:** 50 por cada tramo que el fluido recorre × nivel · +250 al cumplir la meta de
  tramos del nivel · bonus por segundos ahorrados al acelerar
- **Riesgos / esfuerzo:** ~350-420 líneas. Cero assets: las siete piezas se dibujan con `arc()` y
  rectángulos. Lo delicado es el modelo de conexión (cada pieza como conjunto de aperturas
  N/S/E/O; el cruce se recorre en recto y admite ser inundado dos veces) y el avance del fluido
  en fracción de celda, no por saltos. Fin de partida: el fluido llega a una apertura sin
  continuación o al borde.
- **Descartados en esta ronda:** _Klax_ — atrapar fichas que caen se solapa con `caida` y
  `bloque-buster`, y sus "olas" con objetivos heterogéneos son varios modos dentro de un motor.
- **Siguiente paso:** `/integrar-juego "Pipe Mania para una fila nueva tuberias — diseño desde cero, 640x480, hasLevel sin vidas"`

---

### S11 — Missile Command → `escudo-final` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-escudo` nueva en
  `app/globals.css`.
  - `id`: `escudo-final`
  - `title`: `ESCUDO FINAL`
  - `short`: `Intercepta la lluvia de misiles antes del impacto.`
  - `long`: `Seis ciudades de neón duermen bajo un cielo que se rompe. Mueve la mira, lanza tus antimisiles y detona muros de fuego en el punto exacto. Cuando caiga la última ciudad, no habrá otra oleada.`
  - `cat`: `SHOOTER`
  - `cover`: `cover-escudo`
  - `color`: `cyan`
  - `plays`: `7.8K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** es el shooter más distinto de todo lo que hay: **no controlas un vehículo**.
  Aporta tres mecánicas inéditas — apuntado con retícula libre en 2D, defensa de objetivos que no
  eres tú (las ciudades), y explosiones que persisten y encadenan (el skill está en anticipar, no
  en reaccionar).
- **Capacidades:** `{ hasLives: true, hasLevel: true }` — "Vidas" se reporta como ciudades en pie
  (6 iniciales), "Nivel" como oleada. Encaja en el HUD compartido sin inventar stats nuevas.
- **Canvas lógico:** 640 × 480 (4:3)
- **Controles:** teclado puro, sin ratón (el contrato manda): ← ↑ → ↓ y `W` `A` `S` `D` mueven la
  retícula (velocidad constante, con aceleración leve al mantener); `Espacio` lanza desde la
  batería con munición más cercana a la mira; `1` `2` `3` fuerzan batería concreta. **Decisión de
  diseño clave:** el original es de trackball y hay que compensar la pérdida de precisión bajando
  algo la velocidad de los misiles enemigos en las primeras oleadas.
- **Puntaje:** 25 por misil enemigo interceptado × multiplicador de oleada (1× hasta la 2, 2×
  hasta la 4…), 5 por cada antimisil sin gastar al terminar la oleada, 100 por cada ciudad que
  sobrevive
- **Riesgos / esfuerzo:** ~350-430 líneas, en rango `arkanoid`. Cero assets (todo vectorial:
  estelas de línea, círculos de explosión con radio animado, ciudades como siluetas de bloques).
  Riesgos: (1) la colisión es "punto dentro de círculo en expansión", barata, pero hay que
  resolver el encadenado sin recursión infinita; (2) evitar que la retícula por teclado se sienta
  lenta — es lo que puede hundir el feel; (3) fin de partida cuando no queda ninguna ciudad, no
  cuando se acaba la munición.
- **Siguiente paso:** `/integrar-juego "Missile Command como fila nueva escudo-final — diseño desde cero, 640x480, hasLives (ciudades) + hasLevel (oleada)"`

---

### S12 — Q\*bert → `piramide` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-piramide` nueva en
  `app/globals.css`.
  - `id`: `piramide`
  - `title`: `PIRÁMIDE`
  - `short`: `Salta cubos y píntalos todos sin caer al vacío.`
  - `long`: `Una pirámide isométrica de veintiocho cubos flota sobre la nada. Cada salto cambia el color de la baldosa que pisas, mientras criaturas rebotan escaleras abajo detrás de ti. Un salto de más y caes fuera del mundo.`
  - `cat`: `ARCADE`
  - `cover`: `cover-piramide`
  - `color`: `yellow`
  - `plays`: `5.8K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** es el candidato **visualmente más distinto del catálogo**: el único render
  isométrico y el único movimiento en diagonal. La mecánica —pintar toda la superficie evitando
  al perseguidor— es evasión con objetivo constructivo, no recolección: complementa a Pac-Man en
  vez de repetirlo. El peligro doble (enemigo + borde del mundo) genera muertes por error propio,
  que es lo que hace adictivo el reintento.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto) — pirámide de 7 filas (28 cubos) en proyección
  isométrica, cubos de 64 × 64, discos de escape a ambos lados
- **Controles:** `Q` / `E` saltar arriba-izquierda / arriba-derecha, `A` / `D` saltar
  abajo-izquierda / abajo-derecha; flechas como alias con el mapeo rotado clásico
- **Puntaje:** 25 por cubo cambiado de color, 25 extra por cubo en los niveles de dos colores,
  300 por hacer caer a la serpiente usando un disco, 50 por disco sin usar al completar
- **Riesgos / esfuerzo:** 350-420 líneas. La lógica es barata; lo caro es el render isométrico
  (orden de pintado de atrás hacia adelante, offsets de cada cara) y el arco del salto, que es
  interpolación entre dos cubos con parábola, no teletransporte. **Riesgo de usabilidad:** el
  control diagonal desconcierta en los primeros 20 segundos; la guía de teclas va en la pantalla
  de detalle del juego, nunca dibujada en el canvas.
- **Siguiente paso:** `/integrar-juego "Q*bert como fila nueva piramide — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S13 — Dr. Mario → `virus` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-virus` nueva en
  `app/globals.css`.
  - `id`: `virus`
  - `title`: `VIRUS`
  - `short`: `Empareja colores y purga el frasco.`
  - `long`: `Cápsulas bicolor caen dentro de un frasco infestado. Alinea cuatro del mismo color para desintegrar los virus y vaciar el cristal, aprovechando las mitades huérfanas que se desploman. Cada frasco limpio llega con más infección y más velocidad.`
  - `cat`: `PUZZLE`
  - `cover`: `cover-virus`
  - `color`: `green` (nota: `GameCard.tsx:52-55` sólo estiliza `magenta` y `yellow`; `green` cae
    al estilo por defecto)
  - `plays`: `8.6K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** único candidato con **objetivo de limpieza** en vez de supervivencia: el
  tablero empieza sembrado y hay que vaciarlo, lo que le da al nivel un significado real (frasco
  terminado) en lugar de un contador de velocidad. Añade dos cosas que `caida` no tiene:
  emparejado por color en cuatro direcciones y gravedad en cascada de las mitades sueltas.
- **Capacidades:** `{ hasLives: false, hasLevel: true }`
- **Canvas lógico:** propuesto 480 × 640 (retrato) — **ver riesgo del canvas vertical abajo**
- **Controles:** ← → mover, ↓ caída suave, ↑ / `X` rotar, `Espacio` caída dura — mismo mapeo que
  `caida`, deliberadamente, para que el jugador no reaprenda nada
- **Puntaje:** 100 · 2^(n−1) por cada virus eliminado en la misma resolución (100/200/400/800…)
  × nivel · +1000 al limpiar el frasco. Nivel = frascos completados: +4 virus y caída más rápida
  cada vez.
- **Riesgos / esfuerzo:** ~350-400 líneas, sin assets. **Demérito principal: repite el eje "pieza
  que cae y encaja en grilla" que `caida` ya cubre.** Riesgo técnico: la resolución en cascada
  (eliminar → soltar mitades huérfanas → volver a comprobar) debe ser un bucle hasta estabilizar,
  y la rotación contra la pared del frasco necesita su regla de empuje. **Riesgo del canvas
  vertical:** el 480 × 640 se propuso citando a `caida` (450×600) y `bloque-buster` (480×640)
  como precedente, pero ese precedente está roto — `app/globals.css:625` fija
  `.crt-screen { aspect-ratio: 4/3 }` y la línea 714 estira el canvas sin `object-fit`, así que
  esos dos juegos se deforman ≈1.78× hoy. Antes de specear: arreglar el CSS o rediseñar a 4:3.
- **Descartados en esta ronda:** _Columns_ — es Tetris con color y pieza de tres, aporta todavía
  menos sobre el eje que `caida` ya ocupa; si se quiere un tercer juego de piezas que caen, Dr.
  Mario va primero.
- **Siguiente paso:** `/integrar-juego "Dr. Mario para una fila nueva virus — diseño desde cero, 480x640, hasLevel sin vidas"`

---

### S14 — Dig Dug → `excavador` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-excava` nueva en
  `app/globals.css`.
  - `id`: `excavador`
  - `title`: `EXCAVADOR`
  - `short`: `Cava túneles e infla monstruos hasta reventarlos.`
  - `long`: `Bajo tierra, cuatro capas de roca esconden criaturas que te persiguen por los túneles que tú mismo abres. Ínflalos con la bomba de aire o déjales caer una roca encima. Cuanto más profundo revientas, más vale cada estallido.`
  - `cat`: `ARCADE`
  - `cover`: `cover-excava`
  - `color`: `green`
  - `plays`: `6.9K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** el laberinto **lo construye el jugador**: no hay mapa fijo, cada partida
  esculpe su propio terreno y con él sus rutas de huida. Terreno destructible continuo, que
  ningún juego del catálogo tiene, y el multiplicador por profundidad da una curva de
  riesgo/recompensa clara. Añade física simple de rocas que caen.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto) — máscara de terreno en celdas de 8 px (80 × 60)
  sobre cuatro estratos de color; el jugador ocupa 3 × 3 celdas
- **Controles:** ← ↑ → ↓ y `W` `A` `S` `D` para moverse/cavar, `Espacio` para lanzar el arpón y
  mantener pulsado para inflar
- **Puntaje:** por monstruo reventado según el estrato en que muere (200 / 300 / 400 / 500), el
  doble si lo aplasta una roca, bonus por dos o más bichos con la misma roca
- **Riesgos / esfuerzo:** 450-520 líneas, con **tres subsistemas nuevos**: máscara de terreno
  excavable con colisión "sólo avanzo si la celda destino está vacía", arpón de alcance fijo con
  estado de inflado por enemigo, y rocas que caen al perder el soporte de tierra. Recorte
  recomendado: dejar fuera el modo en que los enemigos atraviesan la tierra como fantasmas.
  **Aviso:** el arpón **no es un disparo** (no hay proyectil libre ni puntería libre) — es un
  agarre de alcance fijo en la dirección encarada. Si el spec lo convierte en bala, el juego pisa
  a `rocas` y pierde su razón de estar en el catálogo.
- **Siguiente paso:** `/integrar-juego "Dig Dug como fila nueva excavador — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S15 — Bomberman (campaña 1P) → `detonante` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-detona` nueva en
  `app/globals.css`.
  - `id`: `detonante`
  - `title`: `DETONANTE`
  - `short`: `Coloca bombas, abre paredes y sobrevive la onda.`
  - `long`: `Un mecha diminuto siembra bombas de plasma en un laberinto de bloques frágiles. Cada explosión abre caminos, libera potenciadores y encadena detonaciones. Cuidado: tu propia onda expansiva no distingue amigos.`
  - `cat`: `ARCADE`
  - `cover`: `cover-detona`
  - `color`: `magenta`
  - `plays`: `7.3K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** aporta la mecánica más distinta del carril de laberinto respecto a Pac-Man:
  no es huir, es **denegación de área con retardo** — colocas un peligro que te puede matar a ti
  mismo y tienes que calcular la ruta de escape. Añade terreno destructible y encadenado de
  explosiones. El bucle "abrir paredes → potenciar el radio → limpiar enemigos" da progresión
  natural de nivel.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto) — grilla 16 × 12 de tiles de 40 px: borde
  indestructible, pilares fijos en celdas pares interiores, bloques frágiles al azar
- **Controles:** ← ↑ → ↓ y `W` `A` `S` `D` para moverse, `Espacio` para soltar bomba
- **Puntaje:** 10 por bloque frágil destruido, 100 por enemigo, 200 por potenciador recogido,
  bonus 500 al limpiar el nivel
- **Riesgos / esfuerzo:** 400-450 líneas. Puntos delicados: (1) el encadenado —una explosión que
  alcanza otra bomba la detona— es recursión y necesita marca de "ya detonada" para no ciclar;
  (2) el encarrilado del jugador a los pasillos de un tile (snap al eje perpendicular al entrar
  en un corredor), sin el cual el juego se siente atascado; (3) el radio de explosión se corta en
  el primer bloque. **Decisión de diseño obligatoria:** campaña de un jugador, sin modo VERSUS
  local — dos jugadores en el mismo teclado no encajan con un ranking de un solo nombre (mismo
  motivo que el descarte de Pong), y el contrato prohíbe la pantalla previa de selección de modo.
- **Siguiente paso:** `/integrar-juego "Bomberman de campaña 1P como fila nueva detonante — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S16 — Centipede → `ciempies` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-ciempies` nueva en
  `app/globals.css`.
  - `id`: `ciempies`
  - `title`: `CIEMPIÉS`
  - `short`: `Fumiga el jardín antes de que el bicho te alcance.`
  - `long`: `Un ciempiés de luz serpentea entre hongos hacia el fondo del jardín. Cada disparo lo parte en dos criaturas más rápidas y siembra el terreno de nuevos obstáculos. Sólo puedes moverte en la última franja.`
  - `cat`: `SHOOTER`
  - `cover`: `cover-ciempies`
  - `color`: `green`
  - `plays`: `11.3K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** aporta el eje "**tu propio disparo transforma el escenario**": cada hongo
  destruido o creado reescribe la ruta del ciempiés, así que el jugador construye su propio
  laberinto. Ningún juego actual tiene terreno mutable persistente. También es el único con
  **movilidad 2D confinada a una banda**, a medio camino entre el cañón fijo de S03 y la nave
  libre de `rocas`.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** propuesto 480 × 600 (retrato) — **ver riesgo del canvas vertical abajo**;
  grilla de 20 px: 24 columnas × 30 filas, el jugador se mueve en las filas 24-29
- **Controles:** ← ↑ → ↓ y `W` `A` `S` `D` (movimiento libre por píxel dentro de la banda),
  `Espacio` dispara hacia arriba (autofire con cadencia limitada)
- **Puntaje:** 1 por hongo destruido, 10 por segmento de ciempiés, 100 por cabeza, 300-900 por la
  araña según lo cerca que estuviera al morir. Sin techo: al limpiar el ciempiés aparece otro más
  rápido y con más cabezas independientes.
- **Riesgos / esfuerzo:** ~400-480 líneas. Recorte recomendado para la v1: **ciempiés + hongos +
  araña**, dejando pulga y escorpión fuera. Riesgos: (1) el ciempiés segmentado con partición en
  dos cadenas independientes es la parte delicada — modelarlo como lista de segmentos con
  dirección y "fila objetivo" propias, no como una serpiente que sigue a la cabeza; (2) solape
  conceptual con `rocas` (enemigo que se divide al dispararle) — real, pero el movimiento, el
  confinamiento y el terreno mutable lo alejan. **Riesgo del canvas vertical:** el 480 × 600 se
  propuso citando a `caida` y `bloque-buster` como precedente, pero ese precedente está roto (ver
  S13). Antes de specear: arreglar `app/globals.css` o rediseñar a 4:3.
- **Siguiente paso:** `/integrar-juego "Centipede como fila nueva ciempies — diseño desde cero, 480x600, hasLives + hasLevel"`

---

### S17 — Panel de Pon / Tetris Attack → `panel-neon` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-panel` nueva en
  `app/globals.css`.
  - `id`: `panel-neon`
  - `title`: `PANEL NEÓN`
  - `short`: `Intercambia y encadena antes de tocar el techo.`
  - `long`: `La pila de bloques sube desde el suelo y no se detiene nunca. Desliza pares en horizontal para alinear tres del mismo color y desatar cadenas en caída libre. Si una columna llega al techo, se apagan las luces.`
  - `cat`: `PUZZLE`
  - `cover`: `cover-panel`
  - `color`: `magenta`
  - `plays`: `7.3K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** es match-3 **sin pieza que cae**: el jugador nunca controla lo que entra,
  sólo reordena lo que ya está mientras la pila sube. Eje invertido respecto a `caida` (allí
  controlas la pieza y el tablero es pasivo; aquí el tablero es el que actúa). Aporta cadenas y
  multiplicadores, la mecánica de puntaje explosivo que le falta al catálogo, y una condición de
  derrota natural sin temporizador postizo.
- **Capacidades:** `{ hasLives: false, hasLevel: true }`
- **Canvas lógico:** propuesto 480 × 640 (retrato) — **ver riesgo del canvas vertical abajo**;
  tablero 6 × 12 de celdas de 48 px centrado en (96, 32)
- **Controles:** ← ↑ → ↓ mueven el cursor de 2 × 1 · `Espacio` intercambia el par · `Z` empuja la
  pila una fila hacia arriba (riesgo/recompensa)
- **Puntaje:** 10 por bloque eliminado × multiplicador de cadena (×2, ×4, ×8…) · +50 por combos
  de 4 o más en una sola resolución · bonus por empuje manual. Nivel sube cada 20 filas generadas
  y acelera el ascenso.
- **Riesgos / esfuerzo:** el más caro del carril puzzle, ~420-480 líneas. El punto crítico es la
  **cadena**: hay que marcar los bloques que caen a causa de una eliminación previa para propagar
  el multiplicador a la siguiente resolución; si eso se implementa mal, el juego "funciona" pero
  deja de ser Panel de Pon. Segundo punto: el swap debe poder hacerse mientras hay bloques
  cayendo (es parte del skill ceiling). **Riesgo del canvas vertical:** mismo problema que S13 y
  S16 — el precedente vertical está roto.
- **Descartados en esta ronda:** _Bejeweled / match-3 por swap_ (mismo input pero sin condición
  de derrota propia: obligaría a un temporizador postizo); _Puyo Puyo_ (sus cadenas quedan
  cubiertas aquí y su input repite el de `caida`).
- **Siguiente paso:** `/integrar-juego "Panel de Pon para una fila nueva panel-neon — diseño desde cero, 480x640, hasLevel sin vidas"`

---

### S18 — Robotron 2084 → `horda` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-horda` nueva en
  `app/globals.css`.
  - `id`: `horda`
  - `title`: `HORDA`
  - `short`: `Dispara en ocho direcciones y rescata a los últimos humanos.`
  - `long`: `Encerrado en una arena sin salida, una marea de autómatas converge sobre ti desde los cuatro costados. Muévete con una mano y dispara con la otra. Cada humano que saques con vida vale más que el anterior.`
  - `cat`: `SHOOTER`
  - `cover`: `cover-horda`
  - `color`: `yellow`
  - `plays`: `8.9K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** único **twin-stick** del catálogo, y el teclado es su control nativo (el
  arcade era dos joysticks, no ratón): moverse y apuntar se desacoplan por completo, algo que
  ningún juego actual pide. Añade el eje de **objetivo secundario opcional** (rescatar humanos)
  que compite con la supervivencia.
- **Capacidades:** `{ hasLives: true, hasLevel: true }` (nivel = ola)
- **Canvas lógico:** 640 × 480 (4:3), arena cerrada sin scroll ni wraparound
- **Controles:** `W` `A` `S` `D` mueven en 8 direcciones (sin inercia); ← ↑ → ↓ disparan en 8
  direcciones con fuego automático mientras se mantienen. Se apoya en el doble mapeo que ya usa
  `serpentina`, pero separando roles en vez de duplicándolos.
- **Puntaje:** 100 por grunt, 200 por cerebro, 25 por electrodo destruido, y rescate de humano
  con multiplicador escalonado 1000 → 2000 → 3000 → 4000 → 5000 dentro de la misma ola (se
  reinicia al cambiar de ola). Premia el riesgo, no la pasividad.
- **Riesgos / esfuerzo:** ~400-500 líneas. Advertencias: (1) es el que más entidades simultáneas
  maneja (60-80) — obliga a pools de objetos y colisión por círculo; (2) los hulks
  indestructibles complican el balance, recomendado dejarlos fuera de la v1; (3) es el que **más
  se solapa con `rocas`** en "disparar en todas direcciones", y por eso va al final de su carril:
  sin rotación, sin inercia y sin wraparound el feel cambia, pero el solape existe y hay que
  asumirlo.
- **Siguiente paso:** `/integrar-juego "Robotron 2084 como fila nueva horda — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S19 — Donkey Kong (plataformas de andamios) → `andamios` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-andamios` nueva en
  `app/globals.css`.
  - `id`: `andamios`
  - `title`: `ANDAMIOS`
  - `short`: `Trepa la torre esquivando barriles en llamas.`
  - `long`: `Una torre de vigas torcidas se pierde en la oscuridad y algo furioso lanza barriles desde arriba. Trepa escaleras, salta en el instante exacto y llega a la cima antes de que el andamio te trague. Cada torre conquistada escupe barriles más rápidos.`
  - `cat`: `ARCADE`
  - `cover`: `cover-andamios`
  - `color`: `magenta`
  - `plays`: `7.8K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** es el hueco de género más grande del catálogo. Ninguno de los cuatro juegos
  reales ni S01 tiene **gravedad, salto con arco y colisión contra plataformas**: `rocas` es
  inercia sin suelo, `caida` es grilla, `bloque-buster` es paleta, `serpentina` es grilla
  discreta, y Frogger salta celda a celda sin física. Suma escaleras y enemigos que caen por
  gravedad, no perseguidores con IA — así que no pisa el carril de laberinto.
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3). **No vertical**: la torre se resuelve con scroll vertical de
  cámara dentro del 640×480, precisamente para no repetir el problema de `bloque-buster`.
- **Controles:** ← → caminar, ↑ ↓ subir/bajar escaleras, `Espacio` saltar
- **Puntaje:** 100 por barril saltado (sólo si pasa por debajo del jugador, no farmeable), 200 por
  plataforma nueva alcanzada hacia arriba (máximo histórico de la vida, mismo criterio
  anti-farmeo que S01), 1000 al coronar la torre + bonus por tiempo restante
- **Riesgos / esfuerzo:** **el más caro del carril D**: 450-550 líneas, cerca de `asteroids`.
  Mitigación que el spec debe fijar: plataformas **horizontales planas, sin vigas inclinadas**
  (las rampas duplican la complejidad de colisión y de rodado de barriles), y barriles que bajan
  de piso por caída en los extremos, no por decisión aleatoria en cada escalera. Riesgo
  secundario: la colisión salto/escalera es el foco clásico de bugs de "quedarse pegado";
  resolver el jugador como AABB con estados `suelo | aire | escalera` mutuamente excluyentes.
- **Descartados en esta ronda:** _Ice Climber_ (otra vez plataformas verticales, redundante con
  este y más caro); _Circus Charlie_ (timing de saltos subsumido por este y por S06).
- **Siguiente paso:** `/integrar-juego "Plataformas de andamios estilo Donkey Kong como fila nueva andamios — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S20 — Tempest → `vortice` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-vortice` nueva en
  `app/globals.css`.
  - `id`: `vortice`
  - `title`: `VÓRTICE`
  - `short`: `Barre el borde del pozo antes de que trepen.`
  - `long`: `Patrullas el filo de un pozo geométrico mientras criaturas vectoriales suben por los carriles hacia ti. Dispara al fondo del abismo y guarda el superzapper para el instante exacto. Cada pozo deforma el tablero bajo tus pies.`
  - `cat`: `SHOOTER`
  - `cover`: `cover-vortice`
  - `color`: `magenta`
  - `plays`: `5.7K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** es el juego que mejor casa con la identidad **neon/CRT vectorial** del
  sitio — literalmente wireframe brillante sobre negro. Introduce un eje que no existe:
  **movimiento sobre un espacio 1D cerrado (el borde del pozo) con profundidad como segunda
  dimensión** — apuntas eligiendo carril y la amenaza avanza hacia ti en Z. Nada que ver con el
  plano cartesiano de todo lo demás.
- **Capacidades:** `{ hasLives: true, hasLevel: true }` (nivel = pozo)
- **Canvas lógico:** 640 × 480 (4:3)
- **Controles:** ← → y `A` `D` mueven la nave de carril en carril por el borde (con envolvimiento
  en los pozos cerrados, tope en los abiertos); `Espacio` dispara; `Shift` o ↓ lanza el
  superzapper (un uso por pozo)
- **Puntaje:** 50 por flipper, 100 por tanker (se parte en dos al morir), 150 por spiker, 200 por
  fuseball, más bonus de pozo completado (nivel × 100)
- **Riesgos / esfuerzo:** ~450-550 líneas — **el más caro del carril de disparo y el que más se
  acerca a `asteroids` (558)**. La geometría es el riesgo real. Mitigación: definir cada pozo como
  un array de vértices 2D del borde exterior + un punto de fuga, e interpolar linealmente hacia él
  por profundidad `z ∈ [0,1]` — proyección barata, sin matrices ni 3D. Recortar a 3-4 formas de
  pozo (círculo, cuadrado, cruz, línea abierta) que se repiten con paleta distinta, en vez de las
  16 del original.
- **Descartados en esta ronda:** _Gyruss_ — mismo eje "espacio 1D cerrado + profundidad" pero sin
  la variedad de pozos; si entra este, Gyruss no.
- **Siguiente paso:** `/integrar-juego "Tempest como fila nueva vortice — diseño desde cero, 640x480, hasLives + hasLevel"`

---

### S21 — Track & Field (dos pruebas) → `decatlon` (fila nueva)

- **Estado:** Pendiente
- **Fecha:** 2026-08-25
- **Fila nueva en `games`** — SQL aditivo manual + clase `.cover-pista` nueva en
  `app/globals.css`.
  - `id`: `decatlon`
  - `title`: `DECATLÓN`
  - `short`: `Machaca las teclas y bate tu propia marca.`
  - `long`: `Alterna dos teclas hasta que te ardan los dedos para lanzar al atleta por la pista de neón, y suelta el salto en el ángulo exacto. Cada prueba superada encadena la siguiente, más exigente. Aquí la gloria se mide en centésimas.`
  - `cat`: `ARCADE`
  - `cover`: `cover-pista`
  - `color`: `green`
  - `plays`: `3.4K`
- **Fuente:** sin fuente → diseño desde cero
- **Por qué encaja:** es el único candidato con un **eje de input completamente distinto**:
  ritmo/machaque alternado + timing de liberación, en vez de navegación espacial. Ningún juego del
  catálogo mide la cadencia del jugador. El encadenado de pruebas da progresión natural sin menús.
- **Capacidades:** `{ hasLives: true, hasLevel: true }` (vidas = intentos fallidos permitidos;
  nivel = número de prueba)
- **Canvas lógico:** 640 × 480 (4:3)
- **Controles:** `A` / `D` alternados para acumular velocidad, `Espacio` mantener y soltar para
  fijar el ángulo/impulso
- **Puntaje:** puntos por marca en cada prueba (metros o centésimas convertidas a puntos),
  acumulados prueba tras prueba sin techo; no clasificar termina la partida
- **Riesgos / esfuerzo:** el **más arriesgado de la tanda**, por eso va último. (1) El machaque de
  teclas es hostil en accesibilidad y en teclados de portátil, y hay que **filtrar el `repeat` de
  `keydown`** o mantener la tecla apretada haría trampa. (2) El contrato prohíbe pantallas
  previas, así que las pruebas deben **encadenarse automáticamente** con una transición corta
  dentro del propio bucle, sin menú de selección. (3) Cada prueba es casi un mini-motor: con tres
  ya son 350-450 líneas en un archivo; el spec debería arrancar con **dos** (100 m y salto de
  longitud) y dejar el resto para una ampliación posterior.
- **Descartados en esta ronda:** _Kaboom!_ (recoger bombas con cubos es el eje paleta horizontal
  que ya cubre `bloque-buster`); _Spy Hunter_ (dispara, y su esquiva de tráfico pisa a S01);
  _canasta / lanzamiento con medidor_ (el medidor de carga ya aparece aquí y el puntaje por tiro
  es de baja resolución para un ranking); _Sky Jinks / helicóptero-cueva_ (mecánica demasiado
  delgada).
