# StorylineEngine Extraction Design

## Goal
Extract pure narrative logic into a shared `StorylineEngine` module so both `GameRuntime` and `GameLoopModel` can use the same faction gating and act-flag derivation logic.

## Scope
- Introduce a new module with pure functions.
- Add unit tests for the module.
- No runtime or game loop wiring in this step.

## Architecture
`StorylineEngine` is a stateless module of pure functions. It takes plain flag objects and quest id lists as inputs and returns derived data without side effects. The module is used by higher-level systems but never depends on them.

## Components
- `src/engine/storyline/StorylineEngine.ts`
  - `resolveFactionExclusivity(flags, key, value)`
  - `resolveFactionGate(flags, requiredFaction)`
  - `checkQuestPrerequisites(prerequisites, completedQuestIds)`
  - `deriveActFlags(flags)`
- `src/engine/storyline/__tests__/StorylineEngine.test.ts`
  - Unit tests for each function, including immutability checks and edge cases.

## Data Flow
- Inputs: `Record<string, boolean>` flags, `string[]` quest ids.
- Outputs: booleans or partial flag objects.
- No mutations. Callers merge derived flags into existing state.

## Error Handling
- No exceptions expected; functions return safe defaults for empty inputs.

## Testing
- Vitest unit tests covering:
  - Faction exclusivity enforcement.
  - Faction gate checks.
  - Quest prerequisite checks.
  - Act flag derivation and non-overwrite behavior.

## Out of Scope
- Wiring `StorylineEngine` into `GameRuntime` or `GameLoopModel`.
- Act II/III content updates.
