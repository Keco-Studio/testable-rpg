# Spec Kit Setup: Excalibur RPG Maker

---

## STEP 0 — Install & Initialize

```bash
# Install spec-kit CLI
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Verify
specify --version

# Initialize project with Claude Code
specify init excalibur-rpg-maker --ai claude

cd excalibur-rpg-maker
```

This scaffolds the following structure:

```
excalibur-rpg-maker/
├── .claude/
│   └── commands/
│       ├── specify.md       ← /specify command prompt
│       ├── plan.md          ← /plan command prompt
│       ├── tasks.md         ← /tasks command prompt
│       ├── implement.md     ← /implement command prompt
│       └── analyze.md       ← /analyze quality gate
├── .spec-kit/
│   └── constitution.md      ← YOU WRITE THIS (source of truth)
├── specs/                   ← generated feature specs
├── plans/                   ← generated technical plans
├── tasks/                   ← generated task breakdowns
└── src/                     ← game source code
```

---

## STEP 1 — constitution.md

**Path:** `.spec-kit/constitution.md`

This is the most important file. Every AI agent reads this before doing anything.

```markdown
# RPG Maker — Project Constitution

## Vision
A multiplayer web-based RPG maker that lets users create, share, and play
2D RPGs in the browser. Built on Excalibur.js with TypeScript. The tool
provides a map editor, character creator, quest builder, dialog editor,
and a runtime engine that plays the created games.

## Core Principles
- The spec is the source of truth. Code serves the spec, not the other way around.
- No implementation code before tests exist and are confirmed FAILING.
- Every game system must be independently testable without a running browser.
- Determinism is mandatory: all randomness must be seedable for reproducibility.

---

## Tech Stack

### Runtime
- Engine:      Excalibur.js ^0.30.0
- Language:    TypeScript ^5.4
- Bundler:     Vite ^5.0
- Framework:   None (vanilla TS, no React in game runtime)

### Editor UI (RPG Maker tool itself)
- Framework:   React 19 + TypeScript
- State:       Zustand
- Styling:     Tailwind CSS v4

### Multiplayer
- Transport:   WebSockets (ws library server-side)
- Sync:        Delta-state CRDT (Yjs)

---

## Testing Stack (NON-NEGOTIABLE)

| Layer              | Tool                        | What It Tests                              |
|--------------------|-----------------------------|--------------------------------------------|
| Unit               | Vitest ^1.6                 | Game logic: combat, inventory, quests, RNG |
| Canvas / Actor     | excalibur-jasmine ^2.0      | Actor position, physics, visual snapshots  |
| Integration        | @excaliburjs/testing ^1.0   | Scene transitions, full game flows         |
| E2E / AI Explorer  | Playwright ^1.44            | Editor UI, multiplayer flows               |

### Testing Rules
1. All unit tests run in Vitest with jsdom — no real browser required.
2. `ex.Engine` MUST use `new ex.TestClock()` in all tests — never real rAF.
3. `window.__game` API MUST be exposed in `MODE !== 'production'` builds.
4. All RNG must accept `seed: number` — tests always run with `seed: 42`.
5. Visual snapshot tolerance: `0.99` (99% pixel match required).
6. Tests in `src/**/__tests__/` for units, `tests/` for integration/E2E.

### TDD Gate (ENFORCED BY /implement COMMAND)
- Step 1: Write tests → user reviews → user approves
- Step 2: Confirm tests FAIL (Red phase) — screenshot or log required
- Step 3: Write implementation → tests pass (Green phase)
- Step 4: Refactor → tests still Green
- VIOLATION: Writing implementation before approved failing tests = BLOCKED

---

## Game Systems (Source of Truth)

### 1. CombatSystem
- Turn-based, not real-time
- Formula: `damage = max(1, attacker.stats.attack - defender.stats.defense)`
- Status effects: poison, stun, burn (each with duration in turns)
- Death: actor HP <= 0 triggers `ActorDiedEvent`, scene handles game-over logic

### 2. InventorySystem
- Max slots: configurable per actor (default: 24)
- Item stacking: stackable items have `maxStack: number` property
- Weight: optional, disabled by default in new games
- Equip slots: head, body, weapon, offhand, accessory (x2)

### 3. QuestSystem
- Quest states: INACTIVE → ACTIVE → COMPLETED → FAILED
- Trigger types: talk-to-npc, enter-zone, collect-item, defeat-enemy
- Branching: quests can have multiple completion paths
- Prerequisites: quests can require other quests COMPLETED

### 4. DialogSystem
- Tree-based dialog with nodes and choices
- Condition nodes: check quest state, inventory, player stats
- Action nodes: give item, trigger quest, change scene variable
- Portrait support: actor portrait shown during dialog

### 5. SceneSystem
- Scene types: WorldMap, Town, Dungeon, Battle, Cutscene
- Transition types: fade, slide, instant
- Persistence: scene state saved to localStorage keyed by scene ID

### 6. MapEditor (RPG Maker tool)
- Tile-based: 16x16 px tiles, maps up to 256x256 tiles
- Layers: ground, decoration, collision, events
- Export: JSON format consumed by SceneSystem at runtime

---

## Project Structure

```
src/
├── engine/
│   ├── combat/
│   │   ├── CombatSystem.ts
│   │   └── __tests__/CombatSystem.test.ts
│   ├── inventory/
│   │   ├── InventorySystem.ts
│   │   └── __tests__/InventorySystem.test.ts
│   ├── quest/
│   │   ├── QuestSystem.ts
│   │   └── __tests__/QuestSystem.test.ts
│   ├── dialog/
│   │   ├── DialogSystem.ts
│   │   └── __tests__/DialogSystem.test.ts
│   └── rng/
│       ├── SeededRNG.ts
│       └── __tests__/SeededRNG.test.ts
├── actors/
│   ├── Player.ts
│   ├── Enemy.ts
│   └── NPC.ts
├── scenes/
│   ├── WorldMapScene.ts
│   ├── TownScene.ts
│   ├── DungeonScene.ts
│   └── BattleScene.ts
├── testing/
│   ├── GameTestAPI.ts       ← window.__game surface
│   └── ScenarioRunner.ts    ← JSON scenario executor
├── editor/                  ← React RPG Maker UI
│   ├── MapEditor/
│   ├── QuestEditor/
│   └── DialogEditor/
tests/
├── integration/             ← @excaliburjs/testing
├── visual/                  ← excalibur-jasmine snapshots
├── e2e/                     ← Playwright editor tests
└── ai-explorer/             ← AI agent test scripts
```

---

## Coding Constraints

### Complexity Gates
- Maximum 3 top-level modules for initial implementation
- Additional modules require documented justification in the spec
- No abstraction layers without written rationale

### Framework Trust
- Use Excalibur features directly — do not wrap them
- Do not re-implement what Excalibur already provides (physics, input, scenes)

### Error Handling
- All async operations must have explicit error boundaries
- Game systems must not throw — return Result<T, Error> types

### Performance
- Target: 60fps on mid-range hardware (2020 laptop)
- No allocations in hot path (update loop) — object pooling required
- Bundle size cap: 500KB gzipped for game runtime

---

## Multiplayer Constraints
- Server authoritative for combat resolution
- Client-side prediction for movement only
- All server messages versioned with schema version
- Desync detection: hash game state every 60 frames, compare with server
```

