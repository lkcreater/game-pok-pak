@AGENTS.md

# Pok Pak

Single-player brick breaker (many balls, item drops) — Next.js 16 App Router, Canvas 2D, localStorage. UI copy is Thai.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm test` — Vitest (all logic in `lib/`)
- `npm run build` / `npm run lint` / `npx tsc --noEmit`
- `bash .claude/hooks/docs-check.test.sh` — self-test for the docs hook

## Layout

- `lib/game/` — DOM-free game logic: `grid.ts` (map parsing), `items.ts` (item registry), `levels.ts` (levels), `scoring.ts`, `engine.ts` (`Game`, fixed-step physics), `constants.ts`
- `lib/save.ts` (localStorage `pokpak:v1`), `lib/names.ts` (random player names)
- `components/App.tsx` (screen flow + save), `components/GameCanvas.tsx` (render loop, input, HUD)
- `docs/spec.md` (what the game is now), `docs/decisions.md` (why), `docs/superpowers/` (original design + plan)

## Common changes

- **Add a level:** append to `LEVELS` in `lib/game/levels.ts`, then `npm test` (validates every level). Keep open rows above the frame and the empty ring inside it (see spec). Tune `par`/`stars` by playing; in dev, `window.__game` exposes the running `Game` for scripted checks.
- **Add an item:** one entry in `ITEMS` in `lib/game/items.ts`. Only if it needs new behaviour: add a method to `GameActions` and implement it on `Game` with a test.

## Rules

- `lib/` stays DOM-free and deterministic via the injected `rng`; every logic change gets a Vitest test.
- After changing behaviour: update `docs/spec.md`; after a decision: add to `docs/decisions.md`; keep this file current. The Stop hook (`.claude/hooks/docs-check.sh`) blocks once when code is newer than these docs.
