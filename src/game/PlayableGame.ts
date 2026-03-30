import { GameLoopModel, type InputState, type SceneName } from './GameLoopModel';

export class PlayableGame {
  private readonly model = new GameLoopModel();
  private readonly input: InputState = { left: false, right: false, up: false, down: false };
  private rafId: number | null = null;
  private lastTime = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly hud: HTMLElement,
  ) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available.');
    }
    this.ctx = ctx;

    this.canvas.width = 640;
    this.canvas.height = 360;
  }

  private readonly ctx: CanvasRenderingContext2D;

  start(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft') this.input.left = true;
    if (key === 'arrowright') this.input.right = true;
    if (key === 'arrowup') this.input.up = true;
    if (key === 'arrowdown') this.input.down = true;

    if (key === 'enter') this.model.enterTownFromTitle();
    if (key === 'e') this.model.interact();
    if (key === '1') this.model.selectDialogChoice(0);
    if (key === '2') this.model.selectDialogChoice(1);
    if (key === 'b') this.model.startBattle();
    if (key === 'w') this.model.resolveBattle('win');
    if (key === 'l') this.model.resolveBattle('lose');
    if (key === 'f') this.model.resolveBattle('flee');
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft') this.input.left = false;
    if (key === 'arrowright') this.input.right = false;
    if (key === 'arrowup') this.input.up = false;
    if (key === 'arrowdown') this.input.down = false;
  };

  private loop = (time: number): void => {
    const dt = Math.max(0, Math.min(100, time - this.lastTime));
    this.lastTime = time;

    this.model.update(this.input, dt);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private sceneColor(scene: SceneName): string {
    if (scene === 'TitleScene') return '#1d2d50';
    if (scene === 'TownScene') return '#1f5130';
    if (scene === 'BattleScene') return '#5a1e1e';
    if (scene === 'VictoryScene') return '#1f5a3f';
    return '#3b1f4a';
  }

  private render(): void {
    const state = this.model.getState();

    this.ctx.fillStyle = this.sceneColor(state.scene);
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (state.scene === 'TownScene') {
      this.ctx.fillStyle = '#ffd166';
      for (const npc of state.npcs) {
        this.ctx.fillRect(npc.x, npc.y, npc.width, npc.height);
      }

      this.ctx.fillStyle = '#f7f7f7';
      this.ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);

      if (this.model.getNearbyNpcId() && !state.dialog.open) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('Press E to interact', 12, 70);
      }
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.fillText(`Scene: ${state.scene}`, 12, 22);

    if (state.scene === 'TitleScene') {
      this.ctx.fillText('Press Enter to Start', 12, 46);
    } else if (state.scene === 'TownScene') {
      this.ctx.fillText('Arrows move | E talk | B battle', 12, 46);
    } else if (state.scene === 'BattleScene') {
      this.ctx.fillText('W win | L lose | F flee', 12, 46);
    }

    if (state.dialog.open) {
      this.ctx.fillStyle = 'rgba(10, 20, 30, 0.88)';
      this.ctx.fillRect(18, this.canvas.height - 126, this.canvas.width - 36, 108);
      this.ctx.strokeStyle = '#7dd3fc';
      this.ctx.strokeRect(18, this.canvas.height - 126, this.canvas.width - 36, 108);

      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.fillText(state.dialog.text, 30, this.canvas.height - 96);
      this.ctx.fillText(`1) ${state.dialog.choices[0] ?? ''}`, 30, this.canvas.height - 68);
      this.ctx.fillText(`2) ${state.dialog.choices[1] ?? ''}`, 30, this.canvas.height - 44);
    }

    this.hud.textContent = `Scene: ${state.scene} | Player: (${Math.round(state.player.x)}, ${Math.round(state.player.y)}) | Faction: ${state.faction} | Dialog: ${state.dialog.open ? 'open' : 'closed'}`;
  }
}