---

## STEP 2 — /specify Commands

Run these in Claude Code one at a time. Each generates a `specs/00N-feature-name.md` file.

---

### Feature 001: Seeded RNG

```
/specify
Build a seeded random number generator for the RPG engine.
It must produce deterministic sequences given the same seed,
support multiple named streams (combat, loot, world-gen),
and be injectable into all game systems so tests can control randomness.
```

**Generated output → `specs/001-seeded-rng.md`:**

```markdown
# Spec 001: Seeded RNG

## User Story
As a game developer, I want all randomness in the game to be
deterministic when given a seed, so that gameplay can be reproduced
exactly for testing, replays, and bug reports.

## Acceptance Criteria
- [ ] AC-01: Given seed 42, `rng.next()` always returns the same sequence
- [ ] AC-02: Named streams are independent: `rng.stream('combat').next()`
             does not affect `rng.stream('loot').next()`
- [ ] AC-03: `rng.nextInt(min, max)` returns integers in [min, max] inclusive
- [ ] AC-04: `rng.nextFloat()` returns floats in [0, 1)
- [ ] AC-05: `rng.shuffle(array)` returns a new shuffled array without
             mutating the original
- [ ] AC-06: RNG state can be serialized to JSON and restored exactly

## Edge Cases
- seed = 0 must work
- seed = Number.MAX_SAFE_INTEGER must work
- nextInt(5, 5) always returns 5
- shuffle([]) returns []
- shuffle([x]) returns [x]

## Out of Scope
- Cryptographic randomness
- True entropy sources
```

