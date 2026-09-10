# SPEC 10 — Sistema de skins de juegos (piloto en `rocas`)

> **Status:** implemented
> **Depends on:** SPEC 05, SPEC 07
> **Date:** 2026-09-09
> **Objective:** Introducir el contrato de skins (`clasico` / `neon` / `retro`) para los juegos reales del reproductor y cablearlo de punta a punta en el juego de Asteroides (`rocas`), dejando `clasico` idéntico al render actual y `neon`/`retro` como skins opcionales legibles sobre el fondo negro con scanlines del `.crt-screen`.

---

## Por qué existe este spec

Cada juego real de Arcade Vault debe ofrecer tres skins: `clasico` (la paleta original del
motor, por defecto), `neon` (el tema cian/magenta/amarillo/verde del sitio) y `retro` (fósforo
CRT monocromo). Hoy no existe ningún concepto de skin: cada motor (`lib/games/<slug>/engine.ts`)
tiene sus colores escritos a mano como literales dispersos por el código de dibujo — en
`lib/games/asteroids/engine.ts` son `"#fff"`, `"#000"`, `"rgba(255, 130, 0, 0.85)"` y `"#0ff"`
repartidos entre las clases `Bullet`, `Asteroid`, `Ship`, `Particle` y `PowerUp`. No hay forma
de recolorearlos sin tocar cada `ctx.fillStyle`/`ctx.strokeStyle`.

Este spec:

- Define el tipo `Skin` compartido y el punto de entrada por el que un motor recibe su skin.
- Consolida la paleta de `rocas` en una estructura indexada por skin dentro de su motor,
  empezando por que `clasico` reproduzca el render actual **byte por byte** (mismos hex, mismo
  alfa dinámico de partículas, y **sin** `shadowBlur` — el motor hoy no dibuja glow).
- Añade `neon` y `retro` para `rocas` con hex fijados (sección Data model).
- Cablea la selección de skin desde el reproductor: prop nuevo en `RealGameProps`, reenvío por
  el wrapper, selector mínimo en el HUD y persistencia en `localStorage`.
- Actualiza `contract.md` §1: la regla "Paleta de colores original preservada — nunca
  recoloreada al tema neon del sitio" pasa a "el skin por defecto `clasico` preserva la paleta
  original byte por byte; `neon` y `retro` son skins opcionales que el motor expone vía un
  parámetro `skin`". El contrato del motor (sin `document`/`window` a nivel de módulo, estado
  dentro del closure, sin HUD ni overlay propios, resolución lógica fija) no cambia en nada más.

Los otros tres juegos reales (`caida`, `bloque-buster`, `serpentina`) quedan para specs
siguientes: este spec deja el andamiaje compartido listo y lo valida en un solo motor.

---

## Scope

**In:**

- `lib/games/types.ts`: tipo `Skin = "clasico" | "neon" | "retro"` y constante `DEFAULT_SKIN = "clasico"`.
- `components/games/types.ts`: `RealGameProps` gana `skin: Skin`.
- `lib/games/asteroids/engine.ts`: firma `createAsteroidsEngine(canvas, callbacks, skin?)`,
  con una tabla `PALETTES: Record<Skin, RocasPalette>` interna al módulo; todo `fillStyle` /
  `strokeStyle` con literal de color pasa a leer de la paleta activa. `clasico` reproduce el
  render actual sin diferencias visibles.
- `components/games/AsteroidsGame.tsx`: acepta `skin` y lo pasa al crear el motor; el efecto
  que instancia el motor pasa a depender de `[resetKey, skin]` (cambiar de skin reinstancia el
  motor, igual que "JUGAR DE NUEVO").
- `components/games/GamePlayerClient.tsx`: lee la skin persistida de `localStorage["av_skin"]`
  (validada contra los tres valores; fallback `clasico`), la pasa a `<realGame.Component>`, y
  muestra un selector mínimo (tres opciones) en la zona del HUD que la actualiza y la
  persiste. Para juegos sin entrada en `REAL_GAMES` (arenas decorativas) el selector no se
  muestra.
