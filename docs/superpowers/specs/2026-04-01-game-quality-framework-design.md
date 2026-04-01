# Game Quality Framework — Design Spec

## Problem

AI generates game code without understanding what makes it fun. Systems work correctly but the game doesn't *feel* good — flat visuals, monotonous pacing, choices without consequences. There's no reference for AI to consult that defines what "good" means holistically.

## Goals

1. **Encode fun** — Define every measurable factor that makes the game feel right, from pixel-level rendering to narrative design
2. **Testable invariants** — Every quality claim maps to automated tests. If you can't test it, it's not in the framework
3. **AI guidance** — AI reads the framework before writing game code, ensuring quality by design rather than by accident

## Approach: Quality Layers + Cross-Cuts

Five layers organized by how the player experiences the game, from surface to core. Three cross-cutting concerns applied as review criteria across all layers.

### File Structure

```
fun/
  README.md                  ← overview, cross-cuts, how to use
  visual-clarity.md          ← Layer 1
  world-feel.md              ← Layer 2
  moment-to-moment.md        ← Layer 3
  session-arc.md             ← Layer 4
  story-agency.md            ← Layer 5
```

Test files:
```
src/runtime/__tests__/
  fun-visual-clarity.test.ts
  fun-world-feel.test.ts
  fun-moment-to-moment.test.ts
  fun-session-arc.test.ts
  fun-story-agency.test.ts
```

CLAUDE.md references `fun/README.md` — AI must consult it before any game code change.

### Cross-Cutting Concerns

These are not separate documents. They are review criteria applied when writing or evaluating any invariant.

**Testability:** Every invariant must have a concrete test strategy — math-based, data-driven, simulation, or visual screenshot comparison. If you can't write a test for it, remove it from the framework.

**Consistency:** Same rules everywhere. If damage floor is 1 for the player, it's 1 for enemies. If NPCs have proximity indicators, all NPCs have them. If paths connect buildings, all buildings have path connections.

**Contrast:** Good games need variation. If every fight is hard, none feel hard. If every NPC is friendly, none feel friendly. The framework checks for variety — not just that things are good, but that they're different from each other.

---

## Layer 1: Visual Clarity

*"Can the player instantly read the game?"*

### Principle

Every visual element communicates one thing clearly. Walkable ground looks different from walls. Interactable NPCs look different from decorations. Water looks impassable. The player's eyes should answer questions before their brain has to.

### Invariants

| ID | Invariant | Test Strategy |
|----|-----------|---------------|
| VC-1 | Each tile type (grass, path, water, wall, floor) uses a visually distinct color family — no two types share the same hue range | Unit test: verify COLORS map hue values don't overlap |
| VC-2 | Tile transitions between types have visual edges (not hard-cut solid colors) | Visual test: screenshot comparison at tile boundaries |
| VC-3 | NPCs are visually distinct from background at any position on the map | Visual test: NPC contrast ratio against all tile types |
| VC-4 | Interactable NPCs have a visible indicator when player is in range | Integration test: proximity trigger renders indicator |
| VC-5 | The player character is always the most visually prominent element on screen | Visual test: player contrast and size relative to other elements |
| VC-6 | UI text (labels, HUD, dialog) is readable against any background it appears over | Visual test: text contrast ratio meets minimum threshold |
| VC-7 | Battle scene visually distinguishes player from enemies at a glance | Visual test: player vs enemy color/shape differentiation |

### Anti-Patterns

- ANTI-VC1: Flat solid-color rectangles for tiles — no texture means no readability cues
- ANTI-VC2: Labels floating without background contrast — hard to read over some tiles
- ANTI-VC3: Color-only differentiation with no shape/pattern backup — accessibility issue

---

## Layer 2: World Feel

*"Does this feel like a real place?"*

### Principle

Every map zone has a purpose the player can intuit. Spatial relationships make sense — the elder lives near the center, the barracks are on the edge, the river separates safe from dangerous. Visual details reinforce the fiction: paths connect buildings, buildings cast shadows, water moves.

### Invariants

| ID | Invariant | Test Strategy |
|----|-----------|---------------|
| WF-1 | Buildings have at least 2 visual elements (walls + roof/door/window) — not just flat rectangles | Visual test: building zone screenshot has multiple distinct colors/shapes |
| WF-2 | Water has animated or varying visual treatment (not a static solid color) | Visual test: two water screenshots at different frames differ |
| WF-3 | Paths visually connect points of interest (no dead-end paths to nowhere) | Map data test: path tiles form connected graph between building zones |
| WF-4 | Map zones are spatially logical — related NPCs are near their associated buildings | Data test: NPC coordinates fall within or adjacent to their building zone |
| WF-5 | At least 3 distinct visual zones exist on the village map | Map data test: count unique zone types in map data |
| WF-6 | Collision zones match visual boundaries — if it looks solid, you can't walk through it | Integration test: wall tiles have corresponding collision zones |
| WF-7 | Decorative variety — no 5x5 or larger area of identical tile appearance | Map data test: scan grid for uniform blocks exceeding threshold |

### Anti-Patterns

- ANTI-WF1: Buildings that are just solid color blocks with a text label
- ANTI-WF2: Large uniform areas with zero visual variation
- ANTI-WF3: Collision zones that don't match what the player sees (invisible walls or walkable-looking obstacles)

---

## Layer 3: Moment-to-Moment

*"Does each interaction feel good right now?"*

### Principle

