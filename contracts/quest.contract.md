# Quest System Contract

| Priority | Contract Item | Test File | Status |
|----------|--------------|-----------|--------|
| P1 | State machine: INACTIVE → ACTIVE → COMPLETED/FAILED (terminal) | QuestSystem.test.ts | Tested |
| P1 | Prerequisites must be completed before activation | QuestSystem.test.ts | Tested |
| P1 | All required objectives met → auto-complete | QuestSystem.test.ts | Tested |
| P1 | Optional objectives don't block completion | QuestSystem.test.ts | Tested |
| P1 | Progress on completed/failed quest is no-op | QuestSystem.test.ts | Tested |
| P1 | Branching paths: first satisfied path resolves | QuestSystem.test.ts | Tested |
| P1 | Serialize/deserialize preserves exact state | QuestSystem.test.ts | Tested |
