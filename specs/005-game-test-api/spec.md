# Feature Specification: GameTestAPI (window.__game)

**Feature Branch**: `005-game-test-api`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Build a test API surface that exposes full game state and control via window.__game in non-production builds. It must allow AI agents and Playwright tests to read state, manipulate actors, trigger events, step frames, and seed randomness — without any DOM dependency."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Game State Inspection (Priority: P1)

As a test author (human or AI agent), I want to read the full game state (current scene,
actors, player stats, inventory, quests, dialog) via a stable API, so that I can write
assertions against game state without coupling to internal implementation details.

**Why this priority**: Read-only state inspection is the foundation of all test scenarios.
Control operations are useless without the ability to observe state.

**Independent Test**: Start the game in a test build (`MODE !== 'production'`). Verify
`window.__game` is defined. Call `window.__game.getScene()` and confirm it returns a
non-empty string. Call `getActors()` and confirm the result is an array.

**Acceptance Scenarios**:

1. **Given** a non-production build after `engine.start()` resolves, **Then**
   `window.__game` is defined and non-null.
2. **Given** a production build, **Then** `window.__game` is `undefined`.
3. **Given** the game is running, **When** `getScene()` is called, **Then** the current
   scene's constructor name is returned as a string.
4. **Given** the game is running, **When** `getActors()` is called, **Then** an array of
   `{ id, name, pos, vel, hp }` objects is returned.
5. **Given** the game is running, **When** `getPlayer()` is called, **Then** the full
   serialized player state is returned.
6. **Given** the game is running, **When** `getInventory()` is called, **Then** an array
   of current inventory items is returned.
7. **Given** the game is running, **When** `getQuestState()` is called, **Then** a map of
   `questId → QuestState` is returned.
8. **Given** no dialog is active, **When** `getDialogState()` is called, **Then** `null`
   is returned.

---

### User Story 2 — Game State Control (Priority: P1)

As a test author, I want to manipulate game state programmatically (teleport player, set HP,
add items, trigger quests, reseed RNG, step frames), so that I can set up specific test
scenarios without playing through the game manually.

**Why this priority**: Without control operations, tests can only observe. Setting up test
scenarios requires the ability to drive the game to a specific state.

**Independent Test**: After engine start, call `window.__game.teleport(100, 200)`. Verify
`getPlayer().pos` equals `{ x: 100, y: 200 }`. Call `setHP(0)`. Verify `getPlayer().hp`
is 0 and the death event fires. Call `addItem('health-potion', 3)`. Verify `getInventory()`
contains 3 health potions.

**Acceptance Scenarios**:

1. **Given** the game is running, **When** `teleport(x, y)` is called, **Then** the player
   position is set immediately to `(x, y)`.
2. **Given** the game is running, **When** `setHP(0)` is called, **Then** player HP becomes
   0 and the death trigger fires.
3. **Given** the game is running, **When** `addItem('item-id', quantity)` is called,
   **Then** the item is added to the player's inventory.
4. **Given** the game is running, **When** `triggerQuest('quest-id')` is called,
   **Then** the quest becomes ACTIVE.
5. **Given** the game is running, **When** `setSeed(42)` is called, **Then** the global RNG
   is reseeded to 42 and subsequent random calls are deterministic from that point.
6. **Given** the game is running with a TestClock, **When** `stepFrames(10)` is called,
   **Then** the clock advances by 10 × 16ms = 160ms.
7. **Given** the game is running, **When** `changeScene('TownScene')` is called, **Then**
   the game transitions to the named scene.

---

### User Story 3 — Scenario Runner (Priority: P2)

As an AI test agent or CI pipeline, I want to execute declarative test scenarios defined
as JSON objects, so that complex multi-step game flows can be automated without writing
imperative test code.

**Why this priority**: The scenario runner enables AI-driven exploratory testing and
high-level smoke tests. It builds on control operations but provides a higher-level
abstraction.

**Independent Test**: Pass a scenario with steps: `setSeed(42)`, `addItem('sword')`,
`teleport(50, 50)`, `assert getPlayer().pos.x === 50`. Verify `runScenario` resolves with
`{ passed: true, log: [...] }`.

