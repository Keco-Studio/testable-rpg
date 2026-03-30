import { PlayableGame } from './game/PlayableGame';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const hud = document.querySelector<HTMLElement>('#hud');
if (!canvas || !hud) {
  throw new Error('Game bootstrap failed: missing #game-canvas or #hud element.');
}

const game = new PlayableGame(canvas, hud);
game.start();

if (import.meta.env.MODE !== 'production') {
  const [{ installGameTestAPI }, { createRuntimeAdapter }] = await Promise.all([
    import('./testing/GameTestAPI'),
    import('./runtime/GameRuntime'),
  ]);
  installGameTestAPI(import.meta.env.MODE, createRuntimeAdapter());
}