---

### Feature 002: Combat System

```
/specify
Build a turn-based combat system for the RPG engine.
Players and enemies take turns attacking. Damage formula is
attack minus defense (minimum 1). Support status effects
(poison, stun, burn) with turn-based duration. Emit events
for UI to consume. No rendering logic — pure game logic only.
```

**Generated output → `specs/002-combat-system.md`:**

```markdown
# Spec 002: Combat System

## User Story
As a player, I want to engage in turn-based combat with enemies
where my stats determine outcomes, so that character building feels
meaningful and battles are strategic.

## Acceptance Criteria

### Damage
- [ ] AC-01: damage = max(1, attacker.attack - defender.defense)
- [ ] AC-02: Critical hits deal 2x damage (15% base chance, affected by luck stat)
- [ ] AC-03: Damage is always a positive integer

### Turn Order
- [ ] AC-04: Turn order determined by speed stat (higher goes first)
- [ ] AC-05: Speed ties broken by RNG stream 'combat'
- [ ] AC-06: Dead actors are removed from turn queue immediately

### Status Effects
- [ ] AC-07: Poison deals 10% of max HP each turn for N turns
- [ ] AC-08: Stun skips actor's next N turns
- [ ] AC-09: Burn deals flat 5 damage each turn for N turns
- [ ] AC-10: Multiple effects of same type refresh duration, do not stack

### Events (consumed by UI/scene layer)
- [ ] AC-11: Emits `combat:damage` { attackerId, defenderId, damage, isCritical }
- [ ] AC-12: Emits `combat:statusApplied` { actorId, effect, duration }
- [ ] AC-13: Emits `combat:actorDied` { actorId }
- [ ] AC-14: Emits `combat:battleEnded` { winningSide: 'player' | 'enemy' }

### Boundaries
- [ ] AC-15: CombatSystem takes actors array and RNG — no global state
- [ ] AC-16: Returns immutable battle log, does not mutate actor objects
- [ ] AC-17: Works with 1 player vs 1 enemy up to 4 players vs 8 enemies

## Edge Cases
- Player with 0 speed still takes a turn (last)
- All enemies die in same turn → battle ends, no further turns processed
- Poison on a 1HP actor kills it
- Stun duration 0 has no effect

## Out of Scope
- Animations, sounds, rendering
- Flee mechanic (separate spec)
- Magic/skills system (separate spec)
```

---

### Feature 003: Inventory System

```
/specify
Build an inventory system for RPG actors. Support item slots,
stacking, weight (optional), and equipment slots (head, body,
weapon, offhand, two accessories). Items defined by JSON data.
Emit events for UI. Pure logic, no rendering.
```

**Generated output → `specs/003-inventory-system.md`:**

