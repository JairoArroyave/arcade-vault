# SPEC 03 — Envío real de correo en el formulario de contacto (Resend)

> **Status:** approved
> **Depends on:** SPEC 02
> **Date:** 2026-08-19
> **Objective:** Conectar el formulario de contacto de `/about` (ya portado 1:1 del template en el spec 02, 100% mock) a un envío real de correo electrónico vía Resend, sin cambiar el diseño existente salvo por un nuevo estado de carga y un nuevo estado de error dentro del mismo bloque terminal.

---

## Por qué existe este spec

El spec 02 portó fielmente `/about` desde `reference/templates/home-about/about.jsx`, incluyendo el formulario de contacto — pero dejó explícitamente fuera de alcance "envío real de mensajes de contacto (backend, email, API)": el `onSubmit` solo validaba campos no vacíos y mostraba un bloque `terminal-success` decorativo.

Este spec cierra ese hueco: agrega un API Route que usa el SDK de Resend para enviar de verdad el mensaje del formulario a una casilla real, sin tocar el layout/diseño ya aprobado de `/about` más allá de lo estrictamente necesario para reflejar que ahora hay una llamada de red real (estado "enviando" y estado de error).

---

## Scope

**In:**

- Instalar el SDK `resend` (`npm install resend`).
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`:
  - `.env.local` (no versionado, ya cubierto por `.gitignore`) con los valores reales:
    - `CONTACT_TO_EMAIL=jairoalonsoarroyave@gmail.com` (la cuenta con la que el usuario se registró en Resend).
    - `CONTACT_FROM_EMAIL=onboarding@resend.dev` (dominio sandbox de Resend; el usuario no tiene dominio propio para verificar).
    - `RESEND_API_KEY` con la key provista por el usuario.
  - `.env.example` (versionado) con los mismos 3 nombres como placeholders, para que cualquiera pueda reconstruir su propio `.env.local`.
- Nuevo API Route Handler `app/api/contact/route.ts` (`POST`), que:
  - Valida que `name`, `email` y `msg` no estén vacíos (400 si falta alguno). Sin validación de formato de email adicional — se confía en la validación `type="email"` del navegador.
  - Envía el correo vía Resend: `from: CONTACT_FROM_EMAIL`, `to: CONTACT_TO_EMAIL`, `reply_to: <email del formulario>`, `subject: "Nuevo mensaje de contacto — {nombre}"`, cuerpo en texto plano con nombre, email y mensaje.
  - Responde `200 { ok: true }` en éxito, `502 { ok: false, error }` si Resend devuelve error.
- Actualización de `app/about/page.tsx`:
  - El `onSubmit` sigue disparando el "shake" si algún campo está vacío (comportamiento del spec 02, sin cambios).
  - Con los 3 campos completos, ahora hace `fetch("/api/contact", ...)` real y espera la respuesta antes de mostrar cualquier resultado.
  - Nuevo estado `sending`: mientras se espera la respuesta, el botón de envío queda deshabilitado y cambia su texto a "▶ ENVIANDO…".
  - Nuevo estado de error: si el `fetch` falla o responde con `ok:false`, se muestra — dentro del mismo bloque terminal que ya existe (`term-bar` + `term-body`) — una variante de error con líneas tipo `[FAIL] No se pudo transmitir el paquete.` y un botón "REINTENTAR" que limpia el error y vuelve a mostrar el formulario con los datos que el usuario ya había escrito (no se pierden).
  - El estado de éxito (`terminal-success`) se mantiene visualmente igual al del spec 02, solo que ahora se muestra recién cuando la API confirma el envío real.
- Estilos nuevos en `app/globals.css`, aditivos: una variante `.line.error` (o equivalente) para las líneas de error dentro de `.term-body`, reusando la paleta ya definida (`--magenta`), y un estado `disabled` para `.btn` mientras `sending` es `true`.

**Out of scope (para specs futuros):**

- Verificar un dominio propio en Resend. Se usa el dominio sandbox `onboarding@resend.dev`, que por eso mismo solo puede entregar correos a `jairoalonsoarroyave@gmail.com` (la cuenta registrada) — no a cualquier destinatario. Si el proyecto pasa a producción real, verificar dominio va en su propio spec.
- Validación de formato de email en el servidor (regex u otra librería). Se confía en la validación del navegador (`type="email"`).
- Rate limiting, captcha o cualquier protección anti-spam del endpoint.
- Persistencia de los mensajes de contacto (ni `localStorage` ni base de datos). El mensaje solo se envía por correo, igual que estaba planteado en el spec 02.
- Reintentos automáticos o colas de envío. Si falla, el usuario reintenta manualmente con el botón "REINTENTAR".
- Server Actions de Next.js. Se decidió explícitamente usar API Route + `fetch` desde cliente para no reescribir el patrón de formulario controlado ya existente.
- Plantilla HTML con el tema visual del sitio para el correo. El cuerpo va en texto plano.
- Cualquier cambio visual a `/about` fuera de los nuevos estados "enviando" / error del formulario (hero, highlight cards, divisor, contact-intro quedan idénticos al spec 02).
- Cambios a cualquier otra pantalla del MVP (Biblioteca, Detalle, Reproductor, Login, Salón de la Fama).

---

## Data model

No se introduce persistencia nueva. Se documenta el contrato del nuevo endpoint:

```ts
// app/api/contact/route.ts
type ContactRequestBody = { name: string; email: string; msg: string };

