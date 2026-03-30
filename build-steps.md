# Spec Kit: Building a Testable RPG Game with Excalibur.js

## Overview

This document covers the complete spec-kit workflow for building a testable
RPG game — the *playable output* of the RPG maker. The game is generated from
a JSON project file and must be fully testable by AI agents through the
window.__game API surface.

The game is called **Ironveil** — a sample RPG that proves the engine works
end-to-end and serves as the canonical test subject for all AI-driven testing.

---

## STEP 0 — Project Bootstrap

```bash
# Initialize game project (separate from the rpg-maker tool)
specify init ironveil-rpg --ai claude

cd ironveil-rpg

# Install dependencies
npm create vite@latest . -- --template vanilla-ts
npm install excalibur
npm install -D vitest excalibur-jasmine @excaliburjs/testing playwright
npm install -D @excaliburjs/testing @playwright/test
```

**Project structure after init:**

```
ironveil-rpg/
├── .spec-kit/
│   └── constitution.md          ← source of truth
├── .claude/
│   └── commands/                ← /specify /plan /tasks /implement
├── specs/                       ← feature specs
├── plans/                       ← technical plans
├── tasks/                       ← task breakdowns
├── src/
│   ├── engine/                  ← pure game logic
│   ├── actors/                  ← Excalibur actors
│   ├── scenes/                  ← Excalibur scenes
│   ├── data/                    ← game data JSON (items, enemies, quests)
│   └── testing/                 ← window.__game API + scenario runner
├── tests/
│   ├── unit/                    ← Vitest pure logic
│   ├── visual/                  ← excalibur-jasmine snapshots
│   ├── integration/             ← @excaliburjs/testing flows
│   ├── e2e/                     ← Playwright full game
│   └── ai-explorer/             ← Claude API explorer agent
├── test-images/
│   ├── expected/                ← golden snapshots
│   └── actual/                  ← test run outputs
├── vitest.config.ts
├── playwright.config.ts
└── index.html
```

---

## STEP 1 — constitution.md

**Path:** `.spec-kit/constitution.md`

```markdown
# Ironveil RPG — Project Constitution

## Vision
Ironveil is a 2D tile-based RPG built with Excalibur.js and TypeScript.
It is the canonical demo game for the RPG Maker tool and the primary
test subject for AI-driven game testing. Every system must be fully
observable, controllable, and testable without human interaction.

Ironveil must be completable by an AI agent running autonomously through
Playwright — from title screen to credits — using only the window.__game API.

## Core Principles
1. Testability is a first-class feature, not an afterthought.
2. All game state is observable through window.__game at all times.
3. All randomness is seeded and reproducible.
4. No implementation code before tests exist and are confirmed FAILING.
5. The game must reach 100% scenario coverage before v1.0 release.

---

## Tech Stack
- Engine:       Excalibur.js ^0.30.0
- Language:     TypeScript ^5.4
- Bundler:      Vite ^5.0
- Tile Maps:    Excalibur Tiled plugin (@excaliburjs/plugin-tiled)
- Audio:        Howler.js (mocked in tests)
- Persistence:  localStorage (mocked in tests)

## Testing Stack

| Layer       | Tool                      | Scope                                  |
|-------------|---------------------------|----------------------------------------|
| Unit        | Vitest ^1.6 + jsdom       | Pure logic: combat, inventory, quests  |
| Canvas      | excalibur-jasmine ^2.0    | Actor rendering, position, animation   |
| Integration | @excaliburjs/testing      | Scene flows, dialog, full battles      |
| E2E         | Playwright ^1.44          | Complete game playthroughs             |
| AI Agent    | Playwright + Claude API   | Exploratory testing, bug hunting       |

## Testing Rules (NON-NEGOTIABLE)
1. All game logic tested with Vitest — no ex.Engine in unit tests.
2. ex.Engine ALWAYS uses `new ex.TestClock()` in canvas/integration tests.
3. Howler.js mocked globally in all test environments.
4. localStorage mocked with in-memory store in all test environments.
5. RNG seeded via URL param `?seed=N` or `window.__game.setSeed(N)`.
6. Default test seed: 42.
7. All tests deterministic — flaky test = failing test.
8. Visual snapshot tolerance: 0.99.
9. window.__game exposed when `import.meta.env.MODE !== 'production'`.

## TDD Gate (ENFORCED)
- Tests written → user approved → confirmed FAILING → implementation written.
- No exceptions. No "I'll add tests later."

---

## Game Systems

### World
- Tile size: 16x16 px
- Maps authored in Tiled, exported as JSON
- Three regions: Starting Village, Forest Dungeon, Final Castle
- Each region: overworld + 1-3 interior maps

### Player
- Stats: hp, maxHp, mp, maxMp, attack, defense, speed, luck, level, exp
- Level cap: 20
- EXP formula: nextLevel = level * 100
- Stat growth per level: defined in `data/player-growth.json`

### Combat
- Turn-based, 1 player vs 1-4 enemies
- Damage: max(1, attack - defense)
- Skills cost MP, defined in `data/skills.json`
- Flee: 60% base success + (player.speed - enemy.speed) * 2%
- Win: all enemies dead → exp + loot distributed
- Lose: player HP = 0 → game over scene

### Items
- Types: consumable, weapon, armor, key-item
- Consumables: healing, MP restore, status cure
- Equipment: weapon (affects attack), armor (affects defense)
- Key items: cannot be dropped, required for quest triggers

### Quests
- Three main quests, five side quests
- States: INACTIVE → ACTIVE → COMPLETED | FAILED
- All quests reachable from starting village

### Dialog
- NPC dialog trees with choices
- Conditions: item ownership, quest state, player level
- Actions: give item, trigger quest, unlock map area

### Save System
- Three save slots
- Auto-save on scene transition
- Data: player stats, inventory, quest states, map positions, dialog flags

---

## Game Data Files

All game content defined as JSON — no hardcoded values in TypeScript.

```
src/data/
├── items.json          ← all items with stats and descriptions
├── enemies.json        ← all enemies with stats, loot tables, skills
├── skills.json         ← all player skills with costs and formulas
├── quests.json         ← all quest definitions with objectives
├── dialog.json         ← all NPC dialog trees
├── maps.json           ← map manifest (Tiled JSON references)
├── player-growth.json  ← level-up stat increases per level
└── loot-tables.json    ← enemy loot drop probabilities
```

---

## window.__game API Contract

All methods available in non-production builds:

### State Reading
- `getScene(): string`
- `getPlayer(): PlayerState`
- `getInventory(): InventoryItem[]`
- `getQuestLog(): QuestLogEntry[]`
- `getMapPosition(): { map: string, x: number, y: number }`
- `getDialogState(): DialogNode | null`
- `getBattleState(): BattleState | null`
- `getFlags(): Record<string, boolean>`
- `getSaveSlot(n: 1|2|3): SaveData | null`

### Control
- `setSeed(n: number): void`
- `teleport(map: string, x: number, y: number): Promise<void>`
- `setPlayerStat(stat: string, value: number): void`
- `addItem(itemId: string, qty?: number): void`
- `removeItem(itemId: string, qty?: number): void`
- `activateQuest(questId: string): void`
- `completeQuest(questId: string): void`
- `setFlag(key: string, value: boolean): void`
- `triggerDialog(npcId: string): void`
- `startBattle(enemyIds: string[]): void`
- `endBattle(outcome: 'win'|'lose'|'flee'): void`
- `stepFrames(n: number): void`
- `skipDialog(): void`
- `changeScene(sceneName: string): Promise<void>`
- `saveGame(slot: 1|2|3): void`
- `loadGame(slot: 1|2|3): Promise<void>`

### Scenario Runner
- `runScenario(s: TestScenario): Promise<ScenarioResult>`
- `runScenarioFile(url: string): Promise<ScenarioResult[]>`

---

## Coding Constraints
- Max file size: 300 lines (split if larger)
- No any types except in test utilities
- No hardcoded item/enemy/quest IDs in engine logic
- All data loaded from JSON at startup through DataLoader
- Error boundary: all async ops return Result<T,E>, never throw to caller
- Performance: 60fps target, no allocations in update loop
```

