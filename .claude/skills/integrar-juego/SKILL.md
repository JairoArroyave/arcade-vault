---
name: integrar-juego
description: Diseña el spec para portar un juego real (desde reference/juegos/, otra ruta u otro repo) o para crear uno nuevo a partir de una descripción, y conectarlo al reproductor y al leaderboard real de Supabase. Hace preguntas de intake y análisis propias del dominio (fuente, slot de catálogo, contrato motor/wrapper) y escribe specs/NN-slug.md con la plantilla de /spec, en estado Draft. No implementa código: para eso se usa /spec-impl sobre el spec ya aprobado.
disable-model-invocation: true
argument-hint: 'ruta a la carpeta del juego fuente (p. ej. reference/juegos/03/claude-tetris), o descripción de un juego nuevo si no hay fuente'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /integrar-juego — Spec para portar o crear un juego con leaderboard real

## Session context

Fecha de hoy (usarla para el header del spec, nunca adivinarla):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe todavía"`

Fuentes de juegos ya disponibles en el repo:
!`ls reference/juegos/ 2>/dev/null || echo "No hay carpeta reference/juegos/"`

Catálogo actual de juegos (bloque de seed en supabase/schema.sql):
!`grep -A 12 "insert into games" supabase/schema.sql 2>/dev/null || echo "No se encontró supabase/schema.sql"`

¿Ya existe el registro genérico de juegos reales? (si no existe, este sería el primer spec que porta un *segundo* juego real y su plan debe incluir el refactor de la sección 4 de contract.md):
!`ls components/games/registry.ts 2>/dev/null && echo "registry.ts ya existe" || echo "registry.ts no existe aún — GamePlayerClient.tsx todavía usa el booleano isAsteroids hardcodeado"`

---

Este skill produce un spec (`specs/NN-slug.md`) para llevar un juego —portado de una fuente
existente o diseñado desde cero— al reproductor compartido del sitio, con vidas/nivel/pausa/
fin de partida integrados al HUD ya existente, y con leaderboard real en Supabase (que ya
funciona para cualquier juego sin cambios de esquema, ver sección 6 de `contract.md`).

**Este skill no escribe código de la aplicación ni toca git.** Su única salida es un archivo
de spec en `Draft`. La implementación real ocurre después, corriendo `/spec-impl NN-slug`
sobre el spec ya `Approved` — igual que cualquier otro spec de este repo.

Antes de empezar, lee `contract.md` (en el mismo directorio que este skill). Ahí está el
contrato TypeScript compartido (`GameCallbacks`/`GameEngine`/`RealGameProps`/
`GameCapabilities`/`REAL_GAMES`) que todo spec generado por este skill debe reproducir, y el
ejemplo ya implementado (`lib/games/asteroids/engine.ts` + `components/games/AsteroidsGame.tsx`
+ el porte de `rocas`) que sirve de referencia concreta ante cualquier ambigüedad.

## Filosofía

Specs 05 y 06 de este mismo repo ya resolvieron, a mano, cómo portar un juego real
(`reference/juegos/02/claude-asteroids-main` → `rocas`) y cómo conectar catálogo y
leaderboard reales en Supabase. Este skill no reinventa ese trabajo: **generaliza el intake y
el análisis específicos de portar/crear un juego** (qué fuente usar, en qué slot de catálogo
entra, qué capacidades tiene) para que escribir el próximo spec de este tipo sea rápido y
consistente, sin perder ninguna de las decisiones ya tomadas en 05/06.

## Flujo del comando

Seguir las tres fases en orden. Las respuestas deben estar en el mismo idioma del prompt
inicial (español, salvo que el usuario escriba en otro idioma) — igual que el resto de specs
de este repo, que están en español.

### Fase 1 — Intake

1. Leer la memoria de proyecto: probar en orden `CLAUDE.md`, `AGENTS.md`, `README.md`, y
   quedarse con el primero que exista.
2. Si `$ARGUMENTS` no trae nada, preguntar primero: ¿hay una fuente de código de partida, o es
   un juego nuevo sin fuente?
3. Determinar el **tipo de fuente** con `AskUserQuestion` (bloque de una sola pregunta, 2-4
   opciones):
   - Una carpeta bajo `reference/juegos/<NN>/` (listar las disponibles desde el session
     context; si `$ARGUMENTS` ya apunta a una, confirmarla en vez de volver a preguntar).
   - Otra ruta local o repo que el usuario indique (pedir la ruta exacta).
   - Sin fuente — un juego nuevo diseñado desde una descripción de texto (pedir la
     descripción ahí mismo si no vino en `$ARGUMENTS`: mecánica principal, condición de fin,
     cómo sube el puntaje).
