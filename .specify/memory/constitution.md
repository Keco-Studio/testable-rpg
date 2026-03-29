<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0
Modified principles: N/A (initial ratification — all sections new)

Added sections:
  - Vision
  - Core Principles (I–IV)
  - Tech Stack (Runtime, Editor UI, Multiplayer)
  - Testing Stack
  - TDD Gate
  - Game Systems (CombatSystem, InventorySystem, QuestSystem, DialogSystem, SceneSystem, MapEditor)
  - Project Structure
  - Coding Constraints (Complexity Gates, Framework Trust, Error Handling, Performance)
  - Multiplayer Constraints
  - Governance

Removed sections: N/A (initial ratification)

Templates reviewed:
  ✅ .specify/templates/plan-template.md   — Constitution Check placeholder aligns; no RPG-specific gate required
  ✅ .specify/templates/spec-template.md   — Acceptance Criteria format compatible; no changes required
  ✅ .specify/templates/tasks-template.md  — TDD gate language (tests FAIL before implementation) matches Principle III

Deferred TODOs:
  TODO(RATIFICATION_DATE): Original adoption date unknown — marked 2026-03-29 (today) as first ratification
-->

# RPG Maker — Project Constitution

## Vision

A multiplayer web-based RPG maker that lets users create, share, and play 2D RPGs in the
browser. Built on Excalibur.js with TypeScript. The tool provides a map editor, character
creator, quest builder, dialog editor, and a runtime engine that plays the created games.

## Core Principles

### I. Spec as Source of Truth

The specification is the authoritative source of truth. Code MUST serve the spec — never
the reverse. Any deviation from a spec MUST result in a spec amendment, not silent code
changes. Implementation decisions not covered by a spec MUST be documented as amendments
before merging.

### II. Test-First (NON-NEGOTIABLE)

No implementation code MAY exist before tests are written, user-approved, and confirmed
FAILING. The Red-Green-Refactor cycle is strictly enforced:

1. Write tests → user reviews → user approves.
2. Confirm tests FAIL (Red phase) — failure log or screenshot required as evidence.
3. Write implementation until tests PASS (Green phase).
4. Refactor — tests MUST remain Green.

**VIOLATION**: Writing implementation before approved failing tests = BLOCKED.

### III. Browser-Independent Testability

Every game system MUST be independently testable without a running browser. All unit
tests run in Vitest with jsdom — no real browser required. `ex.Engine` MUST use
`new ex.TestClock()` in all tests — never real `requestAnimationFrame`.

### IV. Determinism by Default

All randomness MUST be seedable for reproducibility. Every system that requires random
values MUST accept a `seed: number` parameter. Tests ALWAYS run with `seed: 42`. This
ensures gameplay can be reproduced exactly for testing, replays, and bug reports.

## Tech Stack

### Runtime

- **Engine**: Excalibur.js ^0.30.0
- **Language**: TypeScript ^5.4
- **Bundler**: Vite ^5.0
- **Framework**: None — vanilla TypeScript; no React in game runtime

### Editor UI (RPG Maker tool)

- **Framework**: React 19 + TypeScript
- **State**: Zustand
- **Styling**: Tailwind CSS v4

### Multiplayer

- **Transport**: WebSockets (`ws` library server-side)
- **Sync**: Delta-state CRDT (Yjs)

## Testing Stack (NON-NEGOTIABLE)

| Layer             | Tool                      | What It Tests                               |
|-------------------|---------------------------|---------------------------------------------|
| Unit              | Vitest ^1.6               | Game logic: combat, inventory, quests, RNG  |
| Canvas / Actor    | excalibur-jasmine ^2.0    | Actor position, physics, visual snapshots   |
| Integration       | @excaliburjs/testing ^1.0 | Scene transitions, full game flows          |
| E2E / AI Explorer | Playwright ^1.44          | Editor UI, multiplayer flows                |

### Testing Rules

1. All unit tests MUST run in Vitest with jsdom — no real browser required.
2. `ex.Engine` MUST use `new ex.TestClock()` in all tests — never real rAF.
3. `window.__game` API MUST be exposed in `MODE !== 'production'` builds.
4. All RNG MUST accept `seed: number` — tests ALWAYS run with `seed: 42`.
5. Visual snapshot tolerance: `0.99` (99% pixel match required).
6. Tests in `src/**/__tests__/` for units; `tests/` for integration/E2E.

## Game Systems (Source of Truth)

### 1. CombatSystem

