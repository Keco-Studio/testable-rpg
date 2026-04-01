# Game Quality Framework

This framework defines what makes the game feel good. AI must consult this before writing or modifying game code.

## Five Quality Layers

| Layer | File | Question It Answers |
|-------|------|-------------------|
| 1. Visual Clarity | [visual-clarity.md](visual-clarity.md) | Can the player instantly read the game? |
| 2. World Feel | [world-feel.md](world-feel.md) | Does this feel like a real place? |
| 3. Moment-to-Moment | [moment-to-moment.md](moment-to-moment.md) | Does each interaction feel good right now? |
| 4. Session Arc | [session-arc.md](session-arc.md) | Does a 15-minute play session feel satisfying? |
| 5. Story & Agency | [story-agency.md](story-agency.md) | Do my choices shape the world? |

## Cross-Cutting Concerns

Apply these when writing or evaluating any invariant:

**Testability:** Every invariant must have a concrete test. If you can't write a test for it, remove it.

**Consistency:** Same rules everywhere. Damage floor of 1 applies to all actors. Proximity indicators on all NPCs. Paths connect all buildings.

**Contrast:** Games need variation. If every fight is hard, none feel hard. Check for variety, not just quality.

## How to Use

1. Before changing game code, identify which layers are affected
2. Read the relevant layer files
3. Verify your change maintains or improves all invariants
4. Run the layer's test file to confirm
5. If adding a new feature, add invariants to the relevant layer

## Test Files

| Layer | Test File | Existing Coverage |
|-------|-----------|-------------------|
| Visual Clarity | `src/runtime/__tests__/fun-visual-clarity.test.ts` | New |
| World Feel | `src/runtime/__tests__/fun-world-feel.test.ts` | New |
| Moment-to-Moment | `src/runtime/__tests__/fun-moment-to-moment.test.ts` | Partial in playtest.test.ts |
| Session Arc | `src/runtime/__tests__/fun-session-arc.test.ts` | Mostly in playtest.test.ts |
| Story & Agency | `src/runtime/__tests__/fun-story-agency.test.ts` | Partial in playtest.test.ts |