4. Determinar el **slot de catálogo** con `AskUserQuestion`, mostrando los 8 juegos del
   session context (id/título/categoría) y marcando cuáles ya son reales (tienen entrada en
   `components/games/registry.ts` si existe, o es `rocas` si el registro todavía no existe):
   - ¿El juego nuevo encaja temáticamente en uno de los slots decorativos restantes (por
     categoría/tema)? Recomendar el mejor match si la fuente ya es conocida (p. ej. Tetris →
     `caida`, PUZZLE; Arkanoid → `bloque-buster`, ARCADE).
   - Si no encaja en ninguno: pedir los datos de una fila nueva para `games`
     (`id`/`title`/`short`/`long`/`cat`/`cover`/`color`/`plays`).

### Fase 2 — Análisis de la fuente (portado) o diseño (desde cero)

**Si se está portando código existente:**

- Leer directamente el archivo de entrada del juego (`game.js` o equivalente) — **nunca
  confiar solo en su propio README/CLAUDE.md**. Este repo ya tiene dos casos confirmados de
  documentación desactualizada respecto al código real: `reference/juegos/04/arkanoid/CLAUDE.md`
  dice "no hay código todavía" cuando sí existe un juego completo implementado (ver sus
  `specs/01-04-*.md`, la mayoría `Implemented`); `reference/juegos/03/claude-tetris/CLAUDE.md`
  dice que `game.js` tiene "~300 líneas" cuando en realidad tiene 696. Leer el código fuente
  es la única fuente de verdad.
- Del código, extraer:
  - Estado a nivel de módulo y su acoplamiento a `document`/`window` (para saber qué mover
    dentro del closure de la factory, igual que se hizo con Asteroids).
  - Si dibuja su propio HUD o su propio overlay de "game over" dentro del canvas (se elimina,
    se reemplaza por callbacks — ver sección 1 de `contract.md`).
  - Si tiene reinicio propio por tecla (se elimina — el reinicio pasa a ser exclusivamente
    `resetKey` desde React).
  - Resolución/aspect ratio lógico del canvas.
  - Si tiene concepto de vidas (→ `hasLives`) y si tiene un nivel/progresión natural en
    partida (→ `hasLevel`) — ver sección 3 de `contract.md` para ejemplos ya identificados.
  - Paleta de colores original — se preserva tal cual, nunca se recolorea al tema neon del
    sitio.
  - Cualquier feature mencionado solo en README/CLAUDE.md pero ausente del código real
    (inconsistencia conocida, documentar como decisión: se porta el código tal como está, no
    como lo describe su propia documentación).

**Si es un juego nuevo sin fuente:**

- Mismo cuestionario que arriba, pero por `AskUserQuestion` en vez de lectura de código:
  mecánica y controles, condición de fin, cómo sube el puntaje, si tiene vidas (`hasLives`),
  si tiene nivel/progresión (`hasLevel`), resolución lógica del canvas.
- Además, una decisión explícita de **paleta** (no hay original de la cual partir): paleta
  retro propia del juego, o tomar las variables de color ya definidas por el tema neon del
  sitio. Preguntar, no asumir.

Ambos caminos convergen en el mismo worksheet de `contract.md`: capacidades
`{hasLives, hasLevel}`, resolución `W×H`, ruta del motor `lib/games/<slug>/engine.ts`, ruta
del wrapper `components/games/<PascalName>Game.tsx`.

**Cuándo parar de preguntar:** cuando se puedan responder sin asumir nada estas tres
preguntas: ¿qué archivos van a aparecer o cambiar?, ¿cuál es el primer paso ejecutable del
plan y cuál el último?, ¿cómo se verifica que quedó terminado? Si falta alguna, seguir
preguntando.

### Fase 3 — Escribir el spec

1. Leer `../spec/template.md` (ruta relativa a este skill) para la forma exacta del
   documento — no duplicar esa plantilla aquí, solo seguirla.
2. Determinar `specs/NN-slug.md`: número más alto existente en `specs/` (del session context)
   más uno, con cero a la izquierda a dos dígitos.
