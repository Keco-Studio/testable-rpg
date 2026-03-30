import { SeededRNG } from './engine/rng/SeededRNG';

const rng = new SeededRNG(42);

document.querySelector('p')!.textContent =
  `SeededRNG(42) ready — nextFloat: ${rng.nextFloat().toFixed(8)}`;

if (import.meta.env.MODE !== 'production') {
  const [{ installGameTestAPI }, { createRuntimeAdapter }] = await Promise.all([
    import('./testing/GameTestAPI'),
    import('./runtime/GameRuntime'),
  ]);
  installGameTestAPI(import.meta.env.MODE, createRuntimeAdapter());
}