```markdown
# Spec 003: Inventory System

## User Story
As a player, I want to collect, manage, and equip items during
my adventure, so that gear progression feels rewarding.

## Acceptance Criteria

### Slots & Stacking
- [ ] AC-01: Inventory has configurable max slots (default 24)
- [ ] AC-02: Stackable items (hasStack: true) stack up to item.maxStack
- [ ] AC-03: Adding a stackable item to a full stack creates a new stack
- [ ] AC-04: Adding a non-stackable item to a full inventory returns
             Result.err('INVENTORY_FULL')
- [ ] AC-05: Removing more than available quantity returns
             Result.err('INSUFFICIENT_QUANTITY')

### Equipment
- [ ] AC-06: Equip slots: head, body, weapon, offhand, accessory1, accessory2
- [ ] AC-07: Equipping an item moves it from inventory to equip slot
- [ ] AC-08: Equipping when slot is occupied swaps items (old goes to inventory)
- [ ] AC-09: Equipping when slot occupied and inventory full returns
             Result.err('INVENTORY_FULL')
- [ ] AC-10: Equipped items contribute stats to actor's computed stats

### Events
- [ ] AC-11: Emits `inventory:itemAdded` { itemId, quantity, slotIndex }
- [ ] AC-12: Emits `inventory:itemRemoved` { itemId, quantity }
- [ ] AC-13: Emits `inventory:itemEquipped` { itemId, slot }
- [ ] AC-14: Emits `inventory:itemUnequipped` { itemId, slot }

## Edge Cases
- Add 0 quantity → no-op, no event
- Remove from empty inventory → Result.err
- Equip item not in inventory → Result.err('ITEM_NOT_IN_INVENTORY')
- Unequip to full inventory → Result.err('INVENTORY_FULL')
```

---

### Feature 004: Quest System

```
/specify
Build a quest system with states INACTIVE, ACTIVE, COMPLETED, FAILED.
Quests have objectives (talk, collect, defeat, enter-zone). Support
branching completion paths and quest prerequisites. Persist state.
```

**Generated output → `specs/004-quest-system.md`:**

```markdown
# Spec 004: Quest System

## Acceptance Criteria

### State Machine
- [ ] AC-01: Quest starts INACTIVE
- [ ] AC-02: INACTIVE → ACTIVE via QuestSystem.activate(questId)
- [ ] AC-03: ACTIVE → COMPLETED when all required objectives met
- [ ] AC-04: ACTIVE → FAILED via QuestSystem.fail(questId)
- [ ] AC-05: COMPLETED and FAILED are terminal — no transitions out

### Objectives
- [ ] AC-06: Objective types: TALK_TO_NPC, COLLECT_ITEM, DEFEAT_ENEMY, ENTER_ZONE
- [ ] AC-07: Progress tracked per objective: { current: number, required: number }
- [ ] AC-08: Quest completes when ALL non-optional objectives reach required count
- [ ] AC-09: Optional objectives tracked but do not block completion

### Prerequisites
- [ ] AC-10: Quest with prerequisites cannot be activated until all
             prerequisite quests are COMPLETED
- [ ] AC-11: Attempting to activate locked quest returns
             Result.err('PREREQUISITES_NOT_MET')

### Branching
- [ ] AC-12: Quest can define multiple completion paths (pathId)
- [ ] AC-13: Completing via different paths can yield different rewards
- [ ] AC-14: Active path determined at completion time by which objectives met

### Events
- [ ] AC-15: Emits `quest:activated`   { questId }
- [ ] AC-16: Emits `quest:progressed`  { questId, objectiveId, current, required }
- [ ] AC-17: Emits `quest:completed`   { questId, pathId }
- [ ] AC-18: Emits `quest:failed`      { questId }

### Persistence
- [ ] AC-19: QuestSystem.serialize() returns JSON string
- [ ] AC-20: QuestSystem.deserialize(json) restores exact state
```

---

### Feature 005: GameTestAPI (window.__game)

```
/specify
Build a test API surface that exposes full game state and control
via window.__game in non-production builds. It must allow AI agents
and Playwright tests to read state, manipulate actors, trigger events,
step frames, and seed randomness — without any DOM dependency.
```

**Generated output → `specs/005-game-test-api.md`:**

```markdown
# Spec 005: GameTestAPI

## Acceptance Criteria

### Availability
- [ ] AC-01: window.__game is defined when MODE !== 'production'
- [ ] AC-02: window.__game is undefined in production builds
- [ ] AC-03: API initializes after engine.start() resolves

### State Reading
- [ ] AC-04: getScene() returns current scene constructor name as string
- [ ] AC-05: getActors() returns array of { id, name, pos, vel, hp }
- [ ] AC-06: getPlayer() returns full serialized player state
- [ ] AC-07: getInventory() returns array of inventory items
- [ ] AC-08: getQuestState() returns map of questId → QuestState
- [ ] AC-09: getDialogState() returns current dialog node or null

### Control
- [ ] AC-10: teleport(x, y) sets player position immediately
- [ ] AC-11: setHP(value) sets player HP, triggers death if 0
- [ ] AC-12: addItem(itemId, quantity?) adds to player inventory
- [ ] AC-13: triggerQuest(questId) activates a quest
- [ ] AC-14: setSeed(n) reseeds the global RNG
- [ ] AC-15: stepFrames(n) advances TestClock by n * 16ms
- [ ] AC-16: changeScene(sceneName) transitions to named scene

### Scenario Runner
- [ ] AC-17: runScenario(scenario: TestScenario) executes a declarative
             scenario JSON object sequentially
- [ ] AC-18: runScenario resolves with { passed: boolean, log: string[] }
```

