# SPEC 12 — Skins de Snake (`serpentina`)

> **Status:** Implemented
> **Depends on:** SPEC 09, SPEC 10
> **Date:** 2026-09-09
> **Objective:** Añadir las skins `neon` y `retro` al motor de Snake (`serpentina`) reutilizando el andamiaje ya montado en SPEC 10, consolidando su paleta en una tabla indexada por skin con `clasico` idéntico al render actual byte por byte, y cableando el 3er parámetro `skin` a través de `SerpentinaGame.tsx`.

---

## Por qué existe este spec

Cada juego real de Arcade Vault debe ofrecer tres skins: `clasico` (la paleta original del
motor, por defecto), `neon` (el tema cian/magenta/amarillo/verde del sitio) y `retro` (fósforo
CRT verde monocromo), todas legibles sobre el fondo negro con scanlines del `.crt-screen`.

SPEC 10 montó el andamiaje compartido y lo validó en `rocas`:

- `lib/games/types.ts` ya exporta `Skin = "clasico" | "neon" | "retro"`, `SKINS` y `DEFAULT_SKIN`.
- `components/games/types.ts` ya tiene `RealGameProps.skin: Skin`.
- `components/games/GamePlayerClient.tsx` ya tiene el selector de skin y la persistencia en
  `localStorage["av_skin"]`.
- `.claude/skills/integrar-juego/contract.md` §1 y §2 ya reflejan el 3er parámetro `skin`.
- `lib/games/asteroids/engine.ts` es el patrón de referencia: firma
  `createAsteroidsEngine(canvas, callbacks, skin = "clasico")`, tabla
  `const PALETTES: Record<Skin, RocasPalette>` interna al módulo, y glow por
  `ctx.shadowBlur` / `ctx.shadowColor` solo cuando `pal.glow > 0`.

Hoy `lib/games/serpentina/engine.ts` tiene su paleta escrita a mano como tres constantes de
módulo — `BG_COLOR = "#050505"`, `SNAKE_HEAD_COLOR = "#aaffaa"`, `SNAKE_BODY_COLOR = "#33ff33"` —
más los sprites de fruta que se dibujan con `drawImage` desde `public/games/serpentina/fruits.png`
a su color real. El motor ya recibe la prop `skin` por la cadena de SPEC 10, pero **la ignora**:
`SerpentinaGame.tsx` no la desestructura ni la pasa a `createSerpentinaEngine`, y la factory solo
acepta `(canvas, callbacks)`.

Este spec:

- Consolida la paleta de `serpentina` en una estructura `PALETTES: Record<Skin, SerpentinaPalette>`
  interna al motor, empezando por que `clasico` reproduzca el render actual **byte por byte**
  (mismos hex, mismo fondo `#050505`, y **sin** `shadowBlur` — el motor hoy no dibuja glow).
- Añade `neon` y `retro` para `serpentina` con hex fijados (sección Data model).
- Añade el 3er parámetro `skin: Skin = "clasico"` a `createSerpentinaEngine` y lo cablea por
  `SerpentinaGame.tsx` (el `useEffect` de creación pasa a depender de `[resetKey, skin]`).
- Documenta la decisión sobre las frutas: **no se recolorean en ninguna skin**, ni siquiera en
  `retro` monocromo — se dibujan siempre con su sprite a color real (continuidad con SPEC 09).

No toca el andamiaje compartido de SPEC 10 ni el contrato: `contract.md` §1/§2 ya quedaron
actualizados allí. `caida` y `bloque-buster` quedan para sus propios specs.

---

## Scope

**In:**

- `lib/games/serpentina/engine.ts`: firma `createSerpentinaEngine(canvas, callbacks, skin?)`,
  con una tabla `PALETTES: Record<Skin, SerpentinaPalette>` interna al módulo. Las tres
  constantes de color de módulo (`BG_COLOR`, `SNAKE_HEAD_COLOR`, `SNAKE_BODY_COLOR`) pasan a
  leerse del rol correspondiente de la paleta activa. `clasico` reproduce el render actual sin
  diferencias visibles.
- Glow opcional para la serpiente: cuando `pal.glow > 0`, envolver los `fillRect` de los
  segmentos con `ctx.shadowBlur = pal.glow` + `ctx.shadowColor` = color del segmento,
  restaurando `shadowBlur = 0` después; cuando `pal.glow === 0` no tocar `shadow*`.