**Acceptance Scenarios**:

1. **Given** a valid scenario object, **When** `runScenario(scenario)` is called, **Then**
   it executes each step sequentially and resolves with `{ passed: boolean, log: string[] }`.
2. **Given** a scenario where an assertion fails, **When** `runScenario` runs, **Then** it
   resolves with `{ passed: false, log: [...] }` (does not throw).
3. **Given** a scenario with a `stepFrames` step, **When** it runs, **Then** the TestClock
   advances by the specified amount before continuing.
4. **Given** a scenario with invalid step data, **When** it runs, **Then** the step is
   logged as an error and `passed: false` is returned.

---

### Edge Cases

- `window.__game` accessed before `engine.start()` resolves → `undefined` or throws a clear error.
- `teleport` with coordinates outside map bounds → behavior delegated to scene (not an API-level error).
- `addItem` with unknown item ID → `Result.err` returned, logged in scenario runner.
- `stepFrames(0)` → no-op.
- `setHP(value)` with value > maxHP → clamped to maxHP.
- `changeScene` with unknown scene name → `Result.err` returned.
- Production build: any attempt to access `window.__game` returns `undefined`; no bundle footprint.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `window.__game` MUST be defined after `engine.start()` resolves when `MODE !== 'production'`.
- **FR-002**: `window.__game` MUST be `undefined` in production builds.
- **FR-003**: `getScene()` MUST return the current scene's constructor name as a string.
- **FR-004**: `getActors()` MUST return `Array<{ id: string, name: string, pos: Vector, vel: Vector, hp: number }>`.
- **FR-005**: `getPlayer()` MUST return the full serialized player state.
- **FR-006**: `getInventory()` MUST return the current player inventory item array.
- **FR-007**: `getQuestState()` MUST return a map of `questId → QuestState`.
- **FR-008**: `getDialogState()` MUST return the current dialog node or `null`.
- **FR-009**: `teleport(x, y)` MUST set the player's position immediately.
- **FR-010**: `setHP(value)` MUST set the player's HP and trigger death logic if value ≤ 0.
- **FR-011**: `addItem(itemId, quantity?)` MUST add the item to the player inventory.
- **FR-012**: `triggerQuest(questId)` MUST activate the specified quest.
- **FR-013**: `setSeed(n)` MUST reseed the global RNG instance.
- **FR-014**: `stepFrames(n)` MUST advance the `TestClock` by `n × 16ms`.
- **FR-015**: `changeScene(sceneName)` MUST trigger a scene transition to the named scene.
- **FR-016**: `runScenario(scenario)` MUST execute steps sequentially and return `Promise<{ passed: boolean, log: string[] }>`.
- **FR-017**: `runScenario` MUST NOT throw — errors are captured in the log and `passed: false`.
- **FR-018**: The entire `GameTestAPI` module MUST be tree-shaken out of production builds.

### Key Entities

- **GameTestAPI**: The object assigned to `window.__game`. Exposes all read and control methods.
- **TestScenario**: Declarative JSON object describing a sequence of game actions and assertions.
- **ScenarioResult**: `{ passed: boolean, log: string[] }` — outcome of a scenario run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All state-reading methods return valid data in a test build, verified by Vitest unit tests.
- **SC-002**: All control methods produce observable state changes, verified by unit tests.
- **SC-003**: A 20-step scenario executes correctly and resolves in under 500ms (excluding TestClock steps).
- **SC-004**: `window.__game` is absent (undefined) in a production build — verified by bundle analysis.
- **SC-005**: `runScenario` never throws for any input — all errors are captured in the result log.

## Assumptions

- `window.__game` is initialized by a `GameTestAPI` module imported conditionally based on `import.meta.env.MODE`.
- The `TestClock` from Excalibur is used in all test builds — never real `requestAnimationFrame`.
- `addItem` quantity defaults to 1 if omitted.
- `setHP` with a value above maxHP is silently clamped to maxHP.
- The API is not thread-safe; tests are assumed to run sequentially in a single context.
- Playwright tests access `window.__game` via `page.evaluate()` — no additional bridge needed.
