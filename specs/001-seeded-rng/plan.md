# Implementation Plan: Seeded RNG

**Branch**: `001-seeded-rng` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-seeded-rng/spec.md`

## Summary

Implement a seeded, deterministic pseudo-random number generator for the RPG engine.
All game systems must inject the `SeededRNG` instance so tests control randomness using seed 42.
The primary algorithm is Mulberry32 (32-bit integer arithmetic). Named, independent streams are
derived by hashing the stream name with the root seed via a secondary xoshiro128** state.
`serialize()` / `deserialize()` use `Result<T, Error>` — no throwing.

## Technical Context

**Language/Version**: TypeScript ^5.4
**Primary Dependencies**: None (pure TypeScript, no external runtime dependencies)
**Storage**: N/A — runtime-only state; serialization is JSON string (caller manages persistence)
**Testing**: Vitest ^1.6, jsdom environment
**Target Platform**: Browser + Node.js (jsdom/Vitest for unit tests, browser at runtime)
**Project Type**: Library module (injectable service, no CLI or web surface)
**Performance Goals**: `shuffle([10000 items])` < 50ms; `nextFloat()` < 1µs per call
**Constraints**: No `Math.random()` calls; no Excalibur imports; pure TypeScript
**Scale/Scope**: Single module (~200 LOC), consumed by all 5 game systems

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec as Source of Truth | ✅ PASS | Plan derived from spec.md |
| II. Test-First | ✅ PASS | Tests in `src/engine/rng/__tests__/` must be written and FAIL before implementation |
| III. Browser-Independent Testability | ✅ PASS | No Excalibur imports; pure TS; Vitest + jsdom |
| IV. Determinism by Default | ✅ PASS | This module IS the determinism primitive |

No violations — Complexity Tracking section not required.

## Project Structure

### Documentation (this feature)

```text
specs/001-seeded-rng/
├── plan.md              # This file
├── research.md          # Phase 0 — algorithm selection rationale
├── data-model.md        # Phase 1 — entity interfaces
├── quickstart.md        # Phase 1 — usage guide
├── contracts/
│   └── SeededRNG.ts.md  # Phase 1 — TypeScript public API contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
└── engine/
    └── rng/
        ├── SeededRNG.ts              ← Main implementation
        └── __tests__/
            └── SeededRNG.test.ts     ← Vitest unit tests (write FIRST)

```

**Structure Decision**: Single-module library. One file (`SeededRNG.ts`) exports the class and
its companion types. No sub-modules needed — the entire feature is < 200 LOC.

## Complexity Tracking

> Not required — no Constitution Check violations.
