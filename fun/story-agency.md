# Layer 5: Story & Agency

*"Do my choices shape the world?"*

## Principle

Every major decision closes one door and opens another. The player should be able to look back and see how their choices shaped their unique playthrough. NPCs react to who you are, not just where you are.

## Invariants

| ID | Invariant | Test Strategy | Status |
|----|-----------|---------------|--------|
| AG-1 | Guard and mage paths lead to different quest lines | Data test | Tested (playtest.test.ts) |
| AG-2 | Faction choice is irreversible within a playthrough | Unit test | Tested (playtest.test.ts) |
| AG-3 | At least 2 NPCs have dialog that changes based on faction choice | Data test | Tested |
| AG-4 | Quest completion changes at least one NPC's dialog | Data test | UNTESTED (content gap) |
| AG-5 | The two faction paths lead through different quest chains before converging | Data test | Tested |
| AG-6 | Loot tables include rare drops below 30% chance | Data test | Tested |
| AG-7 | At least one quest is discoverable through exploration | Data test | Tested |

## Anti-Patterns

- ANTI-AG1: Choices where all options lead to the same outcome
- ANTI-AG2: Faction-gated content that's trivially small
- ANTI-AG3: Every NPC saying the same thing regardless of player state
- ANTI-AG4: Loot tables where every drop is guaranteed (removes surprise)
