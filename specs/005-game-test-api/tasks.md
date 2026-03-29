---
description: "Task list for GameTestAPI (window.__game) implementation"
---

# Tasks: GameTestAPI (window.__game)

**Input**: Design documents from `/specs/005-game-test-api/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Included — TDD is MANDATORY per project constitution.
**Organization**: Tasks organized by user story for independent implementation and testing.

---

## Phase 1: Setup

- [ ] T001 Create directories `src/testing/` and `src/testing/__tests__/`
- [ ] T002 [P] Create stub `src/testing/GameTestAPI.ts`
- [ ] T003 [P] Create stub `src/testing/ScenarioRunner.ts`
- [ ] T004 [P] Create stub `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T005 [P] Create directory `tests/e2e/`

---

## Phase 2: Foundational (Blocking Prerequisites)

⚠️ **CRITICAL**: Must complete before any user story implementation.

- [ ] T006 Define `GameTestAPI` interface (all read + control method signatures) in `src/testing/GameTestAPI.ts`
- [ ] T007 [P] Define `ActorSnapshot` interface (`{ id, name, pos, vel, hp }`) in `src/testing/GameTestAPI.ts`
- [ ] T008 [P] Define `TestScenario` interface (steps array) and `ScenarioResult` (`{ passed, log }`) in `src/testing/GameTestAPI.ts`
- [ ] T009 [P] Define step types for `TestScenario` (teleport, setHP, addItem, stepFrames, assert, etc.) in `src/testing/GameTestAPI.ts`

**Checkpoint**: Types defined — user story work can begin.

---

## Phase 3: User Story 1 — Game State Inspection (Priority: P1) 🎯 MVP

**Goal**: `window.__game` defined in dev builds; all read methods return correct data.

**Independent Test**: Start game with `MODE='test'`. Verify `window.__game !== undefined`. Call `getScene()`, verify non-empty string. Call `getActors()`, verify array.

### Tests for User Story 1 ⚠️ Write FIRST — confirm FAIL

- [ ] T010 [P] [US1] Write test: `window.__game` defined when MODE is not 'production' in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T011 [P] [US1] Write test: `window.__game` is undefined when MODE is 'production' in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T012 [P] [US1] Write test: `getScene()` returns current scene name string in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T013 [P] [US1] Write test: `getActors()` returns array of `ActorSnapshot` objects in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T014 [P] [US1] Write test: `getPlayer()` returns full serialized player state in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T015 [P] [US1] Write test: `getInventory()` returns array of inventory items in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T016 [P] [US1] Write test: `getQuestState()` returns questId→QuestState map in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T017 [P] [US1] Write test: `getDialogState()` returns null when no dialog is active in `src/testing/__tests__/GameTestAPI.test.ts`

### Implementation for User Story 1

- [ ] T018 [US1] Implement `GameTestAPI` class holding references to engine, player, inventory, quest, RNG in `src/testing/GameTestAPI.ts` (depends on T010–T017 FAILING)
- [ ] T019 [US1] Implement all read methods: `getScene()`, `getActors()`, `getPlayer()`, `getInventory()`, `getQuestState()`, `getDialogState()` in `src/testing/GameTestAPI.ts`
- [ ] T020 [US1] Implement conditional `window.__game` assignment guarded by `import.meta.env.MODE !== 'production'` in `src/testing/GameTestAPI.ts`

**Checkpoint**: User Story 1 complete — T010–T017 must be GREEN.

---

## Phase 4: User Story 2 — Game State Control (Priority: P1)

**Goal**: All control methods (`teleport`, `setHP`, `addItem`, etc.) produce correct state changes.

**Independent Test**: After engine start, call `teleport(100, 200)`. Verify `getPlayer().pos = {x:100,y:200}`. Call `setHP(0)`. Verify `getPlayer().hp = 0` and death triggered.

### Tests for User Story 2 ⚠️ Write FIRST — confirm FAIL

- [ ] T021 [P] [US2] Write test: `teleport(x, y)` sets player position immediately in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T022 [P] [US2] Write test: `setHP(0)` sets player HP to 0 and triggers death logic in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T023 [P] [US2] Write test: `setHP(value > maxHP)` clamps to maxHP in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T024 [P] [US2] Write test: `addItem('item-id', 3)` adds 3 items to player inventory in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T025 [P] [US2] Write test: `triggerQuest('quest-id')` activates the specified quest in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T026 [P] [US2] Write test: `setSeed(42)` reseeds the global RNG in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T027 [P] [US2] Write test: `stepFrames(10)` advances TestClock by 160ms in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T028 [P] [US2] Write test: `changeScene('TownScene')` triggers scene transition in `src/testing/__tests__/GameTestAPI.test.ts`

