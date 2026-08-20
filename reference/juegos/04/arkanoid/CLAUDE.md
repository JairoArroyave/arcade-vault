# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repository is a scaffold for a browser-based Arkanoid/Breakout clone. **No application code exists yet** — only game assets have been added so far (`assets/`). There is no `package.json`, build tool, linter, or test suite configured. Do not assume any of these exist; check before referencing commands for them.

## Assets

- `assets/assets/spritesheet-breakout.png` — the sprite sheet image.
- `assets/assets/spritesheet.js` — sprite coordinate map for the sheet above (`SPRITES`, `EXPLOSION_FRAMES`) plus loader helpers (`loadSpritesheet`, `drawFrame`, `drawSprite`). This is the reference for how sprites are meant to be sliced and drawn onto a canvas (`ctx.drawImage` with `sx/sy/sw/sh` regions). Block color variants are looked up via the `block_<color>` naming convention (e.g. `block_red` → `SPRITES.blocks.red`).
- `assets/assets/sounds/ball-bounce.mp3`, `break-sound.mp3` — sound effects.
- `assets/__MACOSX/` — macOS zip-extraction artifacts (AppleDouble `._*` files, `.DS_Store`). Not part of the game; ignore/exclude when writing code that walks `assets/`.

## Spec-driven development workflow

This repo uses the `spec` / `spec-impl` skills (installed from `Klerith/fernando-skills`, see `skills-lock.json`) as the intended way to build features. Follow this workflow rather than writing code ad hoc:

1. **`/spec <description>`** — designs a spec through a clarifying-questions flow, then writes it to `specs/NN-slug.md` in `Draft` state. Never writes code.
2. A human reviews the spec and manually flips its state to `Approved`.
3. **`/spec-impl <NN-slug>`** — refuses to run unless the spec's state means `Approved`. On success it creates/switches to a branch named `spec-NN-slug`, then implements the plan step by step, pausing for review after each step. Branch auto-creation is controlled by `specs/.spec-config.yml` (`AutoCreateBranch`, defaults to `true`).

The `specs/` directory does not exist yet — it will be created by the first `/spec` invocation.
