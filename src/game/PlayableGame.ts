import { GameLoopModel, type InputState, type SceneName } from './GameLoopModel';
import { MapRenderer } from './map/MapRenderer';
import { loadVillageMap } from './map/villageMap';

interface SpritePalette {
  skin: string;
  body: string;
  trim: string;
  shadow: string;
}

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

    const mapData = loadVillageMap();
    this.mapRenderer = new MapRenderer(this.ctx, mapData);
  }

  private readonly ctx: CanvasRenderingContext2D;
  private readonly mapRenderer: MapRenderer;

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

  getState() {
    return this.model.getState();
  }

  reset(): void {
    this.model.reset();
  }

  enterTown(): void {
    this.model.enterTownFromTitle();
  }

  returnToTown(): void {
    this.model.returnToTown();
  }

  setPlayerNearNpc(npcId: string): boolean {
    return this.model.setPlayerNearNpc(npcId);
  }

  interact(): void {
    this.model.interact();
  }

  chooseDialog(index: number): void {
    this.model.selectDialogChoice(index);
  }

  startBattleWith(enemyIds: string[]): void {
    this.model.startBattleWith(enemyIds);
  }

  resolveBattle(outcome: 'win' | 'lose' | 'flee'): void {
    this.model.resolveBattle(outcome);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (key === 'arrowleft') this.input.left = true;
    if (key === 'arrowright') this.input.right = true;
    if (key === 'arrowup') this.input.up = true;
    if (key === 'arrowdown') this.input.down = true;

    if (key === 'enter') {
      this.model.enterTownFromTitle();
      this.model.returnToTown();
    }
    if (key === 'e') this.model.interact();
    if (key === '1') this.model.selectDialogChoice(0);
    if (key === '2') this.model.selectDialogChoice(1);
    if (key === 'b') this.model.startBattle();
    if (key === 'w') this.model.resolveBattle('win');
    if (key === 'l') this.model.resolveBattle('lose');
    if (key === 'f') this.model.resolveBattle('flee');
    if (key === 'r') this.model.reset();
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

  private scenePalette(scene: SceneName): { top: string; bottom: string } {
    if (scene === 'TitleScene') return { top: '#213754', bottom: '#101f32' };
    if (scene === 'TownScene') return { top: '#2a5a44', bottom: '#173526' };
    if (scene === 'BattleScene') return { top: '#663536', bottom: '#2b1516' };
    if (scene === 'VictoryScene') return { top: '#2b6247', bottom: '#123424' };
    return { top: '#4c294f', bottom: '#241226' };
  }

  private drawCharacter(x: number, y: number, palette: SpritePalette): void {
    this.ctx.fillStyle = palette.shadow;
    this.ctx.beginPath();
    this.ctx.ellipse(x + 10, y + 30, 10, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = palette.body;
    this.ctx.fillRect(x + 4, y + 10, 12, 14);
    this.ctx.fillStyle = palette.trim;
    this.ctx.fillRect(x + 8, y + 10, 4, 14);

    this.ctx.fillStyle = palette.skin;
    this.ctx.beginPath();
    this.ctx.arc(x + 10, y + 6, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 7, y + 22);
    this.ctx.lineTo(x + 6, y + 28);
    this.ctx.moveTo(x + 13, y + 22);
    this.ctx.lineTo(x + 14, y + 28);
    this.ctx.stroke();
  }

  private drawEnemy(x: number, y: number): void {
    this.ctx.fillStyle = 'rgba(127, 29, 29, 0.45)';
    this.ctx.beginPath();
    this.ctx.ellipse(x + 12, y + 24, 12, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ef4444';
    this.ctx.beginPath();
    this.ctx.moveTo(x + 2, y + 24);
    this.ctx.lineTo(x + 12, y + 8);
    this.ctx.lineTo(x + 22, y + 24);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#fee2e2';
    this.ctx.fillRect(x + 7, y + 15, 2, 2);
    this.ctx.fillRect(x + 15, y + 15, 2, 2);
  }

  private render(): void {
    const state = this.model.getState();
    const palette = this.scenePalette(state.scene);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, palette.top);
    gradient.addColorStop(1, palette.bottom);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.globalAlpha = 0.08;
    this.ctx.fillStyle = '#ffffff';
    for (let x = 0; x < this.canvas.width; x += 22) {
      this.ctx.fillRect(x, 0, 1, this.canvas.height);
    }
    for (let y = 0; y < this.canvas.height; y += 22) {
      this.ctx.fillRect(0, y, this.canvas.width, 1);
    }
    this.ctx.globalAlpha = 1;

    if (state.scene === 'TownScene') {
      this.mapRenderer.draw();

      for (const npc of state.npcs) {
        this.drawCharacter(npc.x - 2, npc.y - 4, {
          skin: '#fef3c7',
          body: '#ffd166',
          trim: '#b45309',
          shadow: 'rgba(120, 80, 20, 0.35)',
        });
        this.ctx.fillStyle = '#fef3c7';
        this.ctx.font = '11px monospace';
        this.ctx.fillText(npc.title, npc.x - 10, npc.y - 10);
      }
    }

    if (state.scene === 'BattleScene') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const enemies = state.battle?.enemies ?? [];
      for (let i = 0; i < Math.max(1, enemies.length); i += 1) {
        this.drawEnemy(420 + i * 48, 160 + (i % 2) * 22);
      }

      this.ctx.fillStyle = '#fecaca';
      this.ctx.font = '14px monospace';
      this.ctx.fillText(`Enemies: ${enemies.join(', ') || 'unknown'}`, 22, 76);
    }

    this.drawCharacter(state.player.x - 2, state.player.y - 8, {
      skin: '#e2e8f0',
      body: '#7dd3fc',
      trim: '#0369a1',
      shadow: 'rgba(30, 58, 83, 0.45)',
    });

    if (this.model.getNearbyNpcId() && !state.dialog.open && state.scene === 'TownScene') {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '14px monospace';
      this.ctx.fillText('Press E to interact', 12, 72);
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.fillText(`Scene: ${state.scene}`, 12, 24);
    this.ctx.fillText('Arrows move | E talk | B battle | W/L/F outcome | R reset', 12, 46);

    if (state.dialog.open) {
      this.ctx.fillStyle = 'rgba(10, 20, 30, 0.9)';
      this.ctx.fillRect(18, this.canvas.height - 126, this.canvas.width - 36, 108);
      this.ctx.strokeStyle = '#7dd3fc';
      this.ctx.strokeRect(18, this.canvas.height - 126, this.canvas.width - 36, 108);

      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.font = '14px monospace';
      this.ctx.fillText(state.dialog.text, 30, this.canvas.height - 96);
      this.ctx.fillText(`1) ${state.dialog.choices[0] ?? ''}`, 30, this.canvas.height - 68);
      this.ctx.fillText(`2) ${state.dialog.choices[1] ?? ''}`, 30, this.canvas.height - 44);
    }

    const inventory = state.inventory.map((entry) => `${entry.itemId} x${entry.quantity}`).join(', ') || 'empty';
    const questLine = Object.entries(state.quests)
      .map(([id, status]) => `${id}:${status}`)
      .join(' | ');
    this.hud.innerHTML =
      `Scene: ${state.scene} | Position: (${Math.round(state.player.x)}, ${Math.round(state.player.y)}) | ` +
      `HP: ${state.player.hp}/${state.player.maxHp} | Level: ${state.player.level} | EXP: ${state.player.exp}<br>` +
      `Faction: ${state.faction} | Inventory: ${inventory}<br>` +
      `Quests: ${questLine}`;
  }
}