---

## STEP 2 — All /specify Commands

Run these in Claude Code inside the ironveil-rpg directory.
Each command generates a spec file and a git branch.

---

### /specify 001 — Data Loader

```
/specify
Build a DataLoader that reads all game JSON files at startup and provides
typed access to items, enemies, skills, quests, dialog, maps, and loot tables.
It must validate data on load, cache everything in memory, and provide
synchronous lookups by ID after initialization. Fail fast with clear errors
if data is missing or malformed.
```

**→ specs/001-data-loader.md**

```markdown
# Spec 001: DataLoader

## User Story
As the game engine, I need all game content available as typed, validated
objects at runtime so that systems can look up items, enemies, and quests
by ID without async calls during gameplay.

## Acceptance Criteria

### Loading
- [ ] AC-01: DataLoader.init() fetches all JSON files in parallel
- [ ] AC-02: init() throws DataLoadError if any file returns non-200
- [ ] AC-03: init() throws DataValidationError with field path if JSON
             is malformed or missing required fields
- [ ] AC-04: init() resolves in < 500ms on localhost (all files < 50KB each)

### Lookups (all synchronous after init)
- [ ] AC-05: getItem(id) returns Item or throws UnknownIdError
- [ ] AC-06: getEnemy(id) returns Enemy or throws UnknownIdError
- [ ] AC-07: getSkill(id) returns Skill or throws UnknownIdError
- [ ] AC-08: getQuest(id) returns QuestDef or throws UnknownIdError
- [ ] AC-09: getDialogTree(npcId) returns DialogTree or throws UnknownIdError
- [ ] AC-10: getLootTable(tableId) returns LootTable or throws UnknownIdError
- [ ] AC-11: getAllItems() returns Item[] (sorted by id)
- [ ] AC-12: getAllEnemies() returns Enemy[]

### Validation Rules (items.json)
- [ ] AC-13: Every item has: id (string), name (string), type
             (consumable|weapon|armor|key-item), description (string)
- [ ] AC-14: Consumable items have: effect (string), value (number)
- [ ] AC-15: Weapon/armor items have: statBonus record

### Validation Rules (enemies.json)
- [ ] AC-16: Every enemy has: id, name, stats object, lootTableId, expReward
- [ ] AC-17: Stats object has: hp, attack, defense, speed (all positive integers)

## Edge Cases
- getItem with empty string → UnknownIdError
- Two items with same id → DataValidationError on load
- JSON file is valid JSON but wrong shape → DataValidationError
- init() called twice → second call is a no-op, returns cached data

## Out of Scope
- Hot reloading of data files
- Data editing at runtime
```

---

### /specify 002 — SeededRNG

```
/specify
Build a seeded pseudo-random number generator. It must produce identical
sequences given the same seed, support named independent streams, provide
nextInt, nextFloat, nextBool, and weighted random pick. Injectable into
all game systems. Zero external dependencies.
```

**→ specs/002-seeded-rng.md**

```markdown
# Spec 002: SeededRNG

## Acceptance Criteria

### Core
- [ ] AC-01: new SeededRNG(42).nextFloat() always returns same value
- [ ] AC-02: Two RNG instances with same seed produce identical sequences
- [ ] AC-03: Different seeds produce different sequences
- [ ] AC-04: nextFloat() returns value in [0, 1)
- [ ] AC-05: nextInt(min, max) returns integer in [min, max] inclusive
- [ ] AC-06: nextBool(probability) returns true with given probability
             (verified over 10000 samples within 2% tolerance)

### Streams
- [ ] AC-07: rng.stream('combat') returns a child RNG
- [ ] AC-08: Calls to stream('combat') do not advance the parent RNG state
- [ ] AC-09: Same stream name from same parent+seed always produces same seq
- [ ] AC-10: Different stream names produce different sequences

### Weighted Pick
- [ ] AC-11: weightedPick([{value:'a', weight:1}, {value:'b', weight:3}])
             returns 'b' ~75% of the time (verified over 10000 samples)
- [ ] AC-12: weightedPick with single entry always returns that entry
- [ ] AC-13: weightedPick with empty array throws RNGError

### Serialization
- [ ] AC-14: rng.save() returns a SerializedRNG object
- [ ] AC-15: SeededRNG.restore(saved) produces exact continuation of sequence

## Edge Cases
- seed = 0, seed = -1, seed = Number.MAX_SAFE_INTEGER all work
- nextInt(5, 5) always returns 5
- nextBool(0) always false, nextBool(1) always true
- nextBool(probability outside 0-1) throws RNGError
```

---

### /specify 003 — Combat System

```
/specify
Build the core turn-based combat system. Pure logic layer, no rendering.
Player vs 1-4 enemies. Turn order by speed. Damage = max(1, atk - def).
Skills with MP cost. Flee mechanic. Status effects: poison, stun, burn.
Emit typed events. Return immutable battle log.
```

**→ specs/003-combat-system.md**

