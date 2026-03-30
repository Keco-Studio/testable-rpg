# Spec 006: Minimal Playable Loop

## Goal

Deliver a visibly playable browser loop where a user can:

1. see a title scene,
2. start the game,
3. move a player avatar in town with keyboard,
4. enter battle,
5. resolve to victory or game over.

## Acceptance Criteria

- AC-01: Page renders a visible game canvas and HUD.
- AC-02: Initial scene is `TitleScene`.
- AC-03: Pressing `Enter` from title transitions to `TownScene`.
- AC-04: Arrow keys move player in `TownScene` and clamp to map bounds.
- AC-05: Pressing `b` in town transitions to `BattleScene`.
- AC-06: In `BattleScene`, pressing `w` transitions to `VictoryScene`.
- AC-07: In `BattleScene`, pressing `l` transitions to `GameOverScene`.
- AC-08: HUD always shows current scene and player coordinates.
- AC-09: Existing deterministic test API (`window.__game`) remains available in non-production mode.

## Non-Goals

- Full RPG map content, NPC art, or production UI polish.
- Replacing runtime automation systems already implemented.
