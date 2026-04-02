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
## Test Contract System

Every game system has a contract file in `contracts/` listing behavioral guarantees.

**Rule for all code changes:**
1. Identify which contract items are affected by the change
2. Write/update tests that verify those items
3. Run `npm test` and confirm all tests pass
4. Mark contract items as Tested in the relevant contract file
5. New features must add contract items AND tests — no exceptions

Contract files:
- `contracts/combat.contract.md`
- `contracts/inventory.contract.md`
- `contracts/quest.contract.md`
- `contracts/dialog.contract.md`
- `contracts/save.contract.md`
- `contracts/storyline.contract.md`
- `contracts/game-loop.contract.md`
- `contracts/player-experience.contract.md`

## Game Quality Framework

Before writing or modifying game code, consult `fun/README.md` for quality principles.

**5 Quality Layers** (each with testable invariants in `fun/`):
1. Visual Clarity (`fun/visual-clarity.md`) — colors, labels, tile readability
2. World Feel (`fun/world-feel.md`) — map connectivity, zone variety, NPC placement
3. Moment-to-Moment (`fun/moment-to-moment.md`) — feedback, transitions, input response
4. Session Arc (`fun/session-arc.md`) — reward pacing, progression, anti-patterns
5. Story & Agency (`fun/story-agency.md`) — choices, consequences, faction divergence

**Rule for game changes:**
1. Identify which quality layer invariants are affected
2. Run the corresponding `fun-*.test.ts` file to verify
3. New gameplay features should satisfy relevant invariants
<!-- MANUAL ADDITIONS END -->
