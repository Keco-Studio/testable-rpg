# Plan 006: Minimal Playable Loop

## Architecture

- Add a pure state model (`GameLoopModel`) to handle scene transitions and movement deterministically.
- Add a rendering shell (`PlayableGame`) that binds keyboard input, updates model, and draws to canvas.
- Keep existing runtime test API installation logic unchanged in `main.ts`.

## Files

- `src/game/GameLoopModel.ts`
- `src/game/PlayableGame.ts`
- `src/game/__tests__/GameLoopModel.test.ts`
- `tests/integration/playable-loop.spec.ts`
- `src/main.ts`
- `index.html`

## Validation

- Unit tests for model transitions and movement bounds.
- Playwright integration test for keyboard-driven playable loop.
- Full regression (`npm test`, `npm run build`, Playwright integration/e2e).
