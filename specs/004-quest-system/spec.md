# Feature Specification: Quest System

**Feature Branch**: `004-quest-system`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Build a quest system with states INACTIVE, ACTIVE, COMPLETED, FAILED. Quests have objectives (talk, collect, defeat, enter-zone). Support branching completion paths and quest prerequisites. Persist state."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Quest State Machine (Priority: P1)

As a player, I want quests to progress through clear states (inactive → active → completed/failed),
so that I always know the status of my quests and can track my progress.

**Why this priority**: The state machine is the core of the quest system. Objectives,
prerequisites, and persistence all depend on it.

**Independent Test**: Create a quest. Verify it starts INACTIVE. Activate it via
`QuestSystem.activate(questId)`. Verify state is ACTIVE. Call `QuestSystem.fail(questId)`.
Verify state is FAILED and cannot be changed further.

**Acceptance Scenarios**:

1. **Given** a newly registered quest, **Then** its state is `INACTIVE`.
2. **Given** an INACTIVE quest with no prerequisites, **When** `activate(questId)` is called,
   **Then** state becomes `ACTIVE` and `quest:activated` is emitted.
3. **Given** an ACTIVE quest where all required objectives are met, **Then** state becomes
   `COMPLETED` automatically and `quest:completed` is emitted.
4. **Given** an ACTIVE quest, **When** `fail(questId)` is called, **Then** state becomes
   `FAILED` and `quest:failed` is emitted.
5. **Given** a COMPLETED quest, **When** any state-change method is called, **Then** state
   remains COMPLETED (terminal state — no transitions out).
6. **Given** a FAILED quest, **When** any state-change method is called, **Then** state
   remains FAILED (terminal state — no transitions out).

---

### User Story 2 — Objectives & Progress Tracking (Priority: P1)

As a player, I want quest objectives to track my progress automatically (kill X enemies,
collect Y items, talk to NPC Z), so that I can see exactly how close I am to completion.

**Why this priority**: Without objectives, quests have no content. Objectives are inseparable
from the state machine for a functional quest system.

**Independent Test**: Create a quest with one objective: `DEFEAT_ENEMY { required: 3 }`.
Activate it. Call `progressObjective(questId, objectiveId, 2)`. Verify progress is 2/3.
Call `progressObjective(questId, objectiveId, 1)`. Verify quest auto-completes.

**Acceptance Scenarios**:

1. **Given** a quest with a `DEFEAT_ENEMY` objective (required: 3), **When** progress is
   reported twice (amounts 2 then 1), **Then** objective reaches 3/3 and quest auto-completes.
2. **Given** a quest with multiple objectives, **When** all required objectives reach their
   target, **Then** the quest completes.
3. **Given** a quest with an optional objective, **When** it is not completed but all
   required objectives are met, **Then** the quest still completes.
4. **Given** an objective update, **Then** `quest:progressed { questId, objectiveId, current, required }` is emitted.
5. **Given** objective types `TALK_TO_NPC`, `COLLECT_ITEM`, `DEFEAT_ENEMY`, `ENTER_ZONE`,
   **Then** all four types are supported and trackable with integer progress.

---

### User Story 3 — Quest Prerequisites (Priority: P2)

As a game designer, I want quests to have prerequisites that must be completed first, so
that story quests unlock in the correct narrative order.

**Why this priority**: Prerequisites enforce narrative order. Important for story design
but not needed for basic quest functionality.

**Independent Test**: Create quests A and B, where B requires A. Attempt to activate B.
Verify `Result.err('PREREQUISITES_NOT_MET')`. Complete A, then activate B — verify success.

**Acceptance Scenarios**:

1. **Given** quest B requires quest A to be COMPLETED, **When** B is activated while A is
   INACTIVE, **Then** `Result.err('PREREQUISITES_NOT_MET')` is returned.
2. **Given** quest A is ACTIVE (not yet COMPLETED), **When** quest B (requires A) is
   activated, **Then** `Result.err('PREREQUISITES_NOT_MET')` is returned.
3. **Given** quest A is COMPLETED, **When** quest B (requires A) is activated,
   **Then** activation succeeds and B becomes ACTIVE.
4. **Given** a quest with no prerequisites, **When** activated, **Then** it activates
   without checking any prerequisites.

---

### User Story 4 — Branching Completion Paths (Priority: P2)

As a game designer, I want quests to support multiple completion paths (e.g., spare the
villain vs defeat the villain), so that player choices lead to meaningfully different outcomes.

**Why this priority**: Branching is a design differentiator but not required for the core
quest loop.

**Independent Test**: Create a quest with two paths: `pathA` (requires objective OBJ-1)
and `pathB` (requires objective OBJ-2). Complete OBJ-1 only. Verify quest completes via
`pathId: 'pathA'`.

**Acceptance Scenarios**:

1. **Given** a quest with paths `'spare'` and `'defeat'`, each requiring different objectives,
   **When** only the `'spare'` objectives are met, **Then** the quest completes with
   `pathId: 'spare'` in the `quest:completed` event.
2. **Given** two completion paths, **When** objectives for both paths are completed,
   **Then** the first fully-satisfied path is selected (deterministic, not ambiguous).
3. **Given** a quest with paths, **Then** `quest:completed { questId, pathId }` always
   includes the resolved path identifier.

---

### User Story 5 — State Persistence (Priority: P3)

As a player, I want my quest progress to be saved and restored so that I can continue my
adventure after closing the game.

**Why this priority**: Persistence is necessary for shipping but does not affect the core
quest logic. Can be validated independently.

**Independent Test**: Activate a quest, advance objectives to 2/3. Call
`QuestSystem.serialize()`. Create a fresh `QuestSystem`. Call `deserialize(json)`. Verify
the quest is ACTIVE with progress 2/3 intact.

**Acceptance Scenarios**:

1. **Given** a QuestSystem with several quests in various states, **When** `serialize()` is
   called, **Then** a valid JSON string is returned.
2. **Given** a serialized QuestSystem, **When** `deserialize(json)` is called on a fresh
   instance, **Then** all quest states, objective progress, and active paths are restored exactly.
3. **Given** a corrupted JSON string, **When** `deserialize(json)` is called,
   **Then** `Result.err` is returned without throwing.

---

### Edge Cases

- Activating a quest with no prerequisites → immediate success.
- Quest with 0 objectives → completes immediately upon activation.
- Progressing an objective on a COMPLETED or FAILED quest → no-op, no event.
- Multiple prerequisites: all must be COMPLETED before the quest can activate.
- Optional objectives tracked but never block completion.
- Two paths both satisfied simultaneously → first path in definition order wins.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Quest MUST start in `INACTIVE` state upon registration.
- **FR-002**: `INACTIVE → ACTIVE` transition MUST occur via `QuestSystem.activate(questId)`.
- **FR-003**: `ACTIVE → COMPLETED` MUST occur automatically when all required objectives reach their target count.
- **FR-004**: `ACTIVE → FAILED` MUST occur via `QuestSystem.fail(questId)`.
- **FR-005**: `COMPLETED` and `FAILED` MUST be terminal — no further state transitions allowed.
- **FR-006**: Objective types supported: `TALK_TO_NPC`, `COLLECT_ITEM`, `DEFEAT_ENEMY`, `ENTER_ZONE`.
- **FR-007**: Each objective MUST track `{ current: number, required: number }` progress.
- **FR-008**: Quest MUST complete when ALL non-optional objectives reach their required count.
- **FR-009**: Optional objectives MUST be tracked but MUST NOT block completion.
- **FR-010**: Quests with prerequisites MUST NOT activate until all prerequisite quests are `COMPLETED`.
- **FR-011**: Attempting to activate a locked quest MUST return `Result.err('PREREQUISITES_NOT_MET')`.
- **FR-012**: Quests MAY define multiple completion paths; each path specifies which objectives qualify it.
- **FR-013**: Completing via a path MUST record the `pathId` in the completion event.
- **FR-014**: System MUST emit `quest:activated { questId }`.
- **FR-015**: System MUST emit `quest:progressed { questId, objectiveId, current, required }`.
- **FR-016**: System MUST emit `quest:completed { questId, pathId }`.
- **FR-017**: System MUST emit `quest:failed { questId }`.
- **FR-018**: `QuestSystem.serialize()` MUST return a JSON string of complete quest state.
- **FR-019**: `QuestSystem.deserialize(json)` MUST restore exact state and return `Result<void, Error>`.

### Key Entities

- **Quest**: Defined by: id, title, objectives, prerequisites (questId[]), paths (optional).
- **Objective**: id, type, required count, optional flag, current progress.
- **QuestPath**: id, list of objective ids that qualify this path as complete.
- **QuestState**: Runtime state for one quest: current state enum, objective progress map, resolved pathId.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All state-machine transitions are verified by automated unit tests with no browser required.
- **SC-002**: All four objective types (`TALK_TO_NPC`, `COLLECT_ITEM`, `DEFEAT_ENEMY`, `ENTER_ZONE`) are covered by tests.
- **SC-003**: Serialize/deserialize round-trip is exact across 50 quests with mixed states.
- **SC-004**: All four event types emitted in the correct order for every transition tested.
- **SC-005**: Zero exceptions thrown from any valid quest operation — all errors returned as `Result.err`.

## Assumptions

- Quest definitions are loaded from JSON at game startup; the QuestSystem does not manage quest data loading.
- Quest rewards (items, XP) are handled by the calling scene/event layer, not the QuestSystem.
- All objectives use integer progress; fractional progress is not supported.
- The QuestSystem is pure logic — no Excalibur or DOM dependencies.
- Path resolution is deterministic (first fully-satisfied path in definition order); no user-driven path selection at runtime.