Every player action gets immediate, visible feedback. Attack → damage number. Level up → stat change visible. Pick up item → inventory updates. No silent successes, no mystery failures. The player should never wonder "did that work?"

### Invariants

| ID | Invariant | Test Strategy |
|----|-----------|---------------|
| MM-1 | Battle win shows EXP gained and loot received immediately | Runtime test: getBattleState() contains expGained and loot after win |
| MM-2 | Level up changes at least 2 visible stats | Data test: player-growth.json level entries differ by ≥2 stats |
| MM-3 | Dialog choices produce visible state changes (quest activated, item received, flag set) | Runtime test: choose() returns non-empty mutations |
| MM-4 | Combat damage is always at least 1 (no "nothing happened" turns) | Unit test: calcDamage floor is 1 |
| MM-5 | Status effects are visible in battle state | Unit test: CombatActor.statusEffects exposed after application |
| MM-6 | NPC interaction triggers within a consistent proximity radius | GameLoopModel test: proximity detection uses same radius for all NPCs |
| MM-7 | Scene transitions happen on the frame the condition is met | Runtime test: scene change is immediate after trigger |

### Anti-Patterns

- ANTI-MM1: Silent state changes — flag set but player sees nothing
- ANTI-MM2: Combat rounds where nothing visible happens
- ANTI-MM3: Rewards that go to inventory without being displayed first

---

## Layer 4: Session Arc

*"Does a 15-minute play session feel satisfying?"*

### Principle

A session has a shape — start with direction, build through challenge, end with reward. The difficulty curve rises but never walls. Grinding exists but has diminishing returns on boredom before the payoff arrives.

### Invariants

| ID | Invariant | Test Strategy |
|----|-----------|---------------|
| SA-1 | First fight is reachable within 3 interactions from game start | Runtime test: dialog → quest → battle in ≤3 calls |
| SA-2 | Slime fights resolve in 2-3 rounds | Math test: roundsToKill with default stats |
| SA-3 | Boss fights last at least 4 rounds | Math test: roundsToKill with default stats |
| SA-4 | Player HP after slime fight stays above 50% | Math test: damageTaken < 50% maxHp |
| SA-5 | Player HP after boss fight drops below 70% | Math test: damageTaken > 30% maxHp |
| SA-6 | 10 slime fights are enough to reach level 2 | Runtime test: grind 10 slimes, check level |
| SA-7 | Boss EXP reward is at least 5x slime reward | Data test: compare expReward values |
| SA-8 | Every battle win grants both EXP and loot | Runtime test: expGained > 0 and loot.length > 0 |
| SA-9 | Death loses progress since last save | Runtime test: die without saving, verify state reset |

### Anti-Patterns

- ANTI-SA1: Back-to-back boss fights without recovery opportunity
- ANTI-SA2: Fights that resolve in 1 round (no tension)
- ANTI-SA3: Fights with zero reward (feels pointless)
- ANTI-SA4: Grind requiring more than 15 identical fights to progress

---

## Layer 5: Story & Agency

*"Do my choices shape the world?"*

### Principle

Every major decision closes one door and opens another. The player should be able to look back and see how their choices shaped their unique playthrough. NPCs react to who you are, not just where you are.

### Invariants

| ID | Invariant | Test Strategy |
|----|-----------|---------------|
| AG-1 | Guard and mage paths lead to different quest lines | Data test: quest prerequisites diverge after faction-choice |
| AG-2 | Faction choice is irreversible within a playthrough | Unit test: resolveFactionExclusivity clears opposing faction |
| AG-3 | At least 2 NPCs have dialog that changes based on faction choice | Data test: dialog.json trees with faction flag conditions |
| AG-4 | Quest completion changes at least one NPC's dialog | Data test: dialog nodes with questState conditions |
| AG-5 | The two faction paths lead through different quest chains before converging at the final quest | Data test: guard-path and mage-path prerequisite chains share no quests except the final one |
| AG-6 | Loot tables include rare drops below 30% chance | Data test: loot-tables.json contains entries with weight < 30% |
| AG-7 | At least one quest is discoverable through exploration, not handed to the player | Data test: quest activation requires being at specific location or talking to non-obvious NPC |

### Anti-Patterns

- ANTI-AG1: Choices where all options lead to the same outcome
- ANTI-AG2: Faction-gated content that's trivially small
- ANTI-AG3: Every NPC saying the same thing regardless of player state
- ANTI-AG4: Loot tables where every drop is guaranteed (removes surprise)

---

## Integration with Existing Systems

### Relationship to Test Contracts

The test contract system (`contracts/`) verifies **correctness** — do the systems work as specified? The game quality framework (`fun/`) verifies **quality** — does the game feel good? They are complementary:

- Contracts: "CombatSystem deals max(1, atk - def) damage" (correctness)
- Quality: "Boss fights last at least 4 rounds" (feel)

Both must pass. A game can be correct but not fun, or fun but buggy.

### CLAUDE.md Addition

```markdown
## Game Quality Framework

Before writing or modifying game code, consult `fun/README.md` for quality
principles. Every change must maintain or improve invariants across all 5 layers.

Layers: Visual Clarity → World Feel → Moment-to-Moment → Session Arc → Story & Agency
Cross-cuts: Testability, Consistency, Contrast
```

### Existing Test Coverage

Many Session Arc and Moment-to-Moment invariants are already tested in `playtest.test.ts`. The implementation plan should map existing tests to invariants before writing new ones, avoiding duplication.
