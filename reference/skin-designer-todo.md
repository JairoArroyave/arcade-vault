# Skins de juegos — Arcade Vault

> Memoria del agente `skin-designer` (`.claude/agents/skin-designer.md`). Cada entrada es una
> pasada de auditoría ya hecha: el agente la lee antes de rediseñar nada para no repetir
> paletas ya fijadas, y actualiza el estado cuando avanza. No editar a mano salvo para cambiar
> un `Estado`.

Estados: `Auditada (specs/NN)` · `En spec` · `Implementada` · `Regresión detectada`

Skins obligatorias por juego real: `clasico` (default) · `neon` · `retro`.

## Índice

| #   | Fecha      | Juegos auditados | Spec                       | Estado                     |
| --- | ---------- | ---------------- | -------------------------- | -------------------------- |
| A01 | 2026-09-09 | `rocas`          | `specs/10-skins-de-juegos.md` | Implementada (specs/10)     |
| A02 | 2026-09-09 | `bloque-buster`  | `specs/11-skins-arkanoid.md`  | Implementada (specs/11)     |
| A03 | 2026-09-09 | `serpentina`     | `specs/12-skins-snake.md`     | Auditada (specs/12) — Draft |

## Auditorías

### A01 — Auditoría 2026-09-09

- **Estado:** Implementada (specs/10-skins-de-juegos.md).
- **Alcance de la pasada:** solo `rocas` (Asteroides). El spec 10 monta el andamiaje compartido
  del sistema de skins (tipo `Skin`, prop en `RealGameProps`, selector + persistencia en
  `localStorage["av_skin"]`, cambio de `contract.md` §1/§5) y lo valida en un único motor.
  `caida`, `bloque-buster` y `serpentina` quedan para pasadas siguientes con su propio spec.
- **Juegos reales al momento:** `rocas`, `caida`, `bloque-buster`, `serpentina`
  (`components/games/registry.ts`).
- **Nota de rutas:** el motor de `rocas` vive en `lib/games/asteroids/engine.ts` y el wrapper
  es `components/games/AsteroidsGame.tsx` (la clave de `REAL_GAMES` sí es `rocas`). No hay
  `lib/games/rocas/` ni `RocasGame.tsx`.

- **Cobertura:**

  | Juego           | clasico | neon | retro |
  | --------------- | ------- | ---- | ----- |
  | `rocas`         | ✅      | ✅   | ✅    |
  | `caida`         | ✅\*    | ❌   | ❌    |
  | `bloque-buster` | ✅\*    | ❌   | ❌    |
  | `serpentina`    | ✅\*    | ❌   | ❌    |

  \* `clasico` implícito = el render actual de su `engine.ts`; aún no auditado ni consolidado
  en estructura por skin. Pendiente de su propia pasada.

- **`rocas` — roles y paletas fijadas** (detalle completo en `specs/10-skins-de-juegos.md`
  §Data model). Siete roles; no hay OVNI ni destello de hiper-salto en el motor actual.

  | Rol                     | clasico (actual)       | neon               | retro (verde) |
  | ----------------------- | ---------------------- | ------------------ | ------------- |
  | Fondo                   | `#000000`              | `#000000`          | `#000000`     |
  | Nave (trazo)            | `#ffffff`              | `#00f5ff`          | `#b6ffb6`     |
  | Propulsión (llama)      | `#ff8200` @ α 0.85     | `#f5ff00` @ α 0.85 | `#e6ffe6` @ α 0.85 |
  | Balas                   | `#ffffff`              | `#ff3d92`          | `#e6ffe6`     |
  | Asteroides (trazo)      | `#ffffff`              | `#e6e9ff`          | `#33ff33`     |
  | Partículas explosión    | `#ffffff` @ α ttl/life | `#f5ff00` @ α ttl/life | `#66ff66` @ α ttl/life |
  | Power-up disparo triple | `#00ffff`              | `#00ff88`          | `#9dff9d`     |
  | Glow (`shadowBlur`)     | `0` (sin glow)         | `8`               | `5`           |

