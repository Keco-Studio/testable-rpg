import * as ex from 'excalibur';

export class SceneSystem {
  private readonly engine: ex.Engine;
  private readonly registered = new Set<string>();

  constructor(engine: ex.Engine) {
    this.engine = engine;
  }

  register(name: string, scene: ex.Scene): void {
    this.engine.add(name, scene);
    this.registered.add(name);
  }

  async changeScene(name: string): Promise<{ ok: true } | { ok: false; error: 'UNKNOWN_SCENE' }> {
    if (!this.registered.has(name)) {
      return { ok: false, error: 'UNKNOWN_SCENE' };
    }
    this.engine.goToScene(name);
    return { ok: true };
  }

  getCurrentSceneName(): string {
    return this.engine.currentSceneName;
  }
}
