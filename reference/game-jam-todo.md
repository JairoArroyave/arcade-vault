# Game jams — Arcade Vault

> Memoria del agente `game-jam` (`.claude/agents/game-jam.md`). Cada entrada es una jam ya
> organizada: el agente la lee antes de inventar nada para no repetir tema ni juego, y
> actualiza su estado cuando avanza. No editar a mano salvo para cambiar un `Estado`.

Estados: `Draft` · `Approved` · `Implementada` · `Descartada (razón)`

## Índice

| #   | Tema                       | Juego ganador | Slot                        | Estado | Fecha      |
| --- | -------------------------- | ------------- | --------------------------- | ------ | ---------- |
| J01 | cruzar el tráfico y el río | Ranaria       | `ranaria` (fila existente)  | Implementada | 2026-08-26 |

## Jams

### J01 — cruzar el tráfico y el río → Ranaria (`ranaria`)

- **Estado:** Implementada
- **Fecha:** 2026-08-26
- **Tema:** "cruzar el tráfico y el río" — un mundo hecho de carriles en movimiento que hay que
  atravesar a saltos, con reloj en contra. Restricción del usuario para esta jam: el ganador
  debía ser un Frogger.
- **Ganador:** Ranaria (Frogger) → `ranaria` — slot decorativo existente, sin SQL y sin CSS
  (`cover-rana` ya está en `app/globals.css:491`)
- **Specs:** `specs/game-jam/ranaria/01-ranaria-diseno.md` +
  `specs/game-jam/ranaria/02-ranaria-implementacion.md`
- **Mecánica que aporta:** evasión pura sin disparo + plataformas móviles que arrastran al
  jugador + presión de temporizador. Contra lo que ya cubre el catálogo: disparo y rotación
  inercial (`rocas`), encaje y rotación de piezas (`caida`), rebote de paleta y pelota
  (`bloque-buster`), crecimiento en grilla (`serpentina`).
- **Capacidades:** `{ hasLives: true, hasLevel: true }`
- **Canvas lógico:** 640 × 480 (4:3 exacto) — grilla de 40 px, 16 columnas × 12 filas: fila 0
  nenúfares, 1-5 río, 6 mediana, 7-10 carretera, 11 base
- **Controles:** ← ↑ → ↓ y `W` `A` `S` `D` (salto de una celda, 90 ms de animación y 110 ms de
  cooldown)
- **Puntaje:** +10 por fila nueva alcanzada hacia arriba (sólo contra el récord de fila del
  intento actual: anti-farmeo), +50 por nenúfar ocupado, +10 × segundo entero restante, +100 por
  mosca bonus, +500 por completar los cinco nenúfares
- **Candidatos descartados:** _Hora Punta_ (el jugador es el semáforo, no el que cruza) — el río
  desaparece del diseño, el puntaje es de hitos discretos y premia jugar lento, y sin avatar el
  jugador observa en vez de cruzar. _Balsero_ (endless de río puro, saltando de tronco a tronco
  con cámara ascendente) — su mecánica es un subconjunto exacto de la mitad fluvial del ganador;
  su único mérito propio, el score infinito por distancia, se rescata como puntaje por fila nueva.
- **Convergencia con `game-planner`:** la entrada **S01** de `reference/game-sugestions-todo.md`
  (Frogger → `ranaria`, `Pendiente`) propone el mismo juego en el mismo slot. No hay
  desplazamiento: estos specs son el paso que S01 dejaba pendiente. Al aprobarlos, marcar S01 a
  mano como `En spec (specs/game-jam/ranaria/…)`.
- **Riesgos / esfuerzo:** ~320-420 líneas (entre `caida` 383 y `bloque-buster` 420). Cero assets.
  Puntos delicados: la `x` de la rana va en float para que los troncos la arrastren aunque el
  movimiento sea por celdas; las colisiones se evalúan sólo con el salto terminado; la barra de
  tiempo se dibuja en la franja inferior del canvas porque el HUD compartido no tiene slot de
  tiempo.
- **Siguiente paso:** `/spec-impl specs/game-jam/ranaria/02-ranaria-implementacion.md`

---
