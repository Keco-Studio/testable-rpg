---
description: "Task list for Seeded RNG implementation"
---

# Tasks: Seeded RNG

**Input**: Design documents from `/specs/001-seeded-rng/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included — TDD is MANDATORY per project constitution.
**Organization**: Tasks organized by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create project structure and shared foundations.

- [x] T001 Create directory `src/engine/rng/` and `src/engine/rng/__tests__/`
- [x] T002 [P] Create empty file `src/engine/rng/SeededRNG.ts` with export stub
- [x] T003 [P] Create empty file `src/engine/rng/__tests__/SeededRNG.test.ts` with describe block

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types consumed by all user stories.

⚠️ **CRITICAL**: Must complete before any user story implementation.

- [x] T004 Define `Result<T, E>` discriminated union type in `src/engine/rng/SeededRNG.ts`
- [x] T005 Define `SerializedRNG` interface in `src/engine/rng/SeededRNG.ts`
- [x] T006 Define `IRNGStream` interface in `src/engine/rng/SeededRNG.ts`

**Checkpoint**: Types defined — user story implementation can now begin.

---

## Phase 3: User Story 1 — Deterministic Reproducibility (Priority: P1) 🎯 MVP

**Goal**: `SeededRNG` produces identical float/int sequences for the same seed.

**Independent Test**: Instantiate two `SeededRNG(42)` instances; call `nextFloat()` 10 times each; verify sequences are byte-for-byte identical.

### Tests for User Story 1 ⚠️ Write FIRST — confirm FAIL before Phase 3 implementation

> **TDD GATE: Write tests → confirm FAILING → then implement**

- [x] T007 [P] [US1] Write test: `nextFloat()` returns float in `[0, 1)` in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T008 [P] [US1] Write test: given seed 42, `nextFloat()` returns same sequence on two instances in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T009 [P] [US1] Write test: seed 0 and `Number.MAX_SAFE_INTEGER` produce valid output in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T010 [P] [US1] Write test: `nextInt(5, 5)` always returns 5 in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T011 [P] [US1] Write test: `nextInt(min, max)` returns integer in `[min, max]` inclusive in `src/engine/rng/__tests__/SeededRNG.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement `SeededRNG` class constructor with Mulberry32 state in `src/engine/rng/SeededRNG.ts` (depends on T007–T011 FAILING)
- [ ] T013 [US1] Implement `nextFloat()` using Mulberry32 step in `src/engine/rng/SeededRNG.ts`
- [ ] T014 [US1] Implement `nextInt(min, max)` derived from `nextFloat()` in `src/engine/rng/SeededRNG.ts`

**Checkpoint**: User Story 1 complete — T007–T011 must be GREEN before proceeding.

---

## Phase 4: User Story 2 — Independent Named Streams (Priority: P2)

**Goal**: `rng.stream('combat')` and `rng.stream('loot')` advance independently.

**Independent Test**: Advance stream `'loot'` 5 times; call `stream('combat').next()`; verify combat result matches calling `rng.stream('combat').next()` fresh on a second identical-seed instance that never touched `'loot'`.

### Tests for User Story 2 ⚠️ Write FIRST — confirm FAIL

- [x] T015 [P] [US2] Write test: `stream('combat')` and `stream('loot')` produce independent sequences in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T016 [P] [US2] Write test: `stream(name)` returns same object on repeated calls in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T017 [P] [US2] Write test: advancing `'loot'` stream does not affect `'combat'` stream in `src/engine/rng/__tests__/SeededRNG.test.ts`

### Implementation for User Story 2

- [x] T018 [US2] Implement `djb2Hash(name)` utility inside `src/engine/rng/SeededRNG.ts`
- [x] T019 [US2] Implement `RNGStream` class with Mulberry32 state derived from `djb2(name) ^ seed` in `src/engine/rng/SeededRNG.ts`
- [x] T020 [US2] Implement `stream(name)` method on `SeededRNG` using lazy `Map` registry in `src/engine/rng/SeededRNG.ts`

**Checkpoint**: User Story 2 complete — T015–T017 must be GREEN.

---

## Phase 5: User Story 3 — Array Shuffling (Priority: P2)

**Goal**: `rng.shuffle([...])` returns a deterministic permutation without mutating input.

**Independent Test**: Shuffle `[1,2,3,4,5]` twice with `SeededRNG(42)`, verify results are identical. Verify original array is unchanged.

### Tests for User Story 3 ⚠️ Write FIRST — confirm FAIL

- [x] T021 [P] [US3] Write test: `shuffle([])` returns `[]` in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T022 [P] [US3] Write test: `shuffle([x])` returns `[x]` in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T023 [P] [US3] Write test: `shuffle(array)` returns permutation and does not mutate input in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T024 [P] [US3] Write test: two `SeededRNG(42)` instances produce identical shuffle of `[1,2,3,4,5]` in `src/engine/rng/__tests__/SeededRNG.test.ts`