- `components/games/SerpentinaGame.tsx`: desestructura `skin` de `RealGameProps` y lo pasa como
  3er argumento a `createSerpentinaEngine`; el `useEffect` que instancia el motor pasa a
  depender de `[resetKey, skin]`. El efecto de `[paused]` no cambia.
- Las tres paletas completas de `serpentina` con hex por rol (sección Data model).
- La decisión documentada sobre las frutas (color real, nunca recoloreadas).

**Out of scope (para specs futuros):**

- Tocar el andamiaje compartido de SPEC 10: el tipo `Skin`, `RealGameProps.skin`, el selector,
  la persistencia en `localStorage["av_skin"]` o `.claude/skills/integrar-juego/contract.md`.
- Recolorear o tintar los sprites de fruta de `public/games/serpentina/fruits.png`, o cualquier
  edición del spritesheet portado (`reference/snake-assets/` es de solo lectura).
- Recolorear el chrome del reproductor (`.crt-screen`, scanlines, viñeta, `.crt-bottom`), el
  HUD de React o la arena decorativa.
- Las skins `neon`/`retro` de `caida` y `bloque-buster` — cada una en su propio spec.
- Skins para los cuatro juegos decorativos (`gloton`, `invasores`, `ranaria`, `duelo-pixel`):
  cuando tengan motor deben nacer con las tres skins.
- Light mode del sitio (el proyecto es dark-only).
- Skins definidas por el usuario, editor de paletas, import/export de skins.
- Animar la transición entre skins (cross-fade del canvas). El cambio reinstancia el motor.
- Sonido, tests automatizados, cambios de esquema en Supabase.

---

## Data model

No hay persistencia nueva. La skin elegida ya vive en `localStorage["av_skin"]` gracias a
SPEC 10; este spec solo la consume dentro del motor de `serpentina`.

```ts
// lib/games/serpentina/engine.ts — nueva firma y estructura de paleta
import type { GameCallbacks, GameEngine, Skin } from "@/lib/games/types";

type SerpentinaPalette = {
  bg: string; // fillRect de fondo del tablero en draw()
  body: string; // fillRect de los segmentos del cuerpo (i > 0)
  head: string; // fillRect del segmento de cabeza (i === 0)
  glow: number; // ctx.shadowBlur de los segmentos (0 = sin glow); shadowColor = color del segmento
};

// La fruta NO tiene entrada en la paleta: se dibuja siempre con drawImage del atlas
// public/games/serpentina/fruits.png a su color real, en las tres skins (ver Decisions).
// Este motor no compone ningún color con alfa, así que no necesita un helper withAlpha
// (a diferencia de lib/games/asteroids/engine.ts).

const PALETTES: Record<Skin, SerpentinaPalette> = {
  clasico: {
    bg: "#050505",
    body: "#33ff33",
    head: "#aaffaa",
    glow: 0,
  },
  neon: {
    bg: "#000000",
    body: "#00ff88", // --green
    head: "#f5ff00", // --yellow
    glow: 8,
  },
  retro: {
    bg: "#000000",
    body: "#33ff33", // tono base de fósforo fijado en SPEC 09 / SPEC 10
    head: "#d8ffd8", // más claro que el cuerpo → jerarquía por brillo
    glow: 5,
  },
};

export function createSerpentinaEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin: Skin = "clasico",
): GameEngine;
```

```tsx
// components/games/SerpentinaGame.tsx — cableado del prop
export default function SerpentinaGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  resetKey,
  skin, // nuevo: de RealGameProps (SPEC 10)
}: RealGameProps) {
  // ...
  useEffect(() => {
    // ...
    const engine = createSerpentinaEngine(canvas, { /* callbacks */ }, skin);
    // ...
  }, [resetKey, skin]); // antes: [resetKey]
}
```

### `serpentina` — roles de color y las tres paletas

El motor de `serpentina` pinta **cuatro roles** (no hay grilla dibujada, ni texto/HUD dentro del
canvas, ni bordes; la separación entre celdas es geometría, no color):

