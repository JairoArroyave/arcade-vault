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
| A01 | 2026-09-09 | `rocas`          | `specs/10-skins-de-juegos.md` | Auditada (specs/10) — Draft |

## Auditorías

### A01 — Auditoría 2026-09-09

- **Estado:** Auditada (specs/10-skins-de-juegos.md) — spec en `Draft`.
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