```markdown
# Spec 003: Combat System

## Acceptance Criteria

### Setup
- [ ] AC-01: CombatSystem.init(player, enemies[], rng, config) validates inputs
- [ ] AC-02: Enemies array must be 1-4 items, else throws CombatConfigError
- [ ] AC-03: All actors deep-cloned on init — originals never mutated

### Turn Order
- [ ] AC-04: Actors sorted descending by speed at battle start
- [ ] AC-05: Speed ties broken by rng.stream('turn-order').nextBool()
- [ ] AC-06: Turn order recalculated after any actor dies (removed from queue)
- [ ] AC-07: Stunned actor's turn is skipped and stun duration decremented

### Damage
- [ ] AC-08: damage = max(1, attacker.attack - target.defense)
- [ ] AC-09: Critical hit: damage * 2, base crit chance = 15% + luck/100
- [ ] AC-10: RNG stream 'crit' used for crit rolls

### Skills
- [ ] AC-11: Using skill with insufficient MP returns ActionResult.err('NO_MP')
- [ ] AC-12: Skill MP deducted before damage applied
- [ ] AC-13: Healing skill cannot overheal beyond maxHp
- [ ] AC-14: Skills with target='all' apply to all living enemies

### Flee
- [ ] AC-15: Flee success = 60% + (player.speed - slowestEnemy.speed) * 2%
- [ ] AC-16: Flee chance clamped to [10%, 95%]
- [ ] AC-17: Failed flee consumes player's turn
- [ ] AC-18: RNG stream 'flee' used for flee rolls

### Status Effects
- [ ] AC-19: Poison: 10% maxHp damage per turn, stacks duration (max 5 turns)
- [ ] AC-20: Stun: skip N turns, stacks duration (max 3 turns)
- [ ] AC-21: Burn: 5 flat damage per turn, stacks duration (max 5 turns)
- [ ] AC-22: Status tick happens at start of affected actor's turn
- [ ] AC-23: Status can kill (HP reaching 0 via status = actor dies)

### Victory / Defeat
- [ ] AC-24: Battle ends when all enemies dead → outcome = 'win'
- [ ] AC-25: Battle ends when player HP = 0 → outcome = 'lose'
- [ ] AC-26: Battle ends on successful flee → outcome = 'flee'
- [ ] AC-27: Win distributes exp = sum of enemy.expReward
- [ ] AC-28: Win rolls loot from each enemy's loot table via rng.stream('loot')

### Events Emitted
- [ ] AC-29: combat:turnStart    { actorId, turnNumber }
- [ ] AC-30: combat:damage       { attackerId, targetId, damage, isCritical }
- [ ] AC-31: combat:skillUsed    { actorId, skillId, targetId, mpCost }
- [ ] AC-32: combat:statusApplied { actorId, effect, duration }
- [ ] AC-33: combat:actorDied    { actorId }
- [ ] AC-34: combat:fleeFailed   { attemptedAt: turnNumber }
- [ ] AC-35: combat:battleEnded  { outcome, expGained, loot[] }

## Edge Cases
- Battle with 4 enemies, all same speed → order deterministic by seed
- Player dies from poison on enemy's turn → defeat triggers immediately
- All enemies die from AoE skill on same action → win, no further turns
- Flee on turn 1 with very high speed → may always succeed (95% cap)
- Skill that damages + applies status → both applied, events both emitted
```

---

### /specify 004 — Inventory System

```
/specify
Build an inventory system supporting 24 slots, stackable items, equipment
slots (weapon, armor), key items. Integrate with DataLoader for item
definitions. Result<T,E> returns for all mutating operations. Serialize
to/from JSON for save system.
```

**→ specs/004-inventory-system.md**

```markdown
# Spec 004: Inventory System

## Acceptance Criteria

### Slots
- [ ] AC-01: Default capacity: 24 slots
- [ ] AC-02: Each slot: { itemId: string, quantity: number }
- [ ] AC-03: addItem(itemId, qty) fills existing stack first, then new slot
- [ ] AC-04: addItem when inventory full → Result.err('INVENTORY_FULL')
- [ ] AC-05: removeItem(itemId, qty) → Result.err('INSUFFICIENT_QUANTITY')
             if qty > available
- [ ] AC-06: Key items cannot be removed → Result.err('KEY_ITEM')

### Stacking
- [ ] AC-07: Stackable items (from items.json maxStack > 1) stack up to maxStack
- [ ] AC-08: Adding beyond maxStack creates new slot if space available
- [ ] AC-09: Non-stackable items (maxStack = 1) each occupy one slot

### Equipment
- [ ] AC-10: Equip slots: weapon, armor
- [ ] AC-11: equipItem(itemId) moves from inventory to equip slot
- [ ] AC-12: Equipping over occupied slot swaps — old item to inventory
- [ ] AC-13: Cannot equip wrong type → Result.err('WRONG_ITEM_TYPE')
- [ ] AC-14: Equipped weapon adds weapon.statBonus.attack to player.attack
- [ ] AC-15: Equipped armor adds armor.statBonus.defense to player.defense
- [ ] AC-16: Unequip returns item to inventory or Result.err('INVENTORY_FULL')

### Events
- [ ] AC-17: inventory:itemAdded    { itemId, quantity }
- [ ] AC-18: inventory:itemRemoved  { itemId, quantity }
- [ ] AC-19: inventory:itemEquipped { itemId, slot }
- [ ] AC-20: inventory:itemUnequipped { itemId, slot }

### Serialization
- [ ] AC-21: serialize() returns plain object (JSON-safe)
- [ ] AC-22: InventorySystem.deserialize(data, dataLoader) restores exact state
- [ ] AC-23: Deserializing with unknown itemId → logs warning, skips item
```

---

### /specify 005 — Quest System

```
/specify
Build a quest system with state machine (INACTIVE→ACTIVE→COMPLETED|FAILED),
objective tracking (talk, collect, defeat, enter-zone), prerequisites,
and branching completion paths. Integrate with game event bus so objective
progress updates automatically when game events fire.
```

**→ specs/005-quest-system.md**