// POST /api/contact
// 200 -> { ok: true }
// 400 -> { ok: false, error: string }   (algún campo vacío)
// 502 -> { ok: false, error: string }   (Resend devolvió error al enviar)
```

Variables de entorno (no son datos de la app, pero condicionan el endpoint):

```
RESEND_API_KEY=<key real, en .env.local, nunca commiteada>
CONTACT_TO_EMAIL=jairoalonsoarroyave@gmail.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

---

## Implementation plan

1. Ejecutar `npm install resend`. Crear `.env.example` (versionado) con los 3 nombres de variable como placeholders, y `.env.local` (no versionado, ya cubierto por `.gitignore`) con los valores reales indicados arriba. Verificación: `npm run build` sigue pasando; `.env.local` no aparece en `git status`.
2. Crear `app/api/contact/route.ts` (Route Handler `POST`). Antes de escribirlo, revisar `node_modules/next/dist/docs/01-app` para la convención vigente de Route Handlers en esta versión de Next (tal como indica `AGENTS.md`). Instanciar `Resend` con `process.env.RESEND_API_KEY`, validar los 3 campos no vacíos (400 si falta alguno), y enviar el correo con `from`, `to`, `reply_to`, `subject` y `text` según lo descrito en el scope. Responder 200/502 según el resultado de Resend. Verificación: probar el endpoint directamente (`curl` o fetch manual) con los 3 campos completos y confirmar que el correo llega a la bandeja de `jairoalonsoarroyave@gmail.com`.
3. Actualizar `app/about/page.tsx`: agregar estados `sending: boolean` y `error: string | null` junto a los ya existentes (`form`, `sent`, `shake`). El `onSubmit` sigue disparando el shake si hay campos vacíos; si no, pone `sending=true`, hace el `fetch` a `/api/contact`, y según la respuesta setea `sent` (éxito, igual que hoy) o `error` (nuevo, con el mensaje devuelto), y en ambos casos `sending=false`. Mientras `sending` es `true`, el botón de envío queda `disabled` con el texto "▶ ENVIANDO…". Verificación: con la key real, enviar el formulario muestra brevemente "ENVIANDO…" y luego el `terminal-success` existente.
4. Dentro del bloque `terminal-success` de `app/about/page.tsx`, agregar la rama de error: mismo `term-bar`, `term-body` con las líneas `[OK] Conectando…` / `[OK] Validando…` seguidas de una línea `[FAIL] No se pudo transmitir el paquete.` en el nuevo estilo de error, y un botón "REINTENTAR" que limpia `error` (vuelve a mostrar el formulario, conservando lo que el usuario ya había escrito en `form`). Verificación manual: forzar un error (ej. `RESEND_API_KEY` temporalmente inválida) y confirmar que se ve el estado de error y que "REINTENTAR" recupera el formulario con los datos intactos.
5. Agregar en `app/globals.css` (aditivo, al final, siguiendo el patrón del spec 02) el estilo de la línea de error dentro de `.term-body` (reusando `--magenta`) y un estado `disabled` para `.btn`. Verificación: `npm run build` sin errores; ninguna clase existente queda sobrescrita.
6. Revisión final: `npm run lint` y `npm run build`, y prueba manual end-to-end completa — formulario completo con la key real llega a `jairoalonsoarroyave@gmail.com`; con la key rota se ve el estado de error y "REINTENTAR" funciona; ninguna otra parte de `/about` cambió visualmente respecto al spec 02.

---

## Acceptance criteria

