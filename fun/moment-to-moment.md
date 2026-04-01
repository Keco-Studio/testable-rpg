# Layer 3: Moment-to-Moment

*"Does each interaction feel good right now?"*

## Principle

Every player action gets immediate, visible feedback. Attack → damage number. Level up → stat change visible. Pick up item → inventory updates. No silent successes, no mystery failures.

## Invariants

| ID | Invariant | Test Strategy | Status |
|----|-----------|---------------|--------|
| MM-1 | Battle win shows EXP gained and loot received immediately | Runtime test | Tested (playtest.test.ts) |
| MM-2 | Level up changes at least 2 visible stats | Data test | Tested (playtest.test.ts) |
| MM-3 | Dialog choices produce visible state changes | Runtime test | Tested |
| MM-4 | Combat damage is always at least 1 | Unit test | Tested (playtest.test.ts) |
| MM-5 | Status effects are visible in battle state | Unit test | Tested |
| MM-6 | NPC interaction triggers within a consistent proximity radius | GameLoopModel test | Tested (GameLoopModel.test.ts) |
| MM-7 | Scene transitions happen on the frame the condition is met | Runtime test | Tested |

## Anti-Patterns

- ANTI-MM1: Silent state changes — flag set but player sees nothing
- ANTI-MM2: Combat rounds where nothing visible happens
- ANTI-MM3: Rewards that go to inventory without being displayed first
