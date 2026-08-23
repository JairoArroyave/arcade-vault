# SPEC 06 — Catálogo de juegos y leaderboard reales en Supabase

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 04
> **Date:** 2026-08-22
> **Objective:** Reemplazar el catálogo de juegos hardcodeado (`lib/games.ts`) y el leaderboard simulado (`lib/leaderboard.ts`, `seededScores`) por dos tablas reales en Supabase (`games` y `scores`), leídas y escritas desde la Biblioteca, el Detalle, el Reproductor y el Salón de la Fama.

---

## Por qué existe este spec

El spec 04 dejó el proyecto conectado a Supabase (`lib/supabase/client.ts`, `lib/supabase/server.ts`) pero deliberadamente sin ninguna tabla, "para que specs futuros decidan qué mover a Supabase". Hoy el catálogo de 8 juegos vive como un array en memoria (`lib/games.ts`), el Salón de la Fama (`/hall-of-fame`) y el Detalle (`/games/[id]`) muestran puntuaciones falsas generadas con una semilla (`seededScores`), y las puntuaciones reales que el jugador guarda al terminar una partida se escriben en `localStorage["av_scores"]` pero nunca se leen de vuelta en ninguna pantalla (gap documentado como "no se cierra" en el spec 05).

Este spec cierra ese gap: crea las dos tablas que faltan, mueve el catálogo y las puntuaciones a Supabase, y conecta las cuatro pantallas existentes a datos reales — sin agregar autenticación real ni tocar el mock de usuario en `localStorage` (`av_user`, spec 01).

---

## Scope

**In:**

- `supabase/schema.sql` (nuevo, versionado): script SQL con `CREATE TABLE` de `games` y `scores`, políticas RLS, e `INSERT` de seed con los 8 juegos actuales. Se ejecuta una vez, a mano, en el SQL Editor del dashboard de Supabase (mismo estilo manual que la conexión del spec 04; no se usa Supabase CLI ni migraciones formales).
- `lib/games.ts` reescrito: mantiene los tipos `Game`/`GameCategory`, pero reemplaza el array `GAMES` por `getGames(): Promise<Game[]>` y `getGameById(id): Promise<Game | undefined>`, que consultan la tabla `games` en Supabase (vía `lib/supabase/server.ts`) y le adjuntan a cada juego su `best` (mejor puntuación) calculado a partir de la tabla `scores`.
- `lib/leaderboard.ts` reescrito: mantiene el tipo `ScoreRow` (`rank`, `name`, `score`, `date`), reemplaza `seededScores`/`PLAYERS` por:
  - `getScoresForGame(gameId, limit)`: top N puntuaciones reales de un juego, ordenadas desc.
  - `getBestScores()`: mapa `{ [gameId]: number }` con la mejor puntuación de cada juego (0 si no tiene ninguna), usado por `getGames()`.
- `lib/leaderboard-client.ts` (nuevo): `saveScore({ game, score, name })`, hace `INSERT` en `scores` desde el cliente de navegador; lanza si falla (el llamador decide cómo mostrarlo). Ver Decisiones — separado de `lib/leaderboard.ts` por el límite servidor/cliente de Next.
- `lib/storage.ts`: se eliminan `SCORES_KEY`, `StoredScoreEntry`, `getStoredScores` y `addStoredScore`. El resto (mock de usuario `av_user`) queda intacto.
- `app/page.tsx` pasa a ser un Server Component `async` que llama a `getGames()` y renderiza un nuevo `components/GameLibrary.tsx` (`"use client"`) con la búsqueda/filtro/grilla que hoy vive en `app/page.tsx`, recibiendo `games: Game[]` por props.
- `app/games/[id]/page.tsx`: sigue siendo Server Component `async`; cambia `getGameById` (ahora async) y `seededScores` por `getScoresForGame(id, 10)` para la lista "MEJORES PUNTUACIONES" y usa `game.best` real en "Mejor global".
- `app/games/[id]/play/page.tsx` se divide en:
  - `app/games/[id]/play/page.tsx` (Server Component `async`): resuelve `getGameById(id)`, llama `notFound()` si no existe, y renderiza `components/games/GamePlayerClient.tsx` pasándole `game` por props.
  - `components/games/GamePlayerClient.tsx` (`"use client"`, nuevo): contiene toda la lógica de estado/HUD/modal que hoy está en `app/games/[id]/play/page.tsx`, recibiendo `game: Game` en vez de resolverlo con `useParams` + `getGameById` síncrono. El guardado de puntuación llama a `saveScore(...)` en vez de `addStoredScore(...)`.
