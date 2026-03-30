# testable-rpg-game Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-29

## Active Technologies

- TypeScript ^5.4 + None (pure TypeScript, no external runtime dependencies) (001-seeded-rng)

## Project Structure

```text
src/
tests/
specs/
```

## Commands

npm test
npm run build
npm run test:e2e

## Code Style

TypeScript ^5.4: Follow standard conventions

## Recent Changes

- 001-seeded-rng: Added TypeScript ^5.4 + None (pure TypeScript, no external runtime dependencies)

<!-- MANUAL ADDITIONS START -->
- Browser demos:
  - `/` main playable canvas game (`src/game/PlayableGame.ts`)
  - `/game-storyline-demo.html` long storyline playtest for `/src/game`
  - `/playtest.html` runtime playtest dashboard
  - `/storyline-demo.html` runtime storyline validation page
- Storyline browser test specs:
  - `tests/e2e/game-storyline-demo.spec.ts`
  - `tests/e2e/storyline-demo.spec.ts`
<!-- MANUAL ADDITIONS END -->
