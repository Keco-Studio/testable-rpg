# Veilbreaker Rising — Full RPG Expansion Design

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Expand Veilbreaker Rising from POC demo to a complete 3-act story-first RPG, with a shared StorylineEngine fixing the runtime/game narrative duplication identified in research.md.

---

## 1. Goals

- Unify narrative logic into a single `StorylineEngine` consumed by both `src/runtime` and `src/game`.
- Expand Veilbreaker Rising to a full 3-act story with faction-branching consequences and two distinct endings.
- Maintain deterministic, fully testable behavior throughout — every story beat covered by automated tests.

---

## 2. Phase 1: StorylineEngine (shared narrative core)

### Problem

`src/runtime/GameRuntime.ts` and `src/game/PlayableGame.ts` both contain independent implementations of:
- Dialog action handling (`activateQuest`, `setFlag`, `giveItem`)
- Quest prerequisite checking
- Faction gate evaluation

This duplication risks behavioral drift as story content grows.

### Solution

New file: `src/engine/storyline/StorylineEngine.ts`

Pure functions only — no DOM, no runtime, no side effects:

| Function | Signature | Purpose |
|---|---|---|
| `resolveDialogAction` | `(action, state) → StateChange` | Given a dialog action and current state, returns what changes |
| `checkQuestPrerequisites` | `(quest, flags) → boolean` | Whether a quest's prerequisites are met |
| `getUnlockedQuests` | `(allQuests, flags, activeIds) → QuestId[]` | All quests currently available |
| `resolveFactionGate` | `(flag, requiredFaction) → boolean` | Whether player belongs to a faction |

Both `GameRuntime` and `PlayableGame` remove their own copies and import from the engine. `StorylineEngine` gets its own unit tests at `src/engine/storyline/__tests__/StorylineEngine.test.ts`.

---

## 3. Phase 2: Three-Act Story

### Act I — "The Fracture" (existing content, polished)

**Existing content becomes Act I.** No maps or NPCs removed.

Additions:
- Dialog expanded on Elder Aldric to hint Gorak believes he is preventing something worse (sets up Act II moral ambiguity).
- `act-complete-1` flag set by the faction choice dialog action (the last step of Act I — by this point, main quest is always already active via Elder Aldric).

**End condition:** `act-complete-1` is set.

---

### Act II — "The Divergence" (new content)

Two parallel faction paths, converging at the Veil Ruins.

#### Guard Path

| Addition | Detail |
|---|---|
| Map: `guard-barracks` | New map, 50×30, spawn (8, 10) |
| NPC: Sergeant Davan | Guard ally, guard-barracks |
| NPC: Officer Crest (corrupt) | guard-barracks — source of mid-act twist |
| Quest: `guard-march` | Patrol mission via Captain Vera |
| Quest: `expose-the-traitor` | Discover Officer Crest is supplying Gorak; choice: expose or cover up |
| Flag: `guard-betrayal-exposed` | Set if player exposes Crest; affects Act III epilogue |

#### Mages Path

| Addition | Detail |
|---|---|
| Map: `mages-archive` | New map, 46×28, spawn (7, 9) |
| NPC: Scholar Lira | Mages researcher, mages-archive |
| NPC: Ruins Guardian | mages-archive — blocks progress until ruins decoded |
| Quest: `decode-the-ruins` | Research mission via Arch-Mage Solen |
| Quest: `solens-sacrifice` | Reveals mending the Veil may cost Solen his power; player can warn him or not |
| Flag: `solen-warned` | Set if player warns Solen; affects Act III ending |

#### Convergence

| Addition | Detail |
|---|---|
| Map: `veil-ruins` | Shared map, 54×32, spawn (10, 12) |
| NPC: Gorak's Lieutenant | Boss encounter; dialog differs by faction flag |
| Quest: `defeat-the-lieutenant` | Required from both paths to proceed to Act III |
| Flag: `act-complete-2` | Set after lieutenant defeated |

---

### Act III — "The Reckoning" (new content)

| Addition | Detail |
|---|---|
| Map: `veil-sanctum` | Final map, 60×36, spawn (12, 14) |
| NPC: Gorak the Ironbreaker | Final boss |
| Quest: `final-confrontation` | Prerequisites: `act-complete-2` |

#### Endings (delivered as dialog sequences)

**Guard Ending:**
- The Veil is sealed by force. The Guard controls the Sanctum.
- If `guard-betrayal-exposed`: epilogue dialog references Officer Crest's arrest.
- If not exposed: epilogue hints at unresolved corruption.

**Mages Ending:**
- Solen mends the Veil through sacrifice.
- If `solen-warned`: Solen survives; grateful dialog.
- If not warned: Solen dies; mourning dialog from Scholar Lira.

---

## 4. Flag Vocabulary

| Flag | Set When | Used For |
|---|---|---|
| `joined-guard` | Faction choice dialog | Gates Guard path quests and endings |
| `joined-mages` | Faction choice dialog | Gates Mages path quests and endings |
| `guard-betrayal-exposed` | `expose-the-traitor` resolution | Act III epilogue branch |
| `solen-warned` | `solens-sacrifice` player choice | Act III ending branch |
| `act-complete-1` | Set by faction choice dialog (final Act I action) | Gates Act II content |
| `act-complete-2` | Lieutenant defeated | Gates Act III content |

---

## 5. Testing Strategy

| Layer | Coverage |
|---|---|
| `StorylineEngine` unit tests | All pure functions; prerequisite checks, flag resolution, faction gates |
| `storyline.test.ts` runtime tests | Each new quest beat; both faction paths; all 4 ending branches |
| `tests/e2e/` Playwright specs | Guard path full run, Mages path full run, both endings |
| Existing tests | Must continue passing — no regressions |

---

## 6. What Does Not Change

- `RpgProjectBuilder` API
- Engine systems: combat, inventory, save, dialog, RNG
- Data loader format
- Playable canvas game loop structure
- Existing maps, NPCs, quests, and dialogs

---

## 7. Risks

- **StorylineEngine extraction scope creep:** Keep the extraction surgical — only move logic that is genuinely duplicated. Don't redesign the engine systems.
- **Faction gating correctness:** Each Act II quest must guard correctly on `joined-guard` / `joined-mages`. Test both paths explicitly.
- **Ending branch coverage:** Four ending variants (2 factions × 2 choice flags) must all be tested, not just the happy path.
