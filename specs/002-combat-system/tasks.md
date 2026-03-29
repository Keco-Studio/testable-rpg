---
description: "Task list for Combat System implementation"
---

# Tasks: Combat System

**Input**: Design documents from `/specs/002-combat-system/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Included — TDD is MANDATORY per project constitution.
**Organization**: Tasks organized by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US4 maps to spec.md user stories
- Include exact file paths in all descriptions

---

## Phase 1: Setup

**Purpose**: Create directory structure and file stubs.

- [ ] T001 Create directories `src/engine/combat/` and `src/engine/combat/__tests__/`
- [ ] T002 [P] Create empty stub `src/engine/combat/CombatTypes.ts`
- [ ] T003 [P] Create empty stub `src/engine/combat/CombatSystem.ts`
- [ ] T004 [P] Create empty stub `src/engine/combat/StatusEffects.ts`
- [ ] T005 [P] Create empty test file `src/engine/combat/__tests__/CombatSystem.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: All shared interfaces consumed by every user story.

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Define `CombatActor` interface (id, name, side, stats, statusEffects) in `src/engine/combat/CombatTypes.ts`
- [ ] T007 [P] Define `StatusEffect` type (type: 'poison'|'stun'|'burn', duration) in `src/engine/combat/CombatTypes.ts`
- [ ] T008 [P] Define `TurnRecord` interface (actorId, action, targetId?, damage?, isCritical?, statusApplied?) in `src/engine/combat/CombatTypes.ts`
- [ ] T009 [P] Define `BattleResult` interface (winner, turns, survivingActors) in `src/engine/combat/CombatTypes.ts`
- [ ] T010 [P] Define `CombatConfig` interface (optional overrides for crit chance etc.) in `src/engine/combat/CombatTypes.ts`

**Checkpoint**: All types defined — user story implementation can now begin.

---

## Phase 3: User Story 1 — Basic Turn-Based Combat (Priority: P1) 🎯 MVP

**Goal**: `CombatSystem.resolve(actors, rng)` returns a valid `BattleResult` with correct damage.

**Independent Test**: Player (atk 10, def 3, spd 8) vs enemy (atk 6, def 3, spd 5). Resolve. Verify player damage = max(1,10-3)=7, enemy damage = max(1,6-3)=3, result.winner set correctly.

### Tests for User Story 1 ⚠️ Write FIRST — confirm FAIL before implementation

> **TDD GATE: Tests written → FAILING confirmed → then implement**

- [ ] T011 [P] [US1] Write test: `damage = max(1, attack - defense)` for normal case in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T012 [P] [US1] Write test: `damage = 1` when defense >= attack in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T013 [P] [US1] Write test: resolve() with 1v1 actors returns valid BattleResult in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T014 [P] [US1] Write test: resolve() with 4v8 actors returns valid BattleResult in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T015 [P] [US1] Write test: all enemies die → winner = 'player' in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T016 [P] [US1] Write test: all players die → winner = 'enemy' in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T017 [P] [US1] Write test: resolve() does NOT mutate input actor objects in `src/engine/combat/__tests__/CombatSystem.test.ts`

### Implementation for User Story 1

- [ ] T018 [US1] Implement `calcDamage(attacker, defender, rng): { damage, isCritical }` pure function in `src/engine/combat/CombatSystem.ts` (depends on T011–T017 FAILING)
- [ ] T019 [US1] Implement `CombatSystem.resolve(actors, rng, config?)` battle loop skeleton (no turn order yet — process in input order) in `src/engine/combat/CombatSystem.ts`
- [ ] T020 [US1] Implement `BattleResult` assembly (winner determination, survivingActors, turns log) in `src/engine/combat/CombatSystem.ts`

**Checkpoint**: User Story 1 complete — T011–T017 must be GREEN.

---

## Phase 4: User Story 2 — Turn Order by Speed (Priority: P1)

**Goal**: Actors act in descending speed order; RNG breaks ties; dead actors removed immediately.

**Independent Test**: 3 actors with speeds [10, 5, 1]. Resolve one round. Verify TurnRecord order matches speed descending.

### Tests for User Story 2 ⚠️ Write FIRST — confirm FAIL

- [ ] T021 [P] [US2] Write test: higher speed actor takes turn before lower speed in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T022 [P] [US2] Write test: equal speed tie broken deterministically by `rng.stream('combat')` with seed 42 in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T023 [P] [US2] Write test: actor with speed 0 still takes a turn (last) in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T024 [P] [US2] Write test: actor dying mid-round is removed from turn queue immediately in `src/engine/combat/__tests__/CombatSystem.test.ts`

### Implementation for User Story 2

- [ ] T025 [US2] Implement `sortBySpeed(actors: CombatActor[], rng: SeededRNG): CombatActor[]` pure function in `src/engine/combat/CombatSystem.ts` (depends on T021–T024 FAILING)
- [ ] T026 [US2] Wire `sortBySpeed` into `CombatSystem.resolve()` to replace input-order processing in `src/engine/combat/CombatSystem.ts`
- [ ] T027 [US2] Implement dead-actor removal from queue immediately on death within the battle loop in `src/engine/combat/CombatSystem.ts`

**Checkpoint**: User Story 2 complete — T021–T024 must be GREEN.