```markdown
# Spec 005: Quest System

## Acceptance Criteria

### State Machine
- [ ] AC-01: All quests load as INACTIVE
- [ ] AC-02: activate(questId) → ACTIVE if prerequisites met
- [ ] AC-03: activate when prerequisites not met → Result.err('LOCKED')
- [ ] AC-04: Quest auto-completes when all required objectives satisfied
- [ ] AC-05: fail(questId) → FAILED from ACTIVE only
- [ ] AC-06: COMPLETED and FAILED are terminal states

### Objectives
- [ ] AC-07: Types: TALK_TO_NPC, COLLECT_ITEM, DEFEAT_ENEMY, ENTER_ZONE
- [ ] AC-08: Each objective: { id, type, target, required, current, optional }
- [ ] AC-09: Optional objectives tracked but don't block completion
- [ ] AC-10: COLLECT_ITEM objective checks current inventory quantity

### Auto-Progress via Event Bus
- [ ] AC-11: npc:talked event → increments TALK_TO_NPC objectives
- [ ] AC-12: combat:actorDied event → increments DEFEAT_ENEMY objectives
- [ ] AC-13: zone:entered event → completes ENTER_ZONE objectives
- [ ] AC-14: inventory:itemAdded event → rechecks COLLECT_ITEM objectives

### Prerequisites
- [ ] AC-15: Quest with prerequisites lists required questIds (all COMPLETED)
- [ ] AC-16: QuestSystem.getAvailable() returns quests where prerequisites met

### Branching
- [ ] AC-17: Quest may define paths: { pathId, requiredObjectiveIds[] }
- [ ] AC-18: On completion, active path = first path whose required objectives
             are all COMPLETED
- [ ] AC-19: quest:completed event includes pathId

### Events
- [ ] AC-20: quest:activated   { questId }
- [ ] AC-21: quest:progressed  { questId, objectiveId, current, required }
- [ ] AC-22: quest:completed   { questId, pathId }
- [ ] AC-23: quest:failed      { questId }

### Serialization
- [ ] AC-24: serialize() / deserialize(data) round-trips exact state
```

---

### /specify 006 — Dialog System

```
/specify
Build a tree-based dialog system. Dialog trees defined in JSON with node
types: message, choice, condition, action. Conditions check quest state,
inventory, flags, player level. Actions give items, trigger quests, set
flags. Emit events for UI to display. Headless — no rendering.
```

**→ specs/006-dialog-system.md**

```markdown
# Spec 006: Dialog System

## Acceptance Criteria

### Tree Traversal
- [ ] AC-01: startDialog(npcId) loads tree from DataLoader, begins at rootNodeId
- [ ] AC-02: getCurrentNode() returns active node or null if no dialog active
- [ ] AC-03: advance() moves to nextNodeId (for message nodes)
- [ ] AC-04: choose(choiceIndex) moves to choice's targetNodeId
- [ ] AC-05: Reaching a node with no next/choices → dialog ends automatically
- [ ] AC-06: endDialog() can be called at any time to force-end

### Node Types
- [ ] AC-07: MESSAGE node: { text, speakerId, nextNodeId? }
- [ ] AC-08: CHOICE node: { text, choices[{ label, targetNodeId, condition? }] }
- [ ] AC-09: CONDITION node: evaluates condition, routes to trueNodeId or
             falseNodeId with no UI shown
- [ ] AC-10: ACTION node: executes action, routes to nextNodeId with no UI shown

### Conditions (evaluated against game state)
- [ ] AC-11: { type:'QUEST_STATE', questId, state } — checks quest state
- [ ] AC-12: { type:'HAS_ITEM', itemId, qty } — checks inventory
- [ ] AC-13: { type:'FLAG', key, value } — checks boolean flag
- [ ] AC-14: { type:'PLAYER_LEVEL', min?, max? } — checks player level

### Actions (side effects)
- [ ] AC-15: { type:'GIVE_ITEM', itemId, qty } — adds to inventory
- [ ] AC-16: { type:'REMOVE_ITEM', itemId, qty } — removes from inventory
- [ ] AC-17: { type:'ACTIVATE_QUEST', questId } — activates quest
- [ ] AC-18: { type:'SET_FLAG', key, value } — sets game flag
- [ ] AC-19: { type:'TELEPORT', map, x, y } — moves player

### Events
- [ ] AC-20: dialog:started    { npcId, treeId }
- [ ] AC-21: dialog:nodeShown  { nodeId, type, text?, choices? }
- [ ] AC-22: dialog:choiceMade { nodeId, choiceIndex }
- [ ] AC-23: dialog:actionRun  { nodeId, action }
- [ ] AC-24: dialog:ended      { npcId, treeId, nodesVisited[] }

### Choice Filtering
- [ ] AC-25: Choices whose condition evaluates false are hidden from player
- [ ] AC-26: If all choices hidden → CHOICE node treated as MESSAGE + advance
```

---

### /specify 007 — Player Actor

```
/specify
Build the Player Excalibur actor. Handles movement (WASD/arrow keys),
map collision, interaction with NPCs and objects (E key), combat
encounter triggers, leveling up from exp, and stat application from
equipped items. Integrates all engine systems. Exposes serializable state.
```

**→ specs/007-player-actor.md**

```markdown
# Spec 007: Player Actor

## Acceptance Criteria

### Movement
- [ ] AC-01: WASD and arrow keys move player at speed stat * 60 px/s
- [ ] AC-02: Player cannot move into collision tiles
- [ ] AC-03: Player cannot move while dialog is active
- [ ] AC-04: Player cannot move while battle is active
- [ ] AC-05: Diagonal movement speed normalized (no speed boost)

### Interaction
- [ ] AC-06: E key triggers interaction with nearest NPC/object within 32px
- [ ] AC-07: Interaction with NPC → DialogSystem.startDialog(npcId)
- [ ] AC-08: Interaction with chest → opens chest, adds items, marks opened
- [ ] AC-09: Interaction with door → scene transition if not locked

### Combat Encounters
- [ ] AC-10: Stepping on enemy trigger tile starts battle with that enemy group
- [ ] AC-11: Random encounters: enemy spawn rate from map metadata
- [ ] AC-12: Random encounter check runs every 30 steps (not frames)
- [ ] AC-13: Encounter uses rng.stream('encounter') for roll

### Leveling
- [ ] AC-14: exp added via player.gainExp(amount)
- [ ] AC-15: Level-up when exp >= level * 100
- [ ] AC-16: Level-up applies stat increases from player-growth.json
- [ ] AC-17: Level-up emits player:levelUp { level, statGains }
- [ ] AC-18: Level cap = 20, exp still accumulates but no further level-ups

### Computed Stats
- [ ] AC-19: player.computedAttack = base.attack + equippedWeapon?.statBonus.attack
- [ ] AC-20: player.computedDefense = base.defense + equippedArmor?.statBonus.defense
- [ ] AC-21: Computed stats update automatically on equip/unequip

### Serialization
- [ ] AC-22: player.serialize() returns PlayerState (JSON-safe)
- [ ] AC-23: Player.deserialize(state, systems) restores fully functional player
```

---

### /specify 008 — Scene System

```
/specify
Build the scene management system for: TitleScene, WorldMapScene,
TownScene, DungeonScene, BattleScene, GameOverScene, VictoryScene.
Handle transitions (fade, instant), map loading from Tiled JSON, NPC
placement from map object layer, auto-save on transition. All scenes
must be testable via window.__game.changeScene().
```