- Actualización de `.claude/skills/integrar-juego/contract.md` §1 (y la mención de §5) al nuevo
  texto.
- Las tres paletas completas de `rocas` con hex por rol (sección Data model).

**Out of scope (para specs futuros):**

- Las skins `neon`/`retro` de `caida`, `bloque-buster` y `serpentina` — cada una en su propio
  spec, reutilizando el andamiaje que deja este.
- Recolorear el chrome del reproductor (`.crt-screen`, `.crt-bottom`, viñeta, scanlines), el
  HUD de React, o la arena decorativa de los cuatro juegos no implementados.
- Skins para los cuatro juegos decorativos (`gloton`, `invasores`, `ranaria`, `duelo-pixel`):
  no tienen motor todavía; cuando se implementen deben nacer con las tres skins.
- Light mode del sitio (el proyecto es dark-only).
- Skins definidas por el usuario, editor de paletas, o import/export de skins.
- Animar la transición entre skins (cross-fade del canvas). El cambio reinstancia el motor.
- Añadir un OVNI enemigo o un destello de hiper-salto al motor de `rocas` (no existen hoy en
  `lib/games/asteroids/engine.ts`); si algún spec futuro los agrega, deben incluir sus tres
  variantes de skin.
- Sonido, tests automatizados, cambios de esquema en Supabase.

---

## Data model

No hay persistencia nueva en Supabase. La skin elegida vive en `localStorage["av_skin"]`
(cadena, uno de los tres valores), junto al `av_user` que ya usa el login mock.

```ts
// lib/games/types.ts
export type Skin = "clasico" | "neon" | "retro";
export const SKINS: readonly Skin[] = ["clasico", "neon", "retro"] as const;
export const DEFAULT_SKIN: Skin = "clasico";

export type GameCallbacks = {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
};

export type GameEngine = {
  setPaused(paused: boolean): void;
  reset(): void;
  destroy(): void;
};
```

```ts
// components/games/types.ts
import type { GameCallbacks, Skin } from "@/lib/games/types";

export type RealGameProps = GameCallbacks & {
  paused: boolean;
  resetKey: number;
  skin: Skin;
};

export type GameCapabilities = { hasLives: boolean; hasLevel: boolean };
```

```ts
// lib/games/asteroids/engine.ts — nueva firma y estructura de paleta
import type { GameCallbacks, GameEngine, Skin } from "@/lib/games/types";

type RocasPalette = {
  bg: string; // fillRect de fondo en draw()
  ship: string; // trazo del casco de la nave (lineWidth 1.5)
  thrust: string; // trazo de la llama del propulsor
  thrustAlpha: number; // alfa fijo de la llama (0.85 en el original)
  bullet: string; // relleno de las balas (radius 2)
  asteroid: string; // trazo del polígono de cada asteroide (lineWidth 1.5)
  particle: string; // trazo de las partículas de explosión; el alfa es runtime (ttl/life)
  powerup: string; // trazo del anillo + rayos del power-up "Disparo Triple"
  glow: number; // ctx.shadowBlur para siluetas (0 = sin glow); shadowColor = color del rol
};

// withAlpha("#f5ff00", 0.42) -> "rgba(245,255,0,0.42)"
// las partículas y la llama componen su rgba desde el color del rol + alfa (fijo o runtime),
// preservando exactamente la fórmula actual de Particle.draw (alpha = ttl/life).
declare function withAlpha(hex: string, a: number): string;

const PALETTES: Record<Skin, RocasPalette> = {
  clasico: {
    bg: "#000000",
    ship: "#ffffff",
    thrust: "#ff8200",
    thrustAlpha: 0.85,
    bullet: "#ffffff",
    asteroid: "#ffffff",
    particle: "#ffffff",
    powerup: "#00ffff",
    glow: 0,
  },
  neon: {
    bg: "#000000",
    ship: "#00f5ff",
    thrust: "#f5ff00",
    thrustAlpha: 0.85,
    bullet: "#ff3d92",
    asteroid: "#e6e9ff",
    particle: "#f5ff00",
    powerup: "#00ff88",
    glow: 8,
  },
  retro: {
    bg: "#000000",
    ship: "#b6ffb6",
    thrust: "#e6ffe6",
    thrustAlpha: 0.85,
    bullet: "#e6ffe6",
    asteroid: "#33ff33",
    particle: "#66ff66",
    powerup: "#9dff9d",
    glow: 5,
  },
};

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  skin: Skin = "clasico",
): GameEngine;
```