---

## Phase 5: User Story 3 — Status Effects (Priority: P2)

**Goal**: Poison/stun/burn tick correctly; same-type effects refresh duration (no stack).

**Independent Test**: Actor (maxHP 100) + poison (duration 3). Advance 3 turns. Verify 10 damage × 3 turns = 30 total. Effect expires after turn 3.

### Tests for User Story 3 ⚠️ Write FIRST — confirm FAIL

- [ ] T028 [P] [US3] Write test: poison deals 10% maxHP per turn for N turns in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T029 [P] [US3] Write test: stun skips actor's turn for N turns in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T030 [P] [US3] Write test: burn deals 5 flat damage per turn for N turns in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T031 [P] [US3] Write test: applying same effect type refreshes duration, does not stack in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T032 [P] [US3] Write test: poison on 1 HP actor kills it (ActorDied-level check via survivingActors) in `src/engine/combat/__tests__/CombatSystem.test.ts`

### Implementation for User Story 3

- [ ] T033 [US3] Implement `tickStatus(actor: CombatActor): { updatedActor: CombatActor, events: StatusEvent[] }` pure function in `src/engine/combat/StatusEffects.ts` (depends on T028–T032 FAILING)
- [ ] T034 [US3] Implement same-type effect refresh logic in `StatusEffects.ts` (replaces duration, does not push new entry)
- [ ] T035 [US3] Wire `tickStatus` into battle loop at start of each actor's turn in `src/engine/combat/CombatSystem.ts`

**Checkpoint**: User Story 3 complete — T028–T032 must be GREEN.

---

## Phase 6: User Story 4 — Combat Events (Priority: P2)

**Goal**: All 4 event types emitted correctly for UI consumption.

**Independent Test**: Subscribe to all events. Run 1v1 combat. Verify at least one `combat:damage`, one `combat:actorDied`, and exactly one `combat:battleEnded` are emitted.

### Tests for User Story 4 ⚠️ Write FIRST — confirm FAIL

- [ ] T036 [P] [US4] Write test: `combat:damage` emitted with `{attackerId, defenderId, damage, isCritical}` in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T037 [P] [US4] Write test: `combat:statusApplied` emitted with `{actorId, effect, duration}` in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T038 [P] [US4] Write test: `combat:actorDied` emitted with `{actorId}` on death in `src/engine/combat/__tests__/CombatSystem.test.ts`
- [ ] T039 [P] [US4] Write test: `combat:battleEnded` emitted exactly once with `{winningSide}` in `src/engine/combat/__tests__/CombatSystem.test.ts`

### Implementation for User Story 4

- [ ] T040 [US4] Add `EventEmitter` to `CombatSystem`; emit `combat:damage` on each hit in `src/engine/combat/CombatSystem.ts` (depends on T036–T039 FAILING)
- [ ] T041 [US4] Emit `combat:statusApplied` from `tickStatus` event flow in `src/engine/combat/CombatSystem.ts`
- [ ] T042 [US4] Emit `combat:actorDied` when actor HP ≤ 0 in `src/engine/combat/CombatSystem.ts`
- [ ] T043 [US4] Emit `combat:battleEnded` exactly once when all actors on one side are dead in `src/engine/combat/CombatSystem.ts`
- [ ] T044 [US4] Freeze/seal `BattleResult` before returning to enforce immutability in `src/engine/combat/CombatSystem.ts`

**Checkpoint**: All user stories complete — T036–T039 must be GREEN.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Add export statements and barrel in `src/engine/combat/CombatSystem.ts`
- [ ] T046 [P] Grep `src/engine/combat/` for `Math.random` — must be zero occurrences
- [ ] T047 Performance test: resolve() with 4v8 actors completes in < 5ms (add to `src/engine/combat/__tests__/CombatSystem.test.ts`)
- [ ] T048 [P] Write test: critical hit deals exactly 2× damage when `isCritical = true` in `src/engine/combat/__tests__/CombatSystem.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1.
- **US1 (Phase 3)**: Depends on Phase 2. Tests FAIL first, then implement.
- **US2 (Phase 4)**: Depends on Phase 3 (adds turn order to existing resolve()).
- **US3 (Phase 5)**: Depends on Phase 3 (adds status to battle loop). Can parallel with US2.
- **US4 (Phase 6)**: Depends on Phase 3+5 (events wrap existing loop). Can parallel with US3.
- **Polish (Phase 7)**: Depends on all complete.

### TDD Checkpoints (MANDATORY per Constitution)

| Gate | Requirement |
|------|-------------|
| ✅ Tests Written | All story tests exist in `CombatSystem.test.ts` |
| ✅ Tests FAILING | `vitest run` shows new tests RED |
| ✅ Implementation | Code written until tests GREEN |
| ✅ No Regressions | All prior tests still GREEN |

---

## Notes

- `SeededRNG` (spec 001) must be available before this feature can be implemented — use a mock/stub if 001 is not yet merged.
- No Excalibur imports in `CombatSystem.ts` or `CombatTypes.ts`; actors are plain interfaces.
- `BattleResult` must be immutable — use `Object.freeze()` or TypeScript `Readonly<>`.
- All status effect ticking is pure — `tickStatus` takes an actor, returns a new actor (no mutation).