- `app/hall-of-fame/page.tsx` se divide en:
  - `app/hall-of-fame/page.tsx` (Server Component `async`): llama a `getGames()` y, para cada juego, `getScoresForGame(id, 12)`; arma un mapa `{ [gameId]: ScoreRow[] }` y lo pasa a un nuevo `components/HallOfFameClient.tsx`.
  - `components/HallOfFameClient.tsx` (`"use client"`, nuevo): contiene el estado de tab/podio/tabla que hoy está en `app/hall-of-fame/page.tsx`, cambiando de juego sobre los datos ya recibidos (sin nueva consulta de red al cambiar de tab). La sección "TU MEJOR MARCA" busca, dentro de las 12 filas ya cargadas del juego activo, una cuyo `name` coincida (case-insensitive) con `user.name`; si no aparece, la sección no se muestra.
- Manejo de error al guardar puntuación: si `saveScore` falla (network, RLS, etc.), el botón "GUARDAR PUNTUACIÓN" vuelve a su estado normal (no queda marcado como guardado) y se muestra un mensaje de error breve debajo del input; el usuario puede reintentar con el mismo puntaje.
- `GameCard.tsx` no cambia: sigue recibiendo `game.best` ya calculado, ahora con el valor real en vez del mock.

**Out of scope (para specs futuros):**

- Autenticación real con Supabase Auth. El usuario sigue siendo el mock de `localStorage` (`av_user`, spec 01); las puntuaciones se siguen guardando con nombre/iniciales sueltas, sin asociarlas a una cuenta real. Ya era una decisión explícita del spec 04.
- `middleware.ts` de refresco de sesión. Sigue sin haber sesión de Supabase que refrescar.
- El campo `plays` ("12.4K", conteo de partidas jugadas): se migra tal cual como valor estático sembrado en la tabla `games`. No hay tracking real de partidas jugadas; ese es un feature aparte.
- Editar o borrar puntuaciones ya guardadas (no hay políticas de `UPDATE`/`DELETE` en `scores`, ni UI para ello).
- Migrar/usar Supabase CLI (`supabase init`, migraciones formales, `supabase db push`). El script SQL se corre a mano en el dashboard, igual que la conexión del spec 04.
- Cliente admin con `SUPABASE_SERVICE_ROLE_KEY`. El seed y el schema se corren manualmente en el SQL Editor (contexto con permisos de owner), no desde la app.
- Vistas/paginación para el Salón de la Fama más allá del top 12 por juego, o para el Detalle más allá del top 10. Si un juego acumula muchas partidas, solo se muestran esas cantidades fijas.
- Recolorear o rediseñar cualquiera de las 4 pantallas afectadas. El único cambio es el origen de los datos.
- Adaptar los otros 7 juegos mock a implementaciones jugables reales (eso es el spec 05, ya resuelto solo para `rocas`).

---

## Data model