- **Hallazgos de legibilidad en oscuro:** las tres skins de `rocas` pasan los cinco criterios.
  Único punto tenso: en `neon`, balas con `--magenta` puro `#ff006e` quedan cerca del piso de
  4.5:1 bajo scanlines — ya corregido en la paleta usando `#ff3d92` (magenta aclarado). Sin
  celdas `⚠️`.

- **Conflictos anotados:**
  - `rocas` en `clasico` ya es casi monocromo (blanco/negro + llama naranja + anillo cian), así
    que `retro` aporta poca novedad de tono: es `clasico` teñido de verde. Su valor real es la
    jerarquía por brillo (jugador/proyectiles más claros que la grilla de asteroides) y el
    bloom de fósforo.
  - Roles con alfa (partículas `ttl/life`, llama `0.85`): la skin no puede ser solo un hex; se
    compone `rgba` con `withAlpha(color, alfa)` preservando la fórmula actual.
  - Discrepancia de nombres de carpeta (`asteroids/` vs slug `rocas`) — el spec usa las rutas
    reales, no renombra.
  - `bloque-buster` (spritesheet `spritesheet-breakout.png` con `BlockColor`) y `serpentina`
    (frutas a color real que no se recolorean): riesgos a tratar en sus pasadas.

- **Cambio de contrato:** `contract.md` §1 — de "Paleta de colores original preservada — nunca
  recoloreada al tema neon del sitio" a "el default `clasico` preserva la paleta original byte
  por byte; `neon`/`retro` son skins opcionales vía el 3er parámetro `skin`". §5 menciona la
  firma `createXEngine(canvas, callbacks, skin?)`. El cambio lo aplica `/spec-impl`, no este
  agente.

- **Siguiente paso:** `/spec-impl specs/10-skins-de-juegos.md`

---

### A02 — Auditoría 2026-09-09

- **Estado:** Implementada (specs/11-skins-arkanoid.md).
- **Alcance de la pasada:** solo `bloque-buster` (Arkanoid). Reutiliza el andamiaje compartido de
  SPEC 10 (tipo `Skin`, `RealGameProps.skin`, selector + persistencia en
  `localStorage["av_skin"]`, `contract.md` §1/§2 ya actualizados); **este spec no lo re-toca**.
  Consolida la paleta del motor de Arkanoid indexada por skin y cablea el 3er parámetro por
  `ArkanoidGame.tsx`. `caida` sigue pendiente de su propio spec.
- **Juegos reales al momento:** `rocas`, `caida`, `bloque-buster`, `serpentina`.
- **Rutas:** motor `lib/games/arkanoid/engine.ts`, wrapper `components/games/ArkanoidGame.tsx`,
  datos de sprites `lib/games/arkanoid/sprites.ts`, asset `public/games/bloque-buster/spritesheet-breakout.png`.
  Clave en `REAL_GAMES`: `bloque-buster`. Capabilities `{ hasLives: true, hasLevel: false }`.

- **Cobertura:**

  | Juego           | clasico | neon | retro |
  | --------------- | ------- | ---- | ----- |
  | `rocas`         | ✅      | ✅   | ✅    |
  | `caida`         | ✅\*    | ❌   | ❌    |
  | `bloque-buster` | ✅      | ✅   | ✅    |
  | `serpentina`    | ✅      | ✅   | ✅    |

  \* `clasico` implícito = render actual de su `engine.ts`; pendiente de su propia pasada.

- **Conflicto central — juego 100% spritesheet.** El motor de Arkanoid no dibuja nada
  vectorial: paleta, pelota, los 7 `BlockColor` (`red yellow green cyan magenta hotpink gray`,
  uno por fila) y las 28 `EXPLOSION_FRAMES` salen de `spritesheet-breakout.png` vía `drawImage`.
  Lo único con literal de color es `drawStartOverlay` (scrim `rgba(0,0,0,0.6)` + texto `#fff`).
  No hay fondo propio (`clearRect` → negro del `.crt-screen`) ni HUD en canvas.
  - **Técnica de recoloreo elegida:** atlas teñido offscreen construido **una vez** en
    `image.onload` (solo si `pal.tint` no es `null`). Por sprite: `clip` a su rect →
    `drawImage` original → `globalCompositeOperation = "source-in"` → `fillRect` del tinte. Da
    silueta plana (se pierde bisel + contorno negro del PNG; los ladrillos ya se separan por
    `BRICK_GAP = 4`). `drawSprite`/`drawFrame` solo cambian la fuente: `image` → `tinted ?? image`.
    Las explosiones heredan `tint.blocks[color]`. Glow por `shadowBlur` cuando `pal.glow > 0`.
  - **`clasico` = `tint: null`:** `drawImage` del PNG sin compositing, scrim `0.6`, texto `#fff`,
    `glow: 0`. Byte por byte. Los hex de la columna `clasico` en el spec son aproximados
    (muestreados del PNG con `sharp`), solo documentación.
  - Nombres del enum vs. apariencia real del PNG: `green` se ve azul, `cyan` se ve turquesa,
    `magenta` se ve violeta, `hotpink` se ve naranja. El spec lo anota fila por fila.

