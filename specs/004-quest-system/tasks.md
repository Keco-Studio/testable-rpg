---
description: "Task list for Quest System implementation"
---

# Tasks: Quest System

**Input**: Design documents from `/specs/004-quest-system/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Included — TDD is MANDATORY per project constitution.
**Organization**: Tasks organized by user story for independent implementation and testing.

---

## Phase 1: Setup

- [ ] T001 Create directories `src/engine/quest/` and `src/engine/quest/__tests__/`
- [ ] T002 [P] Create stub `src/engine/quest/QuestTypes.ts`
- [ ] T003 [P] Create stub `src/engine/quest/QuestSystem.ts`
- [ ] T004 [P] Create stub `src/engine/quest/__tests__/QuestSystem.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Define `QuestStateEnum` (`'INACTIVE'|'ACTIVE'|'COMPLETED'|'FAILED'`) in `src/engine/quest/QuestTypes.ts`
- [ ] T006 [P] Define `ObjectiveType` enum (`TALK_TO_NPC`, `COLLECT_ITEM`, `DEFEAT_ENEMY`, `ENTER_ZONE`) in `src/engine/quest/QuestTypes.ts`
- [ ] T007 [P] Define `Objective` interface (id, type, required, optional, current) in `src/engine/quest/QuestTypes.ts`
- [ ] T008 [P] Define `QuestPath` interface (id, objectiveIds: string[]) in `src/engine/quest/QuestTypes.ts`
- [ ] T009 [P] Define `QuestDefinition` interface (id, title, objectives, prerequisites, paths?) in `src/engine/quest/QuestTypes.ts`
- [ ] T010 [P] Define `QuestRuntimeState` interface (questId, state, objectiveProgress, resolvedPathId?) in `src/engine/quest/QuestTypes.ts`
- [ ] T011 [P] Define `Result<T, E>` discriminated union type in `src/engine/quest/QuestTypes.ts`

**Checkpoint**: All types defined — user story work can begin.

---

## Phase 3: User Story 1 — Quest State Machine (Priority: P1) 🎯 MVP

**Goal**: Quests transition through INACTIVE → ACTIVE → COMPLETED/FAILED correctly; terminal states enforced.

**Independent Test**: Register quest, verify INACTIVE. activate() → ACTIVE. fail() → FAILED. Attempt activate() on FAILED → no change, no error thrown.

### Tests for User Story 1 ⚠️ Write FIRST — confirm FAIL

- [ ] T012 [P] [US1] Write test: newly registered quest state is INACTIVE in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T013 [P] [US1] Write test: activate() changes state to ACTIVE, emits `quest:activated` in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T014 [P] [US1] Write test: COMPLETED is terminal — no transitions out in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T015 [P] [US1] Write test: fail() changes state to FAILED, emits `quest:failed` in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T016 [P] [US1] Write test: FAILED is terminal — no transitions out in `src/engine/quest/__tests__/QuestSystem.test.ts`

### Implementation for User Story 1

- [ ] T017 [US1] Implement `QuestSystem` class with `registerQuest(def)` and state map in `src/engine/quest/QuestSystem.ts` (depends on T012–T016 FAILING)
- [ ] T018 [US1] Implement `activate(questId)` with INACTIVE→ACTIVE transition guard in `src/engine/quest/QuestSystem.ts`
- [ ] T019 [US1] Implement `fail(questId)` with ACTIVE→FAILED transition guard in `src/engine/quest/QuestSystem.ts`
- [ ] T020 [US1] Implement terminal state enforcement (COMPLETED/FAILED reject all transitions) in `src/engine/quest/QuestSystem.ts`
- [ ] T021 [US1] Wire EventEmitter; emit `quest:activated` and `quest:failed` in `src/engine/quest/QuestSystem.ts`

**Checkpoint**: User Story 1 complete — T012–T016 must be GREEN.

---

## Phase 4: User Story 2 — Objectives & Progress Tracking (Priority: P1)

**Goal**: `progressObjective(questId, objId, amount)` tracks progress; quest auto-completes when all required objectives met.

**Independent Test**: Quest with DEFEAT_ENEMY (required: 3). progressObjective × 2 (amt 2) → 2/3. progressObjective (amt 1) → 3/3, quest auto-completes.

### Tests for User Story 2 ⚠️ Write FIRST — confirm FAIL

- [ ] T022 [P] [US2] Write test: progressObjective updates `current` count, emits `quest:progressed` in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T023 [P] [US2] Write test: all required objectives met → quest auto-completes (COMPLETED), emits `quest:completed` in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T024 [P] [US2] Write test: optional objective not met does NOT block completion in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T025 [P] [US2] Write test: all 4 objective types (TALK, COLLECT, DEFEAT, ENTER) are trackable in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T026 [P] [US2] Write test: progressObjective on COMPLETED quest is no-op with no event in `src/engine/quest/__tests__/QuestSystem.test.ts`

### Implementation for User Story 2

- [ ] T027 [US2] Implement `progressObjective(questId, objectiveId, amount)` updating progress in `src/engine/quest/QuestSystem.ts` (depends on T022–T026 FAILING)
- [ ] T028 [US2] Implement auto-complete check: after each progress update, check all required objectives in `src/engine/quest/QuestSystem.ts`
- [ ] T029 [US2] Implement optional-objective gate: optional objectives tracked but not checked for completion in `src/engine/quest/QuestSystem.ts`
- [ ] T030 [US2] Emit `quest:progressed { questId, objectiveId, current, required }` in `src/engine/quest/QuestSystem.ts`
- [ ] T031 [US2] Emit `quest:completed { questId, pathId }` on auto-complete (pathId null for non-branching quests) in `src/engine/quest/QuestSystem.ts`