**→ specs/008-scene-system.md**

```markdown
# Spec 008: Scene System

## Scene Inventory
| Scene         | Entry From              | Exits To                       |
|---------------|-------------------------|--------------------------------|
| TitleScene    | game start              | WorldMapScene (new/load game)  |
| WorldMapScene | TitleScene, TownScene   | TownScene, DungeonScene        |
| TownScene     | WorldMapScene           | WorldMapScene, DungeonScene    |
| DungeonScene  | WorldMapScene/TownScene | WorldMapScene, BattleScene     |
| BattleScene   | DungeonScene encounter  | DungeonScene (win/flee/lose)   |
| GameOverScene | BattleScene (lose)      | TitleScene                     |
| VictoryScene  | Final boss defeated     | TitleScene (credits)           |

## Acceptance Criteria

### Transitions
- [ ] AC-01: changeScene(name, transitionType) triggers fade or instant
- [ ] AC-02: Fade transition: 300ms black overlay in + pause + 300ms out
- [ ] AC-03: Player state persists across all non-battle scene changes
- [ ] AC-04: BattleScene receives enemy group from triggering scene
- [ ] AC-05: Auto-save fires on every scene exit (except BattleScene)

### Map Loading (WorldMap / Town / Dungeon)
- [ ] AC-06: Map loaded from Tiled JSON referenced in maps.json
- [ ] AC-07: Collision layer tiles set as ex.CollisionType.Fixed
- [ ] AC-08: Object layer 'npcs' spawns NPC actors at object positions
- [ ] AC-09: Object layer 'triggers' creates zone trigger actors
- [ ] AC-10: Object layer 'enemies' places encounter zones
- [ ] AC-11: Object layer 'chests' places chest actors (with itemId metadata)

### TitleScene
- [ ] AC-12: Shows "New Game" and "Continue" (disabled if no saves exist)
- [ ] AC-13: "New Game" initializes fresh player state, goes to WorldMapScene
- [ ] AC-14: "Continue" shows save slot picker, loads selected slot

### BattleScene
- [ ] AC-15: Renders player and enemy sprites with HP bars
- [ ] AC-16: Shows action menu: Attack, Skill, Item, Flee
- [ ] AC-17: On combat:battleEnded win → shows loot + exp screen → DungeonScene
- [ ] AC-18: On combat:battleEnded lose → GameOverScene
- [ ] AC-19: On combat:battleEnded flee → DungeonScene (enemy removed)

### Events
- [ ] AC-20: scene:exiting  { from: sceneName }
- [ ] AC-21: scene:entered  { to: sceneName }
- [ ] AC-22: scene:saved    { slot, timestamp }
```

---

### /specify 009 — GameTestAPI

```
/specify
Build the window.__game testing API surface. Expose all game state
reading and control methods defined in the constitution. Include a
declarative scenario runner that accepts JSON scenarios. Must work
with TestClock for deterministic frame stepping. Fully typed.
```

**→ specs/009-game-test-api.md**

```markdown
# Spec 009: GameTestAPI

## Acceptance Criteria

### Registration
- [ ] AC-01: GameTestAPI instantiated after engine.start() resolves
- [ ] AC-02: window.__game set to instance when MODE !== 'production'
- [ ] AC-03: window.__game === undefined in production builds
- [ ] AC-04: All methods throw GameTestAPIError if called before init

### All Constitution Methods
(see constitution.md §window.__game API Contract — all ACs map 1:1)

### Scenario Runner
- [ ] AC-05: runScenario accepts TestScenario interface
- [ ] AC-06: Setup steps run sequentially before actions
- [ ] AC-07: Actions run sequentially, each awaited
- [ ] AC-08: Assertions checked after all actions complete
- [ ] AC-09: Returns { passed, failures: AssertionFailure[], log: string[] }
- [ ] AC-10: Scenario with empty actions still runs assertions

### TestScenario Interface
```typescript
interface TestScenario {
  name: string;
  seed: number;
  setup: SetupStep[];
  actions: GameAction[];
  assertions: Assertion[];
}

type SetupStep =
  | { type: 'teleport'; map: string; x: number; y: number }
  | { type: 'setPlayerStat'; stat: string; value: number }
  | { type: 'addItem'; itemId: string; qty?: number }
  | { type: 'activateQuest'; questId: string }
  | { type: 'setSeed'; value: number }
  | { type: 'changeScene'; scene: string };

type GameAction =
  | { type: 'stepFrames'; count: number }
  | { type: 'pressKey'; key: string; frames: number }
  | { type: 'startBattle'; enemyIds: string[] }
  | { type: 'executeAction'; fn: string; args: unknown[] }
  | { type: 'skipDialog' }
  | { type: 'choose'; index: number };

type Assertion =
  | { type: 'sceneEquals'; expected: string }
  | { type: 'playerHpEquals'; expected: number }
  | { type: 'playerHpRange'; min: number; max: number }
  | { type: 'playerLevelEquals'; expected: number }
  | { type: 'hasItem'; itemId: string; minQty?: number }
  | { type: 'questState'; questId: string; state: string }
  | { type: 'flagEquals'; key: string; value: boolean }
  | { type: 'dialogActive'; expected: boolean }
  | { type: 'mapPositionRange'; map: string; xRange: [number,number]; yRange: [number,number] };
```
```

---

### /specify 010 — Save System

```
/specify
Build a save system with 3 slots. Save captures: player state, inventory,
quest log, flags, current map and position, dialog visit history.
Auto-save on scene transition. Load restores all systems to saved state.
Use localStorage with in-memory mock for tests.
```

**→ specs/010-save-system.md**

```markdown
# Spec 010: Save System

## Acceptance Criteria

### Save
- [ ] AC-01: saveGame(slot) writes SaveData to localStorage key
             `ironveil-save-${slot}`
- [ ] AC-02: SaveData includes: { version, timestamp, player, inventory,
             equips, quests, flags, map, position, dialogHistory }
- [ ] AC-03: saveGame resolves within 50ms
- [ ] AC-04: Existing save is overwritten without prompt (prompt is UI concern)

### Load
- [ ] AC-05: loadGame(slot) reads and parses SaveData
- [ ] AC-06: Restores PlayerSystem, InventorySystem, QuestSystem to saved state
- [ ] AC-07: Teleports player to saved map + position
- [ ] AC-08: loadGame with empty slot → Result.err('NO_SAVE')
- [ ] AC-09: loadGame with incompatible version → Result.err('VERSION_MISMATCH')

### Auto-Save
- [ ] AC-10: Auto-save fires on scene:exiting event (slot 1 always)
- [ ] AC-11: Auto-save does NOT fire when exiting BattleScene

### Versioning
- [ ] AC-12: SaveData.version = current game version string from package.json
- [ ] AC-13: Migration: v1.x saves loadable in v1.y (minor version compat)

### Test Environment
- [ ] AC-14: SaveSystem accepts storage adapter interface
- [ ] AC-15: Default adapter uses localStorage
- [ ] AC-16: MemoryStorageAdapter provided for tests (no localStorage)

## Edge Cases
- localStorage full → Result.err('STORAGE_FULL'), no partial write
- Corrupted JSON in localStorage → Result.err('CORRUPT_SAVE')
- Save slot 0 or 4 → Result.err('INVALID_SLOT')
```