3. Escribir el spec completo con las secciones de `template.md`, usando:
   - **Header**: `Depends on: SPEC 05, SPEC 06` (siempre — este skill construye sobre ambos
     patrones); objetivo en una sola frase.
   - **Por qué existe este spec** (opcional): solo si hay una decisión no obvia que justificar
     (p. ej. por qué este juego usa este slot de catálogo en particular, o por qué se
     descartó un feature documentado pero ausente del código real de la fuente).
   - **Scope**: en el "In" siempre entran, como mínimo, el motor, el wrapper, la integración
     al catálogo/leaderboard, y — si corresponde según el session context — el refactor único
     de `GamePlayerClient.tsx`/`registry.ts`/CSS descrito en la sección 4 de `contract.md`. En
     el "Out" siempre entran, salvo que el usuario pida explícitamente lo contrario en Fase 1:
     controles táctiles/móviles, recoloreo al tema neon, Supabase Auth, CLI/migraciones de
     Supabase, tests automatizados, y cualquier chrome de juego nuevo (p. ej. pantalla de
     selección de dificultad) más allá del HUD/pausa/modal ya existentes.
   - **Data model**: los tipos de `contract.md` sección 1-3, más la fila de `games` (nueva o
     reutilizada) y la entrada de `REAL_GAMES` que le corresponde a este juego.
   - **Implementation plan**: pasos numerados, cada uno dejando el sistema funcional. Si el
     session context indicó que `registry.ts` no existe, los primeros pasos son exactamente
     los 6 de la sección 4 de `contract.md` (crear tipos, crear registro, migrar
     Asteroids/engine, migrar AsteroidsGame, generalizar GamePlayerClient, generalizar CSS)
     antes de agregar el motor/wrapper de este juego nuevo. Si ya existe, el plan empieza
     directo por el motor de este juego. Terminar siempre con: correr el SQL actualizado a
     mano si se agregó fila nueva a `games` (sección 6 de `contract.md`), y
     `npm run lint && npm run build`.
   - **Acceptance criteria**: partir literalmente del checklist de la sección 8 de
     `contract.md`, adaptando `<slug>`/`<PascalName>`/`<id>` y agregando los criterios propios
     de los controles/reglas específicas de este juego.
   - **Decisions**: registrar explícitamente, con Sí/No y razón, cada elección de Fase 1-2
     (tipo de fuente, slot de catálogo elegido y por qué, capacidades `hasLives`/`hasLevel`,
     paleta si es un juego nuevo), más las decisiones heredadas de specs 05/06 que apliquen
     (no tocar la fuente original, no recolorear, sin Auth, sin CLI de Supabase, motor
     separado del wrapper).
   - **Risks**: solo si hay riesgos no obvios (p. ej. drift entre la documentación y el
     código real de la fuente, o que el refactor único de `registry.ts` podría afectar el
     comportamiento ya verificado de `rocas` si no se hace con cuidado).
   - **What is not in this spec**: repetir el "Out of scope" del final.
4. Verificar que las dependencias referenciadas (`SPEC 05`, `SPEC 06`) existen en `specs/`.
5. Si `specs/.spec-config.yml` no existe, crearlo con el contenido por defecto (igual que hace
   `/spec` — `AutoCreateBranch: true`). Si ya existe, no tocarlo.
6. Guardar el archivo en `specs/NN-slug.md` con estado `Draft`. **No pedir permiso para
   escribirlo ni confirmación del nombre** — anunciar la ruta en la confirmación final.
7. Confirmar al usuario:
   - Ruta del archivo creado.
   - Recordatorio: el spec está en `Draft`; cambiarlo a `Approved` tras revisarlo.
   - Próximo paso: correr `/spec-impl NN-slug` para implementarlo.
   - **Detenerse ahí.** No proponer implementar el spec ni escribir código.

## Reglas

- **Nunca modifica archivos bajo la ruta fuente que se está portando** (`reference/juegos/**`
  o cualquier otra ruta/repo externo indicado por el usuario) — esa carpeta queda de solo
  lectura; toda la adaptación vive en archivos nuevos bajo `lib/games/` y `components/games/`.
- **Nunca recolorea** la paleta original de un juego portado al tema neon del sitio.
- **No construye controles táctiles/móviles** — solo teclado, mismo precedente que spec 05.
- **No agrega Supabase Auth** ni ningún sistema de identidad más allá del input de iniciales/
  `useAuth()` ya existente.
- **No usa Supabase CLI, migraciones ni cliente admin/service-role** — los cambios de esquema
  son SQL aditivo en `supabase/schema.sql`, corrido a mano por el usuario en el dashboard.
- **Nunca modifica la tabla `scores`** — ya es genérica por `game` id (ver sección 6 de
  `contract.md`); un juego nuevo obtiene leaderboard funcional en cuanto tiene fila en `games`
  y llama a `saveScore()`.
- **No escribe tests automatizados** — no hay test runner configurado en este proyecto.
- **No implementa código ni crea rama de git.** Su única salida es `specs/NN-slug.md` en
  `Draft`. Implementación y creación de rama son siempre trabajo de `/spec-impl`, una vez el
  spec esté `Approved`.
- **No agrega chrome de juego nuevo** (p. ej. una pantalla de selección de dificultad
  pre-partida) más allá del HUD/pausa/modal de fin de partida ya compartidos — si un juego
  portado lo necesita de verdad, eso es un spec futuro aparte, no algo que este skill deba
  improvisar.
- **Nunca escribe código durante este comando** — solo el archivo `.md` del spec, al final.

## Argumentos

`$ARGUMENTS` puede ser una ruta a una carpeta de juego fuente (p. ej.
`reference/juegos/03/claude-tetris`) o, si no hay fuente, la descripción de un juego nuevo.
Si viene vacío, empezar la Fase 1 preguntando cuál de los dos casos aplica.
