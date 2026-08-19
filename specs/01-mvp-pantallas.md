# SPEC 01 — MVP de pantallas de Arcade Vault

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-08-18
> **Objective:** Implementar las 5 pantallas del MVP (Biblioteca, Detalle de juego, Reproductor simulado, Login y Salón de la Fama) portando fielmente el diseño y los datos mock de `reference/templates` a Next.js App Router, sin implementar ningún juego real.

---

## Por qué existe este spec

`reference/templates` contiene un prototipo funcional en React+CDN (JSX suelto, sin build) con las 5 pantallas ya diseñadas, con datos mock y con un tema visual neón/CRT completo (`styles.css`, 950 líneas). Ese tema ya se empezó a portar a `app/globals.css` y `app/layout.tsx` en el commit `stylos`. Este spec formaliza cómo terminar de portar ese prototipo a la app real de Next.js 16 (App Router, TypeScript, React 19) manteniendo la fidelidad visual y de contenido, sin construir ningún juego jugable de verdad — la pantalla de "jugar" simula una partida (puntaje automático) solo como placeholder del bucle de puntuación/leaderboard.

---

## Scope

**In:**

- 5 pantallas como rutas reales de Next.js App Router:
  - `/` — Biblioteca (grid de juegos, buscador, filtro por categoría).
  - `/games/[id]` — Detalle de juego (info, tags, leaderboard del juego).
  - `/games/[id]/play` — Reproductor simulado (HUD, arena decorativa animada, puntaje automático, pausa, fin de partida, guardado de puntuación).
  - `/login` — Auth mock (iniciar sesión / crear cuenta / invitado, botones sociales decorativos).
  - `/hall-of-fame` — Salón de la Fama (podio + tabla por juego, fila "tu mejor marca" si hay sesión).
- Nav global (logo, links, contador de créditos estático, botón de auth, menú hamburguesa móvil) y footer, portados de `nav.jsx` / `app.jsx`.
- Los 8 juegos mock y el generador de leaderboard determinístico (`seededScores`), portados de `data.jsx` sin cambios de contenido.
- Auth 100% simulada en cliente (cualquier usuario "entra", sin validación, con modo invitado), persistida en `localStorage`.
- Guardado de puntuaciones de partida en `localStorage`.
- Tema visual neón/CRT completo (colores, tipografías Press Start 2P / JetBrains Mono / Courier Prime, scanlines, animaciones) portado 1:1 desde `reference/templates/styles.css`, completando lo ya iniciado en `app/globals.css`.
- Responsive: panel de navegación móvil (drawer) igual que `nav.jsx`.

**Out of scope (para specs futuros):**

- Cualquier juego jugable real (canvas, física, input de teclado/táctil real). El "reproductor" solo simula el bucle de puntaje.
- Backend, API o base de datos. Todo el estado vive en `localStorage` del navegador.
- Autenticación real (contraseñas, hashing, sesiones de servidor, OAuth). Los botones de Google/GitHub quedan decorativos, sin funcionalidad.
- Sistema de créditos/monedas real. El contador "CRÉDITOS · 03" del nav queda estático.
- Multijugador o partidas en tiempo real.
- Edición de perfil / configuración de cuenta más allá de nombre + cerrar sesión.
- Tests automatizados (no hay test runner configurado en el proyecto).
- Rediseño visual vía `/frontend-design` — se porta fielmente el diseño ya existente en `reference/templates`, no se crea uno nuevo.

---

## Data model

```ts
// lib/games.ts
type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS del fondo de portada (cover-bricks, cover-tetro, ...)
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};
// GAMES: Game[] — los mismos 8 juegos de data.jsx
// CATS: string[] — ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
```

```ts
// lib/leaderboard.ts
type ScoreRow = { rank: number; name: string; score: number; date: string };
// PLAYERS: string[] — mismos 18 nombres de data.jsx
// seededScores(seed: number, count?: number): ScoreRow[] — mismo PRNG determinístico
```

```ts
// lib/storage.ts — persistido en localStorage, claves sin versionar (igual que app.jsx)
type StoredUser = { name: string };
// clave "av_user" -> StoredUser | null

type StoredScoreEntry = { game: string; score: number; name: string; at: number };
// clave "av_scores" -> StoredScoreEntry[]
```

Convenciones:

- Copy de interfaz en español, tal como en el prototipo. Nombres de código (rutas, archivos, variables) en inglés.
- Todo acceso a `localStorage` debe ir envuelto en `try/catch` y solo ejecutarse en cliente (dentro de `useEffect` o en un componente `"use client"` tras el montaje), para evitar mismatches de hidratación.

---

## Implementation plan

1. Crear `lib/games.ts` y `lib/leaderboard.ts` con los datos y el generador portados de `data.jsx`, tipados. Verificación: el proyecto compila (`npm run build`) sin usarlos aún en ninguna pantalla.
2. Crear `lib/storage.ts` con helpers `getStoredUser`/`setStoredUser`/`clearStoredUser` y `getStoredScores`/`addStoredScore`, con guardas de `typeof window`. Verificación: compila sin errores.
3. Crear `app/providers.tsx` (`"use client"`) con un `AuthProvider`/`useAuth()` (React Context) que lee `av_user` en el montaje y expone `login`/`logout`; envolverlo en `app/layout.tsx` alrededor de `{children}`. Verificación: `npm run dev` sigue mostrando la pantalla actual sin errores en consola.
4. Crear `components/Nav.tsx` (portado de `nav.jsx`, usando `next/link` y `usePathname` en vez de router propio) y renderizarlo en `app/layout.tsx` antes de `{children}`, junto con el footer ya presente en `app.jsx`. Verificación: el nav aparece en `/`, el botón "Iniciar Sesión" enlaza a `/login`, el menú hamburguesa abre/cierra el panel móvil.
5. Extender `app/page.tsx` a la pantalla Biblioteca completa: buscador, chips de categoría, grid de `GameCard` (nuevo `components/GameCard.tsx`, portado de `biblioteca.jsx`), estado "sin resultados". Verificación: escribir en el buscador filtra las cards; los chips filtran por categoría.
6. Crear `app/games/[id]/page.tsx` (Detalle, portado de `detalle.jsx`): portada, tags, descripción, stat strip, leaderboard vía `lib/leaderboard.ts`, botón "JUGAR AHORA" enlazando a `/games/[id]/play`; `notFound()` si el id no existe. Antes de escribir el código, revisar `node_modules/next/dist/docs/01-app` para la convención vigente de `params` en rutas dinámicas (puede ser una Promise en esta versión de Next). Verificación: navegar desde una card abre su detalle con 10 filas de leaderboard.
7. Crear `app/games/[id]/play/page.tsx` (Reproductor, `"use client"`, portado de `reproductor.jsx`): HUD (jugador/puntaje/vidas/nivel), arena CRT decorativa animada, controles pausa/fin, modal de fin de partida con input de iniciales que llama a `addStoredScore`, botón "SALIR" de vuelta al detalle. Verificación: el puntaje sube solo, "PAUSA" lo detiene, "FIN" abre el modal, guardar escribe una entrada en `localStorage["av_scores"]`.
8. Crear `app/login/page.tsx` (`"use client"`, portado de `auth.jsx`): tabs iniciar sesión / crear cuenta (ambas llaman al mismo `login` mock), botón de invitado, botones sociales decorativos sin acción, redirección a `/` al enviar. Verificación: loguearse con un usuario actualiza el nav con ese nombre y `localStorage["av_user"]`; el botón invitado entra como "INVITADO".
9. Crear `app/hall-of-fame/page.tsx` (`"use client"`, portado de `salon.jsx`): tabs por juego, podio top 3, tabla completa, fila "tu mejor marca" cuando hay sesión. Verificación: cambiar de tab regenera el leaderboard de ese juego; con sesión iniciada aparece la fila del usuario.
10. Revisión final: comparar `app/globals.css` contra `reference/templates/styles.css` y añadir cualquier selector faltante que usen los componentes portados; correr `npm run lint` y `npm run build`. Verificación: ambos comandos terminan sin errores.

---

## Acceptance criteria