**Checkpoint**: User Story 2 complete — T022–T026 must be GREEN.

---

## Phase 5: User Story 3 — Quest Prerequisites (Priority: P2)

**Goal**: Quests with prerequisites cannot activate until all prerequisite quests are COMPLETED.

**Independent Test**: Quest B requires quest A. activate(B) → Result.err('PREREQUISITES_NOT_MET'). Complete A. activate(B) → ACTIVE.

### Tests for User Story 3 ⚠️ Write FIRST — confirm FAIL

- [ ] T032 [P] [US3] Write test: activate quest with unmet prerequisite returns `Result.err('PREREQUISITES_NOT_MET')` in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T033 [P] [US3] Write test: activate quest with ACTIVE (not COMPLETED) prerequisite still fails in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T034 [P] [US3] Write test: activate quest after all prerequisites COMPLETED succeeds in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T035 [P] [US3] Write test: quest with no prerequisites activates without any check in `src/engine/quest/__tests__/QuestSystem.test.ts`

### Implementation for User Story 3

- [ ] T036 [US3] Add prerequisite gate to `activate()`: check all prerequisite questIds are COMPLETED in `src/engine/quest/QuestSystem.ts` (depends on T032–T035 FAILING)
- [ ] T037 [US3] Return `Result.err('PREREQUISITES_NOT_MET')` when gate fails in `src/engine/quest/QuestSystem.ts`

**Checkpoint**: User Story 3 complete — T032–T035 must be GREEN.

---

## Phase 6: User Story 4 — Branching Completion Paths (Priority: P2)

**Goal**: Quest with multiple paths resolves to the first fully-satisfied path on completion.

**Independent Test**: Quest with pathA (needs OBJ-1) and pathB (needs OBJ-2). Complete OBJ-1 only. Verify `quest:completed` has `pathId: 'pathA'`.

### Tests for User Story 4 ⚠️ Write FIRST — confirm FAIL

- [ ] T038 [P] [US4] Write test: quest completes via correct path when that path's objectives are met in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T039 [P] [US4] Write test: `quest:completed` event includes correct `pathId` in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T040 [P] [US4] Write test: when both paths satisfied, first path in definition order wins in `src/engine/quest/__tests__/QuestSystem.test.ts`

### Implementation for User Story 4

- [ ] T041 [US4] Implement `resolvePath(quest, progress): string|null` function checking each path's objectives in `src/engine/quest/QuestSystem.ts` (depends on T038–T040 FAILING)
- [ ] T042 [US4] Wire `resolvePath` into auto-complete check; store resolved pathId in runtime state in `src/engine/quest/QuestSystem.ts`
- [ ] T043 [US4] Include `pathId` in `quest:completed` event payload in `src/engine/quest/QuestSystem.ts`

**Checkpoint**: User Story 4 complete — T038–T040 must be GREEN.

---

## Phase 7: User Story 5 — State Persistence (Priority: P3)

**Goal**: Full quest state serializes to JSON and restores exactly.

**Independent Test**: Activate quest, advance objectives 2/3. serialize(). New QuestSystem. deserialize(json). Verify state = ACTIVE, progress = 2/3.

### Tests for User Story 5 ⚠️ Write FIRST — confirm FAIL

- [ ] T044 [P] [US5] Write test: `serialize()` returns valid JSON in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T045 [P] [US5] Write test: `deserialize(json)` restores all quest states and objective progress in `src/engine/quest/__tests__/QuestSystem.test.ts`
- [ ] T046 [P] [US5] Write test: `deserialize(invalid_json)` returns `Result.err` without throwing in `src/engine/quest/__tests__/QuestSystem.test.ts`

### Implementation for User Story 5

- [ ] T047 [US5] Implement `serialize()` returning `JSON.stringify` of full runtime state map in `src/engine/quest/QuestSystem.ts` (depends on T044–T046 FAILING)
- [ ] T048 [US5] Implement `deserialize(json)` restoring runtimeStates with try/catch → `Result<void, Error>` in `src/engine/quest/QuestSystem.ts`

**Checkpoint**: All user stories complete — T044–T046 must be GREEN.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T049 [P] Add exports to `src/engine/quest/QuestSystem.ts`
- [ ] T050 [P] Grep `src/engine/quest/` for thrown exceptions — must be zero
- [ ] T051 Performance test: serialize/deserialize 50 quests in < 10ms (add to test file)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2) → US5 (P3) → Polish**
- US2 depends on US1 (objectives on an active quest).
- US3 depends on US1 (prerequisite check in activate()).
- US4 depends on US2 (path resolution is part of auto-complete).
- US5 depends on all prior stories (serializes full state).

### TDD Checkpoints (MANDATORY per Constitution)

| Gate | Requirement |
|------|-------------|
| ✅ Tests Written | All story tests exist in `QuestSystem.test.ts` |
| ✅ Tests FAILING | `vitest run` shows new tests RED |
| ✅ Implementation | Code written until tests GREEN |
| ✅ No Regressions | All prior tests still GREEN |