```sql
-- supabase/schema.sql

create table if not exists games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null,
  plays text not null
);

create table if not exists scores (
  id bigint generated always as identity primary key,
  game text not null references games(id),
  score integer not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table games enable row level security;
alter table scores enable row level security;

create policy "games are publicly readable" on games
  for select using (true);

create policy "scores are publicly readable" on scores
  for select using (true);

create policy "anyone can insert a score" on scores
  for insert with check (true);

insert into games (id, title, short, long, cat, cover, color, plays) values
  ('bloque-buster', 'BLOQUE BUSTER', '...', '...', 'ARCADE', 'cover-bricks', 'cyan', '12.4K'),
  ('caida', 'CAÍDA', '...', '...', 'PUZZLE', 'cover-tetro', 'magenta', '31.8K'),
  ('serpentina', 'SERPENTINA', '...', '...', 'ARCADE', 'cover-snake', 'green', '9.1K'),
  ('gloton', 'GLOTÓN', '...', '...', 'ARCADE', 'cover-glot', 'yellow', '27.2K'),
  ('invasores', 'INVASORES', '...', '...', 'SHOOTER', 'cover-invaders', 'green', '18.0K'),
  ('rocas', 'ROCAS', '...', '...', 'SHOOTER', 'cover-rocas', 'yellow', '15.6K'),
  ('ranaria', 'RANARIA', '...', '...', 'ARCADE', 'cover-rana', 'green', '6.4K'),
  ('duelo-pixel', 'DUELO PIXEL', '...', '...', 'VERSUS', 'cover-duelo', 'cyan', '4.2K')
on conflict (id) do nothing;
```

_(Los `'...'` se completan en la implementación con los textos `short`/`long` reales, copiados tal cual de `lib/games.ts` actual. No se inserta `best`: no es columna de `games`, se calcula desde `scores`.)_

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  plays: string;
  best: number; // calculado desde scores, 0 si el juego no tiene puntuaciones
};

export async function getGames(): Promise<Game[]>;
export async function getGameById(id: string): Promise<Game | undefined>;
```

```ts
// lib/leaderboard.ts (lecturas, server-only)
export type ScoreRow = { rank: number; name: string; score: number; date: string };