- **Paletas fijadas** (detalle en `specs/11-skins-arkanoid.md` §Data model):
  - **neon** — filas 0–6: `#ff3355` / `#f5ff00` / `#00b3ff` / `#00f5ff` / `#b26bff` / `#ff8a00`
    / `#e6e9ff` (fila `gray` = `--ink`, ladrillo neutro). Paleta `#00ff88` (`--green`), pelota
    `#ffffff`, texto overlay `#00f5ff`, `glow: 8`. Fila 2 azul `#00b3ff` distinta del cian de la
    fila 3 para separar las dos bandas frías.
  - **retro** — verde fósforo: todos los ladrillos + explosiones `#40d840`, paleta `#b6ffb6`,
    pelota `#e6ffe6`, texto overlay `#66ff66`, `glow: 4`. Jerarquía por brillo:
    fondo < ladrillos < paleta < pelota. Verde, no ámbar (consistente con SPEC 09/10).

- **Hallazgos de legibilidad en oscuro:** las tres skins pasan los cinco criterios. Sin celdas
  `⚠️`. Detalle:
  - `clasico`: los ladrillos `red` (~3.7:1), `magenta` (~3.3:1) y `gray` (~3.2:1) del PNG rozan
    el piso de 3:1 y bajo scanlines `multiply` caen por debajo en las franjas oscuras. **No se
    corrige** (es la paleta original; tocarla = regresión). Queda como hallazgo de `clasico`.
  - `neon`: todas las filas ≥ ~5.9:1 (mínimo `#ff3355`); pelota blanca ~21:1; texto cian ~15:1.
  - `retro`: ladrillos `#40d840` ~6.8:1 (~5.5:1 bajo scanlines, siluetas grandes → OK); pelota
    `#e6ffe6` ~19:1; paleta `#b6ffb6` ~15:1.

- **Conflictos anotados:**
  - Muro verde plano en `retro`: las 7 filas de colores colapsan a un solo verde. Asumido (el
    color de ladrillo es cosmético: 10 pts, un golpe). El spec permite alternar dos verdes por
    fila par/impar si se ve pobre; contraste y jerarquía se sostienen igual.
  - `source-in` sobre el atlas offscreen puede variar en bordes antialias entre navegadores;
    fallback en el spec: teñir en un canvas del tamaño del sprite y copiarlo de vuelta.
  - El tinte plano pierde el bisel/sombreado y el contorno negro del PNG — aceptado: es el look
    "neón vectorial" del sitio y hace el contraste predecible.

- **Cambio de contrato:** ninguno. SPEC 10 ya dejó `contract.md` §1/§2 con el 3er parámetro
  `skin`; este spec solo lo consume.

- **Siguiente paso:** `/spec-impl specs/11-skins-arkanoid.md`

---

### A03 — Auditoría 2026-09-09

- **Estado:** Auditada (specs/12-skins-snake.md) — Draft.
- **Alcance de la pasada:** solo `serpentina` (Snake). Reutiliza el andamiaje compartido de
  SPEC 10 (tipo `Skin`, `RealGameProps.skin`, selector + persistencia en
  `localStorage["av_skin"]`, `contract.md` §1/§2 ya actualizados); **este spec no lo re-toca**.
  Consolida la paleta del motor de Snake indexada por skin y cablea el 3er parámetro por
  `SerpentinaGame.tsx`. `caida` y `bloque-buster` siguen pendientes de su propio spec.