| Rol                              | Origen en `engine.ts`                                             | `clasico` (actual)   | `neon`                  | `retro` (fósforo verde)             |
| -------------------------------- | ---------------------------------------------------------------- | -------------------- | ----------------------- | ----------------------------------- |
| Fondo del tablero                | `BG_COLOR` → `draw()` `fillRect(0,0,COLS*CELL,ROWS*CELL)`        | `#050505`            | `#000000`               | `#000000`                           |
| Cuerpo de la serpiente           | `SNAKE_BODY_COLOR` → `draw()` `fillStyle` para segmentos `i > 0` | `#33ff33`            | `#00ff88` (`--green`)   | `#33ff33`                           |
| Cabeza de la serpiente           | `SNAKE_HEAD_COLOR` → `draw()` `fillStyle` para segmento `i === 0`| `#aaffaa`            | `#f5ff00` (`--yellow`)  | `#d8ffd8`                           |
| Fruta / comida                   | `draw()` → `ctx.drawImage(fruitSheet, ...)` recorte de `fruits.png` | sprite a color real | sprite a color real     | sprite a color real                 |
| Separación de celdas (`CELL_GAP = 1`) | geometría: cada segmento se dibuja `CELL - 2` px            | hueco que revela `bg`| hueco que revela `bg`   | hueco que revela `bg`               |
| Glow (`ctx.shadowBlur`)          | — (no existe hoy)                                                | `0` (sin glow)       | `8`, `shadowColor` = color del segmento | `5`, `shadowColor` = color del segmento |

Notas de diseño:

- **`clasico`** es exactamente lo que dibuja el motor hoy: fondo `#050505` (no `#000`), cuerpo
  `#33ff33`, cabeza `#aaffaa`, frutas con su sprite a color real, y `glow = 0` (el motor actual
  nunca toca `shadowColor`/`shadowBlur`). No se "mejora". La separación cabeza/cuerpo es sutil
  (ambos verdes, `#aaffaa` apenas más claro que `#33ff33`) pero visible; es el render vigente y
  se congela byte por byte.
- **`neon`** conserva la lectura "la serpiente es verde" usando `--green` `#00ff88` para el
  cuerpo, y separa la cabeza con `--yellow` `#f5ff00`: diferencia de **tono y de brillo** a la
  vez, más nítida que un segundo verde. Ambos superan con holgura el 3:1 exigido a siluetas
  sobre `#000` incluso con las scanlines multiplicando encima. `--cyan`, `--magenta` e `--ink`
  no se usan: el motor solo pinta tres roles de color y las 22 frutas aportan el resto de la
  gama cromática. El `shadowBlur 8` es refuerzo: quitándolo, cabeza y cuerpo siguen
  distinguiéndose por tono.
- **`retro`** colapsa la serpiente a fósforo verde y resuelve la jerarquía por **brillo**, no
  por tono: fondo `#000` < cuerpo `#33ff33` (tono base) < cabeza `#d8ffd8` (tramo más claro).
  La escalera cabeza/cuerpo queda más marcada que en `clasico` (`#d8ffd8` vs `#aaffaa`). Verde
  (no ámbar) por consistencia con el `retro` ya fijado en SPEC 09 y SPEC 10 y con el LED verde
  de `.crt-bottom`. La fruta a color real es el único elemento no-fósforo en pantalla: el
  objetivo siempre resalta.

---

## Implementation plan

1. **Consolidar la paleta de `serpentina` indexada por skin, empezando por `clasico`.** En
   `lib/games/serpentina/engine.ts`: importar `Skin` de `@/lib/games/types`; añadir el tipo
   `SerpentinaPalette` y la tabla `PALETTES` con las tres entradas de la sección Data model;
   añadir el 3er parámetro `skin: Skin = "clasico"` a `createSerpentinaEngine` y `const pal =
   PALETTES[skin]`. Sustituir en `draw()` el uso de `BG_COLOR` por `pal.bg`, y el ternario
   `i === 0 ? SNAKE_HEAD_COLOR : SNAKE_BODY_COLOR` por `i === 0 ? pal.head : pal.body`. Dejar
   `CELL_GAP` y la geometría de los `fillRect` intactos; dejar el `drawImage` de la fruta
   intacto. `SerpentinaGame.tsx` sigue llamando al motor sin el 3er argumento, así que el
   default `clasico` mantiene el comportamiento.
   _Verificación:_ con skin `clasico` (default), `/games/serpentina/play` es idéntico al render
   previo: fondo `#050505`, cuerpo `#33ff33`, cabeza `#aaffaa`, frutas con su sprite a color
   real, sin glow. `npm run build` sin errores.