export async function getScoresForGame(gameId: string, limit?: number): Promise<ScoreRow[]>;
export async function getBestScores(): Promise<Record<string, number>>;
```

```ts
// lib/leaderboard-client.ts (escritura, desde Client Components)
export async function saveScore(entry: { game: string; score: number; name: string }): Promise<void>;
```

`getBestScores` y el cálculo de `best` no usan una vista SQL: se resuelven trayendo las filas de `scores` ordenadas por `score desc` y quedándose con la primera aparición por `game` en JS (volumen de datos pequeño, consistente con el resto del proyecto).

---

## Implementation plan

1. Crear `supabase/schema.sql` con las dos tablas, las 3 políticas RLS y el seed de los 8 juegos (textos `short`/`long` copiados de `lib/games.ts`). Ejecutarlo a mano en el SQL Editor del proyecto Supabase del spec 04. Verificación: en el dashboard, `select * from games` devuelve 8 filas; `select * from scores` devuelve 0 filas.
2. Reescribir `lib/leaderboard.ts` con `getScoresForGame`, `getBestScores` y `saveScore` contra la tabla `scores`, usando `lib/supabase/server.ts` para las lecturas (llamadas desde Server Components) y `lib/supabase/client.ts` para `saveScore` (llamada desde `GamePlayerClient.tsx`, un Client Component). Eliminar `seededScores`/`PLAYERS`. Verificación: el archivo compila (`npx tsc --noEmit` o `npm run build`) sin usarse aún en ninguna pantalla.
3. Reescribir `lib/games.ts` con `getGames`/`getGameById` contra la tabla `games`, adjuntando `best` vía `getBestScores()`. Eliminar el array `GAMES`. Verificación: compila sin errores de tipos.
4. Eliminar de `lib/storage.ts` `SCORES_KEY`, `StoredScoreEntry`, `getStoredScores` y `addStoredScore`. Verificación: `npm run build` falla mostrando los import rotos en los archivos que aún los usan (esperado, se arreglan en los pasos siguientes).
5. Extraer `components/GameLibrary.tsx` (`"use client"`) con la búsqueda/filtro/grilla actual de `app/page.tsx`, recibiendo `games: Game[]` por props. Convertir `app/page.tsx` en Server Component `async` que llama a `getGames()` y renderiza `<GameLibrary games={games} />`. Verificación: `/` carga la grilla de 8 juegos con `best` real (0 en todos, porque `scores` está vacía) y la búsqueda/filtro sigue funcionando client-side.
6. Actualizar `app/games/[id]/page.tsx`: `await getGameById(id)` y `await getScoresForGame(id, 10)` en vez de `seededScores`. Verificación: `/games/rocas` carga, muestra "Mejor global" en 0 y la lista "MEJORES PUNTUACIONES" vacía (sin errores de render con 0 filas).
7. Crear `components/games/GamePlayerClient.tsx` moviendo la lógica de `app/games/[id]/play/page.tsx` actual, recibiendo `game: Game` por props en vez de resolverlo con `useParams`/`getGameById`. Cambiar el guardado de puntuación de `addStoredScore(...)` a `await saveScore(...)` dentro de un `try/catch`: en éxito, `setSaved(true)`; en error, mantener `saved=false` y mostrar un mensaje de error breve. Convertir `app/games/[id]/play/page.tsx` en Server Component `async` que resuelve `getGameById(id)`, llama `notFound()` si no existe, y renderiza `<GamePlayerClient game={game} />`. Verificación: jugar `/games/rocas/play`, terminar la partida, guardar con iniciales, y confirmar en el dashboard de Supabase (`select * from scores`) que apareció la fila.
8. Crear `components/HallOfFameClient.tsx` moviendo el estado de tabs/podio/tabla de `app/hall-of-fame/page.tsx` actual, recibiendo `games: Game[]` y `scoresByGame: Record<string, ScoreRow[]>` por props; "TU MEJOR MARCA" busca por `name` dentro de `scoresByGame[tab]`. Convertir `app/hall-of-fame/page.tsx` en Server Component `async` que llama `getGames()` y `getScoresForGame(id, 12)` por cada juego. Verificación: `/hall-of-fame` muestra el puntaje guardado en el paso 7 al seleccionar el tab de `rocas` (podio y tabla), y "TU MEJOR MARCA" aparece si el nombre coincide con `user.name`.
9. Revisión final: `npm run lint` y `npm run build` sin errores; confirmar que ningún archivo del proyecto sigue importando `GAMES`, `seededScores`, `PLAYERS`, `getStoredScores` o `addStoredScore` (`grep` sobre `app/`, `components/`, `lib/`).

---

## Acceptance criteria

- [ ] Las tablas `games` y `scores` existen en Supabase con las columnas y políticas RLS descritas en `supabase/schema.sql`.
- [ ] La tabla `games` tiene exactamente 8 filas (una por juego existente) tras correr el seed.
- [ ] `/` (Biblioteca) carga los 8 juegos desde Supabase; búsqueda por nombre y filtro por categoría siguen funcionando.
- [ ] `/games/rocas` (Detalle) muestra "Mejor global" calculado desde `scores` (no un valor hardcodeado) y la lista de mejores puntuaciones reales de ese juego.
- [ ] Jugar `/games/rocas/play`, perder o forzar FIN, y guardar la puntuación con iniciales crea una fila nueva en la tabla `scores` de Supabase con `game: "rocas"`.
- [ ] Si `saveScore` falla, el modal muestra un mensaje de error y el botón "GUARDAR PUNTUACIÓN" sigue disponible para reintentar (no queda marcado como guardado).
- [ ] `/hall-of-fame` muestra, para cada juego, el top 12 real de `scores` (podio + tabla), no `seededScores`.
- [ ] En `/hall-of-fame`, "TU MEJOR MARCA" aparece solo si existe una fila entre las 12 cargadas del juego activo cuyo `name` coincide (case-insensitive) con el nombre del usuario mock-logueado; si no existe, la sección no se muestra.
- [ ] Ningún archivo del proyecto importa `GAMES`, `seededScores`, `PLAYERS`, `getStoredScores` ni `addStoredScore` (todos eliminados).
- [ ] El mock de usuario (`av_user` en `localStorage`, login simulado) sigue funcionando exactamente igual que antes de este spec.
- [ ] Los otros 7 juegos (arena decorativa simulada del spec 01) siguen funcionando sin cambios visuales ni funcionales, salvo que ahora sus datos (`game`, `title`, etc.) vienen de Supabase en vez del array `GAMES`.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** dos tablas nuevas en Supabase, `games` y `scores`, en vez de seguir con el array en memoria y `localStorage`. Razón: decisión explícita del usuario; cierra el gap documentado desde el spec 01/05 de que las puntuaciones guardadas nunca se mostraban en ningún leaderboard.
- **No:** asociar `scores` a un usuario autenticado real con Supabase Auth. Razón: decisión explícita del usuario; el modelo de nombre/iniciales sueltas (spec 01) se mantiene, auth real queda fuera de alcance tal como ya decidió el spec 04.
- **Sí:** `best` de cada juego se calcula desde `scores` (no es columna de `games`). Razón: decisión explícita del usuario; evita que quede desincronizado de las puntuaciones reales.
- **Sí:** RLS abierto — `SELECT` público en ambas tablas, `INSERT` público en `scores`, sin `UPDATE`/`DELETE`. Razón: decisión explícita del usuario; equivalente a que hoy cualquiera puede escribir en `localStorage` sin restricción, pero sin permitir editar o borrar puntuaciones ajenas.
- **Sí:** guardar la puntuación escribe solo en Supabase, `localStorage["av_scores"]` deja de usarse y su código se elimina. Razón: decisión explícita del usuario; evita mantener dos fuentes de verdad para el mismo dato.
- **Sí:** script SQL manual (`supabase/schema.sql`) corrido a mano en el SQL Editor, sin Supabase CLI ni migraciones formales. Razón: decisión explícita del usuario; consistente con el enfoque manual ya usado en el spec 04 para conectar el proyecto.
- **Sí:** dividir `app/page.tsx`, `app/games/[id]/play/page.tsx` y `app/hall-of-fame/page.tsx` en un Server Component que hace `await` de los datos + un Client Component nuevo con la interactividad existente. Razón: necesario porque `getGames`/`getGameById`/`getScoresForGame` son ahora asíncronos (consultan Supabase); sigue el patrón ya usado por `app/games/[id]/page.tsx` desde el spec 01.
- **Sí:** en el Salón de la Fama, cambiar de tab no dispara una nueva consulta de red — se filtra sobre los datos ya cargados para los 8 juegos. Razón: decisión explícita del usuario (implícita en mantener la UX instantánea actual); con 8 juegos y como máximo 12 filas cada uno, el volumen es trivial para cargarlo todo de una vez.
- **Sí:** "TU MEJOR MARCA" busca dentro de las 12 filas ya cargadas del juego activo, no con una consulta aparte por nombre. Razón: decisión explícita del usuario; mantiene la misma carga de datos que ya trae la tabla, aunque implica que si la mejor puntuación real del usuario no entra en el top 12, la sección no la mostrará (ver Riesgos).
- **Sí:** si `saveScore` falla, mostrar error y permitir reintentar, en vez de fallar en silencio. Razón: decisión explícita del usuario; a diferencia de `localStorage` (que nunca falla), un `INSERT` de red sí puede fallar y el usuario necesita saber que su puntaje no se guardó.
- **Sí (descubierto durante la implementación):** `CATS` no quedó en `lib/games.ts` sino definido localmente en `components/GameLibrary.tsx`; y `saveScore` no quedó en `lib/leaderboard.ts` sino en un archivo nuevo, `lib/leaderboard-client.ts`. Razón: Next.js arrastra al bundle de cliente todo módulo del que un Client Component importe cualquier valor en tiempo de ejecución — como `lib/games.ts` y `lib/leaderboard.ts` importan `lib/supabase/server.ts` (que usa `next/headers`, exclusivo de Server Components), cualquier componente cliente que importara `CATS` o `saveScore` desde esos archivos rompía el build con un error 500 real (verificado en el navegador). Separar lo que consume un Client Component a un archivo sin dependencias server-only resuelve el límite sin cambiar ningún comportamiento visible.
- **No:** vistas SQL o funciones RPC en Supabase para calcular `best`/agregados. Razón: decisión explícita del usuario (implícita al no pedir infraestructura SQL adicional); con el volumen esperado, calcularlo en JS tras traer las filas es suficiente y más simple de versionar en el repo.
- **Sí (descubierto durante la implementación):** en `HallOfFameClient.tsx`, si el juego seleccionado tiene 0 puntuaciones se muestra un estado vacío ("AÚN NO HAY PUNTUACIONES"), y el podio solo renderiza los puestos 2°/3° si existen filas para ellos. Razón: el mock (`seededScores`) siempre garantizaba 12 filas; con datos reales, un juego recién sembrado (como quedan los 8 tras correr `supabase/schema.sql`, con `scores` vacía) tiene 0 filas, y el código original asumía `rows[0]`/`rows[1]`/`rows[2]` siempre presentes.
- **No:** paginación en el Salón de la Fama ni en el Detalle. Razón: fuera de lo pedido; los límites fijos (12 y 10) igualan el comportamiento visual que ya tenía el mock.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| RLS abierto en `scores` (`INSERT` público sin límite) permite que cualquiera con la anon key llene la tabla de puntuaciones falsas o abusivas | Aceptado como limitación conocida del alcance, igual que hoy cualquiera puede escribir `localStorage` sin restricción; moderación/reCAPTCHA quedaría para un spec futuro si se vuelve un problema real |
| "TU MEJOR MARCA" solo busca dentro del top 12 cargado del juego activo; si la mejor puntuación real del usuario no entra en ese top 12, la sección no la mostrará aunque exista en la tabla `scores` | Documentado como limitación aceptada; evita una consulta de red adicional por cada cambio de tab |
| Calcular `best`/agregados trayendo todas las filas de `scores` y reduciendo en JS no escala si un juego acumula miles de partidas | Aceptado para el volumen actual (proyecto sin usuarios reales todavía); si escala, se resuelve con una vista SQL o función `rpc`, no cubierto por este spec |
| El script `supabase/schema.sql` usa `create table if not exists` e `insert ... on conflict do nothing`, pero si el usuario corre el script dos veces con datos de `games` ya editados manualmente en el dashboard, el `on conflict do nothing` no actualizará esas filas | Comportamiento esperado: el seed es solo para la carga inicial; ediciones posteriores del catálogo se hacen a mano en el dashboard o en un spec futuro de administración |

---

## What is **not** in this spec

- Autenticación real con Supabase Auth (sigue el mock de `localStorage` del spec 01).
- Middleware de refresco de sesión.
- Tracking real de partidas jugadas (`plays` sigue siendo un valor estático sembrado).
- Editar o borrar puntuaciones ya guardadas.
- Supabase CLI, migraciones formales o cliente admin con `SUPABASE_SERVICE_ROLE_KEY`.
- Paginación más allá del top 12 (Salón de la Fama) o top 10 (Detalle) por juego.
- Rediseño visual de cualquiera de las 4 pantallas afectadas.
- Adaptar los otros 7 juegos mock a implementaciones jugables reales (spec 05 ya resolvió esto solo para `rocas`).

Cada uno de estos, si se necesita, va en su propio spec.