---

### /specify 011 — AI Explorer Agent

```
/specify
Build an AI explorer agent that uses Playwright + the Claude API to play
the game autonomously, discover bugs, and generate a structured bug report.
The agent reads game state via window.__game, takes screenshots, decides
actions, and tracks what it has and has not explored. Target: full game
playthrough from title to victory in one session.
```

**→ specs/011-ai-explorer-agent.md**

```markdown
# Spec 011: AI Explorer Agent

## Acceptance Criteria

### Session
- [ ] AC-01: Agent initializes Playwright, navigates to game URL with seed param
- [ ] AC-02: Agent maintains conversation history across all turns
- [ ] AC-03: Agent runs until: victoryScene reached, or maxTurns exceeded,
             or unrecoverable error
- [ ] AC-04: maxTurns configurable, default 200

### Observation
- [ ] AC-05: Each turn captures: screenshot (base64), full game state JSON
- [ ] AC-06: State includes: scene, player, inventory, quests, dialog, map pos
- [ ] AC-07: Observation passed to Claude API as image + structured text

### Decision
- [ ] AC-08: Claude returns JSON: { bugs[], reasoning, action }
- [ ] AC-09: action is one of GameAction types from GameTestAPI spec
- [ ] AC-10: Invalid action format → agent logs error, requests retry (max 3)

### Bug Detection Prompting
Agent system prompt instructs Claude to look for:
- [ ] AC-11: Visual glitches (actor offscreen, overlapping UI, clipped text)
- [ ] AC-12: Logic errors (quest stuck, wrong HP after combat)
- [ ] AC-13: Softlocks (no available actions, dialog with no advance)
- [ ] AC-14: Data errors (unknown item IDs, NaN stats)
- [ ] AC-15: Performance drops (visible frame stuttering in screenshot sequence)

### Bug Report
- [ ] AC-16: BugReport written to `reports/explorer-{timestamp}.json`
- [ ] AC-17: Each bug: { severity, description, reproSteps, screenshot, turn }
- [ ] AC-18: Severity: CRITICAL | HIGH | MEDIUM | LOW
- [ ] AC-19: reproSteps is a TestScenario JSON object (replayable)
- [ ] AC-20: Summary: { turnsPlayed, scenesVisited, bugsFound, completed }
```

---

## STEP 3 — /plan Commands

Run after each /specify. Examples for core systems:

### Plan for 003 — Combat System

```
/plan
CombatSystem as pure TypeScript class. No Excalibur imports.
CombatActor is a plain interface. Inject SeededRNG and EventEmitter.
Return CombatResult — immutable, no references to internal state.
Files: src/engine/combat/. Vitest tests co-located.
Use Result<T,E> pattern from neverthrow library for error handling.
BattleLog is an append-only array built during battle resolution.
```

### Plan for 007 — Player Actor

```
/plan
Player extends ex.Actor. Movement via ex.Input.Keys in onPreUpdate.
Inject all systems (CombatSystem, InventorySystem, QuestSystem,
DialogSystem) via constructor. No system instantiation inside Player.
Computed stats as TypeScript getters. Serialize/deserialize are
plain methods, no Excalibur knowledge required. Use TestClock
for all actor tests via excalibur-jasmine.
```

### Plan for 011 — AI Explorer Agent

```
/plan
Standalone Node.js script in tests/ai-explorer/explorer.ts.
Uses Playwright chromium. Calls Anthropic claude-sonnet-4-20250514
via fetch (no SDK to keep deps minimal). Conversation history
maintained as messages array. Action executor is a switch/case
dispatcher over window.__game methods. Bug report written with
fs.writeFileSync. Config via CLI args: --url --seed --maxTurns --output.
```

---

## STEP 4 — /tasks for Combat System (Full Example)

```
/tasks
```

**→ tasks/003-combat-system-tasks.md**

```markdown
# Tasks: Combat System (Spec 003)

## Phase -1: Tests (ALL must be APPROVED + FAILING before Phase 1)

### TASK-003-T01: Unit tests — damage formula
File: src/engine/combat/__tests__/CombatSystem.test.ts

```typescript
describe('CombatSystem — damage', () => {
  const rng = new SeededRNG(42);

  it('calculates damage as max(1, attack - defense)', () => {
    const result = calcDamage(
      { attack: 10, luck: 0 },
      { defense: 3 },
      rng.stream('crit')
    );
    expect(result.damage).toBe(7);
  });

  it('minimum damage is 1 when defense >= attack', () => {
    const result = calcDamage(
      { attack: 5, luck: 0 },
      { defense: 10 },
      rng.stream('crit')
    );
    expect(result.damage).toBe(1);
  });

  it('critical hit doubles damage', () => {
    // Use known seed that produces crit
    const critRng = new SeededRNG(7).stream('crit');
    const result = calcDamage({ attack: 10, luck: 100 }, { defense: 0 }, critRng);
    expect(result.isCritical).toBe(true);
    expect(result.damage).toBe(20);
  });
});
```
Status: [ ] Written  [ ] Approved  [ ] FAILING confirmed

### TASK-003-T02: Unit tests — turn order
```typescript
describe('CombatSystem — turn order', () => {
  it('sorts actors by speed descending', () => {
    const actors = [
      makeActor({ id: 'slow', speed: 3 }),
      makeActor({ id: 'fast', speed: 10 }),
      makeActor({ id: 'mid', speed: 6 }),
    ];
    const order = sortBySpeed(actors, new SeededRNG(42).stream('turn-order'));
    expect(order.map(a => a.id)).toEqual(['fast', 'mid', 'slow']);
  });

  it('breaks speed ties deterministically with seed', () => {
    const actors = [
      makeActor({ id: 'a', speed: 5 }),
      makeActor({ id: 'b', speed: 5 }),
    ];
    const order1 = sortBySpeed(actors, new SeededRNG(42).stream('turn-order'));
    const order2 = sortBySpeed(actors, new SeededRNG(42).stream('turn-order'));
    expect(order1.map(a => a.id)).toEqual(order2.map(a => a.id));
  });
});
```
Status: [ ] Written  [ ] Approved  [ ] FAILING confirmed

### TASK-003-T03: Unit tests — status effects
```typescript
describe('CombatSystem — status effects', () => {
  it('poison deals 10% maxHp per turn', () => {
    const actor = makeActor({ hp: 100, maxHp: 100, statusEffects: [
      { type: 'poison', duration: 3 }
    ]});
    const result = tickStatus(actor);
    expect(result.actor.hp).toBe(90);
    expect(result.actor.statusEffects[0].duration).toBe(2);
  });

  it('stun skips actor turn', () => {
    const actor = makeActor({ statusEffects: [{ type: 'stun', duration: 1 }] });
    expect(isStunned(actor)).toBe(true);
    const result = tickStatus(actor);
    expect(result.actor.statusEffects).toHaveLength(0);
  });

  it('poison can kill actor', () => {
    const actor = makeActor({ hp: 5, maxHp: 100, statusEffects: [
      { type: 'poison', duration: 2 }
    ]});
    const result = tickStatus(actor);
    expect(result.actor.hp).toBeLessThanOrEqual(0);
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'combat:actorDied' })
    );
  });
});
```
Status: [ ] Written  [ ] Approved  [ ] FAILING confirmed

### TASK-003-T04: Integration test — full battle
File: tests/integration/combat-battle.spec.ts
```typescript
import { test } from '@excaliburjs/testing';