- Turn-based, not real-time.
- Formula: `damage = max(1, attacker.stats.attack - defender.stats.defense)`
- Status effects: poison, stun, burn — each with duration in turns.
- Death: actor HP ≤ 0 triggers `ActorDiedEvent`; scene layer handles game-over logic.

### 2. InventorySystem

- Max slots: configurable per actor (default: 24).
- Item stacking: stackable items MUST have a `maxStack: number` property.
- Weight: optional, disabled by default in new games.
- Equip slots: head, body, weapon, offhand, accessory × 2.

### 3. QuestSystem

- Quest states: `INACTIVE → ACTIVE → COMPLETED → FAILED`.
- Trigger types: `talk-to-npc`, `enter-zone`, `collect-item`, `defeat-enemy`.
- Branching: quests MAY have multiple completion paths.
- Prerequisites: quests MAY require other quests to be `COMPLETED`.

### 4. DialogSystem

- Tree-based dialog with nodes and choices.
- Condition nodes: check quest state, inventory, player stats.
- Action nodes: give item, trigger quest, change scene variable.
- Portrait support: actor portrait shown during dialog.

### 5. SceneSystem

- Scene types: `WorldMap`, `Town`, `Dungeon`, `Battle`, `Cutscene`.
- Transition types: `fade`, `slide`, `instant`.
- Persistence: scene state MUST be saved to `localStorage` keyed by scene ID.

### 6. MapEditor (RPG Maker tool)

- Tile-based: 16 × 16 px tiles, maps up to 256 × 256 tiles.
- Layers: ground, decoration, collision, events.
- Export: JSON format consumed by SceneSystem at runtime.

## Project Structure

```text
src/
├── engine/
│   ├── combat/
│   │   ├── CombatSystem.ts
│   │   └── __tests__/CombatSystem.test.ts
│   ├── inventory/
│   │   ├── InventorySystem.ts
│   │   └── __tests__/InventorySystem.test.ts
│   ├── quest/
│   │   ├── QuestSystem.ts
│   │   └── __tests__/QuestSystem.test.ts
│   ├── dialog/
│   │   ├── DialogSystem.ts
│   │   └── __tests__/DialogSystem.test.ts
│   └── rng/
│       ├── SeededRNG.ts
│       └── __tests__/SeededRNG.test.ts
├── actors/
│   ├── Player.ts
│   ├── Enemy.ts
│   └── NPC.ts
├── scenes/
│   ├── WorldMapScene.ts
│   ├── TownScene.ts
│   ├── DungeonScene.ts
│   └── BattleScene.ts
├── testing/
│   ├── GameTestAPI.ts        ← window.__game surface
│   └── ScenarioRunner.ts     ← JSON scenario executor
└── editor/                   ← React RPG Maker UI
    ├── MapEditor/
    ├── QuestEditor/
    └── DialogEditor/

tests/
├── integration/              ← @excaliburjs/testing
├── visual/                   ← excalibur-jasmine snapshots
├── e2e/                      ← Playwright editor tests
└── ai-explorer/              ← AI agent test scripts
```

## Coding Constraints

### Complexity Gates

- Maximum 3 top-level modules for initial implementation.
- Additional modules REQUIRE documented justification in the spec.
- No abstraction layers without written rationale.

### Framework Trust

- Use Excalibur features directly — MUST NOT wrap them.
- MUST NOT re-implement what Excalibur already provides (physics, input, scenes).

### Error Handling

- All async operations MUST have explicit error boundaries.
- Game systems MUST NOT throw — return `Result<T, Error>` types instead.

### Performance

- Target: 60 fps on mid-range hardware (2020 laptop).
- No allocations in hot path (update loop) — object pooling required.
- Bundle size cap: 500 KB gzipped for game runtime.

## Multiplayer Constraints

- Server is authoritative for combat resolution.
- Client-side prediction for movement only.
- All server messages MUST be versioned with a schema version.
- Desync detection: hash game state every 60 frames and compare with server.

## Governance

Amendments to this constitution require:

1. A written rationale documented in the spec or PR description.
2. Version increment following semver rules (MAJOR / MINOR / PATCH as defined above).
3. Propagation check: all dependent templates and agent files reviewed for alignment.
4. `LAST_AMENDED_DATE` updated to the amendment date in ISO-8601 format.

All PRs MUST verify compliance with the four Core Principles before merge. Complexity
violations MUST be justified in the feature plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-03-29 | **Last Amended**: 2026-03-29