2. **Glow opcional para la serpiente.** En `draw()`, cuando `pal.glow > 0`, antes del bucle de
   segmentos fijar `ctx.shadowBlur = pal.glow` y por cada segmento `ctx.shadowColor = (i === 0 ?
   pal.head : pal.body)`; tras el bucle restaurar `ctx.shadowBlur = 0`. Cuando `pal.glow === 0`
   no tocar `shadow*` en absoluto. No aplicar glow al `drawImage` de la fruta.
   _Verificación:_ con `clasico` el juego sigue sin glow y pixel a pixel idéntico; no queda
   `shadowBlur` residual afectando el dibujo de la fruta ni el fondo. `npm run build` sin errores.

3. **Skins `neon` y `retro` disponibles en el motor.** No requiere código nuevo si los pasos 1
   y 2 dejaron `PALETTES` completo; este paso es la verificación visual forzando el skin a mano
   (temporalmente) en el wrapper.
   _Verificación:_ forzando `skin="neon"` el tablero se dibuja con fondo negro, cuerpo `#00ff88`,
   cabeza `#f5ff00` y bloom; forzando `skin="retro"`, cuerpo `#33ff33`, cabeza `#d8ffd8`, bloom
   suave y fondo `#000`. En ambas, las frutas se ven a su color real. Revertir el forzado.

4. **Prop `skin` en el wrapper.** `SerpentinaGame.tsx` desestructura `skin` de `RealGameProps` y
   lo pasa como 3er argumento a `createSerpentinaEngine`. El `useEffect` que crea el motor pasa
   a tener `[resetKey, skin]` como dependencias: cambiar de skin destruye y recrea el motor
   (reset completo de la partida), igual que "JUGAR DE NUEVO". El efecto de `[paused]` no cambia.
   _Verificación:_ cambiar el valor de `skin` pasado desde el reproductor reinstancia el canvas
   con la paleta nueva; navegar dentro y fuera de `/games/serpentina/play` repetidamente no
   duplica el listener de `keydown` ni deja loops de `requestAnimationFrame` vivos.

5. **Regresión visual de `serpentina` en las tres skins.** Jugar una partida en `clasico`,
   `neon` y `retro`: en `clasico` el render coincide con el de antes; en las tres, PAUSA
   congela el último frame, chocar (pared o cuerpo) abre el mismo modal de FIN, "JUGAR DE NUEVO"
   reinicia por `resetKey`, el HUD (puntaje y nivel, `hasLevel: true`), la resolución lógica
   (600×450) y los controles son idénticos entre skins, la cabeza se distingue del cuerpo, y la
   fruta se dibuja siempre a color real. Confirmar que `caida`, `bloque-buster` y los juegos
   decorativos no cambian.
   _Verificación:_ checklist de Acceptance criteria completa.

Revisión final: `npm run lint` y `npm run build` sin errores.

---

## Acceptance criteria

