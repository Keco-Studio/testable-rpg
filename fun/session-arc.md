# Layer 4: Session Arc

*"Does a 15-minute play session feel satisfying?"*

## Principle

A session has a shape — start with direction, build through challenge, end with reward. The difficulty curve rises but never walls. Grinding exists but has diminishing returns on boredom before the payoff arrives.

## Invariants

| ID | Invariant | Test Strategy | Status |
|----|-----------|---------------|--------|
| SA-1 | First fight is reachable within 3 interactions from game start | Runtime test | Tested (playtest.test.ts) |
| SA-2 | Slime fights resolve in 2-3 rounds | Math test | Tested (playtest.test.ts) |
| SA-3 | Boss fights last at least 4 rounds | Math test | Tested (playtest.test.ts) |
| SA-4 | Player HP after slime fight stays above 50% | Math test | Tested (playtest.test.ts) |
| SA-5 | Player HP after boss fight drops below 70% | Math test | Tested (playtest.test.ts) |
| SA-6 | 10 slime fights are enough to reach level 2 | Runtime test | Tested (playtest.test.ts) |
| SA-7 | Boss EXP reward is at least 5x slime reward | Data test | Tested |
| SA-8 | Every battle win grants both EXP and loot | Runtime test | Tested (playtest.test.ts) |
| SA-9 | Death loses progress since last save | Runtime test | Tested (playtest.test.ts) |

## Anti-Patterns

- ANTI-SA1: Back-to-back boss fights without recovery opportunity
- ANTI-SA2: Fights that resolve in 1 round (no tension)
- ANTI-SA3: Fights with zero reward (feels pointless)
- ANTI-SA4: Grind requiring more than 15 identical fights to progress