### `rocas` — roles de color y las tres paletas

El motor de `rocas` pinta **siete roles** (no hay OVNI enemigo ni destello de hiper-salto en
`lib/games/asteroids/engine.ts`, ni texto/HUD dentro del canvas):

| Rol                         | Origen en `engine.ts`                        | `clasico` (actual)               | `neon`                                  | `retro` (fósforo verde)              |
| --------------------------- | ------------------------------------------- | -------------------------------- | -------------------------------------- | ----------------------------------- |
| Fondo                       | `draw()` → `ctx.fillStyle = "#000"`         | `#000000`                        | `#000000`                              | `#000000`                           |
| Nave (trazo del casco)      | `Ship.draw` → `strokeStyle = "#fff"`        | `#ffffff`                        | `#00f5ff` (`--cyan`)                   | `#b6ffb6`                           |
| Propulsión (llama)          | `Ship.draw` → `rgba(255, 130, 0, 0.85)`     | `#ff8200` @ alfa `0.85`          | `#f5ff00` (`--yellow`) @ alfa `0.85`  | `#e6ffe6` @ alfa `0.85`             |
| Balas                       | `Bullet.draw` → `fillStyle = "#fff"`        | `#ffffff`                        | `#ff3d92` (magenta aclarado)          | `#e6ffe6`                           |
| Asteroides (trazo)          | `Asteroid.draw` → `strokeStyle = "#fff"`    | `#ffffff`                        | `#e6e9ff` (`--ink`)                    | `#33ff33`                           |
| Partículas de explosión     | `Particle.draw` → `rgba(255,255,255,α)`     | `#ffffff` @ α = `ttl/life`       | `#f5ff00` @ α = `ttl/life`            | `#66ff66` @ α = `ttl/life`          |
| Power-up "Disparo Triple"   | `PowerUp.draw` → `strokeStyle = "#0ff"`     | `#00ffff`                        | `#00ff88` (`--green`)                  | `#9dff9d`                           |
| Glow (`ctx.shadowBlur`)     | — (no existe hoy)                            | `0` (sin glow)                   | `8`, `shadowColor` = color del rol    | `5`, `shadowColor` `#33ff33`        |

Notas de diseño:

- **`clasico`** es exactamente lo que dibuja el motor hoy: mismos hex, mismo alfa `0.85` de la
  llama, mismo alfa dinámico `ttl/life` de las partículas, y `glow = 0` (el motor actual nunca
  toca `shadowColor`/`shadowBlur`). No se "mejora".
- **`neon`** reparte los roles simultáneos en pantalla entre colores de máxima separación de
  tono: nave cian, balas magenta, asteroides blanco-lavanda (`--ink`, lectura de "roca"
  neutra), llama amarilla, power-up verde. Las balas usan `#ff3d92` (un `--magenta` aclarado)
  en vez del `--magenta` puro `#ff006e` para superar con margen el 4.5:1 exigido a elementos
  finos aun con las scanlines multiplicando encima. El `shadowBlur` es refuerzo: quitándolo,
  los cinco roles siguen distinguiéndose por tono y forma.
