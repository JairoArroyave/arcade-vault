# SPEC 11 — Skins de `bloque-buster` (Arkanoid)

> **Status:** Implemented
> **Depends on:** SPEC 08, SPEC 10
> **Date:** 2026-09-09
> **Objective:** Añadir las skins `neon` y `retro` al motor de Arkanoid (`bloque-buster`) reutilizando el andamiaje compartido de SPEC 10, dejando `clasico` idéntico byte por byte al render actual del spritesheet y recoloreando paleta/pelota/ladrillos/explosiones/overlay de forma legible sobre el fondo negro con scanlines del `.crt-screen`.

---

## Por qué existe este spec

SPEC 10 montó el andamiaje compartido del sistema de skins y lo validó en un solo motor
(`rocas`): el tipo `Skin = "clasico" | "neon" | "retro"` con `SKINS`/`DEFAULT_SKIN`
(`lib/games/types.ts`), el prop `skin: Skin` en `RealGameProps`, el selector + persistencia en
`localStorage["av_skin"]` dentro de `GamePlayerClient`, y el texto nuevo de `contract.md` §1/§2
(la factory del motor recibe un 3er parámetro `skin`). SPEC 10 dejó explícitamente `caida`,
`bloque-buster` y `serpentina` para specs siguientes.

Este spec cubre `bloque-buster`. Su motor (`lib/games/arkanoid/engine.ts`, SPEC 08) es el
primero —y hoy el único— que **no dibuja nada vectorial**: paleta, pelota, los 7 colores de
ladrillo y las animaciones de explosión salen enteros de
`public/games/bloque-buster/spritesheet-breakout.png` vía `ctx.drawImage`, con el mapa de
coordenadas de `lib/games/arkanoid/sprites.ts` (`SPRITES`, `EXPLOSION_FRAMES`) y el enum
`BlockColor` (`red | yellow | green | cyan | magenta | hotpink | gray`, uno por fila del
tablero). Lo único que el motor pinta con literales de color es el overlay de selección de
dificultad (`drawStartOverlay`): un scrim `rgba(0,0,0,0.6)` y el texto `#fff`. No hay HUD ni
fondo (el `draw()` hace `clearRect`, así que el negro es el del `.crt-screen`).

Recolorear un juego atado a un PNG no es cambiar hex: hay que **teñir el spritesheet**. Este
spec fija la técnica (atlas teñido offscreen construido una vez al cargar la imagen), las tres
paletas de `bloque-buster` con hex por rol, y el cableado del 3er parámetro `skin` por
`ArkanoidGame.tsx`. `clasico` sigue siendo exactamente el render actual (sprite sin tocar,
`glow` 0), así que el contrato de SPEC 10 se mantiene: el default preserva la paleta original.

---

## Scope

**In:**

- `lib/games/arkanoid/engine.ts`:
  - Firma `createArkanoidEngine(canvas, callbacks, skin: Skin = "clasico")` (3er parámetro, mismo
    patrón que `createAsteroidsEngine`).
  - Tabla `const PALETTES: Record<Skin, ArkanoidPalette>` interna al módulo (sección Data model).
  - Helper puro `withAlpha(hex, a)` (idéntico al de `lib/games/asteroids/engine.ts`), para el
    scrim del overlay si una skin lo ajusta.
  - Construcción, una sola vez dentro de `image.onload` y solo cuando `pal.tint` no es `null`, de
    un **atlas teñido offscreen** (`HTMLCanvasElement` del mismo tamaño que el PNG) con cada
    sprite recoloreado por rol. `drawSprite`/`drawFrame` pasan a leer de `tinted ?? image`.
  - Glow opcional (`ctx.shadowBlur = pal.glow` + `shadowColor` = color del rol) alrededor de
    `drawImage` cuando `pal.glow > 0`; restaurado después. Con `pal.glow === 0` no se toca
    `shadow*` (comportamiento actual de `clasico`).
  - `drawStartOverlay` lee `pal.overlayScrim` y `pal.overlayText` en vez de los literales
    `"rgba(0, 0, 0, 0.6)"` / `"#fff"`.
- `components/games/ArkanoidGame.tsx`: acepta `skin` de `RealGameProps`, lo pasa como 3er
  argumento a `createArkanoidEngine`, y el `useEffect` que instancia el motor pasa a depender de
  `[resetKey, skin]` (cambiar de skin reinstancia el motor, igual que "JUGAR DE NUEVO"). El
  efecto de `[paused]` no cambia.
