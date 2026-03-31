# Veilbreaker Rising — Full RPG Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Veilbreaker Rising into a full 3-act story-first RPG with a shared StorylineEngine, Act II faction paths (Guard and Mages), Act II convergence, and Act III with four ending branches.

**Architecture:** Phase 1 extracts shared narrative logic (faction exclusivity, prerequisite checks, act flag derivation) into a pure `StorylineEngine` module consumed by both `GameRuntime` and `GameLoopModel`. Phase 2 adds Act II and III story content to both surfaces (JSON data files for the runtime, `GameLoopModel` for the playable surface, `veilbreaker.ts` for the maker).

**Tech Stack:** TypeScript 5.4, Vitest (unit/integration tests), Playwright (e2e), Vite dev server.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/engine/storyline/StorylineEngine.ts` | **Create** | Pure narrative functions: faction exclusivity, gating, prerequisites, act flag derivation |
| `src/engine/storyline/__tests__/StorylineEngine.test.ts` | **Create** | Unit tests for StorylineEngine |
| `src/runtime/GameRuntime.ts` | **Modify** | Use StorylineEngine in `setFlag` and `choose` |
| `src/game/GameLoopModel.ts` | **Modify** | Use StorylineEngine for faction gates; expand QuestId; add Act II/III NPCs |
| `src/data/quests.json` | **Modify** | Add Act II and III quests |
| `src/data/dialog.json` | **Modify** | Add Act II and III dialog trees |
| `src/data/enemies.json` | **Modify** | Add lieutenant and Gorak-final enemies |
| `src/data/loot-tables.json` | **Modify** | Add loot tables for new enemies |
| `src/maker/games/veilbreaker.ts` | **Modify** | Add Act II and III maps, NPCs, quests, dialogs |
| `src/runtime/__tests__/storyline.test.ts` | **Modify** | Add Act II and III story beat tests |
| `tests/e2e/storyline-demo.spec.ts` | **Modify** | Add Guard and Mages full path e2e tests |

---

## Task 1: Create StorylineEngine with pure functions

**Files:**
- Create: `src/engine/storyline/StorylineEngine.ts`
- Create: `src/engine/storyline/__tests__/StorylineEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/engine/storyline/__tests__/StorylineEngine.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  checkQuestPrerequisites,
  deriveActFlags,
  resolveFactionExclusivity,
  resolveFactionGate,
} from '../StorylineEngine';

describe('resolveFactionExclusivity', () => {
  it('sets the target flag to true', () => {
    const result = resolveFactionExclusivity({}, 'joined-guard', true);
    expect(result['joined-guard']).toBe(true);
  });

  it('clears joined-mages when joined-guard is set', () => {
    const result = resolveFactionExclusivity({ 'joined-mages': true }, 'joined-guard', true);
    expect(result['joined-guard']).toBe(true);
    expect(result['joined-mages']).toBe(false);
  });

  it('clears joined-guard when joined-mages is set', () => {
    const result = resolveFactionExclusivity({ 'joined-guard': true }, 'joined-mages', true);
    expect(result['joined-mages']).toBe(true);
    expect(result['joined-guard']).toBe(false);
  });

  it('does not mutate the input flags object', () => {
    const flags = { 'joined-guard': true };
    resolveFactionExclusivity(flags, 'joined-mages', true);
    expect(flags['joined-guard']).toBe(true);
  });

  it('preserves unrelated flags', () => {
    const result = resolveFactionExclusivity({ 'elder-greeted': true }, 'joined-guard', true);
    expect(result['elder-greeted']).toBe(true);
  });
});

describe('resolveFactionGate', () => {
  it('returns true when player has joined the required faction', () => {
    expect(resolveFactionGate({ 'joined-guard': true }, 'guard')).toBe(true);
    expect(resolveFactionGate({ 'joined-mages': true }, 'mages')).toBe(true);
  });

  it('returns false when player has not joined the required faction', () => {
    expect(resolveFactionGate({}, 'guard')).toBe(false);
    expect(resolveFactionGate({ 'joined-mages': true }, 'guard')).toBe(false);
  });
});

describe('checkQuestPrerequisites', () => {
  it('returns true when prerequisites list is empty', () => {
    expect(checkQuestPrerequisites([], [])).toBe(true);
  });

  it('returns true when all prerequisites are completed', () => {
    expect(checkQuestPrerequisites(['q1', 'q2'], ['q1', 'q2', 'q3'])).toBe(true);
  });

  it('returns false when any prerequisite is not completed', () => {
    expect(checkQuestPrerequisites(['q1', 'q2'], ['q1'])).toBe(false);
  });
});

