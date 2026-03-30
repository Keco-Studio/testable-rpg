# Testable RPG Game

A deterministic, automation-first RPG prototype built with TypeScript and Vite.

This project is designed for fast feature iteration with strong testability:
- pure TypeScript game systems (combat, inventory, quests, dialog, save)
- deterministic RNG for reproducible simulation
- browser-exposed test API (`window.__game`) for integration and e2e control
- Playwright suites for visual, integration, and playthrough testing

It now includes two browser-playable surfaces:
- `/` uses `src/game/PlayableGame.ts` (direct canvas game loop)
- `/playtest.html` and `/storyline-demo.html` use `src/runtime/GameRuntime.ts` (automation harnesses)

## Highlights

- Deterministic RNG (`SeededRNG`) with stream support
- Combat system with:
  - turn order by speed
  - status effects (`poison`, `stun`, `burn`)
  - flee attempts
  - skill usage with MP cost and status application
- Inventory system with stackable and equipable items
- Quest system with prerequisites, objective progress, and branching paths
- Dialog system with conditional choices and action mutations
- Runtime save/load with quest-runtime round-tripping
- Battle rewards (EXP + weighted loot) and level growth

## Tech Stack

- TypeScript
- Vite
- Vitest
- Playwright
- Excalibur (runtime dependency)

## Project Structure

```text
src/
  actors/
  data/
  engine/
    combat/
    data/
    dialog/
    inventory/
    quest/
    rng/
    save/
  runtime/
  scenes/
  testing/
tests/
  ai-explorer/
  e2e/
  integration/
  visual/
specs/
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Build production bundle:

```bash
npm run build
```

## Browser Demo Pages

With `npm run dev` running on `http://localhost:5173`:

- Main playable game (`/src/game`): `http://localhost:5173/`
- Long storyline playtest on game canvas: `http://localhost:5173/game-storyline-demo.html`
- Runtime live playtest dashboard: `http://localhost:5173/playtest.html`
- Runtime storyline verification demo: `http://localhost:5173/storyline-demo.html`

## Test Commands

- Unit tests: `npm test`
- Unit watch mode: `npm run test:watch`
- Vitest UI: `npm run test:ui`
- Playwright all: `npm run test:pw`
- Playwright visual: `npm run test:visual`
- Playwright integration: `npm run test:integration`
- Playwright e2e: `npm run test:e2e`

Targeted browser storyline checks:
- `/src/game` storyline demo e2e: `npm run test:e2e -- tests/e2e/game-storyline-demo.spec.ts`
- Runtime storyline demo e2e: `npm run test:e2e -- tests/e2e/storyline-demo.spec.ts`

## AI Explorer

Run scripted AI-style exploration:

```bash
npm run explorer -- http://localhost:5173 42 200 reports/explorer.json
```

Arguments:
- `url` (default: `http://localhost:5173`)
- `seed` (default: `42`)
- `maxTurns` (default: `200`)
- `output` (default: timestamped file in `reports/`)

## `window.__game` Test API

In non-production mode, the runtime installs `window.__game`.

Core read methods:
- `getScene()`
- `getPlayer()`
- `getInventory()`
- `getQuestLog()` / `getQuestState()`
- `getDialogState()`
- `getMapPosition()`
- `getBattleState()`
- `getFlags()`

Core control methods:
- `teleport(x, y, map?)`
- `setPlayerStat(stat, value)`
- `addItem(itemId, quantity?)`
- `removeItem(itemId, quantity?)`
- `triggerDialog(npcId)`
- `choose(index)`
- `startBattle(enemyIds)`
- `endBattle(outcome)`
- `stepFrames(frames)`
- `changeScene(sceneName)`
- `saveGame(slot)` / `loadGame(slot)`

Scenario helpers:
- `runScenario(scenario)`
- `runScenarioFile(url)`

Example:

```js
await window.__game.changeScene('TownScene');
window.__game.triggerDialog('npc-village-elder');
window.__game.choose(0);
window.__game.startBattle(['goblin-boss']);
window.__game.stepFrames(300);
console.log(window.__game.getScene());
```

## Data-Driven Runtime

Runtime content is loaded from JSON files under `src/data/`:
- `items.json`
- `enemies.json`
- `skills.json`
- `quests.json`
- `dialog.json`
- `maps.json`
- `loot-tables.json`
- `player-growth.json`

## Spec Kit Workflow

Specs and plans live in `specs/` and are organized by feature slices.

Recommended loop:
1. define/update spec
2. generate/update plan
3. generate/update tasks
4. write failing tests
5. implement to green
6. run analysis and regression
7. commit/push

## Current Status

Implemented and tested:
- Seeded RNG
- Combat system
- Inventory system
- Quest system
- Dialog system
- Save system
- Runtime adapter and test API
- Integration/e2e/visual Playwright scaffolding

## Notes

- This repo intentionally prioritizes deterministic behavior and test control over visual polish.
- `window.__game` is disabled in production mode.
- `src/game` and `src/runtime` both express the game domain; keep their storyline logic aligned when adding new narrative beats.
