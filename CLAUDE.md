# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("arcade.-vault") — a retro-arcade platform (Spanish UI, neon/CRT theme) for playing games in the browser and competing for the highest score.

Implemented so far (specs 01–09):

- Game catalog + detail + player + hall of fame screens.
- Four games are **actually implemented** (real canvas engines, real scoring): `rocas` (Asteroids), `caida` (Tetris), `bloque-buster` (Arkanoid), `serpentina` (Snake). The remaining four catalog entries (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) are **not implemented — just a demo**: a decorative arena with a simulated score ticker (CSS sprites, `setInterval`), no engine, no code under `lib/games/`. See `reference/implemented-games.md` for the full per-game breakdown (controls, scoring, HUD capabilities, assets), and `reference/game-sugestions-todo.md` for the queue of candidate games already proposed (the `game-planner` agent's memory — see Workflow).
- Real catalog + leaderboard on Supabase (`games` / `scores` tables, anon read + anon insert via RLS).
- Contact form emailing through Resend (`POST /api/contact`).
- Mock "login": a name in `localStorage` (`av_user`), no Supabase Auth.

The UI language is Spanish — copy, specs and code comments are in Spanish. Keep it that way.

## Commands

```bash
npm run dev      # start dev server (Next.js) at localhost:3000
npm run build    # production build
npm run start    # run the production build
npm run lint     # eslint (flat config, eslint.config.mjs)
```

There is no test runner configured — the specs deliberately exclude automated tests. Verification is `npm run lint && npm run build` plus manual checks in the browser. Don't introduce Jest/Vitest/Playwright without asking.

A `PostToolUse` hook in `.claude/settings.json` runs Prettier (and ESLint `--fix` on JS/TS) on every file written or edited, so don't hand-format.

## Environment

`.env.local` (untracked; `.env.example` holds the placeholder names):

- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` — contact form.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — catalog and leaderboard.

`.mcp.json` declares an HTTP Supabase MCP server (enabled in `.claude/settings.local.json`) for docs/database/debugging against the project ref. Schema changes are still **manual additive SQL** in `supabase/schema.sql`, run by the user in the Supabase dashboard SQL editor — no Supabase CLI, no migrations, no service-role client.

## Architecture

- Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS v4 via `@tailwindcss/postcss`. Path alias `@/*` maps to the repo root.
- Styling is **not** utility-first in practice: `app/globals.css` (~1000 lines) holds the whole neon/CRT design system as plain CSS — theme variables (`--cyan`, `--magenta`, `--pixel`, `--mono`…), `.btn`, `.crt`, `.av-*`, `.hud-stat`, cover gradients. Components use those class names; reuse them instead of inventing new styling.
- `app/layout.tsx` loads Press Start 2P / JetBrains Mono / Courier Prime, paints the animated grid + scanline background, and wraps everything in `AuthProvider` + `Nav`.

### Routes

| Route | Kind | Notes |
| --- | --- | --- |
| `/` | Server | `getGames()` → `GameLibrary` (search + category chips, client-side) |
| `/about` | Server/Client | About page with the contact form posting to `/api/contact` |
| `/games/[id]` | Server | Detail + top-10 leaderboard for that game |
| `/games/[id]/play` | Server → `GamePlayerClient` | The player (HUD, CRT frame, pause, game-over modal) |
| `/hall-of-fame` | Server | All games with their top-12 scores |
| `/login` | Client | Writes `{ name }` to `localStorage` via `useAuth()` |
| `/api/contact` | Route handler | Resend `emails.send`, returns `{ ok }` / 400 / 502 |

### Data layer

- `lib/supabase/server.ts` — cookie-aware server client (`next/headers`). `lib/supabase/client.ts` — browser client.
- `lib/games.ts` — `getGames()` / `getGameById()` against the `games` table, merging in the best score.
- `lib/leaderboard.ts` — **server reads** (`getScoresForGame`, `getBestScores`).
- `lib/leaderboard-client.ts` — **client write** (`saveScore`). Kept separate on purpose: importing `lib/leaderboard.ts` from a Client Component would drag `next/headers` into the browser bundle. Don't merge these two files.
- `lib/storage.ts` — the mock session (`av_user`) exposed as an external store (`subscribe`/`getSnapshot`) so `app/providers.tsx` can read it with `useSyncExternalStore` instead of a `localStorage` read inside an effect.

### Real games

Every real game is two files plus one registry line:

- `lib/games/<slug>/engine.ts` — a factory `create<X>Engine(canvas, callbacks): GameEngine` (`setPaused` / `reset` / `destroy`). All state and listeners live inside the closure — no module-level `document`/`window`, no in-canvas HUD, no in-canvas game-over overlay, no restart key.
- `components/games/<PascalName>Game.tsx` — `"use client"` wrapper: mounts the `<canvas>` at the engine's fixed logical resolution, keeps callbacks in a ref, recreates the engine when `resetKey` changes, and forwards `paused` via a separate effect.
- `components/games/registry.ts` — `REAL_GAMES[gameId] = { Component, capabilities: { hasLives, hasLevel } }`. `GamePlayerClient` looks the game up here; a missing entry means the decorative arena. Capabilities drive which HUD stats render.

Shared types live in `lib/games/types.ts` (`GameCallbacks`, `GameEngine`) and `components/games/types.ts` (`RealGameProps`, `GameCapabilities`). Canvas scaling is handled once by `.game-arena canvas` in the CSS — a new port needs no new CSS.

Ported game sources under `reference/juegos/**` and `reference/snake-assets/` are **read-only**; original palettes are preserved, never recolored to the site theme. Runtime assets (sprites, sounds) are copied into `public/games/<slug>/`.

## Workflow

Spec Driven Design. Every feature is a numbered spec in `specs/NN-slug.md` (`Draft` → `Approved` → `Implemented`), implemented on its own `spec-NN-slug` branch and merged to `develop` via PR. `specs/.spec-config.yml` has `AutoCreateBranch: true`, so `/spec-impl` creates the branch itself.

Skills installed in `.claude/skills/` (also mirrored in `.agents/skills/`, tracked in `skills-lock.json`):

- `/spec`, `/spec-impl` — from [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`).
- `/frontend-design` — from `anthropics/skills`. **Always use it when designing or reshaping UI.**
- `/integrar-juego` — project-local skill. Writes the spec for porting or inventing a game wired to the shared player and the real leaderboard. Its `contract.md` is the authoritative engine/wrapper/registry contract summarized above — read it before writing any game code, and update it if the contract changes. The skill only writes a `Draft` spec; implementation is always `/spec-impl` afterwards.

Agents installed in `.claude/agents/` (project scope — they don't exist outside this repo):

- `game-planner` — decides **which game the catalog should get next**. Reads the real state (`components/games/registry.ts`, the `insert into games` block of `supabase/schema.sql`, `lib/games/`, `specs/`, `reference/juegos/`) and scores candidates on catalog fit, viability under the engine/wrapper contract, mechanical diversity, leaderboard-worthy scoring, effort and assets. It prefers filling one of the four remaining decorative slots (no SQL) over proposing a new `games` row. Its **memory is `reference/game-sugestions-todo.md`** — the only file it may write — so it never repeats a suggestion across invocations; each entry carries a status (`Pendiente` / `En spec` / `Implementada` / `Descartada`). It writes no spec and no code: it ends by handing over the exact `/integrar-juego` command. No network access.

The full chain for adding a game is `game-planner` (which game) → `/integrar-juego` (Draft spec) → `/spec-impl` (implementation on its own branch).

Because `scores` is generic by `game` id, a new game needs no schema change — only a row in `games` (if it doesn't fit an existing catalog slot) and a `saveScore()` call.

## Notes

- **This project runs on a pre-release Next.js version with breaking changes from the Next.js you were trained on.** Before writing any Next.js-specific code (routing, data fetching, config, conventions), consult `node_modules/next/dist/docs/` — do not rely on prior training knowledge. Note the generated `PageProps<"/games/[id]">` / `LayoutProps<"/">` types already in use. See `AGENTS.md` (imported above); it is auto-regenerated by `next dev` and should be committed as-is when it changes.
- Documentation inside `reference/juegos/**` has been wrong before (a CLAUDE.md claiming "no code yet" for a finished game, a wrong line count). Read the source, not its README.
- `demos/demos.tsx` and the empty `arcade.-vault/` directory are leftovers, not part of the app.
