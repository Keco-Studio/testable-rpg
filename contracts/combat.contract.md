# Combat System Contract

| Priority | Contract Item | Test File | Status |
|----------|--------------|-----------|--------|
| P1 | Damage = max(1, attack - defense) | CombatSystem.test.ts | Tested |
| P1 | Critical hits deal 2x damage | CombatSystem.test.ts | Tested |
| P1 | Turn order follows speed, deterministic tie-breaking | CombatSystem.test.ts | Tested |
| P1 | Dead actors can't take turns | CombatSystem.test.ts | Tested |
| P1 | Status effects tick down each turn | CombatSystem.test.ts | Tested |
| P1 | Stunned actors skip their turn | CombatSystem.test.ts | Tested |
| P1 | Poison deals 10% max HP per turn | CombatSystem.test.ts | Tested |
| P1 | Flee success probability scales with speed/luck | CombatSystem.test.ts | Tested |
| P1 | Skills consume MP, fail if insufficient | CombatSystem.test.ts | Tested |
| P1 | Battle ends when one side is eliminated | CombatSystem.test.ts | Tested |
| P1 | Input actors are never mutated | CombatSystem.test.ts | Tested |
