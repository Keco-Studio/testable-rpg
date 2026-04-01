# Player Experience Contract (End-to-End)

| Priority | Contract Item | Test File | Status |
|----------|--------------|-----------|--------|
| P1 | New game → title → town → walk to Elder → talk → accept main quest | player-experience.test.ts | UNTESTED |
| P1 | Accept quest → find goblin → fight → win → quest completes | player-experience.test.ts | UNTESTED |
| P1 | Choose guard faction → guard content available, mage locked | player-experience.test.ts | UNTESTED |
| P1 | Choose mage faction → mage content available, guard locked | player-experience.test.ts | UNTESTED |
| P1 | Win battle → gain EXP → level up → stats increase | player-experience.test.ts | UNTESTED |
| P1 | Win battle → receive loot → appears in inventory | player-experience.test.ts | UNTESTED |
| P1 | Save game → reload → exact state preserved | GameRuntime.test.ts | Tested |
| P1 | Die in battle → game over screen → can restart | player-experience.test.ts | UNTESTED |