---

## STEP 3 — /plan Commands

After each `/specify`, run `/plan` with your tech direction.

### Plan for Feature 002 (Combat)

```
/plan
Implement CombatSystem using TypeScript classes.
Pure functions where possible — CombatSystem should be a stateless
service that takes actors + RNG and returns a BattleResult.
Use EventEmitter from Node (already a Vite dep) for events.
File location: src/engine/combat/CombatSystem.ts
Tests in src/engine/combat/__tests__/CombatSystem.test.ts using Vitest.
No Excalibur imports in the logic layer — actors passed as plain interfaces.
```

**Generated output → `plans/002-combat-system-plan.md`:**

```markdown
# Technical Plan: Combat System

## Architecture Decision
CombatSystem is a pure stateless service. It accepts:
- `actors: CombatActor[]` (plain interface, no Excalibur dependency)
- `rng: SeededRNG` (injected, never calls Math.random)
- `config: CombatConfig` (optional overrides)

Returns `BattleResult` — immutable record of what happened.
Side effects only via EventEmitter — callers subscribe to events.

## Interfaces

```typescript
interface CombatActor {
  id: string;
  name: string;
  side: 'player' | 'enemy';
  stats: { hp: number; maxHp: number; attack: number;
           defense: number; speed: number; luck: number; };
  statusEffects: StatusEffect[];
}

interface BattleResult {
  winner: 'player' | 'enemy' | 'draw';
  turns: TurnRecord[];
  survivingActors: CombatActor[];
}

interface TurnRecord {
  actorId: string;
  action: 'attack' | 'skip' | 'status-tick';
  targetId?: string;
  damage?: number;
  isCritical?: boolean;
  statusApplied?: StatusEffect;
}
```

## File Structure
```
src/engine/combat/
├── CombatSystem.ts       ← main service
├── CombatTypes.ts        ← interfaces above
├── StatusEffects.ts      ← effect tick logic
└── __tests__/
    └── CombatSystem.test.ts
```

## Implementation Phases
1. Types + interfaces (no logic yet)
2. Damage formula function
3. Turn order sort
4. Status effect tick
5. Battle loop
6. EventEmitter integration
7. BattleResult assembly
```

---

## STEP 4 — /tasks Command

```
/tasks
```

**Generated output → `tasks/002-combat-system-tasks.md`:**

```markdown
# Tasks: Combat System

## Phase -1: Test Gates (MUST complete before Phase 1)

### TASK-001: Write unit tests — damage formula
File: src/engine/combat/__tests__/CombatSystem.test.ts
Tests to write:
- damage = max(1, attack - defense) for normal cases
- damage minimum is 1 when defense >= attack
- critical hit deals 2x damage
Status: [ ] Written  [ ] User Approved  [ ] Confirmed FAILING

### TASK-002: Write unit tests — turn order
Tests to write:
- Higher speed actor goes first
- Equal speed: RNG breaks tie deterministically with seed
- Dead actors not in queue
Status: [ ] Written  [ ] User Approved  [ ] Confirmed FAILING

### TASK-003: Write unit tests — status effects
Tests to write:
- Poison ticks 10% maxHP per turn for N turns
- Stun skips turn
- Burn ticks 5 damage per turn
- Same effect type refreshes, not stacks
Status: [ ] Written  [ ] User Approved  [ ] Confirmed FAILING

### TASK-004: Write unit tests — battle end conditions
Tests to write:
- All enemies die → winner = 'player'
- All players die → winner = 'enemy'
- Battle ends after last actor processed on death turn
Status: [ ] Written  [ ] User Approved  [ ] Confirmed FAILING

## Phase 1: Implementation (BLOCKED until all Phase -1 tasks APPROVED)

### TASK-005: Implement CombatTypes.ts
- Define all interfaces from plan
- No logic, types only

### TASK-006: Implement damage formula
- `calcDamage(attacker, defender, rng): { damage, isCritical }`
- Must make TASK-001 pass Green

### TASK-007: Implement turn order
- `sortBySpeed(actors, rng): CombatActor[]`
- Must make TASK-002 pass Green

### TASK-008: Implement status effects
- `tickStatus(actor): { actor, events }` pure function
- Must make TASK-003 pass Green

### TASK-009: Implement battle loop
- Assemble all pieces into `CombatSystem.resolve()`
- Must make TASK-004 pass Green

### TASK-010: Wire EventEmitter
- Subscribe pattern for UI layer
- All AC-11 through AC-14 events emitted correctly
```

