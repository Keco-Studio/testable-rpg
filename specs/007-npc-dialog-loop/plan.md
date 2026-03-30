# Plan 007: NPC Interaction and Dialog UI

## Approach

- Extend `GameLoopModel` with deterministic NPC positions and dialog state.
- Add interaction APIs to model: `interact()` and `selectDialogChoice(index)`.
- Render NPC markers, interaction prompt, and dialog overlay in `PlayableGame`.
- Add unit tests for interaction gating and faction choice state.
- Add Playwright integration coverage for keyboard-driven dialog choice.