- **`retro`** colapsa todo a fósforo verde y resuelve la jerarquía por **brillo**, no por tono:
  fondo `#000` < asteroides `#33ff33` < partículas `#66ff66` < power-up `#9dff9d` < nave
  `#b6ffb6` < balas y llama `#e6ffe6`. El elemento del jugador y sus proyectiles son los más
  claros; la grilla de asteroides es el tono base; el power-up queda entre medio para leerse
  como "coleccionable". Verde (no ámbar) por consistencia con el `retro` de `serpentina`
  (SPEC 09, `#33ff33`) y con el LED verde de `.crt-bottom`.

---

## Implementation plan

1. **Tipo `Skin` y punto de entrada compartido.** En `lib/games/types.ts` añadir `Skin`,
   `SKINS` y `DEFAULT_SKIN`. En `components/games/types.ts` añadir `skin: Skin` a
   `RealGameProps`. Aún no lo consume nadie.
   _Verificación:_ `npm run build` compila; `RealGameProps` exige `skin` y TypeScript marca los
   sitios pendientes de pasarlo (se resuelven en los pasos 3 y 5).

2. **Helper `withAlpha` en el motor de `rocas`.** Añadir dentro de
   `lib/games/asteroids/engine.ts` una función pura `withAlpha(hex, a)` que convierta
   `#rrggbb` + alfa en `rgba(r,g,b,a)`. No cambia el render todavía (aún no se usa).
   _Verificación:_ `npm run build` sin errores; el juego se ve exactamente igual en
   `/games/rocas/play`.

3. **Consolidar la paleta de `rocas` indexada por skin, empezando por `clasico`.** Añadir
   `RocasPalette`, `PALETTES` (con las tres entradas de la sección Data model) y el 3er
   parámetro `skin: Skin = "clasico"` a `createAsteroidsEngine`. Sustituir cada literal de
   color del código de dibujo por la lectura del rol correspondiente de `PALETTES[skin]`:
   `draw()` usa `pal.bg`; `Bullet.draw` `pal.bullet`; `Asteroid.draw` `pal.asteroid`;
   `Ship.draw` `pal.ship` y, para la llama, `withAlpha(pal.thrust, pal.thrustAlpha)`;
   `Particle.draw` `withAlpha(pal.particle, alpha)` con el mismo `alpha = ttl/life` de hoy;
   `PowerUp.draw` `pal.powerup`. Cuando `pal.glow > 0`, envolver el trazo de nave, asteroides y
   power-up con `ctx.shadowBlur = pal.glow` + `ctx.shadowColor` = color del rol, restaurando a
   `shadowBlur = 0` después; cuando `pal.glow === 0` no tocar `shadow*` en absoluto.
   `AsteroidsGame.tsx` sigue llamando al motor sin el 3er argumento, así que el default
   `clasico` mantiene el comportamiento.
   _Verificación:_ con skin `clasico` (default), `/games/rocas/play` es pixel a pixel idéntico
   al render previo: nave/balas/asteroides blancos, llama naranja `#ff8200`, power-up cian, sin
   glow. `npm run build` sin errores.

4. **Skin `neon` y `retro` disponibles en el motor.** No requiere código nuevo si el paso 3
   dejó `PALETTES` completo; este paso es la verificación visual forzando el skin a mano
   (temporalmente) en el wrapper.
   _Verificación:_ forzando `skin="neon"` el juego se dibuja con nave cian, balas magenta,
   asteroides blanco-lavanda, llama amarilla, power-up verde y glow; forzando `skin="retro"`,
   todo en verde fósforo con la escalera de brillo descrita. Revertir el forzado.

