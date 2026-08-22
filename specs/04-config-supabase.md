# SPEC 04 — Configuración de conexión a Supabase

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-08-20
> **Objective:** Dejar el proyecto conectado a Supabase (variables de entorno + clientes de navegador y de servidor con `@supabase/ssr`) sin crear ninguna tabla, esquema ni política en la base de datos.

---

## Por qué existe este spec

Hoy toda la persistencia de Arcade Vault vive en `localStorage` (`lib/storage.ts`, spec 01): auth simulada y puntuaciones de partida. Este spec no toca eso — solo prepara la infraestructura de conexión a un proyecto Supabase real (`lib/supabase/client.ts` y `lib/supabase/server.ts`) para que specs futuros puedan decidir, con la conexión ya probada, qué mover a Supabase (auth real, leaderboard persistente, etc.). Es deliberadamente angosto: conectar, no modelar datos.

---

## Scope

**In:**

- Instalar `@supabase/ssr` y `@supabase/supabase-js` (`npm install @supabase/ssr @supabase/supabase-js`).
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nombres tal como los expone el dashboard de Supabase con su sistema de API keys actual):
  - `.env.local` (no versionado) con los valores reales del proyecto del usuario, ya cargados durante la fase de definición de este spec.
  - `.env.example` (versionado) con ambos nombres como placeholders vacíos, agregados junto a las variables ya existentes de Resend.
- `lib/supabase/client.ts`: helper `createClient()` que envuelve `createBrowserClient` de `@supabase/ssr`, para usar desde componentes `"use client"`.
- `lib/supabase/server.ts`: helper `async createClient()` que envuelve `createServerClient` de `@supabase/ssr`, leyendo/escribiendo cookies vía `await cookies()` de `next/headers` — API async confirmada en `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` para esta versión de Next. Para usar desde Server Components y Route Handlers.
- Verificación manual en runtime: una llamada temporal a `supabase.auth.getSession()` (código de prueba, no commiteado) que confirme que la URL y la key conectan de verdad, sin error de red ni de credenciales.

**Out of scope (para specs futuros):**

- Crear cualquier tabla, esquema o política RLS en el proyecto Supabase. Este spec es solo la conexión.
- `middleware.ts` de refresco de sesión. No hay auth real con Supabase todavía (la auth sigue siendo mock en `localStorage`, spec 01), así que no hay sesión de Supabase que refrescar.
- Autenticación real con Supabase Auth (reemplazar el mock de `/login`). Sigue como está en el spec 01.
- Migrar `lib/storage.ts` (usuario y puntuaciones en `localStorage`) a Supabase.
- Cliente admin con `SUPABASE_SERVICE_ROLE_KEY`. No hay ninguna operación todavía que necesite bypass de RLS.
- Cualquier cambio visual o funcional a las pantallas existentes del MVP.

---

## Data model

Este spec no introduce tablas ni modelos de datos — es solo infraestructura de conexión. Se documenta el contrato de los dos helpers:

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient; // createBrowserClient, para "use client"

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>; // createServerClient + await cookies()
```

Variables de entorno (no son datos de la app, condicionan los helpers):

```
NEXT_PUBLIC_SUPABASE_URL=<url real, en .env.local>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key real, en .env.local>
```

---

## Implementation plan

1. Ejecutar `npm install @supabase/ssr @supabase/supabase-js`. Verificación: ambos aparecen en `package.json`; `npm run build` sigue pasando.
2. Confirmar que `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con valores reales (ya cargados durante este spec) y que `.env.example` tiene los mismos nombres como placeholders vacíos. Verificación: `git status` no muestra `.env.local` como archivo a commitear.
3. Crear `lib/supabase/client.ts` con `createClient()` sobre `createBrowserClient` de `@supabase/ssr`, leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Verificación: el archivo compila sin errores de tipos (`npx tsc --noEmit` o `npm run build`).
4. Crear `lib/supabase/server.ts` con `async createClient()` sobre `createServerClient` de `@supabase/ssr`, usando `await cookies()` de `next/headers`. Antes de escribirlo, revisar `node_modules/next/dist/docs` tal como indica `AGENTS.md`, dado que esta versión de Next puede diferir de las convenciones conocidas. Verificación: el archivo compila sin errores de tipos.
5. Verificación manual de conexión real: agregar temporalmente una llamada a `supabase.auth.getSession()` (por ejemplo desde un Server Component de prueba o un Route Handler temporal), confirmar que responde sin error de red ni de credenciales (sin sesión activa, debe devolver `{ data: { session: null }, error: null }`), y luego eliminar ese código de prueba — no se commitea.
6. Revisión final: `npm run lint` y `npm run build` sin errores; `git status` confirma que `.env.local` sigue sin trackearse y que no queda ningún código de prueba temporal del paso 5.