describe('deriveActFlags', () => {
  it('sets act-complete-1 when a faction has been joined', () => {
    expect(deriveActFlags({ 'joined-guard': true })['act-complete-1']).toBe(true);
    expect(deriveActFlags({ 'joined-mages': true })['act-complete-1']).toBe(true);
  });

  it('does not set act-complete-1 when no faction joined', () => {
    expect(deriveActFlags({})['act-complete-1']).toBeUndefined();
  });

  it('does not override act-complete-1 if already set', () => {
    const result = deriveActFlags({ 'joined-guard': true, 'act-complete-1': true });
    expect(result['act-complete-1']).toBeUndefined();
  });

  it('sets act-complete-2 when lieutenant-defeated flag is present', () => {
    expect(deriveActFlags({ 'lieutenant-defeated': true })['act-complete-2']).toBe(true);
  });

  it('does not override act-complete-2 if already set', () => {
    const result = deriveActFlags({ 'lieutenant-defeated': true, 'act-complete-2': true });
    expect(result['act-complete-2']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/engine/storyline/__tests__/StorylineEngine.test.ts
```

Expected: FAIL — `Cannot find module '../StorylineEngine'`

- [ ] **Step 3: Implement StorylineEngine**

Create `src/engine/storyline/StorylineEngine.ts`:

```typescript
/**
 * StorylineEngine — pure narrative logic shared by GameRuntime and GameLoopModel.
 * No side effects, no DOM, no external dependencies.
 */

/**
 * When setting a faction flag, clears the opposing faction.
 * Returns a new flags object; does not mutate input.
 */
export function resolveFactionExclusivity(
  flags: Record<string, boolean>,
  key: string,
  value: boolean,
): Record<string, boolean> {
  const next: Record<string, boolean> = { ...flags, [key]: value };
  if (key === 'joined-guard' && value) next['joined-mages'] = false;
  if (key === 'joined-mages' && value) next['joined-guard'] = false;
  return next;
}

/**
 * Returns true if the player has joined the specified faction.
 */
export function resolveFactionGate(
  flags: Record<string, boolean>,
  requiredFaction: 'guard' | 'mages',
): boolean {
  return flags[`joined-${requiredFaction}`] === true;
}

/**
 * Returns true if all prerequisites are present in completedQuestIds.
 */
export function checkQuestPrerequisites(
  prerequisites: string[],
  completedQuestIds: string[],
): boolean {
  const completed = new Set(completedQuestIds);
  return prerequisites.every((id) => completed.has(id));
}

/**
 * Given current flags, returns any act-completion flags that should now be set.
 * Only returns flags not already set — apply by merging into existing flags.
 */
export function deriveActFlags(flags: Record<string, boolean>): Partial<Record<string, boolean>> {
  const derived: Partial<Record<string, boolean>> = {};
  if (!flags['act-complete-1'] && (flags['joined-guard'] === true || flags['joined-mages'] === true)) {
    derived['act-complete-1'] = true;
  }
  if (!flags['act-complete-2'] && flags['lieutenant-defeated'] === true) {
    derived['act-complete-2'] = true;
  }
  return derived;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/engine/storyline/__tests__/StorylineEngine.test.ts
```

Expected: PASS — all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/storyline/StorylineEngine.ts src/engine/storyline/__tests__/StorylineEngine.test.ts
git commit -m "feat: add StorylineEngine with pure narrative functions"
```

---

## Task 2: Wire GameRuntime to StorylineEngine

**Files:**
- Modify: `src/runtime/GameRuntime.ts`

- [ ] **Step 1: Update imports and setFlag in GameRuntime**

At the top of `src/runtime/GameRuntime.ts`, add:

```typescript
import { deriveActFlags, resolveFactionExclusivity } from '../engine/storyline/StorylineEngine';
```

Replace the existing `setFlag` method (lines ~362–370):

```typescript
// BEFORE:
setFlag(key: string, value: boolean): void {
  if (key === 'joined-guard' && value) {
    this.flags['joined-mages'] = false;
  }
  if (key === 'joined-mages' && value) {
    this.flags['joined-guard'] = false;
  }
  this.flags[key] = value;
}

// AFTER:
setFlag(key: string, value: boolean): void {
  this.flags = resolveFactionExclusivity(this.flags, key, value);
}
```

- [ ] **Step 2: Apply deriveActFlags after dialog choices**

In the `choose` method, after the `this.progressObjectivesFromNpcChoice(...)` call, add:

```typescript
const derived = deriveActFlags(this.flags);
for (const [k, v] of Object.entries(derived)) {
  if (v !== undefined) this.flags[k] = v;
}
```

- [ ] **Step 3: Run full test suite to verify no regressions**

```bash
npm test
```

Expected: All previously passing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/runtime/GameRuntime.ts
git commit -m "refactor: use StorylineEngine in GameRuntime setFlag and choose"
```

---

## Task 3: Wire GameLoopModel to StorylineEngine

**Files:**
- Modify: `src/game/GameLoopModel.ts`

- [ ] **Step 1: Add import**

At the top of `src/game/GameLoopModel.ts`, add:

```typescript
import { deriveActFlags, resolveFactionGate } from '../engine/storyline/StorylineEngine';
```

- [ ] **Step 2: Replace faction gate checks in interact()**

Find the two faction gate guards in `interact()` and replace:

```typescript
// BEFORE (guard-captain):
if (this.state.faction !== 'guard') {

// AFTER:
if (!resolveFactionGate(this.state.flags, 'guard')) {
```

```typescript
// BEFORE (arch-mage):
if (this.state.faction !== 'mages') {

// AFTER:
if (!resolveFactionGate(this.state.flags, 'mages')) {
```

- [ ] **Step 3: Apply deriveActFlags in selectDialogChoice()**

In `selectDialogChoice`, after calling `selected.action()`, add:

```typescript
const derived = deriveActFlags(this.state.flags);
for (const [k, v] of Object.entries(derived)) {
  if (v !== undefined) this.state.flags[k] = v as boolean;
}
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All previously passing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/GameLoopModel.ts
git commit -m "refactor: use StorylineEngine in GameLoopModel faction gates"
```

---

## Task 4: Add Act II Guard Path — JSON data and GameRuntime wiring

**Files:**
- Modify: `src/data/quests.json`
- Modify: `src/data/dialog.json`
- Modify: `src/data/enemies.json`
- Modify: `src/data/loot-tables.json`
- Modify: `src/runtime/GameRuntime.ts`

- [ ] **Step 1: Add guard-path quests to src/data/quests.json**

Append to the JSON array (before the closing `]`):

```json
,
  {
    "id": "guard-march",
    "title": "March Orders",
    "prerequisites": ["faction-choice"],
    "objectives": [
      { "id": "talk-davan", "type": "TALK_TO_NPC", "required": 1 }
    ]
  },
  {
    "id": "expose-the-traitor",
    "title": "Expose the Traitor",
    "prerequisites": ["guard-march"],
    "objectives": [
      { "id": "confront-crest", "type": "TALK_TO_NPC", "required": 1 }
    ]
  }
```

- [ ] **Step 2: Add guard-path dialog trees to src/data/dialog.json**

Append to the dialog JSON array (before the closing `]`):

```json
,
  {
    "npcId": "npc-sergeant-davan",
    "rootNodeId": "root",
    "nodes": [
      {
        "id": "root",
        "text": "Sergeant Davan, Iron Guard. Captain Vera sent you? Good. The garrison at north gate is stretched thin. We need your blade on the march.",
        "choices": [
          {
            "text": "I am ready to march.",
            "nextNodeId": "accepted",
            "conditions": { "flag": { "key": "joined-guard", "value": true } },
            "actions": {
              "activateQuest": "guard-march",
              "setFlag": { "key": "davan-met", "value": true }
            }
          },
          {
            "text": "I fight for the Mages.",
            "nextNodeId": "rejected"
          }
        ]
      },
      {
        "id": "accepted",
        "text": "Fall in. But watch yourself — Officer Crest has been acting strange lately. Keep your ears open.",
        "choices": []
      },
      {
        "id": "rejected",
        "text": "Then you have no place in this formation. Move along.",
        "choices": []
      }
    ]
  },
  {
    "npcId": "npc-officer-crest",
    "rootNodeId": "root",
    "nodes": [
      {
        "id": "root",
        "text": "Officer Crest. I... did not expect visitors. Whatever you heard — it is not what it looks like.",
        "choices": [
          {
            "text": "I am reporting this to the Captain.",
            "nextNodeId": "exposed",
            "conditions": { "flag": { "key": "joined-guard", "value": true } },
            "actions": {
              "setFlag": { "key": "guard-betrayal-exposed", "value": true }
            }
          },
          {
            "text": "I saw nothing. Carry on.",
            "nextNodeId": "covered",
            "conditions": { "flag": { "key": "joined-guard", "value": true } }
          }
        ]
      },
      {
        "id": "exposed",
        "text": "You will regret this. The Guard is not as clean as you think.",
        "choices": []
      },
      {
        "id": "covered",
        "text": "Wise. Some things are better left unseen. I will remember this.",
        "choices": []
      }
    ]
  }
```

- [ ] **Step 3: Add goblin-lieutenant enemy to src/data/enemies.json**

Append to the enemies JSON array (before the closing `]`):

```json
,
  {
    "id": "goblin-lieutenant",
    "name": "Gorak's Lieutenant",
    "stats": { "hp": 22, "attack": 7, "defense": 3, "speed": 4 },
    "lootTableId": "loot-lieutenant",
    "expReward": 20
  }
```

- [ ] **Step 4: Add loot table for lieutenant to src/data/loot-tables.json**

Append to the loot-tables JSON array (before the closing `]`):

```json
,
  {
    "id": "loot-lieutenant",
    "drops": [
      { "itemId": "iron-sword", "weight": 50 },
      { "itemId": "potion", "weight": 50 }
    ]
  }
```

- [ ] **Step 5: Wire GameRuntime objective progress for new NPCs**

In `src/runtime/GameRuntime.ts`, add to `DIALOG_OBJECTIVE_PROGRESS`:

```typescript
'npc-sergeant-davan': [{ questId: 'guard-march', objectiveId: 'talk-davan', amount: 1 }],
'npc-officer-crest': [{ questId: 'expose-the-traitor', objectiveId: 'confront-crest', amount: 1 }],
```

Add to `ENEMY_OBJECTIVE_PROGRESS` (later, for the lieutenant — skip for now, covered in Task 10).

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: All previously passing tests pass. New quests/dialogs are registered silently.

- [ ] **Step 7: Commit**

```bash
git add src/data/quests.json src/data/dialog.json src/data/enemies.json src/data/loot-tables.json src/runtime/GameRuntime.ts
git commit -m "feat: add Act II guard-path quests, dialog, and enemies"
```

---

## Task 5: Act II Guard Path — GameLoopModel NPCs and interact handlers

**Files:**
- Modify: `src/game/GameLoopModel.ts`

- [ ] **Step 1: Expand QuestId type**

Find `type QuestId = ...` and replace with:

```typescript
type QuestId =
  | 'main-quest'
  | 'slime-hunt'
  | 'faction-choice'
  | 'guard-patrol'
  | 'veil-mending'
  | 'guard-march'
  | 'expose-the-traitor'
  | 'decode-the-ruins'
  | 'solens-sacrifice'
  | 'defeat-the-lieutenant'
  | 'final-confrontation';
```

- [ ] **Step 2: Update questSeed() to include new quests**

```typescript
function questSeed(): Record<QuestId, QuestState> {
  return {
    'main-quest': 'INACTIVE',
    'slime-hunt': 'INACTIVE',
    'faction-choice': 'INACTIVE',
    'guard-patrol': 'INACTIVE',
    'veil-mending': 'INACTIVE',
    'guard-march': 'INACTIVE',
    'expose-the-traitor': 'INACTIVE',
    'decode-the-ruins': 'INACTIVE',
    'solens-sacrifice': 'INACTIVE',
    'defeat-the-lieutenant': 'INACTIVE',
    'final-confrontation': 'INACTIVE',
  };
}
```

- [ ] **Step 3: Add guard-path NPCs to state.npcs**

In the `GameLoopModel` initial state, add to the `npcs` array:

```typescript
{ id: 'npc-sergeant-davan', x: 320, y: 80, width: 16, height: 16, title: 'Sergeant Davan' },
{ id: 'npc-officer-crest', x: 360, y: 100, width: 16, height: 16, title: 'Officer Crest' },
```

Also add these same entries in the `reset()` method's npcs re-assignment (the `reset` does not reset npcs so they stay — no change needed there).

- [ ] **Step 4: Add interact handlers for guard-path NPCs**

At the end of the `interact()` method, before the final `}`, add:

```typescript
if (npcId === 'npc-sergeant-davan') {
  if (!resolveFactionGate(this.state.flags, 'guard')) {
    this.openDialog(npcId, 'I answer to the Iron Guard only.', [{ text: 'Understood', action: () => {} }]);
    return;
  }
  this.openDialog(
    npcId,
    'Sergeant Davan, Iron Guard. Captain Vera sent you? Good. The garrison at north gate is stretched thin. We need your blade on the march.',
    [
      {
        text: 'I am ready to march.',
        action: () => {
          this.state.flags['davan-met'] = true;
          this.state.quests['guard-march'] = 'ACTIVE';
        },
      },
      { text: 'Not yet', action: () => {} },
    ],
  );
  return;
}

if (npcId === 'npc-officer-crest') {
  if (!resolveFactionGate(this.state.flags, 'guard')) {
    this.openDialog(npcId, 'Move along, civilian.', [{ text: 'Fine', action: () => {} }]);
    return;
  }
  this.openDialog(
    npcId,
    'Officer Crest. I... did not expect visitors. Whatever you heard — it is not what it looks like.',
    [
      {
        text: 'I am reporting this to the Captain.',
        action: () => {
          this.state.flags['guard-betrayal-exposed'] = true;
          this.state.quests['expose-the-traitor'] = 'COMPLETED';
        },
      },
      {
        text: 'I saw nothing. Carry on.',
        action: () => {
          this.state.quests['expose-the-traitor'] = 'COMPLETED';
        },
      },
    ],
  );
  return;
}
```

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/game/GameLoopModel.ts
git commit -m "feat: add guard-path NPCs and interact handlers to GameLoopModel"
```

---

## Task 6: Act II Guard Path — veilbreaker.ts maker

**Files:**
- Modify: `src/maker/games/veilbreaker.ts`

- [ ] **Step 1: Add guard-barracks map and guard-path NPCs to veilbreaker.ts**

After the `.addMap({ id: 'north-gate', ...})` call, add:

```typescript
.addMap({ id: 'guard-barracks', name: 'Guard Barracks', width: 50, height: 30, spawn: { x: 8, y: 10 } })
```

After existing NPC definitions, add:

```typescript
.addNpc({ id: 'npc-sergeant-davan', name: 'Sergeant Davan', mapId: 'guard-barracks', x: 12, y: 10 })
.addNpc({ id: 'npc-officer-crest', name: 'Officer Crest', mapId: 'guard-barracks', x: 16, y: 10 })
```

- [ ] **Step 2: Add guard-path quests to veilbreaker.ts**

After existing quest definitions, add:

```typescript
.addQuest({
  id: 'guard-march',
  title: 'March Orders',
  prerequisites: ['faction-choice'],
  objectives: [{ id: 'talk-davan', type: 'TALK_TO_NPC', required: 1 }],
})
.addQuest({
  id: 'expose-the-traitor',
  title: 'Expose the Traitor',
  prerequisites: ['guard-march'],
  objectives: [{ id: 'confront-crest', type: 'TALK_TO_NPC', required: 1 }],
})
```

- [ ] **Step 3: Add guard-path dialogs to veilbreaker.ts**

After existing dialog definitions, add:

```typescript
.addDialog({
  npcId: 'npc-sergeant-davan',
  rootNodeId: 'root',
  nodes: [
    {
      id: 'root',
      text: 'Sergeant Davan, Iron Guard. The garrison needs your blade on the march.',
      choices: [
        { text: 'I am ready to march.', actions: [{ type: 'activateQuest', value: 'guard-march' }, { type: 'setFlag', value: 'davan-met' }] },
      ],
    },
  ],
})
.addDialog({
  npcId: 'npc-officer-crest',
  rootNodeId: 'root',
  nodes: [
    {
      id: 'root',
      text: 'Officer Crest. Whatever you heard — it is not what it looks like.',
      choices: [
        { text: 'I am reporting this to the Captain.', actions: [{ type: 'setFlag', value: 'guard-betrayal-exposed' }] },
        { text: 'I saw nothing. Carry on.' },
      ],
    },
  ],
})
```

- [ ] **Step 4: Run maker tests**

```bash
npx vitest run src/maker/__tests__/veilbreaker.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/maker/games/veilbreaker.ts
git commit -m "feat: add guard-path maps, NPCs, quests, dialogs to veilbreaker maker"
```

---

## Task 7: Add Act II Mages Path — JSON data and GameRuntime wiring

**Files:**
- Modify: `src/data/quests.json`
- Modify: `src/data/dialog.json`
- Modify: `src/runtime/GameRuntime.ts`

- [ ] **Step 1: Add mages-path quests to src/data/quests.json**

Append to the JSON array:

```json
,
  {
    "id": "decode-the-ruins",
    "title": "Decode the Ruins",
    "prerequisites": ["faction-choice"],
    "objectives": [
      { "id": "talk-lira", "type": "TALK_TO_NPC", "required": 1 }
    ]
  },
  {
    "id": "solens-sacrifice",
    "title": "Solen's Sacrifice",
    "prerequisites": ["decode-the-ruins"],
    "objectives": [
      { "id": "consult-solen-act2", "type": "TALK_TO_NPC", "required": 1 }
    ]
  }
```

- [ ] **Step 2: Add mages-path dialog trees to src/data/dialog.json**

Append to the dialog JSON array:

```json
,
  {
    "npcId": "npc-scholar-lira",
    "rootNodeId": "root",
    "nodes": [
      {
        "id": "root",
        "text": "Scholar Lira. I have been deciphering the ruin texts near the eastern cave — the Veil was not always a barrier. Once it was a living lattice, and I think I know how to reactivate it. Arch-Mage Solen must hear this.",
        "choices": [
          {
            "text": "Tell me what you know.",
            "nextNodeId": "accepted",
            "conditions": { "flag": { "key": "joined-mages", "value": true } },
            "actions": {
              "activateQuest": "decode-the-ruins",
              "setFlag": { "key": "lira-met", "value": true }
            }
          },
          {
            "text": "The Guard will handle it.",
            "nextNodeId": "rejected"
          }
        ]
      },
      {
        "id": "accepted",
        "text": "Bring this to Solen. But warn him — the reactivation will draw deeply from the caster. He needs to know the cost before he commits.",
        "choices": []
      },
      {
        "id": "rejected",
        "text": "Then I hope the Guard's steel is enough. Ancient magic is not so easily ignored.",
        "choices": []
      }
    ]
  },
  {
    "npcId": "npc-solen-sacrifice",
    "rootNodeId": "root",
    "nodes": [
      {
        "id": "root",
        "text": "I have read Lira's findings. The lattice reactivation is possible — but it will cost me everything. I go into this knowing that. Unless... did you come to warn me?",
        "choices": [
          {
            "text": "I am warning you. Find another way.",
            "nextNodeId": "warned",
            "conditions": { "flag": { "key": "joined-mages", "value": true } },
            "actions": {
              "setFlag": { "key": "solen-warned", "value": true }
            }
          },
          {
            "text": "The Veil must be mended. Do what you must.",
            "nextNodeId": "resolute",
            "conditions": { "flag": { "key": "joined-mages", "value": true } }
          }
        ]
      },
      {
        "id": "warned",
        "text": "A warning, then. I will not waste it. Perhaps there is a way to split the cost across more anchors. I will try.",
        "choices": []
      },
      {
        "id": "resolute",
        "text": "Then it is decided. Whatever comes — the Veil will hold. That is what matters.",
        "choices": []
      }
    ]
  }
```

- [ ] **Step 3: Wire GameRuntime objective progress for mages NPCs**

In `src/runtime/GameRuntime.ts`, add to `DIALOG_OBJECTIVE_PROGRESS`:

```typescript
'npc-scholar-lira': [{ questId: 'decode-the-ruins', objectiveId: 'talk-lira', amount: 1 }],
'npc-solen-sacrifice': [{ questId: 'solens-sacrifice', objectiveId: 'consult-solen-act2', amount: 1 }],
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/quests.json src/data/dialog.json src/runtime/GameRuntime.ts
git commit -m "feat: add Act II mages-path quests, dialog, and runtime wiring"
```

---

## Task 8: Act II Mages Path — GameLoopModel and veilbreaker.ts

**Files:**
- Modify: `src/game/GameLoopModel.ts`
- Modify: `src/maker/games/veilbreaker.ts`

- [ ] **Step 1: Add mages-path NPCs to GameLoopModel state.npcs**

In the initial `state.npcs` array, add:

```typescript
{ id: 'npc-scholar-lira', x: 400, y: 80, width: 16, height: 16, title: 'Scholar Lira' },
{ id: 'npc-solen-sacrifice', x: 440, y: 100, width: 16, height: 16, title: 'Arch-Mage Solen (Sanctum)' },
```

- [ ] **Step 2: Add mages-path interact handlers**

At the end of `interact()`, add:

```typescript
if (npcId === 'npc-scholar-lira') {
  if (!resolveFactionGate(this.state.flags, 'mages')) {
    this.openDialog(npcId, 'I share my research with Veil Mages only.', [{ text: 'Understood', action: () => {} }]);
    return;
  }
  this.openDialog(
    npcId,
    'Scholar Lira. I have decoded the ruin texts — the Veil was once a living lattice. Arch-Mage Solen must hear this.',
    [
      {
        text: 'Tell me what you know.',
        action: () => {
          this.state.flags['lira-met'] = true;
          this.state.quests['decode-the-ruins'] = 'ACTIVE';
        },
      },
      { text: 'Not now', action: () => {} },
    ],
  );
  return;
}

if (npcId === 'npc-solen-sacrifice') {
  if (!resolveFactionGate(this.state.flags, 'mages')) {
    this.openDialog(npcId, 'Only sworn mages may witness this.', [{ text: 'I understand', action: () => {} }]);
    return;
  }
  this.openDialog(
    npcId,
    'The lattice reactivation will cost me everything. I go into this knowing that. Did you come to warn me?',
    [
      {
        text: 'I am warning you. Find another way.',
        action: () => {
          this.state.flags['solen-warned'] = true;
          this.state.quests['solens-sacrifice'] = 'COMPLETED';
        },
      },
      {
        text: 'The Veil must be mended. Do what you must.',
        action: () => {
          this.state.quests['solens-sacrifice'] = 'COMPLETED';
        },
      },
    ],
  );
  return;
}
```

- [ ] **Step 3: Add mages-path to veilbreaker.ts**

Add map, NPCs, quests, and dialogs for mages path:

```typescript
// After guard-barracks map:
.addMap({ id: 'mages-archive', name: 'Mages Archive', width: 46, height: 28, spawn: { x: 7, y: 9 } })

// After guard-path NPCs:
.addNpc({ id: 'npc-scholar-lira', name: 'Scholar Lira', mapId: 'mages-archive', x: 10, y: 8 })
.addNpc({ id: 'npc-solen-sacrifice', name: 'Arch-Mage Solen (Sanctum)', mapId: 'mages-archive', x: 15, y: 9 })

// After expose-the-traitor quest:
.addQuest({
  id: 'decode-the-ruins',
  title: 'Decode the Ruins',
  prerequisites: ['faction-choice'],
  objectives: [{ id: 'talk-lira', type: 'TALK_TO_NPC', required: 1 }],
})
.addQuest({
  id: 'solens-sacrifice',
  title: "Solen's Sacrifice",
  prerequisites: ['decode-the-ruins'],
  objectives: [{ id: 'consult-solen-act2', type: 'TALK_TO_NPC', required: 1 }],
})

// After guard-path dialogs:
.addDialog({
  npcId: 'npc-scholar-lira',
  rootNodeId: 'root',
  nodes: [
    {
      id: 'root',
      text: 'Scholar Lira. I decoded the ruin texts — the Veil was once a living lattice.',
      choices: [
        { text: 'Tell me what you know.', actions: [{ type: 'activateQuest', value: 'decode-the-ruins' }, { type: 'setFlag', value: 'lira-met' }] },
      ],
    },
  ],
})
.addDialog({
  npcId: 'npc-solen-sacrifice',
  rootNodeId: 'root',
  nodes: [
    {
      id: 'root',
      text: 'The reactivation will cost me everything. Did you come to warn me?',
      choices: [
        { text: 'I am warning you. Find another way.', actions: [{ type: 'setFlag', value: 'solen-warned' }] },
        { text: 'The Veil must be mended. Do what you must.' },
      ],
    },
  ],
})
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/game/GameLoopModel.ts src/maker/games/veilbreaker.ts
git commit -m "feat: add mages-path NPCs, handlers, and maker entries"
```

---

## Task 9: Add Act II story beat tests

**Files:**
- Modify: `src/runtime/__tests__/storyline.test.ts`

- [ ] **Step 1: Write failing tests for guard-path beats**

Append to `src/runtime/__tests__/storyline.test.ts`:

```typescript
// ---------------------------------------------------------------------------
// ACT II — The Divergence (Guard Path)
// ---------------------------------------------------------------------------

describe('Act II — Guard path: Sergeant Davan issues march orders', () => {
  it('Davan activates guard-march quest for Guard members', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(0); // Join the Guard
    game.triggerDialog('npc-sergeant-davan');
    game.choose(0);
    expect(game.getQuestState()['guard-march']).toBe('ACTIVE');
  });

  it('Davan is inaccessible to Mages faction members', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(1); // Join the Mages
    game.triggerDialog('npc-sergeant-davan');
    // No valid choice index 0 for non-guard (condition blocks the choice)
    expect(game.getQuestState()['guard-march']).toBe('INACTIVE');
  });

  it('act-complete-1 is set after joining the Guard', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(0);
    expect(game.getFlags()['act-complete-1']).toBe(true);
  });
});

describe('Act II — Guard path: Officer Crest confrontation', () => {
  it('exposing Crest sets guard-betrayal-exposed flag', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(0); // Guard
    game.triggerDialog('npc-sergeant-davan');
    game.choose(0);
    game.triggerDialog('npc-officer-crest');
    game.choose(0); // Expose
    expect(game.getFlags()['guard-betrayal-exposed']).toBe(true);
    expect(game.getQuestState()['expose-the-traitor']).toBe('COMPLETED');
  });

  it('covering for Crest leaves guard-betrayal-exposed unset', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(0); // Guard
    game.triggerDialog('npc-sergeant-davan');
    game.choose(0);
    game.triggerDialog('npc-officer-crest');
    game.choose(1); // Cover it up
    expect(game.getFlags()['guard-betrayal-exposed']).toBeFalsy();
    expect(game.getQuestState()['expose-the-traitor']).toBe('COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// ACT II — The Divergence (Mages Path)
// ---------------------------------------------------------------------------

describe('Act II — Mages path: Scholar Lira reveals the lattice', () => {
  it('Lira activates decode-the-ruins for Mages members', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(1); // Join Mages
    game.triggerDialog('npc-scholar-lira');
    game.choose(0);
    expect(game.getQuestState()['decode-the-ruins']).toBe('ACTIVE');
  });

  it('act-complete-1 is set after joining the Mages', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(1);
    expect(game.getFlags()['act-complete-1']).toBe(true);
  });
});

describe("Act II — Mages path: Solen's sacrifice choice", () => {
  it('warning Solen sets solen-warned flag', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(1); // Mages
    game.triggerDialog('npc-scholar-lira');
    game.choose(0);
    game.triggerDialog('npc-solen-sacrifice');
    game.choose(0); // Warn him
    expect(game.getFlags()['solen-warned']).toBe(true);
    expect(game.getQuestState()['solens-sacrifice']).toBe('COMPLETED');
  });

  it('staying silent leaves solen-warned unset', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(1); // Mages
    game.triggerDialog('npc-scholar-lira');
    game.choose(0);
    game.triggerDialog('npc-solen-sacrifice');
    game.choose(1); // Stay silent
    expect(game.getFlags()['solen-warned']).toBeFalsy();
    expect(game.getQuestState()['solens-sacrifice']).toBe('COMPLETED');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail or pass**

```bash
npx vitest run src/runtime/__tests__/storyline.test.ts
```

Expected: Act II tests pass (data and wiring already added in Tasks 4–8).

- [ ] **Step 3: Commit**

```bash
git add src/runtime/__tests__/storyline.test.ts
git commit -m "test: add Act II guard and mages path story beat tests"
```

---

## Task 10: Add Act II Convergence — data, runtime, GameLoopModel, maker

**Files:**
- Modify: `src/data/quests.json`
- Modify: `src/data/dialog.json`
- Modify: `src/runtime/GameRuntime.ts`
- Modify: `src/game/GameLoopModel.ts`
- Modify: `src/maker/games/veilbreaker.ts`

- [ ] **Step 1: Add convergence quest to src/data/quests.json**

Append:

```json
,
  {
    "id": "defeat-the-lieutenant",
    "title": "Defeat the Lieutenant",
    "prerequisites": [],
    "objectives": [
      { "id": "defeat-lieutenant", "type": "DEFEAT_ENEMY", "required": 1 }
    ]
  }
```

- [ ] **Step 2: Add convergence herald dialog to src/data/dialog.json**

Append:

```json
,
  {
    "npcId": "npc-lieutenant-herald",
    "rootNodeId": "root",
    "nodes": [
      {
        "id": "root",
        "text": "Gorak's Lieutenant guards the Veil Ruins. He knows you are coming. Both factions must move now — together or not at all.",
        "choices": [
          {
            "text": "We face him now.",
            "nextNodeId": "accepted",
            "conditions": { "flag": { "key": "act-complete-1", "value": true } },
            "actions": {
              "activateQuest": "defeat-the-lieutenant",
              "setFlag": { "key": "lieutenant-briefed", "value": true }
            }
          },
          {
            "text": "We are not ready yet.",
            "nextNodeId": "waiting"
          }
        ]
      },
      {
        "id": "accepted",
        "text": "Then we march. The ruins are ahead. Stay sharp.",
        "choices": []
      },
      {
        "id": "waiting",
        "text": "When you are ready. He will not wait forever.",
        "choices": []
      }
    ]
  }
```

- [ ] **Step 3: Wire GameRuntime for convergence**

In `src/runtime/GameRuntime.ts`:

Add to `DIALOG_OBJECTIVE_PROGRESS`:
```typescript
'npc-lieutenant-herald': [],
```

Add to `ENEMY_OBJECTIVE_PROGRESS`:
```typescript
'goblin-lieutenant': [{ questId: 'defeat-the-lieutenant', objectiveId: 'defeat-lieutenant', amount: 1 }],
```

In `endBattle`, after the `progressObjectivesFromEnemies` call, add:

```typescript
if (outcome === 'win' && defeatedEnemies.includes('goblin-lieutenant')) {
  this.setFlag('lieutenant-defeated', true);
  const derived = deriveActFlags(this.flags);
  for (const [k, v] of Object.entries(derived)) {
    if (v !== undefined) this.flags[k] = v;
  }
}
```

Note: `deriveActFlags` is already imported from Task 2.

- [ ] **Step 4: Add convergence to GameLoopModel**

In `state.npcs`, add:
```typescript
{ id: 'npc-lieutenant-herald', x: 480, y: 80, width: 16, height: 16, title: 'Veil Ruins Herald' },
```

In `interact()`, add:
```typescript
if (npcId === 'npc-lieutenant-herald') {
  if (!this.state.flags['act-complete-1']) {
    this.openDialog(npcId, 'You are not ready. Choose your faction first.', [{ text: 'I understand', action: () => {} }]);
    return;
  }
  this.openDialog(
    npcId,
    "Gorak's Lieutenant guards the Veil Ruins. Both factions must move now.",
    [
      {
        text: 'We face him now.',
        action: () => {
          this.state.flags['lieutenant-briefed'] = true;
          this.state.quests['defeat-the-lieutenant'] = 'ACTIVE';
        },
      },
      { text: 'We are not ready yet.', action: () => {} },
    ],
  );
  return;
}
```

In `onBattleWin()`, add lieutenant handling:
```typescript
if (enemyId === 'goblin-lieutenant') {
  this.grantExp(20);
  this.state.quests['defeat-the-lieutenant'] = 'COMPLETED';
  this.state.flags['lieutenant-defeated'] = true;
  const derived = deriveActFlags(this.state.flags);
  for (const [k, v] of Object.entries(derived)) {
    if (v !== undefined) this.state.flags[k] = v as boolean;
  }
}
```

- [ ] **Step 5: Add convergence to veilbreaker.ts**

```typescript
// Add map:
.addMap({ id: 'veil-ruins', name: 'Veil Ruins', width: 54, height: 32, spawn: { x: 10, y: 12 } })

// Add NPC:
.addNpc({ id: 'npc-lieutenant-herald', name: 'Veil Ruins Herald', mapId: 'veil-ruins', x: 14, y: 10 })

// Add quest:
.addQuest({
  id: 'defeat-the-lieutenant',
  title: 'Defeat the Lieutenant',
  prerequisites: [],
  objectives: [{ id: 'defeat-lieutenant', type: 'DEFEAT_ENEMY', required: 1 }],
})

// Add dialog:
.addDialog({
  npcId: 'npc-lieutenant-herald',
  rootNodeId: 'root',
  nodes: [
    {
      id: 'root',
      text: "Gorak's Lieutenant guards the Veil Ruins. Both factions must move now.",
      choices: [
        { text: 'We face him now.', actions: [{ type: 'activateQuest', value: 'defeat-the-lieutenant' }, { type: 'setFlag', value: 'lieutenant-briefed' }] },
      ],
    },
  ],
})
```

- [ ] **Step 6: Write and run convergence tests**

Append to `src/runtime/__tests__/storyline.test.ts`:

```typescript
// ---------------------------------------------------------------------------
// ACT II — Convergence
// ---------------------------------------------------------------------------

describe('Act II — Convergence: the lieutenant fight', () => {
  it('defeat-the-lieutenant quest activates via herald (Guard path)', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(0); // Guard
    game.triggerDialog('npc-lieutenant-herald');
    game.choose(0);
    expect(game.getQuestState()['defeat-the-lieutenant']).toBe('ACTIVE');
  });

  it('defeat-the-lieutenant quest activates via herald (Mages path)', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(1); // Mages
    game.triggerDialog('npc-lieutenant-herald');
    game.choose(0);
    expect(game.getQuestState()['defeat-the-lieutenant']).toBe('ACTIVE');
  });

  it('herald is inaccessible before act-complete-1', () => {
    const game = rt();
    game.triggerDialog('npc-lieutenant-herald');
    expect(game.getQuestState()['defeat-the-lieutenant']).toBe('INACTIVE');
  });

  it('defeating the lieutenant sets lieutenant-defeated and act-complete-2', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader');
    game.choose(0);
    game.triggerDialog('npc-lieutenant-herald');
    game.choose(0);
    game.startBattle(['goblin-lieutenant']);
    game.endBattle('win');
    expect(game.getFlags()['lieutenant-defeated']).toBe(true);
    expect(game.getFlags()['act-complete-2']).toBe(true);
    expect(game.getQuestState()['defeat-the-lieutenant']).toBe('COMPLETED');
  });
});
```

```bash
npx vitest run src/runtime/__tests__/storyline.test.ts
```

Expected: All convergence tests pass.

- [ ] **Step 7: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/data/quests.json src/data/dialog.json src/runtime/GameRuntime.ts src/game/GameLoopModel.ts src/maker/games/veilbreaker.ts src/runtime/__tests__/storyline.test.ts
git commit -m "feat: add Act II convergence (lieutenant, herald, act-complete-2)"
```

---

## Task 11: Add Act III — data, runtime, GameLoopModel, maker

**Files:**
- Modify: `src/data/quests.json`
- Modify: `src/data/dialog.json`
- Modify: `src/runtime/GameRuntime.ts`
- Modify: `src/game/GameLoopModel.ts`
- Modify: `src/maker/games/veilbreaker.ts`

- [ ] **Step 1: Add final-confrontation quest to src/data/quests.json**

Append:

```json
,
  {
    "id": "final-confrontation",
    "title": "The Final Confrontation",
    "prerequisites": ["defeat-the-lieutenant"],
    "objectives": [
      { "id": "defeat-gorak-final", "type": "DEFEAT_ENEMY", "required": 1 }
    ]
  }
```

- [ ] **Step 2: Add Act III dialogs to src/data/dialog.json**

Append the sanctum herald and epilog NPCs:

```json
,
  {
    "npcId": "npc-sanctum-herald",
    "rootNodeId": "root",
    "nodes": [
      {
        "id": "root",
        "text": "The Veil Sanctum lies beyond this gate. Gorak waits inside with the final Veil Stone. This ends here.",
        "choices": [
          {
            "text": "We end it now.",
            "nextNodeId": "accepted",
            "conditions": { "flag": { "key": "act-complete-2", "value": true } },
            "actions": {
              "activateQuest": "final-confrontation",
              "setFlag": { "key": "sanctum-entered", "value": true }
            }
          },
          {
            "text": "Not yet.",
            "nextNodeId": "waiting"
          }
        ]
      },
      {
        "id": "accepted",
        "text": "Then it is time. For Ironveil.",
        "choices": []
      },
      {
        "id": "waiting",
        "text": "When you are ready. The Sanctum will hold.",
        "choices": []
      }
    ]
  },
  {
    "npcId": "npc-epilog",
    "rootNodeId": "root",
    "nodes": [
      {
        "id": "root",
        "text": "Gorak has fallen. The Veil holds. What comes next depends on the path you walked.",
        "choices": [
          {
            "text": "The Guard holds the Sanctum.",
            "nextNodeId": "guard-ending",
            "conditions": { "flag": { "key": "joined-guard", "value": true } }
          },
          {
            "text": "The Veil is mended.",
            "nextNodeId": "mages-ending",
            "conditions": { "flag": { "key": "joined-mages", "value": true } }
          }
        ]
      },
      {
        "id": "guard-ending",
        "text": "The Iron Guard secures the Veil Sanctum. Order is restored.",
        "choices": [
          {
            "text": "What of Officer Crest?",
            "nextNodeId": "guard-betrayal-aftermath",
            "conditions": { "flag": { "key": "guard-betrayal-exposed", "value": true } }
          },
          {
            "text": "The victory is complete.",
            "nextNodeId": "fin"
          }
        ]
      },
      {
        "id": "guard-betrayal-aftermath",
        "text": "Officer Crest was arrested. The Guard is purged of traitors. You made the right call.",
        "choices": []
      },
      {
        "id": "mages-ending",
        "text": "Arch-Mage Solen channels the final Veil Stone. The Barrier seals completely.",
        "choices": [
          {
            "text": "Did Solen survive?",
            "nextNodeId": "solen-survived",
            "conditions": { "flag": { "key": "solen-warned", "value": true } }
          },
          {
            "text": "The Veil holds.",
            "nextNodeId": "solen-gone"
          }
        ]
      },
      {
        "id": "solen-survived",
        "text": "Your warning gave Solen time to prepare. He lives — diminished, but grateful. Scholar Lira weeps with relief.",
        "choices": []
      },
      {
        "id": "solen-gone",
        "text": "Solen poured everything into the seal. He did not survive. Scholar Lira mourns her mentor. The Veil holds.",
        "choices": []
      },
      {
        "id": "fin",
        "text": "The chapter is closed. Ironveil is safe.",
        "choices": []
      }
    ]
  }
```

- [ ] **Step 3: Wire GameRuntime for Act III**

In `src/runtime/GameRuntime.ts`:

Add to `DIALOG_OBJECTIVE_PROGRESS`:
```typescript
'npc-sanctum-herald': [],
'npc-epilog': [],
```

Add to `ENEMY_OBJECTIVE_PROGRESS` (alongside existing `goblin-boss`):
```typescript
// goblin-boss already maps to main-quest; also progress final-confrontation:
```

Update the `ENEMY_OBJECTIVE_PROGRESS` entry for `goblin-boss` to also progress `final-confrontation`:
```typescript
'goblin-boss': [
  { questId: 'main-quest', objectiveId: 'defeat-goblin-boss', amount: 1 },
  { questId: 'final-confrontation', objectiveId: 'defeat-gorak-final', amount: 1 },
],
```

- [ ] **Step 4: Add Act III to GameLoopModel**

In `state.npcs`, add:
```typescript
{ id: 'npc-sanctum-herald', x: 520, y: 80, width: 16, height: 16, title: 'Sanctum Herald' },
{ id: 'npc-epilog', x: 560, y: 100, width: 16, height: 16, title: 'Epilog Witness' },
```

In `interact()`, add:
```typescript
if (npcId === 'npc-sanctum-herald') {
  if (!this.state.flags['act-complete-2']) {
    this.openDialog(npcId, 'Defeat the Lieutenant first. Then return.', [{ text: 'I understand', action: () => {} }]);
    return;
  }
  this.openDialog(
    npcId,
    'The Veil Sanctum lies beyond. Gorak waits inside. This ends here.',
    [
      {
        text: 'We end it now.',
        action: () => {
          this.state.flags['sanctum-entered'] = true;
          this.state.quests['final-confrontation'] = 'ACTIVE';
        },
      },
      { text: 'Not yet.', action: () => {} },
    ],
  );
  return;
}

if (npcId === 'npc-epilog') {
  const isGuard = resolveFactionGate(this.state.flags, 'guard');
  const isMages = resolveFactionGate(this.state.flags, 'mages');
  const betrayalExposed = this.state.flags['guard-betrayal-exposed'];
  const solenWarned = this.state.flags['solen-warned'];

  let text = 'Gorak has fallen. The Veil holds.';
  if (isGuard) {
    text = betrayalExposed
      ? 'The Iron Guard secures the Sanctum. Officer Crest was arrested — the Guard is clean.'
      : 'The Iron Guard secures the Sanctum. Order is restored.';
  } else if (isMages) {
    text = solenWarned
      ? 'Solen mended the Veil and survived. Your warning made the difference.'
      : 'Solen mended the Veil. He did not survive. Scholar Lira mourns her mentor.';
  }

  this.openDialog(npcId, text, [{ text: 'The chapter is closed.', action: () => {} }]);
  return;
}
```

In `onBattleWin()`, after the `goblin-boss` block, update to also complete `final-confrontation`:
```typescript
if (enemyId === 'goblin-boss') {
  this.grantExp(30);
  this.defeatedBoss = true;
  this.state.quests['main-quest'] = 'COMPLETED';
  if (this.state.quests['final-confrontation'] === 'ACTIVE') {
    this.state.quests['final-confrontation'] = 'COMPLETED';
  }
}
```

- [ ] **Step 5: Add Act III to veilbreaker.ts**

```typescript
// Add map:
.addMap({ id: 'veil-sanctum', name: 'Veil Sanctum', width: 60, height: 36, spawn: { x: 12, y: 14 } })

// Add NPCs:
.addNpc({ id: 'npc-sanctum-herald', name: 'Sanctum Herald', mapId: 'veil-sanctum', x: 16, y: 12 })
.addNpc({ id: 'npc-epilog', name: 'Epilog Witness', mapId: 'veil-sanctum', x: 20, y: 14 })

// Add quest:
.addQuest({
  id: 'final-confrontation',
  title: 'The Final Confrontation',
  prerequisites: ['defeat-the-lieutenant'],
  objectives: [{ id: 'defeat-gorak-final', type: 'DEFEAT_ENEMY', required: 1 }],
})

// Add dialogs:
.addDialog({
  npcId: 'npc-sanctum-herald',
  rootNodeId: 'root',
  nodes: [
    {
      id: 'root',
      text: 'The Veil Sanctum lies beyond. Gorak waits inside. This ends here.',
      choices: [
        { text: 'We end it now.', actions: [{ type: 'activateQuest', value: 'final-confrontation' }, { type: 'setFlag', value: 'sanctum-entered' }] },
      ],
    },
  ],
})
.addDialog({
  npcId: 'npc-epilog',
  rootNodeId: 'root',
  nodes: [
    {
      id: 'root',
      text: 'Gorak has fallen. The Veil holds.',
      choices: [
        { text: 'For the Guard.', actions: [{ type: 'setFlag', value: 'epilog-seen' }] },
        { text: 'For the Veil.', actions: [{ type: 'setFlag', value: 'epilog-seen' }] },
      ],
    },
  ],
})
```

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/data/quests.json src/data/dialog.json src/runtime/GameRuntime.ts src/game/GameLoopModel.ts src/maker/games/veilbreaker.ts
git commit -m "feat: add Act III final confrontation, sanctum, and epilog NPCs"
```

---

## Task 12: Act III storyline tests — all four ending branches

**Files:**
- Modify: `src/runtime/__tests__/storyline.test.ts`

- [ ] **Step 1: Write tests for all four ending branches**

Append to `src/runtime/__tests__/storyline.test.ts`:

```typescript
// ---------------------------------------------------------------------------
// ACT III — The Reckoning
// ---------------------------------------------------------------------------

function guardPlaythrough(game: RuntimeGameState): void {
  game.triggerDialog('npc-village-elder'); game.choose(0); // main-quest active
  game.triggerDialog('npc-faction-leader'); game.choose(0); // Guard
  game.triggerDialog('npc-sergeant-davan'); game.choose(0); // guard-march active
  game.triggerDialog('npc-officer-crest'); game.choose(0); // expose crest
  game.triggerDialog('npc-lieutenant-herald'); game.choose(0); // activate defeat-the-lieutenant
  game.startBattle(['goblin-lieutenant']); game.endBattle('win'); // act-complete-2
  game.triggerDialog('npc-sanctum-herald'); game.choose(0); // final-confrontation active
}

function magesPlaythrough(game: RuntimeGameState): void {
  game.triggerDialog('npc-village-elder'); game.choose(0);
  game.triggerDialog('npc-faction-leader'); game.choose(1); // Mages
  game.triggerDialog('npc-scholar-lira'); game.choose(0);
  game.triggerDialog('npc-solen-sacrifice'); game.choose(0); // warn Solen
  game.triggerDialog('npc-lieutenant-herald'); game.choose(0);
  game.startBattle(['goblin-lieutenant']); game.endBattle('win');
  game.triggerDialog('npc-sanctum-herald'); game.choose(0);
}

describe('Act III — final confrontation activates correctly', () => {
  it('final-confrontation activates via sanctum herald after act-complete-2 (Guard)', () => {
    const game = rt();
    guardPlaythrough(game);
    expect(game.getQuestState()['final-confrontation']).toBe('ACTIVE');
  });

  it('sanctum herald is inaccessible before act-complete-2', () => {
    const game = rt();
    game.triggerDialog('npc-faction-leader'); game.choose(0);
    game.triggerDialog('npc-sanctum-herald'); game.choose(0);
    expect(game.getQuestState()['final-confrontation']).toBe('INACTIVE');
  });
});

describe('Act III — Guard ending: betrayal exposed', () => {
  it('Guard epilog shows betrayal text when guard-betrayal-exposed is set', () => {
    const game = rt();
    guardPlaythrough(game); // includes exposing Crest
    game.startBattle(['goblin-boss']); game.endBattle('win');
    game.triggerDialog('npc-epilog');
    game.choose(0); // Guard choice visible
    const text = game.getDialogState()?.text as string;
    expect(text).toMatch(/Crest/i);
    expect(text).toMatch(/arrested/i);
  });
});

describe('Act III — Guard ending: betrayal covered', () => {
  it('Guard epilog does not mention Crest when betrayal was covered', () => {
    const game = rt();
    game.triggerDialog('npc-village-elder'); game.choose(0);
    game.triggerDialog('npc-faction-leader'); game.choose(0); // Guard
    game.triggerDialog('npc-sergeant-davan'); game.choose(0);
    game.triggerDialog('npc-officer-crest'); game.choose(1); // Cover it up
    game.triggerDialog('npc-lieutenant-herald'); game.choose(0);
    game.startBattle(['goblin-lieutenant']); game.endBattle('win');
    game.triggerDialog('npc-sanctum-herald'); game.choose(0);
    game.startBattle(['goblin-boss']); game.endBattle('win');
    game.triggerDialog('npc-epilog');
    game.choose(0); // Guard choice
    // Should have two choices: one about victory, not mentioning Crest
    const choices = game.getDialogState()?.choices as Array<{ index: number; text: string }>;
    // guard-betrayal-exposed is false, so guard-betrayal-aftermath choice is hidden
    // Only "The victory is complete." choice is available
    expect(choices).toHaveLength(1);
    expect(choices[0].text).toMatch(/victory/i);
  });
});

describe('Act III — Mages ending: Solen warned', () => {
  it('Mages epilog shows survival text when solen-warned is set', () => {
    const game = rt();
    magesPlaythrough(game); // includes warning Solen
    game.startBattle(['goblin-boss']); game.endBattle('win');
    game.triggerDialog('npc-epilog');
    game.choose(0); // Mages choice visible
    const text = game.getDialogState()?.text as string;
    expect(text).toMatch(/survived/i);
    expect(text).toMatch(/warning/i);
  });
});

describe('Act III — Mages ending: Solen not warned', () => {
  it('Mages epilog shows death text when solen-warned is unset', () => {
    const game = rt();
    game.triggerDialog('npc-village-elder'); game.choose(0);
    game.triggerDialog('npc-faction-leader'); game.choose(1); // Mages
    game.triggerDialog('npc-scholar-lira'); game.choose(0);
    game.triggerDialog('npc-solen-sacrifice'); game.choose(1); // Stay silent
    game.triggerDialog('npc-lieutenant-herald'); game.choose(0);
    game.startBattle(['goblin-lieutenant']); game.endBattle('win');
    game.triggerDialog('npc-sanctum-herald'); game.choose(0);
    game.startBattle(['goblin-boss']); game.endBattle('win');
    game.triggerDialog('npc-epilog');
    game.choose(0); // Mages choice
    const text = game.getDialogState()?.text as string;
    expect(text).toMatch(/not survive/i);
  });
});
```

Note: Add `import type { RuntimeGameState } from '../GameRuntime';` if not already present, or adjust to use the `rt()` helper return type via inference.

- [ ] **Step 2: Run Act III tests**

```bash
npx vitest run src/runtime/__tests__/storyline.test.ts
```

Expected: All Act III tests pass.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/runtime/__tests__/storyline.test.ts
git commit -m "test: add Act III storyline tests for all four ending branches"
```

---

## Task 13: Playwright e2e — Guard path full run

**Files:**
- Modify: `tests/e2e/storyline-demo.spec.ts`

- [ ] **Step 1: Verify the storyline demo page supports Guard path**

Check that `storyline-demo.html` and its runtime expose the new NPCs and quests. Run the existing e2e suite first:

```bash
npm run test:e2e
```

Expected: Existing tests pass (4/4 on storyline-demo page).

- [ ] **Step 2: Add Guard path full-run e2e test**

Append to `tests/e2e/storyline-demo.spec.ts`:

```typescript
test('Guard path: full run from Elder to Guard ending with betrayal exposed', async ({ page }) => {
  await page.goto('/storyline-demo.html');

  // Use the runtime API exposed on window.__game
  await page.evaluate(() => {
    const game = (window as unknown as Record<string, unknown>).__game as {
      triggerDialog: (id: string) => void;
      choose: (i: number) => void;
      startBattle: (ids: string[]) => void;
      endBattle: (outcome: string) => void;
      getFlags: () => Record<string, boolean>;
      getQuestState: () => Record<string, string>;
    };

    game.triggerDialog('npc-village-elder'); game.choose(0);
    game.triggerDialog('npc-faction-leader'); game.choose(0); // Guard
    game.triggerDialog('npc-sergeant-davan'); game.choose(0);
    game.triggerDialog('npc-officer-crest'); game.choose(0); // Expose
    game.triggerDialog('npc-lieutenant-herald'); game.choose(0);
    game.startBattle(['goblin-lieutenant']); game.endBattle('win');
    game.triggerDialog('npc-sanctum-herald'); game.choose(0);
    game.startBattle(['goblin-boss']); game.endBattle('win');
  });

  const flags = await page.evaluate(() => {
    const game = (window as unknown as Record<string, unknown>).__game as { getFlags: () => Record<string, boolean> };
    return game.getFlags();
  });

  expect(flags['guard-betrayal-exposed']).toBe(true);
  expect(flags['act-complete-2']).toBe(true);

  const quests = await page.evaluate(() => {
    const game = (window as unknown as Record<string, unknown>).__game as { getQuestState: () => Record<string, string> };
    return game.getQuestState();
  });

  expect(quests['main-quest']).toBe('COMPLETED');
  expect(quests['expose-the-traitor']).toBe('COMPLETED');
  expect(quests['defeat-the-lieutenant']).toBe('COMPLETED');
});
```

- [ ] **Step 3: Run e2e tests**

```bash
npm run test:e2e
```

Expected: All e2e tests pass including new Guard path test.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/storyline-demo.spec.ts
git commit -m "test(e2e): add Guard path full-run storyline e2e test"
```

---

## Task 14: Playwright e2e — Mages path full run

**Files:**
- Modify: `tests/e2e/storyline-demo.spec.ts`

- [ ] **Step 1: Add Mages path full-run e2e test**

Append to `tests/e2e/storyline-demo.spec.ts`:

```typescript
test('Mages path: full run from Elder to Mages ending with Solen warned', async ({ page }) => {
  await page.goto('/storyline-demo.html');

  await page.evaluate(() => {
    const game = (window as unknown as Record<string, unknown>).__game as {
      triggerDialog: (id: string) => void;
      choose: (i: number) => void;
      startBattle: (ids: string[]) => void;
      endBattle: (outcome: string) => void;
      getFlags: () => Record<string, boolean>;
      getQuestState: () => Record<string, string>;
    };

    game.triggerDialog('npc-village-elder'); game.choose(0);
    game.triggerDialog('npc-faction-leader'); game.choose(1); // Mages
    game.triggerDialog('npc-scholar-lira'); game.choose(0);
    game.triggerDialog('npc-solen-sacrifice'); game.choose(0); // Warn Solen
    game.triggerDialog('npc-lieutenant-herald'); game.choose(0);
    game.startBattle(['goblin-lieutenant']); game.endBattle('win');
    game.triggerDialog('npc-sanctum-herald'); game.choose(0);
    game.startBattle(['goblin-boss']); game.endBattle('win');
  });

  const flags = await page.evaluate(() => {
    const game = (window as unknown as Record<string, unknown>).__game as { getFlags: () => Record<string, boolean> };
    return game.getFlags();
  });

  expect(flags['solen-warned']).toBe(true);
  expect(flags['act-complete-2']).toBe(true);

  const quests = await page.evaluate(() => {
    const game = (window as unknown as Record<string, unknown>).__game as { getQuestState: () => Record<string, string> };
    return game.getQuestState();
  });

  expect(quests['main-quest']).toBe('COMPLETED');
  expect(quests['solens-sacrifice']).toBe('COMPLETED');
  expect(quests['defeat-the-lieutenant']).toBe('COMPLETED');
});
```

- [ ] **Step 2: Run full e2e suite**

```bash
npm run test:e2e
```

Expected: All e2e tests pass.

- [ ] **Step 3: Run complete test suite one final time**

```bash
npm test && npm run test:e2e
```

Expected: All unit, integration, and e2e tests pass with zero failures.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/storyline-demo.spec.ts
git commit -m "test(e2e): add Mages path full-run storyline e2e test"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task(s) |
|---|---|
| StorylineEngine with pure functions | Task 1 |
| GameRuntime uses StorylineEngine | Task 2 |
| GameLoopModel uses StorylineEngine | Task 3 |
| Act II Guard path (quests, NPCs, dialog) | Tasks 4, 5, 6 |
| Act II Mages path (quests, NPCs, dialog) | Tasks 7, 8 |
| `guard-betrayal-exposed` flag | Tasks 4, 5 |
| `solen-warned` flag | Tasks 7, 8 |
| `act-complete-1` derived flag | Task 1, 2, 3 |
| Act II convergence (lieutenant, `act-complete-2`) | Task 10 |
| Act III final confrontation | Task 11 |
| Epilog with four ending branches | Tasks 11, 12 |
| All endings tested | Task 12 |
| E2E Guard path | Task 13 |
| E2E Mages path | Task 14 |
| veilbreaker.ts maker updated | Tasks 6, 8, 10, 11 |
| Existing tests continue passing | Verified in each task |