test('Player wins battle against single goblin', async (page) => {
  await page.goto('http://localhost:5173?seed=42&testMode=true');
  await page.evaluate(() => window.__game.setPlayerStat('attack', 15));
  await page.evaluate(() => window.__game.startBattle(['goblin-basic']));

  // Step through combat turns
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.__game.stepFrames(60));
    const scene = await page.evaluate(() => window.__game.getScene());
    if (scene !== 'BattleScene') break;
  }

  const scene = await page.evaluate(() => window.__game.getScene());
  expect(scene).toBe('DungeonScene'); // returned after win
});

test('Player loses when HP reaches 0', async (page) => {
  await page.goto('http://localhost:5173?seed=42&testMode=true');
  await page.evaluate(() => window.__game.setPlayerStat('hp', 1));
  await page.evaluate(() => window.__game.startBattle(['goblin-boss']));
  await page.evaluate(() => window.__game.stepFrames(300));

  const scene = await page.evaluate(() => window.__game.getScene());
  expect(scene).toBe('GameOverScene');
});
```
Status: [ ] Written  [ ] Approved  [ ] FAILING confirmed

## Phase 1: Implementation (BLOCKED until Phase -1 complete)

### TASK-003-01: CombatTypes.ts — interfaces only
### TASK-003-02: calcDamage() — makes T01 GREEN
### TASK-003-03: sortBySpeed() — makes T02 GREEN
### TASK-003-04: tickStatus() / isStunned() — makes T03 GREEN
### TASK-003-05: CombatSystem.resolve() battle loop — makes T04 GREEN
### TASK-003-06: EventEmitter wiring (all combat:* events)
### TASK-003-07: Flee mechanic
### TASK-003-08: Skills integration
```

---

## STEP 5 — AI Explorer Agent: Full Test Script

**Path:** `tests/ai-explorer/explorer.ts`

```typescript
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const GAME_URL = process.argv[2] ?? 'http://localhost:5173';
const SEED     = process.argv[3] ?? '42';
const MAX_TURNS = parseInt(process.argv[4] ?? '200');
const OUTPUT   = process.argv[5] ?? `reports/explorer-${Date.now()}.json`;

interface BugReport {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  reproSteps: object;
  turn: number;
}

const SYSTEM_PROMPT = `
You are a QA engineer playtesting a 2D RPG called Ironveil.
You can see the game screen and read full game state.
Your goal: reach the VictoryScene by playing through the game,
while identifying bugs, softlocks, visual glitches, and logic errors.

On each turn, respond with ONLY valid JSON in this exact shape:
{
  "bugs": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "description": "what is wrong",
      "reproSteps": { "type": "...", "setup": [], "actions": [], "assertions": [] }
    }
  ],
  "reasoning": "why you are taking this action",
  "action": {
    "type": "stepFrames|pressKey|startBattle|skipDialog|choose|changeScene",
    ...params
  }
}

Bug detection checklist — look for these every turn:
- Actors outside map bounds
- NaN or negative HP/MP values
- Quest objectives stuck at wrong count
- Dialog with no choices and no advance option
- UI elements overlapping or clipped
- Scene name not matching expected state
- Player unable to move when they should be able to
- Battle ending without correct scene transition
`.trim();

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto(`${GAME_URL}?seed=${SEED}&testMode=true`);
  await page.waitForTimeout(2000); // let engine init

  const history: { role: string; content: unknown[] }[] = [];
  const bugs: BugReport[] = [];
  const scenesVisited = new Set<string>();
  let turn = 0;
  let completed = false;

  while (turn < MAX_TURNS && !completed) {
    turn++;
    console.log(`\n--- Turn ${turn} ---`);

    // Observe
    const screenshot = await page.screenshot({ encoding: 'base64' });
    const state = await page.evaluate(() => ({
      scene:     (window as any).__game.getScene(),
      player:    (window as any).__game.getPlayer(),
      inventory: (window as any).__game.getInventory(),
      quests:    (window as any).__game.getQuestLog(),
      dialog:    (window as any).__game.getDialogState(),
      battle:    (window as any).__game.getBattleState(),
      mapPos:    (window as any).__game.getMapPosition(),
    }));

    scenesVisited.add(state.scene);
    if (state.scene === 'VictoryScene') { completed = true; break; }

    // Ask Claude
    history.push({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot } },
        { type: 'text', text: `Turn ${turn}. Game state:\n${JSON.stringify(state, null, 2)}` }
      ]
    });

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history,
      })
    });

    const data = await resp.json();
    const text = data.content.find((b: any) => b.type === 'text')?.text ?? '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('Bad JSON from Claude:', text);
      continue;
    }

    history.push({ role: 'assistant', content: [{ type: 'text', text }] });

    // Collect bugs
    if (parsed.bugs?.length) {
      for (const bug of parsed.bugs) {
        bugs.push({ ...bug, turn });
        console.log(`🐛 [${bug.severity}] ${bug.description}`);
      }
    }

    // Execute action
    const action = parsed.action;
    console.log(`Action: ${JSON.stringify(action)}`);
    try {
      await executeAction(page, action);
    } catch (err) {
      console.error('Action failed:', err);
    }
  }

  // Write report
  const report = {
    summary: {
      turnsPlayed: turn,
      scenesVisited: [...scenesVisited],
      bugsFound: bugs.length,
      completed,
      seed: SEED,
    },
    bugs,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report written to ${OUTPUT}`);
  console.log(`Bugs: ${bugs.length} | Completed: ${completed} | Turns: ${turn}`);

  await browser.close();
}