---

## Acceptance criteria

- [ ] `@supabase/ssr` y `@supabase/supabase-js` aparecen como dependencias en `package.json`.
- [ ] `.env.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como placeholders vacíos.
- [ ] `.env.local` tiene los valores reales de ambas variables; `git status` no lo lista para commitear.
- [ ] Existe `lib/supabase/client.ts` exportando un cliente de Supabase para componentes `"use client"`.
- [ ] Existe `lib/supabase/server.ts` exportando un cliente de Supabase para Server Components y Route Handlers, usando `await cookies()`.
- [ ] Una llamada de prueba a `supabase.auth.getSession()` responde sin error de red ni de credenciales.
- [ ] No se creó ninguna tabla, esquema ni política RLS en el proyecto Supabase.
- [ ] Ninguna pantalla existente (Biblioteca, Detalle, Reproductor, Login, Salón de la Fama, About) cambia visual ni funcionalmente.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** `@supabase/ssr` en vez de solo `@supabase/supabase-js`. Razón: decisión explícita del usuario; es el paquete oficial recomendado por Supabase para Next.js App Router y evita una migración forzada si más adelante se implementa auth real.
- **Sí:** dos clientes — navegador y servidor —, ambos con la publishable/anon key. Razón: decisión explícita del usuario; cubre Client Components y Server Components/Route Handlers sin exponer una key elevada.
- **Sí:** nombres de variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, tal como los entrega el dashboard de Supabase con su sistema de API keys actual ("publishable key" reemplaza al legacy "anon key"). Razón: valores provistos directamente por el usuario durante este spec.
- **Sí:** verificación manual en runtime (llamada temporal a `supabase.auth.getSession()`, luego eliminada) en vez de confiar solo en build/lint. Razón: decisión explícita del usuario; confirma que la URL y la key realmente conectan, no solo que el código compila.
- **No:** cliente admin con `SUPABASE_SERVICE_ROLE_KEY`. Razón: decisión explícita del usuario; no hay ninguna operación todavía que necesite bypass de RLS.
- **No:** `middleware.ts` de refresco de sesión. Razón: decisión explícita del usuario; no hay auth real con Supabase todavía (spec 01 usa auth mock en `localStorage`), no hay sesión que refrescar.
- **No:** crear tablas, esquemas o políticas RLS en Supabase. Razón: pedido explícito del usuario — este spec es solo la conexión.
- **No:** migrar `lib/storage.ts` (auth mock / puntuaciones en `localStorage`) a Supabase. Razón: fuera del alcance pedido; queda para un spec futuro si se decide usar Supabase para persistencia real.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Next 16 volvió async la API `cookies()` de `next/headers`; usar la firma síncrona clásica de `createServerClient` rompería en build | Implementación de `lib/supabase/server.ts` verificada contra `node_modules/next/dist/docs` antes de escribir código, tal como exige `AGENTS.md` |
| Sin políticas RLS todavía (no se crean tablas en este spec), cualquier tabla que se cree después queda expuesta por defecto según la configuración del proyecto | Documentado como responsabilidad del spec que cree la primera tabla, no de este |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` es pública por diseño (prefijo `NEXT_PUBLIC_`, queda embebida en el bundle del cliente) | Es el comportamiento esperado de una publishable/anon key con RLS; igual se mantiene fuera de `.env.example` con valor real, solo placeholder |

---

## What is **not** in this spec

- Crear tablas, esquemas o políticas RLS en Supabase.
- Middleware de refresco de sesión.
- Autenticación real con Supabase Auth (sigue mock en `localStorage`).
- Migración de `lib/storage.ts` a Supabase.
- Cliente admin con `SUPABASE_SERVICE_ROLE_KEY`.
- Cambios visuales o funcionales a pantallas existentes.

Cada uno de estos, si se necesita, va en su propio spec.
