# SPEC 02 — Pantalla Acerca de (about.jsx)

> **Status:** approved
> **Depends on:** SPEC 01
> **Date:** 2026-08-19
> **Objective:** Portar la pantalla "Acerca de" (`about.jsx`) y el link de nav correspondiente desde `reference/templates/home-about/` a Next.js App Router, dejando fuera de alcance `home.jsx` (la Biblioteca en `/`, ya implementada en el spec 01, sigue siendo la única pantalla de entrada).

---

## Por qué existe este spec

`reference/templates/home-about/` es una actualización del prototipo original (`reference/templates/`) que agrega dos piezas nuevas: `home.jsx` (una landing/hero separada de la Biblioteca) y `about.jsx` (una pantalla "Acerca de" + formulario de contacto mock). Su `nav.jsx` agrega los links "Inicio" y "Acerca de", y su `styles.css` (1744 líneas vs. las 950 ya portadas en el spec 01) es puramente aditivo: no modifica ninguna variable ni selector existente, solo agrega ~800 líneas nuevas para las secciones de `home.jsx` y `about.jsx`.

El usuario pidió traer los ajustes de `home-about/` **excepto** `home.jsx`: la ruta `/` sigue siendo la Biblioteca del spec 01 sin cambios, y no se construye ninguna landing/hero separada. Este spec cubre únicamente lo que sí entra: la pantalla `/about` y la actualización de nav necesaria para llegar a ella.

---

## Scope

**In:**

- Nueva ruta `/about` (`app/about/page.tsx`, `"use client"`), portada fielmente de `reference/templates/home-about/about.jsx`:
  - Hero: kicker "▸ ACERCA DE", título, párrafo de misión, fila de 3 "highlight cards" con icono + texto.
  - Divisor decorativo animado (`about-divider`, `div-pixels`).
  - Sección de contacto: intro + tips, y formulario controlado (Nombre, Correo electrónico, Mensaje) con validación básica de campos vacíos (animación "shake" si falta alguno) y un estado de éxito simulado tipo terminal (`terminal-success`) al enviar, con botón para enviar otro mensaje.
  - Animación de aparición al hacer scroll (`.reveal` / `.reveal.in` vía `IntersectionObserver`), igual que en el prototipo.
- Actualización de `components/Nav.tsx`: agregar el link "Acerca de" → `/about` en el nav desktop y en el panel móvil, con el mismo patrón `isActive` que ya usan "Biblioteca" y "Salón de la Fama".
- Extender `app/globals.css` únicamente con las clases de `reference/templates/home-about/styles.css` que `/about` efectivamente usa (selectores `about-*`, `contact-*`, `highlight*`, `hl-*`, `div-bar`, `div-pixels`, `terminal-success`, `term-*`, `line*`, `prompt`, `caret`, `dot*`, `tip*`, `field`, `shake`, `.btn.press`, `.reveal`/`.reveal.in`, y cualquier `@keyframes` que esas reglas usen), incluyendo variantes responsive si el archivo fuente las trae para esas mismas clases.

**Out of scope (para specs futuros):**

- `home.jsx` (landing/hero separada de la Biblioteca) y cualquier cambio de contenido o de ruta en `/`. Decisión explícita del usuario para este spec.
- El link "Inicio" del nav de `home-about/nav.jsx` (apunta a la landing excluida arriba).
- Envío real de mensajes de contacto (backend, email, API). El formulario queda 100% mock, igual que el resto del MVP del spec 01.
- Persistencia de los mensajes de contacto (ni `localStorage` ni ningún otro storage).
- El resto de las ~800 líneas nuevas de `home-about/styles.css` que pertenecen solo a `home.jsx` (hero, features, mini-rail, stats, activity, pricing) — no se copian porque no tienen consumidor en este spec.
- Cualquier cambio visual a las pantallas ya existentes (Biblioteca, Detalle, Reproductor, Login, Salón de la Fama). El CSS que se agrega es puramente aditivo.

---

## Data model

No aplica. `/about` no introduce estructuras de datos nuevas: el formulario vive en estado local de React (`useState`), no se persiste en `localStorage` ni en ningún otro sitio.

---

## Implementation plan