### Implementation for User Story 2

- [ ] T029 [US2] Implement `teleport(x, y)` setting player actor position in `src/testing/GameTestAPI.ts` (depends on T021–T028 FAILING)
- [ ] T030 [US2] Implement `setHP(value)` with maxHP clamp and death trigger in `src/testing/GameTestAPI.ts`
- [ ] T031 [US2] Implement `addItem(itemId, quantity?)` delegating to InventorySystem in `src/testing/GameTestAPI.ts`
- [ ] T032 [US2] Implement `triggerQuest(questId)` delegating to QuestSystem.activate() in `src/testing/GameTestAPI.ts`
- [ ] T033 [US2] Implement `setSeed(n)` calling rng.deserialize or re-constructing RNG with new seed in `src/testing/GameTestAPI.ts`
- [ ] T034 [US2] Implement `stepFrames(n)` calling `testClock.advance(n * 16)` in `src/testing/GameTestAPI.ts`
- [ ] T035 [US2] Implement `changeScene(name)` triggering engine scene transition in `src/testing/GameTestAPI.ts`

**Checkpoint**: User Story 2 complete — T021–T028 must be GREEN.

---

## Phase 5: User Story 3 — Scenario Runner (Priority: P2)

**Goal**: `runScenario(scenario)` executes declarative steps and returns `{ passed, log }` — never throws.

**Independent Test**: Scenario: `[{ type:'setSeed', seed:42 }, { type:'addItem', itemId:'sword' }, { type:'assert', fn: ()=> getPlayer().hp > 0 }]`. Verify resolves `{ passed: true }`.

### Tests for User Story 3 ⚠️ Write FIRST — confirm FAIL

- [ ] T036 [P] [US3] Write test: `runScenario` with valid steps resolves `{ passed: true, log }` in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T037 [P] [US3] Write test: failing assertion step resolves `{ passed: false, log }` without throwing in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T038 [P] [US3] Write test: `stepFrames` step inside scenario advances TestClock correctly in `src/testing/__tests__/GameTestAPI.test.ts`
- [ ] T039 [P] [US3] Write test: invalid step type is logged as error, `passed: false` returned in `src/testing/__tests__/GameTestAPI.test.ts`

### Implementation for User Story 3

- [ ] T040 [US3] Implement `ScenarioRunner.run(scenario, api): Promise<ScenarioResult>` in `src/testing/ScenarioRunner.ts` (depends on T036–T039 FAILING)
- [ ] T041 [US3] Implement sequential step dispatch with try/catch per step; capture errors in log in `src/testing/ScenarioRunner.ts`
- [ ] T042 [US3] Expose `runScenario(scenario)` on `GameTestAPI` delegating to `ScenarioRunner.run()` in `src/testing/GameTestAPI.ts`

**Checkpoint**: User Story 3 complete — T036–T039 must be GREEN.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Add `window.__game` type declaration to global `window` interface in `src/testing/GameTestAPI.ts` or a `.d.ts` file
- [ ] T044 Performance: 20-step scenario completes < 500ms (add to test file)
- [ ] T045 [P] Write E2E smoke test: Playwright test verifying `window.__game !== undefined` in browser build in `tests/e2e/game-test-api.spec.ts`
- [ ] T046 [P] Verify tree-shaking: confirm `GameTestAPI` module not present in production bundle (manual check or bundle analysis script)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → US1 (P1) → US2 (P1) → US3 (P2) → Polish**
- US1 (read) and US2 (control) are both P1; US2 depends on US1 API structure.
- US3 depends on US2 (scenario runner calls control methods).
- Depends on: SeededRNG (001), InventorySystem (003), QuestSystem (004).

### TDD Checkpoints (MANDATORY per Constitution)

| Gate | Requirement |
|------|-------------|
| ✅ Tests Written | All story tests exist in `GameTestAPI.test.ts` |
| ✅ Tests FAILING | `vitest run` shows new tests RED |
| ✅ Implementation | Code written until tests GREEN |
| ✅ No Regressions | All prior tests still GREEN |