- Las tres paletas completas de `bloque-buster` con hex por rol (sección Data model).

**Out of scope (para specs futuros):**

- Tocar el andamiaje compartido de SPEC 10: el tipo `Skin`, `RealGameProps`, el selector de skin,
  la persistencia en `localStorage["av_skin"]`, o el texto de `contract.md` §1/§2 (ya reflejan el
  3er parámetro).
- Las skins `neon`/`retro` de `caida` y `serpentina` — cada una en su propio spec.
- Recolorear el chrome del reproductor (`.crt-screen`, scanlines, viñeta, `.crt-bottom`), el HUD
  de React o la arena decorativa de los juegos sin motor.
- Skins para los cuatro juegos decorativos (`gloton`, `invasores`, `ranaria`, `duelo-pixel`):
  cuando se implementen deben nacer con las tres skins.
- Reemplazar el spritesheet por dibujo vectorial en `clasico`, retocar el arte del PNG, o
  regenerar el asset. `clasico` se dibuja tal cual está el PNG hoy.
- Traducir el texto del overlay de dificultad ("Choose difficulty" / "1: Easy 2: Medium 3:
  Hard"): las skins solo lo recolorean.
- Light mode del sitio, skins definidas por el usuario, editor de paletas, animar la transición
  entre skins, sonido, tests automatizados, cambios de esquema en Supabase.

---

## Data model

No hay persistencia nueva. La skin activa ya vive en `localStorage["av_skin"]` (SPEC 10). Este
spec no añade tipos a `lib/games/types.ts` ni a `components/games/types.ts`.

```ts
// lib/games/arkanoid/engine.ts — nueva firma y estructura de paleta
import type { GameCallbacks, GameEngine, Skin } from "@/lib/games/types";
import { SPRITES, EXPLOSION_FRAMES, type BlockColor } from "@/lib/games/arkanoid/sprites";

// Tinte plano por rol. Se aplica al spritesheet con la técnica de la sección
// "Recoloreo de los sprites". clasico usa tint: null -> drawImage del PNG sin tocar.
type ArkanoidTint = {
  blocks: Record<BlockColor, string>; // un hex por fila del tablero
  paddle: string;
  ball: string;
  // las explosiones heredan el tinte de blocks[color] (mismo color que su ladrillo)
};

type ArkanoidPalette = {
  tint: ArkanoidTint | null; // null = spritesheet original (clasico)
  overlayScrim: string; // fillRect de drawStartOverlay (dim, no color)
  overlayText: string; // color del texto "Choose difficulty" / "1: Easy ..."
  glow: number; // ctx.shadowBlur de los sprites y el texto (0 = sin glow); shadowColor = color del rol
};

// withAlpha("#00f5ff", 0.72) -> "rgba(0,245,255,0.72)"  (idéntico al de asteroids/engine.ts)
declare function withAlpha(hex: string, a: number): string;

const PALETTES: Record<Skin, ArkanoidPalette> = {
  clasico: {
    tint: null,
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#ffffff",
    glow: 0,
  },
  neon: {
    tint: {
      blocks: {
        red: "#ff3355",
        yellow: "#f5ff00",
        green: "#00b3ff",
        cyan: "#00f5ff",
        magenta: "#b26bff",
        hotpink: "#ff8a00",
        gray: "#e6e9ff",
      },
      paddle: "#00ff88",
      ball: "#ffffff",
    },
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#00f5ff",
    glow: 8,
  },
  retro: {
    tint: {
      blocks: {
        red: "#40d840",
        yellow: "#40d840",
        green: "#40d840",
        cyan: "#40d840",
        magenta: "#40d840",
        hotpink: "#40d840",
        gray: "#40d840",
      },
      paddle: "#b6ffb6",
      ball: "#e6ffe6",
    },
    overlayScrim: "rgba(0, 0, 0, 0.6)",
    overlayText: "#66ff66",
    glow: 4,
  },
};

export function createArkanoidEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin: Skin = "clasico",
): GameEngine;
```

### Recoloreo de los sprites (la técnica)

`clasico` (`tint: null`): `drawSprite`/`drawFrame` hacen `ctx.drawImage(image, …)` exactamente
como hoy. Cero código de color. Es el render byte por byte del PNG.

`neon`/`retro` (`tint` presente): al terminar de cargar el PNG se construye **una vez** un
`HTMLCanvasElement` offscreen del tamaño natural de la imagen y se tiñe cada sprite que el motor
usa (paleta, pelota, los 7 `SPRITES.blocks`, y las 28 `EXPLOSION_FRAMES`). Luego
`drawSprite`/`drawFrame` dibujan desde ese canvas con los **mismos** `sx/sy/sw/sh` — el resto
del motor no se entera.

Tinte de un rect (silueta plana, preserva el borde antialias por alfa):

```ts
// lib/games/arkanoid/engine.ts
function tintRectInto(octx, image, r /* SpriteRect */, color: string) {
  octx.save();
  octx.beginPath();
  octx.rect(r.sx, r.sy, r.sw, r.sh);
  octx.clip(); // limita la escritura a este sprite
  octx.globalCompositeOperation = "source-over";
  octx.drawImage(image, r.sx, r.sy, r.sw, r.sh, r.sx, r.sy, r.sw, r.sh);
  octx.globalCompositeOperation = "source-in"; // conserva el relleno solo donde el sprite es opaco
  octx.fillStyle = color;
  octx.fillRect(r.sx, r.sy, r.sw, r.sh);
  octx.restore();
}

function buildTintedAtlas(image: HTMLImageElement, tint: ArkanoidTint): HTMLCanvasElement {
  const off = document.createElement("canvas");
  off.width = image.naturalWidth;
  off.height = image.naturalHeight;
  const octx = off.getContext("2d")!;
  tintRectInto(octx, image, SPRITES.paddle, tint.paddle);
  tintRectInto(octx, image, SPRITES.ball, tint.ball);
  for (const c of Object.keys(SPRITES.blocks) as BlockColor[]) {
    tintRectInto(octx, image, SPRITES.blocks[c], tint.blocks[c]);
    for (const fr of EXPLOSION_FRAMES[c]) tintRectInto(octx, image, fr, tint.blocks[c]);
  }
  return off;
}
```

`source-in` compone contra el destino ya dibujado dentro del `clip`, así que el relleno queda
**solo** donde el sprite tenía píxeles opacos, con los bordes suavizados intactos. El resultado
es la silueta del sprite (cápsula de la paleta con sus marcas, disco de la pelota, ladrillo,
esquirlas de la explosión) rellena de un color plano. Se pierde el bisel/sombreado interno y el
contorno negro del PNG — aceptado: en `neon`/`retro` el look plano de "neón vectorial" del
sitio es el objetivo, y los ladrillos ya se separan por el `BRICK_GAP = 4` del motor, no por el
contorno.

Glow: cuando `pal.glow > 0`, `drawSprite`/`drawFrame` envuelven el `drawImage` con
`ctx.save(); ctx.shadowBlur = pal.glow; ctx.shadowColor = <color del rol>` y `ctx.restore()`
después. El `shadowColor` de un ladrillo es `tint.blocks[color]`; el de la paleta `tint.paddle`;
el de la pelota `tint.ball`. Con `pal.glow === 0` (`clasico`) no se toca `shadow*`.

### `bloque-buster` — roles de color y las tres paletas

El motor pinta **doce roles**: los 7 colores de ladrillo, las explosiones (heredan el color de
su ladrillo), la paleta, la pelota, el scrim del overlay de dificultad y su texto. No hay fondo
propio (el `clearRect` deja ver el `#000` del `.crt-screen`) ni HUD dentro del canvas.

| Rol                         | Origen en el motor / sprite                     | `clasico` (PNG, aprox. muestreado)   | `neon`                        | `retro` (fósforo verde)   |
| --------------------------- | ---------------------------------------------- | ------------------------------------ | ---------------------------- | ------------------------- |
| Fondo                       | `draw()` → `clearRect` (negro del `.crt-screen`) | `#000000` (transparente)           | `#000000`                    | `#000000`                 |
| Ladrillo fila 0 — `red`     | `SPRITES.blocks.red`                            | cuerpo `#c02030`, bisel `#e07080`   | `#ff3355`                    | `#40d840`                 |
| Ladrillo fila 1 — `yellow`  | `SPRITES.blocks.yellow`                         | cuerpo `#d0b040`, bisel `#e0d090`   | `#f5ff00` (`--yellow`)       | `#40d840`                 |
| Ladrillo fila 2 — `green`   | `SPRITES.blocks.green` (se ve azul)            | cuerpo `#40a0f0`, bisel `#b0d0f0`   | `#00b3ff` (azul cielo)       | `#40d840`                 |
| Ladrillo fila 3 — `cyan`    | `SPRITES.blocks.cyan` (se ve turquesa)         | cuerpo `#40c090`, bisel `#b0f0d0`   | `#00f5ff` (`--cyan`)         | `#40d840`                 |
| Ladrillo fila 4 — `magenta` | `SPRITES.blocks.magenta` (se ve violeta)       | cuerpo `#6020f0`, bisel `#9060f0`   | `#b26bff` (violeta neón)     | `#40d840`                 |
| Ladrillo fila 5 — `hotpink` | `SPRITES.blocks.hotpink` (se ve naranja)       | cuerpo `#f07010`, bisel `#f0a070`   | `#ff8a00` (naranja neón)     | `#40d840`                 |
| Ladrillo fila 6 — `gray`    | `SPRITES.blocks.gray`                           | cuerpo `#5c5b6c`, bisel `#9090a0`   | `#e6e9ff` (`--ink`)          | `#40d840`                 |
| Explosión (por ladrillo)    | `EXPLOSION_FRAMES[color]` (4 frames, 150 ms)    | frames del PNG sin tocar            | = `tint.blocks[color]`       | `#40d840`                 |
| Paleta (paddle)             | `SPRITES.paddle`                                | cápsula `#b0b0c0`/`#f0f0f0`, marcas `#a02040` | `#00ff88` (`--green`) | `#b6ffb6`                 |
| Pelota (ball)               | `SPRITES.ball`                                  | disco `#b0b0c0` + brillo `#f6f2f2`  | `#ffffff`                    | `#e6ffe6`                 |
| Scrim overlay dificultad    | `drawStartOverlay` → `fillRect`                 | `rgba(0, 0, 0, 0.6)`               | `rgba(0, 0, 0, 0.6)`         | `rgba(0, 0, 0, 0.6)`      |
| Texto overlay dificultad    | `drawStartOverlay` → `fillText` (20–32 px)      | `#ffffff`                          | `#00f5ff` (`--cyan`)         | `#66ff66`                 |
| Glow (`ctx.shadowBlur`)     | — (no existe hoy)                               | `0` (sin glow)                     | `8`, `shadowColor` = rol     | `4`, `shadowColor` = rol  |

Notas de diseño:

- **`clasico`** dibuja el spritesheet sin ningún compositing (`tint: null`), scrim
  `rgba(0, 0, 0, 0.6)` y texto `#fff` como el motor hoy, `glow` 0 (nunca toca `shadow*`). Los
  hex de la columna `clasico` son **aproximados**, muestreados del PNG solo para documentar la
  paleta; el render real es el sprite tal cual. No se "mejora".
- **`neon`** reparte las 7 filas en una rampa de máxima separación de tono, ordenada de arriba
  abajo: rojo `#ff3355`, amarillo `#f5ff00`, azul `#00b3ff`, cian `#00f5ff`, violeta `#b26bff`,
  naranja `#ff8a00`, y la fila `gray` como blanco-lavanda `--ink` `#e6e9ff` (lee como "ladrillo
  neutro", igual que los asteroides de `rocas`). La paleta usa `--green` `#00ff88` (ningún
  ladrillo es verde, y está lejos espacialmente de la grilla) y la pelota es blanco puro
  `#ffffff` (máximo contraste, no colisiona con ninguna fila). El azul de la fila 2 (`#00b3ff`)
  se elige distinto del cian `--cyan` de la fila 3 para que las dos filas frías contiguas se
  lean separadas. El `shadowBlur` de 8 es refuerzo: sin él, las 7 filas + paleta + pelota
  siguen distinguiéndose por tono y forma.
- **`retro`** colapsa todo a fósforo verde y resuelve la jerarquía por **brillo**:
  fondo `#000` < ladrillos `#40d840` (tono base, ~6.8:1) < esquirlas de explosión `#40d840` con
  glow < paleta `#b6ffb6` < pelota `#e6ffe6` (el elemento activo, el más claro). Verde `#33ff33`
  y derivados (no ámbar) por consistencia con el `retro` de `rocas` (SPEC 10) y de `serpentina`
  (SPEC 09) y con el LED verde de `.crt-bottom`. Las 7 filas de colores del original colapsan a
  un solo verde: es una consecuencia asumida del monocromo (el color de ladrillo es puramente
  cosmético — todos valen 10 puntos y caen de un golpe). La implementación puede, si el muro
  plano se ve pobre, alternar dos verdes por fila par/impar (`#38c838` / `#48e048`); el
  contraste se sostiene en cualquiera de los dos casos.

---

## Implementation plan

1. **Helper `withAlpha` y firma con `skin`.** En `lib/games/arkanoid/engine.ts` añadir la
   función pura `withAlpha(hex, a)` (copiada verbatim de `lib/games/asteroids/engine.ts`) y el
   3er parámetro `skin: Skin = "clasico"` a `createArkanoidEngine`, con `const pal =
   PALETTES[skin]` (aún sin `PALETTES` definido). Importar `Skin` de `@/lib/games/types`.
   _Verificación:_ `npm run build` sin errores; `ArkanoidGame.tsx` sigue llamando al motor sin
   3er argumento y el juego se ve exactamente igual en `/games/bloque-buster/play`.

2. **Definir `ArkanoidTint`, `ArkanoidPalette` y `PALETTES`.** Añadir los tipos y la tabla
   `PALETTES: Record<Skin, ArkanoidPalette>` con las tres entradas exactas de la sección Data
   model (incluida `clasico` con `tint: null`, `overlayScrim: "rgba(0, 0, 0, 0.6)"`,
   `overlayText: "#ffffff"`, `glow: 0`). Todavía no lo consume el dibujo.
   _Verificación:_ `npm run build` sin errores; el juego se ve igual (nadie lee `PALETTES` aún).

3. **Overlay de dificultad indexado por skin.** En `drawStartOverlay`, reemplazar
   `ctx.fillStyle = "rgba(0, 0, 0, 0.6)"` por `pal.overlayScrim` y `ctx.fillStyle = "#fff"` por
   `pal.overlayText`. Cuando `pal.glow > 0`, envolver los dos `fillText` con
   `ctx.save(); ctx.shadowBlur = pal.glow; ctx.shadowColor = pal.overlayText;` +
   `ctx.restore()`.
   _Verificación:_ con `clasico` (default) el overlay es idéntico (scrim `0.6`, texto blanco,
   sin glow). `npm run build` sin errores.

4. **Atlas teñido offscreen.** Añadir `tintRectInto` y `buildTintedAtlas` (sección Data model).
   Declarar `let tinted: HTMLCanvasElement | null = null`. En `image.onload`, después de
   `imageLoaded = true` y antes de arrancar el loop, si `pal.tint` entonces
   `tinted = buildTintedAtlas(image, pal.tint)`. En `drawSprite` y `drawFrame`, cambiar la
   fuente de `ctx.drawImage(image, …)` a `ctx.drawImage(tinted ?? image, …)`.
   _Verificación:_ con `clasico`, `pal.tint` es `null`, `tinted` queda `null`, y
   `drawSprite`/`drawFrame` siguen leyendo de `image` — `/games/bloque-buster/play` es pixel a
   pixel idéntico al render previo (ladrillos, paleta, pelota, explosiones del PNG originales).
   `npm run build` sin errores.

5. **Glow por sprite.** En `drawSprite`/`drawFrame`, cuando `pal.glow > 0`, envolver el
   `drawImage` con `ctx.save(); ctx.shadowBlur = pal.glow; ctx.shadowColor = <color del rol>;`
   (`tint.blocks[color]` para ladrillos y explosiones, `tint.paddle` para la paleta,
   `tint.ball` para la pelota) y `ctx.restore()` después. Con `pal.glow === 0` no se toca
   `shadow*`.
   _Verificación:_ con `clasico` no hay cambios (`glow` 0). `npm run build` sin errores.

6. **Verificación visual de `neon` y `retro`.** Forzando temporalmente `skin` en el wrapper:
   con `neon`, las 7 filas se dibujan rojo / amarillo / azul / cian / violeta / naranja /
   lavanda, la paleta verde, la pelota blanca, las explosiones del color de su fila, el overlay
   con texto cian, todo con glow; con `retro`, todo en verde fósforo con la jerarquía
   fondo < ladrillos `#40d840` < paleta `#b6ffb6` < pelota `#e6ffe6`. Revertir el forzado.
   _Verificación:_ ambas skins se ven como la sección Data model; ningún sprite queda
   invisible ni fundido con el fondo.

7. **Prop `skin` en el wrapper.** `components/games/ArkanoidGame.tsx` acepta `skin` de
   `RealGameProps` y lo pasa como 3er argumento a `createArkanoidEngine`. El `useEffect` que
   crea el motor pasa a depender de `[resetKey, skin]`; el efecto de `[paused]` no cambia.
   _Verificación:_ cambiar la skin en el selector del reproductor reinstancia el canvas con la
   paleta nueva y reinicia la partida (vuelve al overlay "Choose difficulty"); entrar y salir
   de `/games/bloque-buster/play` repetidamente no duplica listeners de teclado ni deja loops
   de `requestAnimationFrame` vivos.

8. **Regresión visual en las tres skins.** Jugar una partida en `clasico`, `neon` y `retro`:
   en `clasico` el render coincide con el de antes de este spec (sprites del PNG sin teñir,
   overlay blanco, sin glow); en las tres, ←/→ mueve la paleta, la pelota rebota igual, romper
   un ladrillo suma 10 y dispara la explosión, PAUSA congela el último frame, perder la 3ª vida
   y limpiar el tablero abren el mismo modal, "JUGAR DE NUEVO" reinicia por `resetKey`, y el
   HUD (Vidas sí, Nivel no) / resolución 480×640 / controles son idénticos entre skins.
   Confirmar que `rocas`, `caida`, `serpentina` y los juegos decorativos no cambian.
   _Verificación:_ checklist de Acceptance criteria completa.

Revisión final: `npm run lint` y `npm run build` sin errores.

---

## Acceptance criteria

- [x] `createArkanoidEngine` acepta un 3er parámetro `skin: Skin = "clasico"` y no rompe a
      ningún llamador que no lo pase.
- [x] Con skin `clasico`, `/games/bloque-buster/play` se ve **idéntico** al render previo a este
      spec: los 7 colores de ladrillo, la paleta, la pelota y las 4 frames de explosión salen
      del spritesheet sin teñir; el overlay de dificultad tiene scrim `rgba(0, 0, 0, 0.6)` y
      texto `#ffffff`; sin `shadowBlur` (chequeo de regresión).
- [x] La skin `neon` de `bloque-buster` dibuja las filas 0–6 como `#ff3355` / `#f5ff00` /
      `#00b3ff` / `#00f5ff` / `#b26bff` / `#ff8a00` / `#e6e9ff`, la paleta `#00ff88`, la pelota
      `#ffffff`, cada explosión del color de su fila, el texto del overlay `#00f5ff`, todo con
      `shadowBlur` 8 de refuerzo. _(Excepción aceptada: `EXPLOSION_FRAMES.gray` comparte los
      mismos rects del spritesheet que `EXPLOSION_FRAMES.red`, así que en el atlas único la
      explosión del ladrillo gris toma el tinte rojo `#ff3355` — coincide con el render de
      `clasico`, donde el gris ya explota con frames rojos.)_
- [x] La skin `retro` de `bloque-buster` dibuja todos los ladrillos y sus explosiones en
      `#40d840`, la paleta `#b6ffb6`, la pelota `#e6ffe6` y el texto del overlay `#66ff66`, con
      la jerarquía por brillo fondo < ladrillos < paleta < pelota y `shadowBlur` 4.
- [x] El recoloreo de `neon`/`retro` se construye una sola vez (atlas teñido offscreen en
      `image.onload`), no por frame; `drawSprite`/`drawFrame` dibujan desde el atlas con los
      mismos `sx/sy/sw/sh`.
- [x] Las tres skins cumplen los cinco criterios de legibilidad sobre el `.crt-screen` (fondo
      `#000` + scanlines `multiply` ~18% + viñeta hasta `rgba(0,0,0,0.65)`): contraste ≥ 3:1
      para los ladrillos y la paleta y ≥ 4.5:1 para la pelota y el texto del overlay contra
      `#000`; ninguna entidad jugable comparte tono con el fondo; quitar el glow no vuelve
      indistinguibles las piezas; en `retro` la jerarquía se resuelve por brillo. _(Hallazgo
      documentado en Risks: en `clasico` los ladrillos `red`/`magenta`/`gray` del PNG rozan el
      piso de 3:1 y caen por debajo bajo las scanlines — es la paleta original, no se modifica.)_
- [x] Cambiar de skin no altera la resolución lógica (480×640), la física, el ángulo de rebote
      en la paleta, los controles, el puntaje (10 por ladrillo), las 3 vidas ni el HUD/chrome
      del reproductor.
- [x] Cambiar de skin en el selector del reproductor reinstancia el motor (efecto
      `[resetKey, skin]`): la partida vuelve al overlay de selección de dificultad, score 0,
      3 vidas, tablero completo.
- [x] La skin elegida persiste en `localStorage["av_skin"]` (andamiaje de SPEC 10) y se
      respeta al recargar y al volver a entrar a `/games/bloque-buster/play`.
- [x] `rocas`, `caida`, `serpentina` y los juegos decorativos no cambian su render.
- [x] `ArkanoidGame.tsx` monta y desmonta sin duplicar listeners de teclado ni dejar loops de
      `requestAnimationFrame` vivos al navegar dentro y fuera de la pantalla repetidamente.
- [x] `reference/juegos/04/arkanoid/` no muestra diff en `git status`.
- [x] `npm run lint` y `npm run build` terminan sin errores. _(0 errores. `withAlpha`, que el
      Scope/Paso 1 pedían por paridad con `asteroids/engine.ts`, se quitó al final: ningún paso
      lo consume — las tres paletas usan el literal `"rgba(0, 0, 0, 0.6)"` para `overlayScrim`.)_

---

## Decisions

- **Sí:** `clasico` dibuja el spritesheet sin ningún compositing (`tint: null`) y se congela
  byte por byte, incluido scrim `rgba(0, 0, 0, 0.6)`, texto `#fff` y `glow: 0`. Razón: el
  contrato de SPEC 10 sigue válido porque el default preserva la paleta original; si `clasico`
  divergiera del PNG sería una regresión. Los hex de la columna `clasico` en Data model son
  documentación aproximada, no valores que el motor use.
- **Sí:** recolorear vía **atlas teñido offscreen** construido una vez en `image.onload`, con
  `drawImage` original + `globalCompositeOperation = "source-in"` + `fillRect` del tinte por
  sprite. Razón: es el mínimo cambio en el código de dibujo (solo cambia la fuente de
  `drawImage`, de `image` a `tinted ?? image`), es O(1) por partida (no por frame), y preserva
  la silueta exacta de cada sprite (marcas de la paleta, redondez de la pelota, esquirlas de la
  explosión). Reemplazar el spritesheet por dibujo vectorial obligaría a re-crear el arte y a
  bifurcar cinco funciones de dibujo.
- **Sí:** el tinte es un **relleno plano** por sprite (se pierde el bisel y el contorno negro
  del PNG). Razón: da el look de "neón vectorial" del sitio, hace el contraste predecible
  (un solo tono por rol), y los ladrillos ya se separan por el `BRICK_GAP = 4` del motor, no
  por el contorno. Sobre negro, un ladrillo plano brillante es más legible, no menos.
- **Sí:** en `neon`, la fila `gray` es `--ink` `#e6e9ff` (blanco-lavanda), no un color
  saturado. Razón: mantiene la lectura de "ladrillo neutro" y separa esa fila de las seis
  saturadas por desaturación, igual que los asteroides neutros de `rocas` en SPEC 10.
- **Sí:** en `neon`, la fila 2 (`green` en el enum, azul en el PNG) es azul cielo `#00b3ff`,
  distinto del cian `--cyan` `#00f5ff` de la fila 3. Razón: son dos filas frías contiguas; con
  el mismo cian se leerían como una sola banda.
- **Sí:** en `neon`, la pelota es blanco puro `#ffffff` y la paleta `--green` `#00ff88`.
  Razón: la pelota es el elemento fino y rápido — blanco es el máximo contraste y no colisiona
  con ninguna fila; ningún ladrillo es verde y la paleta está lejos de la grilla, así que
  `--green` la marca como "tu herramienta" sin ambigüedad.
- **Sí:** en `retro`, las 7 filas colapsan a un solo verde `#40d840`. Razón: el color de
  ladrillo es puramente cosmético (10 puntos, un golpe); el monocromo resuelve la jerarquía por
  brillo (pelota > paleta > ladrillos > fondo), no por tono. La implementación puede alternar
  dos verdes por fila par/impar si el muro plano se ve pobre; el contraste se sostiene igual.
- **Sí:** `retro` en verde fósforo (`#33ff33` y derivados), no ámbar. Razón: una sola identidad
  "CRT verde" en todo el sitio, consistente con `rocas` (SPEC 10), `serpentina` (SPEC 09) y el
  LED de `.crt-bottom`.
- **Sí:** cambiar de skin **reinstancia** el motor (`useEffect` con `[resetKey, skin]`),
  reiniciando la partida. Razón: mismo criterio que SPEC 10 para `rocas`; evita un método
  `setSkin` y reconstruir el atlas teñido a mitad de partida.
- **No:** tocar el andamiaje de SPEC 10 (tipo `Skin`, `RealGameProps`, selector, persistencia,
  `contract.md`). Razón: ya está implementado y this spec solo consume el 3er parámetro.
- **No:** traducir el texto del overlay de dificultad. Razón: las skins solo recolorean lo que
  el motor pinta; traducir es otro cambio, en otro spec.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Al introducir `PALETTES` y la fuente `tinted ?? image`, `clasico` podría derivar del render actual (un scrim mal copiado, un `shadow*` colado, `tinted` construido cuando no debe). | `clasico` tiene `tint: null` → `tinted` queda `null` y `drawSprite`/`drawFrame` leen de `image` sin cambios; `glow: 0` no toca `shadow*`; scrim y texto se copian verbatim de `drawStartOverlay`. Paso 4 exige verificación pixel a pixel con `clasico`. |
| La técnica `source-in` sobre el atlas offscreen puede comportarse distinto entre navegadores en los bordes antialias o si el `clip` no aísla bien el sprite. | El `clip` a `rect(sx,sy,sw,sh)` aísla cada sprite; `source-in` compone contra un destino recién dibujado dentro de ese clip, así que el relleno hereda exactamente el alfa del sprite. Verificación visual en el paso 6; si un navegador fallara, el fallback es teñir en un canvas del tamaño del sprite (0,0,sw,sh) y copiarlo de vuelta. |
| Las 7 filas de colores del original desaparecen en `retro` (muro verde plano): puede verse monótono. | Asumido y documentado (el color de ladrillo es cosmético). La implementación puede alternar dos verdes por fila; el contraste y la jerarquía por brillo se sostienen igual. |
| Los ladrillos `red` (~3.7:1), `magenta` (~3.3:1) y `gray` (~3.2:1) del PNG rozan el piso de 3:1 y bajo scanlines `multiply` (~18%) caen por debajo en las franjas oscuras. | Es la paleta original (columna `clasico`) y **no se modifica** (modificarla = regresión). `neon` y `retro` sí suben todas las filas muy por encima del piso (mínimo `#ff3355` ~5.9:1, `#40d840` ~6.8:1). Se deja constancia como hallazgo de `clasico`, no como bug a corregir aquí. |
| El atlas teñido se construye en `image.onload`; si `pal` cambiara sin recrear el motor, quedaría desincronizado. | El wrapper reinstancia el motor con `[resetKey, skin]` (paso 7): cada skin arranca un motor nuevo que hace su propio `onload` y su propio atlas. No hay ruta que cambie `skin` sin recrear. |
| Las scanlines y la viñeta comen luminancia en las esquinas del canvas; un color válido en teoría puede quedar flojo abajo. | Todas las paletas `neon`/`retro` se fijan con contraste holgado (mínimo efectivo ~4.8:1 tras el knockdown para siluetas grandes); la pelota y el texto quedan en el tramo más claro (`#ffffff` / `#e6ffe6` / `#00f5ff` / `#66ff66`), y el glow es refuerzo. |

---

## What is **not** in this spec

- El andamiaje compartido de SPEC 10 (tipo `Skin`, `RealGameProps`, selector, persistencia en
  `localStorage["av_skin"]`, texto de `contract.md` §1/§2).
- Las skins `neon`/`retro` de `caida` y `serpentina`.
- Recolorear el chrome del reproductor (`.crt-screen`, scanlines, viñeta, `.crt-bottom`), el HUD
  de React o la arena decorativa.
- Skins para los cuatro juegos decorativos sin motor.
- Reemplazar el spritesheet por dibujo vectorial, retocar el PNG o regenerar el asset.
- Traducir el texto del overlay de dificultad.
- Light mode del sitio, skins personalizadas por el usuario, editor de paletas, animar la
  transición entre skins.
- Sonido, tests automatizados, cambios de esquema en Supabase.

Cada uno de estos, si se necesita, va en su propio spec.