1. Extraer de `reference/templates/home-about/styles.css` únicamente los selectores que usa `about.jsx` (listados en el scope) y añadirlos al final de `app/globals.css`, junto con cualquier `@keyframes` que esas reglas referencien (p. ej. la de "shake"). Verificación: `npm run build` sin errores; ninguna clase que ya exista en `app/globals.css` queda duplicada o sobrescrita.
2. Crear `app/about/page.tsx` (`"use client"`), portado de `about.jsx`: hero, highlight cards (con su `HighlightIcon` como sub-componente en el mismo archivo), divisor, y sección de contacto con el formulario controlado, validación de campos vacíos con "shake", y el estado de éxito `terminal-success`. El efecto de scroll-reveal (`IntersectionObserver` que agrega `.in` a los `.reveal`) se implementa localmente en este archivo (único consumidor por ahora), no como hook compartido. Verificación: enviar el formulario vacío dispara el shake sin avanzar; completarlo y enviarlo muestra el bloque `terminal-success` con el nombre en mayúsculas; "ENVIAR OTRO MENSAJE" limpia el formulario.
3. Actualizar `components/Nav.tsx`: agregar `<Link href="/about">Acerca de</Link>` en el nav desktop y en el panel móvil, usando `pathname.startsWith("/about")` para el estado activo, siguiendo el mismo patrón que "Biblioteca" y "Salón de la Fama". No se agrega ningún link "Inicio". Verificación: el link aparece en ambos navs y queda resaltado (`active`) al visitar `/about`.
4. Revisión final: correr `npm run lint` y `npm run build`, y comparar visualmente `/about` contra `reference/templates/home-about/about.jsx` para fidelidad de diseño y contenido. Verificación: ambos comandos terminan sin errores.

---

## Acceptance criteria

- [ ] `/about` es accesible y muestra el hero con el kicker "▸ ACERCA DE", el título, el párrafo de misión y las 3 highlight cards con icono.
- [ ] La sección de contacto muestra el formulario con los campos Nombre, Correo electrónico y Mensaje.
- [ ] Enviar el formulario con algún campo vacío dispara la animación "shake" y no muestra el estado de éxito.
- [ ] Enviar el formulario completo reemplaza el formulario por el bloque `terminal-success`, mostrando el nombre ingresado en mayúsculas.
- [ ] El botón "ENVIAR OTRO MENSAJE" limpia el formulario y permite volver a enviarlo.
- [ ] Las secciones con clase `.reveal` (divisor, bloque de contacto) aparecen con la animación de aparición al hacer scroll hasta ellas.
- [ ] El nav (desktop y móvil) muestra un link "Acerca de" que navega a `/about` y queda resaltado como activo en esa ruta.
- [ ] El nav NO incluye ningún link "Inicio": `/` sigue mostrando únicamente la Biblioteca, sin cambios de contenido respecto al spec 01.
- [ ] Ninguna pantalla existente (Biblioteca, Detalle, Reproductor, Login, Salón de la Fama) cambia visualmente: el CSS agregado es aditivo y no toca selectores que esas pantallas ya usaban.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

---

## Decisions

- **Sí:** excluir `home.jsx` del alcance — `/` sigue siendo la Biblioteca del spec 01, sin landing/hero separada. Razón: decisión explícita del usuario al invocar `/spec`.
- **Sí:** omitir el link "Inicio" del `nav.jsx` de `home-about` — solo se agrega "Acerca de". Razón: "Inicio" apuntaría a la landing excluida; agregarlo igualmente apuntando a `/` sería redundante con "Biblioteca", que ya apunta ahí.
- **Sí:** formulario de contacto 100% mock, sin persistencia ni backend. Razón: consistencia con las decisiones del spec 01 (auth simulada, reproductor simulado); no se pidió alcance de backend.
- **Sí:** mergear a `app/globals.css` únicamente las clases que `/about` usa, no las ~800 líneas completas del nuevo `styles.css`. Razón: evitar CSS muerto para secciones de `home.jsx` (hero, features, mini-rail, stats, pricing, activity) que no se van a construir en este spec.
- **Sí:** implementar el scroll-reveal (`IntersectionObserver`) localmente en `app/about/page.tsx` en vez de extraerlo a un hook compartido. Razón: es el único consumidor por ahora; extraerlo sería una abstracción prematura — se puede promover después si otra pantalla lo necesita.
- **No:** crear ninguna landing/hero separada de la Biblioteca (lo que habría requerido `home.jsx`). Razón: excluido explícitamente por el usuario.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Mismatch de hidratación si el `IntersectionObserver` corriera durante el render inicial | Se registra dentro de `useEffect`, después del montaje, igual que en `home.jsx`/`about.jsx` del prototipo. |
| Duplicar sin querer una clase que ya exista en `app/globals.css` al copiar selectores de `home-about/styles.css` | Antes de pegar cada bloque, verificar por nombre de selector si ya existe en `app/globals.css` (heredado del spec 01) y no duplicarlo. |

---

## What is **not** in this spec

- `home.jsx` y cualquier landing/hero separada de la Biblioteca.
- El link "Inicio" del nav.
- Envío real o persistencia de los mensajes de contacto.
- El resto del CSS nuevo de `home-about/styles.css` que pertenece solo a `home.jsx`.
- Cambios visuales a las pantallas ya existentes del spec 01.

Cada uno de estos, si se necesita, va en su propio spec.