5. **Prop `skin` en el wrapper.** `AsteroidsGame.tsx` acepta `skin` de `RealGameProps` y lo
   pasa como 3er argumento a `createAsteroidsEngine`. El `useEffect` que crea el motor pasa a
   tener `[resetKey, skin]` como dependencias: cambiar de skin destruye y recrea el motor
   (reset completo de la partida), igual que "JUGAR DE NUEVO". El efecto de `[paused]` no
   cambia.
   _Verificación:_ cambiar el valor de `skin` pasado desde el padre reinstancia el canvas con
   la paleta nueva; navegar dentro y fuera de `/games/rocas/play` repetidamente no duplica
   listeners ni deja loops de `requestAnimationFrame` vivos.

6. **Selector de skin + persistencia en el reproductor.** En `GamePlayerClient.tsx`: estado
   `skin` inicializado leyendo `localStorage["av_skin"]` (si no es uno de los tres valores,
   `DEFAULT_SKIN`); un control de tres opciones (`clasico` / `neon` / `retro`) en la zona del
   HUD, reutilizando clases existentes (`.btn` / `.hud-stat`), que al cambiar actualiza el
   estado y escribe `localStorage["av_skin"]`. Pasar `skin` a `<realGame.Component>`. Cuando
   `game.id` no está en `REAL_GAMES`, no renderizar el selector.
   _Verificación:_ elegir `neon`, recargar la página: el juego arranca en `neon`. Elegir
   `retro`, salir a `/games/rocas` y volver a `play`: sigue en `retro`. En un juego decorativo
   (`/games/gloton/play`) no aparece el selector y nada cambia.

7. **Actualizar `contract.md`.** En `.claude/skills/integrar-juego/contract.md` §1, reemplazar
   la viñeta "Paleta de colores original preservada — nunca recoloreada al tema neon del sitio"
   por: "El skin por defecto (`clasico`) preserva la paleta original del motor byte por byte;
   `neon` y `retro` son skins opcionales que el motor expone vía el 3er parámetro `skin: Skin`
   (`lib/games/types.ts`). El default deja el render idéntico al de antes del sistema de
   skins." Añadir en §5 (o donde se describe la firma de la factory) la mención del 3er
   parámetro `skin` opcional con default `clasico`.
   _Verificación:_ `contract.md` describe la firma `createXEngine(canvas, callbacks, skin?)` de
   forma coherente con `lib/games/types.ts` y con este spec; ningún otro punto del contrato
   cambia.

8. **Regresión visual de `rocas` en las tres skins.** Jugar una partida en `clasico`, `neon` y
   `retro`: en `clasico` el render coincide con el de antes; en las tres, PAUSA congela el
   último frame, FIN y perder las 3 vidas abren el mismo modal, "JUGAR DE NUEVO" reinicia por
   `resetKey`, y el HUD/resolución/controles son idénticos entre skins. Confirmar que `caida`,
   `bloque-buster`, `serpentina` y los juegos decorativos no cambian (todavía reciben `skin`
   pero lo ignoran hasta su propio spec — su render actual es su `clasico`).
   _Verificación:_ checklist de Acceptance criteria completa.

Revisión final: `npm run lint` y `npm run build` sin errores.

---

## Acceptance criteria

