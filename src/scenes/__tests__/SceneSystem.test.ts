import { describe, expect, it } from 'vitest';
import type * as ex from 'excalibur';

import { SceneSystem } from '../SceneSystem';

describe('SceneSystem', () => {
  it('registers and changes known scene, rejects unknown scene', async () => {
    const registry = new Map<string, unknown>();
    const engine = {
      currentSceneName: 'boot',
      add: (name: string, scene: unknown) => {
        registry.set(name, scene);
      },
      goToScene: (name: string) => {
        (engine as { currentSceneName: string }).currentSceneName = name;
      },
    } as unknown as ex.Engine;

    const system = new SceneSystem(engine);
    system.register('TownScene', {} as ex.Scene);

    const ok = await system.changeScene('TownScene');
    const bad = await system.changeScene('MissingScene');

    expect(ok).toEqual({ ok: true });
    expect(system.getCurrentSceneName()).toBe('TownScene');
    expect(bad).toEqual({ ok: false, error: 'UNKNOWN_SCENE' });
  });
});
