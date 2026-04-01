# Save System Contract

| Priority | Contract Item | Test File | Status |
|----------|--------------|-----------|--------|
| P1 | Save captures: scene, player stats, inventory, quests, flags, position | SaveSystem.test.ts | Tested |
| P1 | Load restores exact game state | SaveSystem.test.ts | Tested |
| P1 | Empty slot returns null | SaveSystem.test.ts | Tested |
| P1 | Overwriting a slot replaces completely | SaveSystem.test.ts | UNTESTED |
| P1 | Loading invalid/malformed JSON returns null, never throws | SaveSystem.test.ts | UNTESTED |
| P1 | All 3 slots are independent | SaveSystem.test.ts | UNTESTED |