- [x] `lib/games/types.ts` exporta `Skin = "clasico" | "neon" | "retro"`, `SKINS` y `DEFAULT_SKIN`.
- [x] `RealGameProps` incluye `skin: Skin`; `GamePlayerClient` se lo pasa a todo componente de `REAL_GAMES`.
- [x] `createAsteroidsEngine` acepta un 3er parámetro `skin: Skin = "clasico"` y no rompe a ningún llamador que no lo pase.
- [x] Con skin `clasico`, `/games/rocas/play` se ve **idéntico** al render previo a este spec: nave, balas y asteroides `#ffffff`; llama `#ff8200` al `85%`; partículas blancas con alfa `ttl/life`; power-up `#00ffff`; sin `shadowBlur` (chequeo de regresión). _(El alfa de partículas pasa de redondeado a 2 decimales a precisión completa — cambio sub-perceptible prescrito por el Data model / Paso 3.)_
- [x] La skin `neon` de `rocas` dibuja: nave `#00f5ff`, llama `#f5ff00`, balas `#ff3d92`, asteroides `#e6e9ff`, partículas `#f5ff00`, power-up `#00ff88`, con `shadowBlur` de refuerzo.
- [x] La skin `retro` de `rocas` dibuja todo en fósforo verde con la escalera de brillo: asteroides `#33ff33` (tono base) más oscuros que la nave `#b6ffb6` y que balas/llama `#e6ffe6`; power-up `#9dff9d` intermedio.
- [x] Las tres skins de `rocas` cumplen los cinco criterios de legibilidad sobre el `.crt-screen` (fondo `#000` + scanlines `multiply` ~18% + viñeta): contraste ≥ 3:1 para siluetas y ≥ 4.5:1 para balas/partículas contra `#000`; ninguna entidad jugable comparte tono con el fondo; quitar el glow no vuelve indistinguibles las piezas; en `retro` la jerarquía se resuelve por brillo; y ninguna skin altera resolución, gameplay ni HUD.
- [x] Cambiar de skin no altera la resolución lógica (800×600), la física, los controles, el sistema de puntos (20/50/100) ni el HUD/chrome del reproductor.
- [x] La skin elegida se persiste en `localStorage["av_skin"]` y se respeta al recargar y al volver a entrar a `/games/rocas/play`; un valor inválido cae a `clasico`.
- [x] El selector de skin no aparece para los juegos sin entrada en `REAL_GAMES`, y esos juegos (decorativos) no cambian visual ni funcionalmente.
- [x] `caida`, `bloque-buster` y `serpentina` no cambian su render: reciben `skin` pero su paleta actual sigue siendo la que se dibuja (su `clasico` implícito hasta su propio spec).
- [x] `.claude/skills/integrar-juego/contract.md` §1/§5 queda actualizado al texto de "default `clasico` preserva la paleta original; `neon`/`retro` opcionales vía parámetro `skin`". _(§1: viñeta de paleta + firma de la factory. §2 sincronizado además: `RealGameProps.skin` y el efecto `[resetKey, skin]`.)_
- [x] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** `skin` entra como 3er parámetro opcional de la factory del motor (`createAsteroidsEngine(canvas, callbacks, skin = "clasico")`) y como prop `skin: Skin` en `RealGameProps`. Razón: es el mínimo cambio de contrato; los llamadores que no lo pasen siguen obteniendo el render original, y el motor no necesita un método `setSkin` porque el wrapper ya sabe recrear el motor.
- **Sí:** cambiar de skin **reinstancia** el motor (el `useEffect` de creación depende de `[resetKey, skin]`), reiniciando la partida en curso. Razón: evita un método `setSkin` y el riesgo de estado a medio recolorear; cambiar de skin es una acción rara y previa a jugar, no algo que se haga a mitad de partida.
- **Sí:** la skin se persiste en `localStorage["av_skin"]`, global (no por juego). Razón: coherente con el `av_user` del login mock; el usuario elige una estética y la mantiene en todo el vault. Un override por juego puede ir en un spec futuro.
- **Sí:** `retro` en verde fósforo `#33ff33`, no ámbar. Razón: consistencia con el `retro` ya fijado de `serpentina` (SPEC 09) y con el LED verde de `.crt-bottom`; una sola identidad "CRT verde" en todo el sitio.
- **Sí:** en `neon`, las balas usan `#ff3d92` (un `--magenta` aclarado) en vez del `--magenta` puro `#ff006e`. Razón: `#ff006e` sobre `#000` queda cerca del piso de 4.5:1 para elementos finos y las scanlines `multiply` lo bajan más; `#ff3d92` deja margen sin dejar de leerse como magenta del tema.
- **Sí:** en `neon`, los asteroides son `#e6e9ff` (`--ink`), no un color saturado del tema. Razón: mantienen la lectura de "roca neutra" y contrastan con la nave cian por tono y por forma (polígono irregular vs. triángulo); usar cian o verde los confundiría con nave o power-up.
- **No:** tocar el chrome del reproductor, el HUD de React o la arena decorativa. Razón: las skins solo afectan lo que el motor pinta en su `<canvas>`; el marco CRT es del sitio, no del juego.
- **No:** diseñar aquí las skins `neon`/`retro` de `caida`, `bloque-buster` y `serpentina`. Razón: este spec valida el andamiaje en un motor; los otros tres (con el spritesheet de `bloque-buster` atado a un PNG y las frutas a color de `serpentina`) merecen cada uno su spec.
- **Sí:** `clasico` se extrae del `engine.ts` actual y se congela byte por byte, incluido "sin `shadowBlur`". Razón: el contrato (§1) sigue válido porque el default preserva la paleta original; si `clasico` divergiera del código sería una regresión.