- [ ] `npm run dev` inicia sin errores y `/` muestra el hero, el buscador, los chips de categoría y las 8 cards de juego.
- [ ] Escribir en el buscador filtra las cards visibles por título en tiempo real.
- [ ] Al hacer click en un chip de categoría, se filtran las cards por esa categoría; "TODOS" muestra las 8.
- [ ] Al hacer click en una card o en su botón "JUGAR", navega a `/games/[id]` y muestra título, descripción y 10 filas de leaderboard mock.
- [ ] Al hacer click en "JUGAR AHORA" en el detalle, navega a `/games/[id]/play` y muestra el HUD con el puntaje incrementándose solo.
- [ ] Al hacer click en "PAUSA" el puntaje deja de subir; al hacer click de nuevo ("REANUDAR") continúa.
- [ ] Al hacer click en "FIN" se abre un modal con el puntaje final y un input para iniciales.
- [ ] Guardar la puntuación en ese modal escribe una entrada en `localStorage["av_scores"]` y muestra confirmación de guardado.
- [ ] En `/login`, ingresar un usuario y enviar el formulario loguea: el botón del nav muestra ese nombre y `localStorage["av_user"]` queda seteado.
- [ ] El botón "JUGAR COMO INVITADO" en `/login` loguea como invitado y vuelve a `/`.
- [ ] Cerrar sesión desde el nav limpia `localStorage["av_user"]` y el nav vuelve a mostrar "Iniciar Sesión".
- [ ] `/hall-of-fame` muestra podio (top 3) y tabla completa para el primer juego; cambiar el tab de juego actualiza ambos.
- [ ] Con sesión iniciada, `/hall-of-fame` muestra una fila adicional "tu mejor marca" para el usuario actual.
- [ ] Visitar `/games/no-existe` muestra un 404 de Next.js (`notFound()`), no un crash.
- [ ] El menú hamburguesa móvil abre un panel con los mismos links del nav y se cierra al hacer click en el backdrop.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** portar el tema visual neón/CRT tal cual desde `reference/templates/styles.css` (ya iniciado en `app/globals.css` en el commit `stylos`) en vez de rediseñar con `/frontend-design`. Razón: ya existe un diseño completo y aprobado para las 5 pantallas; rediseñar generaría una segunda identidad visual inconsistente.
- **No:** ejecutar `/frontend-design` para esta feature, pese a la instrucción general del `CLAUDE.md`. Razón: esa instrucción aplica cuando hay que diseñar la interfaz; aquí el diseño ya está definido y solo falta portarlo.
- **Sí:** rutas de Next.js en inglés (`/games/[id]`, `/login`, `/hall-of-fame`) con copy de interfaz en español. Razón: mantiene las convenciones idiomáticas del código en inglés sin tocar el contenido visible que ya está en español.
- **No:** ruteo tipo SPA con hash (como en `app.jsx`). Razón: descartaría el ruteo real de Next.js App Router (code-splitting, SEO, `notFound()`) sin ningún beneficio en este proyecto.
- **Sí:** mantener la simulación mock en el Reproductor (puntaje automático, arena decorativa, pausa/fin/guardado). Razón: es la forma de ejercitar el flujo de puntuación y leaderboard —el bucle central de la app— de punta a punta sin construir un juego real.
- **Sí:** `localStorage` sin versionar, claves `av_user` / `av_scores` idénticas a `app.jsx`. Razón: MVP solo-cliente con datos mock; no hay necesidad de migraciones de esquema todavía.
- **Sí:** auth 100% simulada (cualquier usuario "entra", sin validar contraseña, botones sociales decorativos). Razón: coincide con `auth.jsx` y evita meter alcance de autenticación real en este spec.
- **Sí:** reutilizar los 8 juegos y el generador `seededScores` de `data.jsx` sin cambios.
- **No:** sistema de créditos real. El contador "CRÉDITOS · 03" queda estático y decorativo.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `localStorage` deshabilitado (navegación privada) | Todo acceso envuelto en `try/catch`, igual que en `app.jsx`; si falla, la app sigue funcionando pero sin persistir sesión/puntajes. |
| Mismatch de hidratación al leer `localStorage` durante el render | `AuthProvider` lee el usuario solo dentro de `useEffect`, después del montaje, no durante el render inicial. |
| Next.js 16 puede tener una API distinta para `params` en rutas dinámicas respecto al conocimiento de entrenamiento | Consultar `node_modules/next/dist/docs/01-app` antes de escribir `app/games/[id]/page.tsx` y `app/games/[id]/play/page.tsx`, tal como indica `AGENTS.md`. |

---

## What is **not** in this spec

- Ningún juego jugable real (canvas, física, controles reales).
- Backend, API o base de datos.
- Autenticación real (passwords, sesiones de servidor, OAuth funcional).
- Sistema de créditos/monedas real.
- Multijugador o tiempo real.
- Edición de perfil o configuración de cuenta.
- Tests automatizados.
- Rediseño visual vía `/frontend-design`.

Cada uno de estos, si se necesita, va en su propio spec.
