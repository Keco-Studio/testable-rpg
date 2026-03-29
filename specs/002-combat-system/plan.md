# Implementation Plan: Combat System

**Branch**: `002-combat-system` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-combat-system/spec.md`

## Summary

Implement a pure, stateless turn-based combat system. `CombatSystem.resolve(actors, rng)` accepts
plain-interface actors and an injected `SeededRNG`, returns an immutable `BattleResult`, and emits
events via `EventEmitter`. No Excalibur imports in the logic layer. Status effects tick on each
actor's turn. The `'combat'` RNG stream is used for all critical hit and speed-tie resolution.

## Technical Context

**Language/Version**: TypeScript ^5.4
**Primary Dependencies**: `SeededRNG` (spec 001); Node.js `EventEmitter` (available via Vite)
**Storage**: N/A — stateless function, callers persist `BattleResult`
**Testing**: Vitest ^1.6, jsdom environment
**Target Platform**: Browser + Node.js (jsdom for tests)
**Project Type**: Library module (pure function service)
**Performance Goals**: `resolve()` with 4v8 actors < 5ms
**Constraints**: No Excalibur imports; no `Math.random()`; immutable BattleResult; actors not mutated

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec as Source of Truth | ✅ PASS | Plan derived from spec.md |
| II. Test-First | ✅ PASS | Tests written and FAIL before implementation |
| III. Browser-Independent Testability | ✅ PASS | No Excalibur; Vitest + jsdom |
| IV. Determinism by Default | ✅ PASS | All randomness via injected `SeededRNG` stream `'combat'` |

## Project Structure

### Documentation (this feature)

```text
specs/002-combat-system/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── CombatSystem.ts.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
└── engine/
    └── combat/
        ├── CombatTypes.ts             ← Interfaces (CombatActor, BattleResult, etc.)
        ├── CombatSystem.ts            ← Main resolve() function + EventEmitter
        ├── StatusEffects.ts           ← tickStatus() pure function
        └── __tests__/
            └── CombatSystem.test.ts  ← Vitest unit tests (write FIRST)
```

**Structure Decision**: Three-file split keeps types, logic, and effect handling separate
without over-engineering. All three are within the `combat/` module — no extra top-level modules.

## Implementation Phases

1. **Types** — `CombatTypes.ts`: interfaces, no logic.
2. **Damage formula** — `calcDamage(attacker, defender, rng)` pure function.
3. **Turn order** — `sortBySpeed(actors, rng)` pure function.
4. **Status effects** — `tickStatus(actor)` pure function in `StatusEffects.ts`.
5. **Battle loop** — `CombatSystem.resolve()` assembles pieces, runs loop, builds log.
6. **Events** — wire `EventEmitter`; emit all 4 event types.
7. **BattleResult** — freeze/seal the object before returning.

## Complexity Tracking

> Not required — no Constitution Check violations.