- [ ] `createSerpentinaEngine` acepta un 3er parámetro `skin: Skin = "clasico"` y no rompe a ningún llamador que no lo pase.
- [ ] `SerpentinaGame.tsx` desestructura `skin` de `RealGameProps` y lo pasa al motor; el `useEffect` de creación depende de `[resetKey, skin]` y el de `[paused]` no cambia.
- [ ] Con skin `clasico`, `/games/serpentina/play` se ve **idéntico** al render previo a este spec: fondo `#050505`; cuerpo `#33ff33`; cabeza `#aaffaa`; frutas con su sprite a color real; sin `shadowBlur` (chequeo de regresión).
- [ ] La skin `neon` de `serpentina` dibuja: fondo `#000000`, cuerpo `#00ff88` (`--green`), cabeza `#f5ff00` (`--yellow`), con `shadowBlur 8` de refuerzo; frutas a color real.
- [ ] La skin `retro` de `serpentina` dibuja: fondo `#000000`, cuerpo `#33ff33` (tono base), cabeza `#d8ffd8` (más clara que el cuerpo → jerarquía por brillo), con `shadowBlur 5`; frutas a color real.
- [ ] En las tres skins la cabeza se distingue del cuerpo: por tono y brillo en `neon`, por brillo en `clasico` y `retro`.
- [ ] Las tres skins cumplen los cinco criterios de legibilidad sobre el `.crt-screen` (fondo `#000` + scanlines `multiply` ~18% + viñeta): contraste ≥ 3:1 para los segmentos (siluetas) contra `#000`; ninguna entidad jugable comparte tono con el fondo; quitar el glow no vuelve indistinguibles cuerpo, cabeza y fruta; en `retro` la jerarquía se resuelve por brillo; y ninguna skin altera resolución, gameplay ni HUD.
- [ ] Las frutas se dibujan con su sprite a color real en las tres skins; `public/games/serpentina/fruits.png` no se modifica ni se tinta.
- [ ] Cambiar de skin no altera la resolución lógica (600×450), la velocidad por nivel, los controles, el sistema de puntos (10 por fruta, nivel cada 5 frutas) ni el HUD/chrome del reproductor.
- [ ] La skin elegida se persiste en `localStorage["av_skin"]` (andamiaje de SPEC 10, sin cambios aquí) y se respeta al recargar y al volver a entrar a `/games/serpentina/play`.
- [ ] El andamiaje compartido de SPEC 10 (tipo `Skin`, `RealGameProps.skin`, selector, persistencia, `contract.md`) no se modifica en este spec.
- [ ] `caida`, `bloque-buster` y los juegos decorativos no cambian su render.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** `skin` entra como 3er parámetro opcional de la factory (`createSerpentinaEngine(canvas, callbacks, skin = "clasico")`), igual que `createAsteroidsEngine` en SPEC 10. Razón: reutiliza el contrato ya establecido; el motor no necesita un método `setSkin` porque el wrapper ya sabe recrear la instancia.
- **Sí:** cambiar de skin **reinstancia** el motor (el `useEffect` de creación depende de `[resetKey, skin]`), reiniciando la partida en curso. Razón: idéntico a `rocas`; evita un método `setSkin` y el riesgo de estado a medio recolorear; elegir skin es una acción previa a jugar.
- **No:** recolorear las frutas en ninguna skin, ni siquiera en `retro` monocromo — se dibujan siempre con su sprite a color real desde `fruits.png`. Razón: (1) continuidad con SPEC 09, que ya decidió "las frutas se dibujan con su sprite a color real, nunca recoloreadas al tema"; (2) legibilidad: un sprite tinteado a verde fósforo en `retro` se fundiría con la serpiente y el tablero verdes y perdería el contraste interno del que dependen los recortes (semillas de una fresa, un racimo de uvas), mientras que a color real la fruta es lo único que no es del tono de la skin y el objetivo siempre resalta; (3) el spritesheet es asset portado de solo lectura y no se toca, y se evita `ctx.filter`/compositing por sprite. En `retro` se encuadra como diseño: el único color no-fósforo en pantalla es el objetivo.
- **Sí:** `retro` en verde fósforo con `#33ff33` como tono base del cuerpo (fijado en SPEC 09 y SPEC 10), no ámbar. Razón: una sola identidad "CRT verde" en todo el vault y coherencia con el LED verde de `.crt-bottom`.
- **Sí:** en `retro` la cabeza es `#d8ffd8` (más clara que el cuerpo `#33ff33`) y el fondo baja a `#000000`. Razón: `serpentina` en `clasico` ya es fósforo verde, así que el aporte real de `retro` no es un cambio de tono sino la jerarquía por brillo cabeza/cuerpo más marcada que en `clasico` (`#d8ffd8` vs `#aaffaa`), el bloom `shadowBlur 5` y el negro puro.
- **Sí:** en `neon` el cuerpo es `#00ff88` (`--green`) y la cabeza `#f5ff00` (`--yellow`). Razón: `--green` conserva la lectura "la serpiente es verde" con un color del tema; la cabeza amarilla se separa del cuerpo por tono **y** por brillo, con contraste holgado sobre `#000` aun con scanlines, más nítida que un segundo verde. `--cyan`, `--magenta` e `--ink` no se usan: el motor solo pinta tres roles de color y las frutas aportan el resto de la gama.
- **Sí:** `clasico` conserva el fondo `#050505` (no `#000000`) byte por byte. Razón: es lo que dibuja el motor hoy; `clasico` no se "mejora". `neon` y `retro` sí llevan el fondo a `#000000`, como `rocas`.
- **No:** añadir un rol de grilla o líneas de celda. Razón: el motor no dibuja grilla; el efecto de celdas es el hueco de `CELL_GAP = 1` que revela el fondo entre segmentos. Se preserva la geometría; ninguna skin pinta líneas.
- **No:** usar un helper `withAlpha` en este motor. Razón: a diferencia de `rocas`, `serpentina` no compone ningún color con alfa (todos los rellenos son sólidos, sin `rgba` ni alfa dinámico); el helper no hace falta.
- **No:** tocar el andamiaje compartido de SPEC 10, el chrome del reproductor, el HUD de React o las skins de otros juegos. Razón: este spec solo consolida la paleta del motor de `serpentina` y cablea su 3er parámetro.

