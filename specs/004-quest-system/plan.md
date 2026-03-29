# Implementation Plan: Quest System

**Branch**: `004-quest-system` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-quest-system/spec.md`

## Summary

Implement a pure-logic quest system with a state machine (INACTIVE → ACTIVE → COMPLETED/FAILED).
`QuestSystem` manages quest registrations, objective progress, prerequisites, and branching paths.
Returns `Result<T, Error>` for fallible operations. Emits 4 event types. Serialize/deserialize
for save-game persistence. No Excalibur or DOM dependencies.

## Technical Context

**Language/Version**: TypeScript ^5.4
**Primary Dependencies**: Node.js `EventEmitter`; `Result<T,Error>` type from project
**Storage**: N/A — in-memory; JSON serialization for persistence (caller owns storage)
**Testing**: Vitest ^1.6, jsdom environment
**Target Platform**: Browser + Node.js
**Project Type**: Library module
**Performance Goals**: 50-quest serialize/deserialize round-trip < 10ms
**Constraints**: No Excalibur imports; Result<T,Error> — never throw; pure logic

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec as Source of Truth | ✅ PASS | Plan derived from spec.md |
| II. Test-First | ✅ PASS | Tests written and FAIL before implementation |
| III. Browser-Independent Testability | ✅ PASS | No Excalibur; Vitest + jsdom |
| IV. Determinism by Default | ✅ PASS | No randomness; path resolution is deterministic |

## Project Structure

### Documentation (this feature)

```text
specs/004-quest-system/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── QuestSystem.ts.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
└── engine/
    └── quest/
        ├── QuestTypes.ts            ← Quest, Objective, QuestPath, QuestState interfaces
        ├── QuestSystem.ts           ← State machine + progress tracking + events
        └── __tests__/
            └── QuestSystem.test.ts ← Vitest unit tests (write FIRST)
```

**Structure Decision**: Two-file split. State machine logic is complex enough to warrant
detailed types but not enough to split into sub-modules.

## Implementation Phases

1. **Types** — `QuestTypes.ts`: enums, interfaces, `QuestState`, `QuestPath`.
2. **State machine** — `activate()`, `fail()`, auto-complete detection.
3. **Objectives** — `progressObjective()`, completion check logic.
4. **Prerequisites** — prerequisite gate in `activate()`.
5. **Branching** — path resolution at completion time.
6. **Events** — wire all 4 event types.
7. **Persistence** — `serialize()` / `deserialize()`.

## Complexity Tracking

> Not required — no Constitution Check violations.
