# Test Contract System — Design Spec

## Problem

AI-generated game code ships without rigorous verification. Tests are incomplete, shallow, and don't cover the actual player experience. This has made the codebase fragile and hard to improve.

## Goals

1. **Confidence to refactor** — change any system and know immediately if something broke
2. **AI accountability** — AI must prove code works before delivering. Tests are the definition of done.
3. **Playable correctness** — automated verification that the game plays correctly end-to-end

## Approach: Test Contract System

Every system gets a **contract** — a plain-language list of behaviors that MUST be verified. Contracts serve as both living documentation and test coverage targets.

### Three Test Layers

1. **Unit Contracts** — Each engine system (Combat, Inventory, Quest, Dialog, Save, RNG, Storyline) has a contract listing every behavior verified in isolation.
2. **Integration Contracts** — Cross-system behaviors that must work together (e.g., battle win → EXP gain → level-up → stat update → save/load preserves).
3. **Player Experience Contracts** — End-to-end scenarios verifying actual player journeys.

### Contract Format

Each contract item is a single testable statement with a priority level:

```
[P1] SystemName: Behavioral guarantee stated as fact
[P2] SystemName: Less critical but important behavior
[P3] SystemName: Edge case or performance guarantee
```

**Priority levels:**
- **P1 (Must have)** — Core game logic. If this breaks, the game is broken.
- **P2 (Should have)** — Important behavior affecting game feel.
- **P3 (Nice to have)** — Edge cases, performance, polish.

### Contract File Structure

```
contracts/
  combat.contract.md
  inventory.contract.md
  quest.contract.md
  dialog.contract.md
  save.contract.md
  storyline.contract.md
  game-loop.contract.md
  player-experience.contract.md
```

Each contract file lists items, their priority, and which test file covers them. Untested items are marked `[UNTESTED]`.

### Enforcement Rule

New features must add contract items AND tests. AI cannot deliver code without proving it satisfies the contract.

---

## Contracts

### Combat System

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | Damage = max(1, attack - defense) | Tested |
| P1 | Critical hits deal 2x damage | UNTESTED |
| P1 | Turn order follows speed, deterministic tie-breaking | Tested |
| P1 | Dead actors can't take turns | Tested |
| P1 | Status effects tick down each turn | Tested |
| P1 | Stunned actors skip their turn | Tested |
| P1 | Poison deals 10% max HP per turn | Tested |
| P1 | Flee success probability scales with speed/luck | Tested |
| P1 | Skills consume MP, fail if insufficient | Tested |
| P1 | Battle ends when one side is eliminated | Tested |
| P1 | Input actors are never mutated | Tested |

### Inventory System

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | Items stack up to maxStack | Tested |
| P1 | Full inventory rejects new items with INVENTORY_FULL | Tested |
| P1 | Equipment goes to correct slot type only | Tested |
| P1 | Equipped item stat bonuses apply to computed stats | Tested |
| P1 | Unequipping returns item to inventory | Tested |
| P1 | Slot swap: equipping occupied slot returns previous item | Tested |
| P1 | Remove fails gracefully with insufficient quantity | Tested |

### Quest System

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | State machine: INACTIVE → ACTIVE → COMPLETED/FAILED (terminal) | Tested |
| P1 | Prerequisites must be completed before activation | Tested |
| P1 | All required objectives met → auto-complete | Tested |
| P1 | Optional objectives don't block completion | Tested |
| P1 | Progress on completed/failed quest is no-op | Tested |
| P1 | Branching paths: first satisfied path resolves | Tested |
| P1 | Serialize/deserialize preserves exact state | Tested |

### Dialog System

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | Choices filtered by conditions (level, items, flags, quest state) | Tested |
| P1 | Actions execute on choice selection (give item, set flag, activate quest) | Tested |
| P1 | Multi-node traversal reaches correct end nodes | UNTESTED |
| P1 | Condition combinations (AND logic) all must pass | UNTESTED |
| P1 | Invalid node references don't crash, return error | UNTESTED |
| P1 | NPC-specific trees load correctly from data | UNTESTED |

### Save System

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | Save captures: scene, player stats, inventory, quests, flags, position | Tested |
| P1 | Load restores exact game state | Tested |
| P1 | Empty slot returns null | Tested |
| P1 | Overwriting a slot replaces completely | UNTESTED |
| P1 | Loading invalid/malformed JSON returns an error result, never throws | UNTESTED |
| P1 | All 3 slots are independent | UNTESTED |

### Storyline

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | Faction choice is exclusive (guard clears mage, vice versa) | Tested |
| P1 | Faction gates block content correctly | Tested |
| P1 | Act flags derive from prerequisite completion | Tested |
| P1 | Full guard path is completable start-to-finish | UNTESTED |
| P1 | Full mage path is completable start-to-finish | UNTESTED |
| P1 | Flag mutations don't affect input object | Tested |

### GameLoopModel

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | Scene transitions follow valid paths only | Tested |
| P1 | Movement respects collision zones | Tested |
| P1 | NPC proximity detection within radius | Tested |
| P1 | Dialog open blocks movement input | Tested |
| P1 | State returned is always a deep copy | Tested |
| P1 | World boundary clamping works on all edges | Tested |

### Player Experience (End-to-End)

| Priority | Contract Item | Status |
|----------|--------------|--------|
| P1 | New game → title → town → walk to Elder → talk → accept main quest | UNTESTED |
| P1 | Accept quest → find goblin → fight → win → quest completes | UNTESTED |
| P1 | Choose guard faction → guard content available, mage locked | UNTESTED |
| P1 | Choose mage faction → mage content available, guard locked | UNTESTED |
| P1 | Win battle → gain EXP → level up → stats increase | UNTESTED |
| P1 | Win battle → receive loot → appears in inventory | UNTESTED |
| P1 | Save game → reload → exact state preserved | Tested |
| P1 | Die in battle → game over screen → can restart | UNTESTED |

---

## Current Coverage Summary

| System | Test Lines | Status | UNTESTED P1 Items |
|--------|-----------|--------|-------------------|
| Combat | 248 | Good | 1 (critical hits) |
| Inventory | 249 | Good | 0 |
| Quest | 234 | Good | 0 |
| Dialog | 69 | Weak | 4 |
| Save | 37 | Weak | 3 |
| Storyline | 88 | Basic | 2 |
| GameLoopModel | 250 | Good | 0 |
| PlayableGame | 0 | None | N/A (rendering layer) |
| MapRenderer | 0 | None | N/A (rendering layer) |
| Player Experience | ~5 scenarios | Basic | 7 |

**Total UNTESTED P1 items: 17**

---

## Implementation Priority

1. **Dialog System** — 4 untested P1 items, weakest engine system
2. **Player Experience E2E** — 7 untested scenarios, validates the actual game works
3. **Save System** — 3 untested P1 items, data integrity matters
4. **Storyline** — 2 untested P1 items, full path completion
5. **Combat** — 1 untested P1 item (critical hits)

---

## Workflow Rule

For every code change, AI must:

1. Identify which contract items are affected
2. Write/update tests that verify those items
3. Run all tests and confirm they pass
4. Mark contract items as Tested
5. Deliver code with test results as proof