---

## STEP 5 — /implement Command

```
/implement TASK-001
```

Claude Code will:
1. Write the test file first
2. Show you the tests
3. **Wait for your approval**
4. Run the tests to confirm they FAIL
5. Show you the failure output
6. **Wait for your confirmation to proceed**
7. Write the implementation
8. Run tests again to confirm they PASS

---

## STEP 6 — /analyze Quality Gate

Run this periodically to catch drift between specs, plans, tasks, and code:

```
/analyze
```

Claude Code checks:
- Are all ACs in specs covered by tasks?
- Are all tasks mapped to test files?
- Do test descriptions match spec AC language?
- Does the implementation plan match the actual file structure?
- Are there any TODO / FIXME comments blocking completion?

---

## STEP 7 — Full Feature Flow Example

Here's the complete command sequence for adding the combat system
from zero to tested implementation:

```bash
# 1. Write spec
/specify
Build a turn-based combat system. Turn order by speed stat.
Damage = max(1, attack - defense). Status effects: poison (10% maxHP/turn),
stun (skip turn), burn (5 flat/turn). Emit events. Pure logic, no rendering.

# 2. Write technical plan
/plan
TypeScript stateless service. CombatActor plain interface (no Excalibur import).
Inject SeededRNG. Return immutable BattleResult. EventEmitter for side effects.
Files in src/engine/combat/. Vitest tests co-located in __tests__/.

# 3. Break into tasks
/tasks

# 4. Implement task by task (TDD enforced)
/implement TASK-001  # → writes tests, waits for approval, confirms fail
/implement TASK-002
/implement TASK-003
/implement TASK-004
# ↑ all tests now written, approved, and FAILING

/implement TASK-005  # → types only
/implement TASK-006  # → damage formula, TASK-001 now GREEN
/implement TASK-007  # → turn order, TASK-002 now GREEN
/implement TASK-008  # → status effects, TASK-003 now GREEN
/implement TASK-009  # → battle loop, TASK-004 now GREEN
/implement TASK-010  # → events wired

# 5. Quality gate
/analyze

# 6. Commit
git add .
git commit -m "feat(combat): implement turn-based combat system (spec 002)"
```

---

## All /specify Commands for Full RPG Maker

Run these in order to build out the complete system:

```bash
/specify   # 001 — Seeded RNG
/specify   # 002 — Combat System
/specify   # 003 — Inventory System
/specify   # 004 — Quest System
/specify   # 005 — Dialog System (tree-based NPC dialog)
/specify   # 006 — Scene System (WorldMap, Town, Dungeon, Battle)
/specify   # 007 — GameTestAPI (window.__game)
/specify   # 008 — Map Editor React UI (tile painter, layer management)
/specify   # 009 — Character Creator (stat allocation, sprite selection)
/specify   # 010 — Quest Editor React UI (visual node graph)
/specify   # 011 — Dialog Editor React UI (tree editor with conditions)
/specify   # 012 — Game Export & Import (JSON project format)
/specify   # 013 — Multiplayer Sync (Yjs CRDT, WebSocket transport)
/specify   # 014 — AI Explorer Agent (Playwright + Claude API test runner)
/specify   # 015 — Save System (localStorage + cloud sync)
```