---

## Risks

| Riesgo                                                                                                                                              | Mitigación                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al reemplazar `BG_COLOR` / `SNAKE_HEAD_COLOR` / `SNAKE_BODY_COLOR` por `PALETTES[skin]`, `clasico` podría derivar del render actual (un hex mal copiado, un glow colado, fondo a `#000` en vez de `#050505`). | Los hex de `clasico` en Data model se copian de `lib/games/serpentina/engine.ts` verbatim (`#050505`, `#33ff33`, `#aaffaa`); `glow: 0` no toca `shadow*`; el Paso 1 exige verificación visual pixel a pixel con el default. |
| Las frutas a color real sobre un tablero verde (`retro`) o negro (`neon`) podrían leerse como "fuera de skin".                                        | Aceptado y encuadrado como diseño: la fruta es el objetivo y debe resaltar siempre; a color real nunca se funde con la serpiente en ninguna skin. Coherente con SPEC 09.                                                     |
| `serpentina` en `clasico` ya es fósforo verde, así que `retro` aporta poco cambio de tono (igual que `rocas`).                                        | Aceptado: `retro` sigue siendo obligatorio; su valor es la jerarquía por brillo cabeza/cuerpo más marcada, el bloom `shadowBlur 5` y el fondo `#000` puro (frente al `#050505` de `clasico`).                                |
| El `shadowBlur` (8 en `neon`, 5 en `retro`) podría rellenar el hueco de 1px entre segmentos y difuminar la lectura de "celdas".                       | El blur es modesto (≤ 8) y se aplica sobre `fillRect` de 28 px; el hueco de 1px sigue leyéndose. Si en pruebas se pierde, bajar `neon` a 6 sin cambiar la identidad.                                                          |
| Las scanlines `multiply` (~18%) y la viñeta (esquinas hasta `rgba(0,0,0,0.65)`) comen luminancia; un color válido en teoría puede quedar flojo en las esquinas del canvas. | Las tres paletas se fijan con contraste holgado sobre `#000` (mínimo efectivo ~12:1 tras el knockdown); `neon` mantiene el glow como refuerzo y `retro` mantiene la cabeza en el tramo más claro de la escalera.             |
| `RealGameProps.skin` ya es requerido (SPEC 10) y `SerpentinaGame` hoy lo ignora; si el wrapper no lo consume, el selector no afectaría a `serpentina`. | El Paso 4 cablea `skin` en el wrapper y sus dependencias `[resetKey, skin]`; un criterio de aceptación verifica que cambiar de skin en el reproductor reinstancia el canvas con la paleta nueva.                              |

---

## What is **not** in this spec

- Tocar el andamiaje compartido de SPEC 10 (tipo `Skin`, `RealGameProps.skin`, selector, persistencia en `localStorage["av_skin"]`, `contract.md`).
- Recolorear o tintar los sprites de fruta de `public/games/serpentina/fruits.png`, o editar el spritesheet portado.
- Recolorear el chrome del reproductor (`.crt-screen`, scanlines, viñeta, `.crt-bottom`), el HUD de React o la arena decorativa.
- Las skins `neon`/`retro` de `caida` y `bloque-buster`.
- Skins para los cuatro juegos decorativos sin motor.
- Light mode del sitio.
- Skins personalizadas por el usuario, editor de paletas, import/export.
- Animar la transición entre skins.
- Sonido, tests automatizados, cambios de esquema en Supabase.

Cada uno de estos, si se necesita, va en su propio spec.