### Implementation for User Story 3

- [x] T025 [US3] Implement `shuffle<T>(array: readonly T[]): T[]` using Fisher-Yates consuming root stream in `src/engine/rng/SeededRNG.ts`

**Checkpoint**: User Story 3 complete — T021–T024 must be GREEN.

---

## Phase 6: User Story 4 — State Serialization & Restoration (Priority: P3)

**Goal**: `serialize()` / `deserialize()` round-trip restores exact RNG state across all streams.

**Independent Test**: Advance root and two named streams, serialize, restore in a fresh instance, verify next 10 calls on each stream are identical to the original.

### Tests for User Story 4 ⚠️ Write FIRST — confirm FAIL

- [x] T026 [P] [US4] Write test: `serialize()` returns valid JSON string in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T027 [P] [US4] Write test: `deserialize(json)` restores root + all streams exactly in `src/engine/rng/__tests__/SeededRNG.test.ts`
- [x] T028 [P] [US4] Write test: `deserialize(invalid_json)` returns `Result.err` without throwing in `src/engine/rng/__tests__/SeededRNG.test.ts`

### Implementation for User Story 4

- [x] T029 [US4] Implement `serialize()` returning `JSON.stringify({ seed, state, streams })` in `src/engine/rng/SeededRNG.ts`
- [x] T030 [US4] Implement `deserialize(json)` with try/catch returning `Result<void, Error>` in `src/engine/rng/SeededRNG.ts`

**Checkpoint**: All user stories complete — T026–T028 must be GREEN.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, export cleanup, and quality gates.

- [x] T031 [P] Add `export` statements and barrel index in `src/engine/rng/SeededRNG.ts` (export class + types)
- [x] T032 [P] Grep codebase for `Math.random` — verify zero occurrences in `src/engine/rng/` (FR-010)
- [x] T033 Performance: shuffle array of 10,000 items with `SeededRNG(42)`; assert < 50ms (add to `src/engine/rng/__tests__/SeededRNG.test.ts`)
- [x] T034 [P] Update `CLAUDE.md` with new module path `src/engine/rng/SeededRNG.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 — blocks all user stories.
- **US1 (Phase 3)**: Depends on Phase 2 — tests written first, FAIL confirmed, then implement.
- **US2 (Phase 4)**: Depends on Phase 3 completion (streams build on root nextFloat).
- **US3 (Phase 5)**: Depends on Phase 3 (shuffle consumes root stream). Can parallel with US2.
- **US4 (Phase 6)**: Depends on Phases 3+4+5 (serializes all streams).
- **Polish (Phase 7)**: Depends on all user stories complete.

### User Story Dependencies

- **US1 (P1)**: Foundation — required by all others.
- **US2 (P2)**: Depends on US1. Can run in parallel with US3.
- **US3 (P2)**: Depends on US1. Can run in parallel with US2.
- **US4 (P3)**: Depends on US1 + US2 + US3.

### Within Each User Story

- Tests MUST be written and FAIL before implementation begins.
- Types before logic.
- Each story is independently testable at its checkpoint.

### Parallel Opportunities

```bash
# Phase 1 — all parallel
Task: "Create src/engine/rng/ directory structure"
Task: "Create SeededRNG.ts stub"
Task: "Create SeededRNG.test.ts stub"

# Phase 3 tests — all parallel
Task: T007 Write test: nextFloat() range
Task: T008 Write test: deterministic sequence
Task: T009 Write test: edge seeds
Task: T010 Write test: nextInt(5,5)
Task: T011 Write test: nextInt range

# US2 and US3 tests — parallel across stories
Task: T015 Write test: stream independence
Task: T021 Write test: shuffle([])
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational types
3. Write US1 tests (T007–T011), confirm FAIL
4. Implement US1 (T012–T014), confirm GREEN
5. **STOP and VALIDATE** — `SeededRNG(42).nextFloat()` is deterministic

### Incremental Delivery

1. Setup + Foundational → types ready
2. US1 → deterministic root RNG (MVP)
3. US2 → named streams independent
4. US3 → deterministic shuffle
5. US4 → full save/restore

### TDD Checkpoints (MANDATORY)

Each user story phase requires:

| Gate | Requirement |
|------|-------------|
| ✅ Tests Written | All story tests exist in `SeededRNG.test.ts` |
| ✅ Tests FAILING | Run `vitest run` — all new tests RED |
| ✅ Implementation | Write code until tests GREEN |
| ✅ No Regressions | All prior tests still GREEN |

---

## Notes

- `[P]` tasks = different parts of the test file or entirely different files — safe to parallelize.
- All tests live in one file (`SeededRNG.test.ts`) — mark parallel only when test cases are independent describes.
- TDD gate is enforced by constitution — implementation tasks are BLOCKED until tests FAIL.
- `Math.random()` must never appear in implementation — T032 validates this.