async function executeAction(page: any, action: any) {
  switch (action?.type) {
    case 'stepFrames':
      await page.evaluate((n: number) => (window as any).__game.stepFrames(n), action.count ?? 60);
      break;
    case 'pressKey':
      await page.keyboard.down(action.key);
      await page.evaluate((n: number) => (window as any).__game.stepFrames(n), action.frames ?? 10);
      await page.keyboard.up(action.key);
      break;
    case 'skipDialog':
      await page.evaluate(() => (window as any).__game.skipDialog());
      break;
    case 'choose':
      await page.evaluate((i: number) => (window as any).__game.choose(i), action.index ?? 0);
      break;
    case 'changeScene':
      await page.evaluate((s: string) => (window as any).__game.changeScene(s), action.scene);
      break;
    case 'startBattle':
      await page.evaluate((ids: string[]) => (window as any).__game.startBattle(ids), action.enemyIds);
      break;
    case 'teleport':
      await page.evaluate(
        (args: any) => (window as any).__game.teleport(args.map, args.x, args.y),
        action
      );
      break;
    default:
      console.warn('Unknown action type:', action?.type);
  }
}

main().catch(console.error);
```

---

## STEP 6 — Visual Regression Test Suite

**Path:** `tests/visual/scenes.spec.ts`

```typescript
import { ExcaliburAsyncMatchers, ensureImagesLoaded } from 'excalibur-jasmine';
import * as ex from 'excalibur';

describe('Visual Regression', () => {
  beforeAll(() => {
    jasmine.addAsyncMatchers(ExcaliburAsyncMatchers);
  });

  const snapshots = [
    {
      name: 'title-screen',
      setup: async (game: any) => game.changeScene('TitleScene'),
    },
    {
      name: 'battle-start-goblin',
      setup: async (game: any) => {
        await game.changeScene('DungeonScene');
        game.startBattle(['goblin-basic']);
        game.stepFrames(2);
      },
    },
    {
      name: 'inventory-with-items',
      setup: async (game: any) => {
        game.addItem('health-potion', 3);
        game.addItem('iron-sword', 1);
        game.addItem('leather-armor', 1);
      },
    },
    {
      name: 'dialog-village-elder',
      setup: async (game: any) => {
        await game.teleport('starting-village', 240, 180);
        game.triggerDialog('npc-village-elder');
        game.stepFrames(2);
      },
    },
    {
      name: 'game-over-screen',
      setup: async (game: any) => {
        game.setPlayerStat('hp', 0);
        game.stepFrames(10);
      },
    },
  ];

  for (const snap of snapshots) {
    it(`matches snapshot: ${snap.name}`, async () => {
      const engine = new ex.Engine({
        width: 800, height: 600,
        clock: new ex.TestClock(),
        suppressPlayButton: true,
      });

      await engine.start();
      const game = (window as any).__game;
      await snap.setup(game);
      engine.clock.step(16);

      await expectAsync(engine.canvas)
        .toEqualImage(`./test-images/expected/${snap.name}.png`, 0.99);

      engine.stop();
    });
  }
});
```

---

## STEP 7 — Full Command Sequence (All 11 Features)

```bash
# ── PHASE 0: Foundation ─────────────────────────────────────
/specify   # 001 DataLoader
/plan      # TypeScript class, fetch + validate, typed lookup methods
/tasks     # T01: unit tests for validation errors, T02: unit tests for lookups
/implement TASK-001-T01   # write tests → approve → confirm FAIL
/implement TASK-001-T02
/implement TASK-001-01    # DataLoader class → GREEN
/implement TASK-001-02    # validation rules → GREEN

/specify   # 002 SeededRNG
/plan      # Mulberry32 algorithm, named streams via child seeds
/tasks
/implement TASK-002-T01   # determinism tests
/implement TASK-002-T02   # stream independence tests
/implement TASK-002-T03   # weighted pick tests
/implement TASK-002-01    # implementation → GREEN
/analyze                  # quality gate check

# ── PHASE 1: Engine Systems ──────────────────────────────────
/specify   # 003 CombatSystem
/specify   # 004 InventorySystem
/specify   # 005 QuestSystem
/specify   # 006 DialogSystem

# Implement each with TDD gate:
/plan      # for each
/tasks     # for each
# For each feature:
# /implement TASK-XXX-T01 through T0N  (tests first, approved, FAILING)
# /implement TASK-XXX-01 through 0N    (implementation, GREEN)
/analyze   # after each feature

# ── PHASE 2: Actors & Scenes ─────────────────────────────────
/specify   # 007 PlayerActor
/specify   # 008 SceneSystem

/plan      # 007: extends ex.Actor, inject systems, TestClock in tests
/plan      # 008: ex.Scene subclasses, Tiled plugin, map object layers
/tasks     # both
# implement with TDD gate for each
/analyze

# ── PHASE 3: Testing Surface ─────────────────────────────────
/specify   # 009 GameTestAPI
/specify   # 010 SaveSystem
/specify   # 011 AIExplorerAgent

/plan      # 009: window.__game, TestScenario runner
/plan      # 010: MemoryStorageAdapter for tests, localStorage for prod
/plan      # 011: Playwright + Claude API, JSON report output
/tasks
# implement all with TDD gate
/analyze

# ── PHASE 4: AI Testing Run ──────────────────────────────────
npm run dev &   # start game server

# Run AI explorer (autonomous full playthrough + bug report)
npx ts-node tests/ai-explorer/explorer.ts \
  http://localhost:5173 \
  42 \
  200 \
  reports/explorer-v1.json

# Run visual regression suite
npx playwright test tests/visual/

# Run full unit suite
npx vitest run

# Run integration suite
npx playwright test tests/integration/

# Final quality gate
/analyze
```

---

## Expected Test Coverage at v1.0

| Suite              | Target  | What It Covers                                  |
|--------------------|---------|-------------------------------------------------|
| Vitest unit        | 95%     | All engine logic functions                      |
| excalibur-jasmine  | 8 snaps | Title, Battle, Inventory, Dialog, GameOver, etc |
| Integration        | 12 tests| Scene transitions, full combat, quest flows     |
| AI Explorer        | 1 run   | Full game playthrough, bug report generated     |
| Playwright E2E     | 5 tests | New game, save/load, complete main quest        |