---

## Risks

| Riesgo                                                                                                       | Mitigación                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Al reemplazar literales por `PALETTES[skin]`, `clasico` podría derivar del render actual (un hex mal copiado, el alfa de partículas, un glow colado). | Paso 3 exige verificación pixel a pixel con `clasico`; los hex de `clasico` en Data model se copian de `lib/games/asteroids/engine.ts` verbatim; `glow: 0` no toca `shadow*`. |
| `clasico` de `rocas` ya es casi monocromo (blanco sobre negro + una llama naranja + un anillo cian), así que `retro` verde aporta poca novedad visual: es `clasico` teñido de verde con una escalera de brillo. | Aceptado: `retro` sigue siendo obligatorio y coherente con el resto del sitio; su valor real en `rocas` es la jerarquía por brillo (power-up y partículas más claros que la grilla) y el bloom de fósforo, no un cambio de tono. |
| Las scanlines `multiply` (~18%) y la viñeta (esquinas hasta `rgba(0,0,0,0.65)`) comen luminancia; un color válido en teoría puede quedar flojo en las esquinas del canvas. | Todas las paletas se fijan con contraste holgado (mínimo efectivo ~8:1 tras el knockdown); `neon` mantiene el glow como refuerzo y `retro` mantiene los elementos finos en el tramo más claro de la escalera. |
| Roles con alfa dinámico (partículas `ttl/life`) o alfa fijo (llama `0.85`): un cambio de skin ingenuo que solo sustituya el hex rompería el desvanecido. | `withAlpha(color, alpha)` compone el `rgba` desde el color del rol y el alfa (runtime o fijo), preservando la fórmula actual de `Particle.draw` y `Ship.draw`. |
| El sistema toca tipos compartidos (`RealGameProps`) que usan los cuatro juegos reales, no solo `rocas`. | `skin` se añade como campo requerido pero los motores de `caida`/`bloque-buster`/`serpentina` simplemente lo ignoran hasta su spec; `GamePlayerClient` siempre lo pasa, así que no hay `undefined` en runtime. |
| Nombre de carpeta: el motor de Asteroides vive en `lib/games/asteroids/` y el wrapper es `AsteroidsGame.tsx`, aunque el slug del catálogo y la clave de `REAL_GAMES` es `rocas`. | Este spec usa las rutas reales (`lib/games/asteroids/engine.ts`, `components/games/AsteroidsGame.tsx`); no se renombra nada. |

---

## What is **not** in this spec

- Las skins `neon`/`retro` de `caida`, `bloque-buster` y `serpentina`.
- Recolorear el chrome del reproductor (`.crt-screen`, scanlines, viñeta), el HUD de React o la arena decorativa.
- Skins para los cuatro juegos decorativos sin motor.
- Light mode del sitio.
- Skins personalizadas por el usuario, editor de paletas, import/export.
- Animar la transición entre skins.
- Un OVNI enemigo o un destello de hiper-salto en el motor de `rocas`.
- Sonido, tests automatizados, cambios de esquema en Supabase.

Cada uno de estos, si se necesita, va en su propio spec.