- [ ] `resend` aparece como dependencia en `package.json`.
- [ ] Existe `.env.example` (versionado) con `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` como placeholders.
- [ ] Existe `.env.local` (no versionado) con los valores reales; `git status` no lo muestra como archivo a commitear.
- [ ] `POST /api/contact` con los 3 campos completos envía un correo real vía Resend a `CONTACT_TO_EMAIL`, con `Reply-To` igual al email ingresado, y responde `200 { ok: true }`.
- [ ] `POST /api/contact` con algún campo vacío responde `400` sin llamar a Resend.
- [ ] En `/about`, enviar el formulario completo deshabilita el botón mostrando "▶ ENVIANDO…" hasta que la API responde.
- [ ] Al confirmarse el envío real, `/about` muestra el bloque `terminal-success` existente (sin cambios visuales respecto al spec 02).
- [ ] Si el envío falla, `/about` muestra el nuevo estado de error dentro del mismo bloque terminal, con un botón "REINTENTAR" que limpia el error y vuelve a mostrar el formulario con los datos que el usuario ya había escrito.
- [ ] Un envío real de prueba desde `/about` llega efectivamente a la bandeja de `jairoalonsoarroyave@gmail.com`.
- [ ] El hero, las highlight cards y el divisor de `/about` no cambian visualmente respecto al spec 02.
- [ ] Ninguna otra pantalla del MVP (Biblioteca, Detalle, Reproductor, Login, Salón de la Fama) cambia.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** API Route Handler (`app/api/contact/route.ts`) + `fetch` desde el cliente, en vez de Server Action. Razón: decisión explícita del usuario; mantiene el patrón de formulario controlado ya existente en `/about` sin reescribirlo.
- **Sí:** `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` como variables de entorno en `.env.local` (no versionado) + `.env.example` con placeholders (versionado). Razón: decisión explícita del usuario; evita hardcodear secretos en el código.
- **Sí:** `CONTACT_FROM_EMAIL=onboarding@resend.dev` (dominio sandbox, sin verificar dominio propio). Razón: el usuario no tiene un dominio propio disponible para verificar en Resend.
- **Sí:** `CONTACT_TO_EMAIL=jairoalonsoarroyave@gmail.com` (la cuenta de Resend del usuario), no `jairo.prueba@yopmail.com` como se propuso inicialmente. Razón: sin dominio verificado, el dominio sandbox de Resend solo entrega correos a la dirección con la que se registró la cuenta; usar otra dirección haría que los correos nunca llegaran ([resend/resend-node#454](https://github.com/resend/resend-node/issues/454)).
- **Sí:** nuevo estado de error dentro del mismo bloque `terminal-success` (en vez de un alert separado fuera del estilo terminal), con reintento manual vía botón "REINTENTAR". Razón: decisión explícita del usuario; mantiene consistencia visual con el resto de la pantalla.
- **Sí:** esperar la respuesta real de la API antes de mostrar éxito o error (botón deshabilitado + texto "ENVIANDO…"), reemplazando el comportamiento optimista del spec 02 (que mostraba éxito apenas se validaban campos no vacíos). Razón: decisión explícita del usuario — con un envío real, adelantar el éxito sería engañoso si el correo termina fallando.
- **Sí:** cuerpo del correo en texto plano, sin plantilla HTML con el tema visual del sitio. Razón: decisión explícita del usuario; el correo lo ve solo el equipo interno, no amerita el trabajo de diseño de un template HTML.
- **Sí:** `Reply-To` del correo = email ingresado en el formulario. Razón: decisión explícita del usuario; permite responder directo a quien escribió sin copiar el email manualmente.
- **No:** validación de formato de email en el servidor (regex u otra librería). Razón: decisión explícita del usuario; se confía en la validación `type="email"` del navegador. Riesgo aceptado, documentado abajo.
- **No:** rate limiting, captcha o protección anti-spam en el endpoint. Razón: no se pidió ese alcance; la única barrera sigue siendo que los 3 campos no estén vacíos, igual que en el spec 02.
- **No:** persistir los mensajes de contacto en `localStorage` ni en ningún otro storage. Razón: consistente con el spec 02 — el mensaje solo se envía, nunca se guardó ni se pidió guardarlo ahora.
- **No:** verificar un dominio propio en Resend en este spec. Razón: el usuario no cuenta con uno disponible todavía; queda documentado como riesgo/limitación para retomar si el proyecto pasa a producción real.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Sin dominio verificado, Resend con `onboarding@resend.dev` solo entrega a `jairoalonsoarroyave@gmail.com` (la cuenta registrada) — un uso real con destinatarios/remitentes arbitrarios no funcionaría así | Documentado explícitamente en este spec como decisión y limitación conocida; verificar un dominio propio queda para un spec futuro si el proyecto pasa a producción |
| Sin validación de formato de email en el servidor, un `POST` directo al endpoint (sin pasar por el formulario) podría enviar un `reply_to` con formato inválido | Resend valida el formato en su propia API y devuelve error; el endpoint lo traduce a `502` sin romper el servidor |
| `RESEND_API_KEY` expuesta si `.env.local` se commitea por error | Ya cubierto por la regla `.env*` en `.gitignore`; no se modifica esa regla |
| Mismatch de hidratación por los nuevos estados `sending`/`error` | Todo el manejo vive dentro de handlers de evento (`onSubmit`, `onClick` de "REINTENTAR") en el componente `"use client"` ya existente, no durante el render inicial |

---

## What is **not** in this spec

- Verificación de un dominio propio en Resend.
- Validación de formato de email en el servidor.
- Rate limiting, captcha o protección anti-spam.
- Persistencia de los mensajes de contacto.
- Rediseño visual de `/about` más allá de los nuevos estados "enviando" / error del formulario.
- Server Actions de Next.js.
- Plantilla HTML con el tema visual del sitio para el correo enviado.
- Cambios a cualquier otra pantalla del MVP.

Cada uno de estos, si se necesita, va en su propio spec.
