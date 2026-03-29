# Implementation Plan: GameTestAPI (window.__game)

**Branch**: `005-game-test-api` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-game-test-api/spec.md`

## Summary

Implement `GameTestAPI` — the `window.__game` surface exposed in non-production Vite builds.
The module is conditionally imported via `import.meta.env.MODE` and tree-shaken in production.
It wraps live game engine references, exposing read methods (state inspection) and control methods
(teleport, setHP, addItem, etc.) plus a declarative `runScenario()` runner. Uses `TestClock` for
frame stepping — never real `requestAnimationFrame`.

## Technical Context

**Language/Version**: TypeScript ^5.4
**Primary Dependencies**: Excalibur.js ^0.30.0 (`TestClock`, `Engine`, `Scene`, `Actor`); all game systems (SeededRNG, InventorySystem, QuestSystem)
**Storage**: N/A — live game state references; no persistence in this module
**Testing**: Vitest ^1.6, jsdom environment; Playwright ^1.44 for E2E
**Target Platform**: Browser (runtime); Node.js/jsdom (unit tests)
**Project Type**: Testing utility / developer API
**Performance Goals**: 20-step scenario < 500ms; state reads < 1ms
**Constraints**: Tree-shaken from production; TestClock only (no real rAF); never throws

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec as Source of Truth | ✅ PASS | Plan derived from spec.md |
| II. Test-First | ✅ PASS | Tests written and FAIL before implementation |
| III. Browser-Independent Testability | ✅ PASS | Vitest + jsdom for unit tests; Playwright for E2E |
| IV. Determinism by Default | ✅ PASS | `setSeed(n)` exposes RNG reseeding; `stepFrames` uses TestClock |

## Project Structure

### Documentation (this feature)

```text
specs/005-game-test-api/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── GameTestAPI.ts.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
└── testing/
    ├── GameTestAPI.ts          ← window.__game surface (conditionally imported)
    ├── ScenarioRunner.ts       ← runScenario() declarative executor
    └── __tests__/
        └── GameTestAPI.test.ts ← Vitest unit tests (write FIRST)

tests/
└── e2e/
    └── game-test-api.spec.ts  ← Playwright E2E (verifies window.__game in browser)
```

**Structure Decision**: `GameTestAPI.ts` and `ScenarioRunner.ts` are separate because the
scenario runner can be tested independently of the full API surface.

## Implementation Phases

1. **Types** — `GameTestAPI` interface, `TestScenario`, `ScenarioResult`.
2. **State reading** — `getScene()`, `getActors()`, `getPlayer()`, `getInventory()`, `getQuestState()`, `getDialogState()`.
3. **Control methods** — `teleport()`, `setHP()`, `addItem()`, `triggerQuest()`, `setSeed()`, `stepFrames()`, `changeScene()`.
4. **window assignment** — conditional `import.meta.env.MODE !== 'production'` guard.
5. **ScenarioRunner** — `runScenario()` with sequential step execution and error capture.
6. **E2E smoke test** — Playwright test verifying `window.__game` presence in browser.

## Complexity Tracking

> Not required — no Constitution Check violations.