- **Juegos reales al momento:** `rocas`, `caida`, `bloque-buster`, `serpentina`.
- **Rutas:** motor `lib/games/serpentina/engine.ts`, wrapper `components/games/SerpentinaGame.tsx`,
  atlas `lib/games/serpentina/sprites.ts` (+ `public/games/serpentina/fruits.png`, copia del
  portado `reference/snake-assets/`, solo lectura).

- **Cobertura:**

  | Juego        | clasico | neon | retro |
  | ------------ | ------- | ---- | ----- |
  | `serpentina` | ✅      | ✅   | ✅    |

- **`serpentina` — roles y paletas fijadas** (detalle en `specs/12-skins-snake.md` §Data model).
  Cuatro roles de color: fondo del tablero, cuerpo, cabeza, glow. La separación entre celdas es
  geometría (`CELL_GAP = 1`, hueco que revela el fondo), no un rol; no hay grilla dibujada, ni
  texto en canvas, ni bordes. La fruta no entra en la paleta.

  | Rol                    | clasico (actual)    | neon                   | retro (verde)       |
  | ---------------------- | ------------------- | ---------------------- | ------------------- |
  | Fondo del tablero      | `#050505`           | `#000000`             | `#000000`           |
  | Cuerpo de la serpiente | `#33ff33`           | `#00ff88` (`--green`) | `#33ff33`           |
  | Cabeza de la serpiente | `#aaffaa`           | `#f5ff00` (`--yellow`)| `#d8ffd8`           |
  | Fruta / comida         | sprite a color real | sprite a color real   | sprite a color real |
  | Glow (`shadowBlur`)    | `0` (sin glow)      | `8`                   | `5`                 |

- **Decisión sobre las frutas:** **no se recolorean en ninguna skin**, ni en `retro` monocromo.
  Se dibujan siempre con su sprite a color real vía `drawImage` desde `fruits.png`. Motivos:
  continuidad con SPEC 09 ("frutas a color real, nunca recoloreadas") + legibilidad (un tinte
  verde en `retro` fundiría la fruta con la serpiente y el tablero verdes y perdería el
  contraste interno de los recortes) + el spritesheet es asset portado de solo lectura y se
  evita `ctx.filter`/compositing. En `retro` se encuadra como diseño: la fruta es el único
  color no-fósforo en pantalla, el objetivo siempre resalta.
- **Hallazgos de legibilidad en oscuro:** las tres skins pasan los cinco criterios; **sin celdas
  ⚠️**. Notas menores: (1) en `clasico` la separación cabeza/cuerpo es sutil (`#aaffaa` vs
  `#33ff33`, ambos verdes) — es el render vigente, se preserva byte por byte; `neon` (amarillo
  vs verde) y `retro` (`#d8ffd8` vs `#33ff33`) la ensanchan. (2) El bloom `shadowBlur` (8 `neon`
  / 5 `retro`) podría difuminar el hueco de 1px entre segmentos; blur modesto sobre `fillRect`
  de 28 px, sigue leyéndose; bajar `neon` a 6 si en prueba se pierde.
- **Conflictos anotados:**
  - Frutas = sprites a color real del spritesheet `fruits.png` (solo lectura): decisión de no
    recolorear en ninguna skin (ver arriba).
  - `serpentina` en `clasico` ya es fósforo verde (`#33ff33` / `#aaffaa`): igual que `rocas`,
    `retro` aporta poco cambio de tono; su valor es la escalera de brillo cabeza/cuerpo, el
    bloom y el fondo `#000` puro (clasico usa `#050505`).
  - `clasico` conserva el fondo `#050505` (no `#000`) byte por byte; `neon`/`retro` lo llevan a
    `#000000`.
  - Sin `withAlpha` en este motor: todos los rellenos son sólidos, sin `rgba` ni alfa dinámico
    (a diferencia de `rocas`).
  - Sin rol de grilla: el efecto de celdas es el hueco de `CELL_GAP = 1`.
- **Cambio de contrato:** ninguno — `contract.md` §1/§2 ya quedó actualizado en SPEC 10. Este
  spec no toca el contrato.
- **Siguiente paso:** `/spec-impl specs/12-skins-snake.md`

---
