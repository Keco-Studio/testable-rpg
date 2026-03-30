export type SceneName = 'TitleScene' | 'TownScene' | 'BattleScene' | 'VictoryScene' | 'GameOverScene';

export interface GameLoopState {
  scene: SceneName;
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    speedPerSec: number;
  };
  world: {
    width: number;
    height: number;
  };
  npcs: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
  }>;
  dialog: {
    open: boolean;
    npcId: string | null;
    text: string;
    choices: string[];
  };
  faction: 'none' | 'guard' | 'mages';
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class GameLoopModel {
  private state: GameLoopState = {
    scene: 'TitleScene',
    player: {
      x: 128,
      y: 96,
      width: 16,
      height: 16,
      speedPerSec: 110,
    },
    world: {
      width: 640,
      height: 360,
    },
    npcs: [
      { id: 'faction-leader', x: 156, y: 96, width: 16, height: 16, title: 'Faction Leader' },
    ],
    dialog: {
      open: false,
      npcId: null,
      text: '',
      choices: [],
    },
    faction: 'none',
  };

  getState(): GameLoopState {
    return JSON.parse(JSON.stringify(this.state)) as GameLoopState;
  }

  enterTownFromTitle(): void {
    if (this.state.scene === 'TitleScene') {
      this.state.scene = 'TownScene';
    }
  }

  startBattle(): void {
    if (this.state.scene === 'TownScene') {
      this.state.scene = 'BattleScene';
    }
  }

  resolveBattle(outcome: 'win' | 'lose' | 'flee'): void {
    if (this.state.scene !== 'BattleScene') return;
    if (outcome === 'win') {
      this.state.scene = 'VictoryScene';
      return;
    }
    if (outcome === 'lose') {
      this.state.scene = 'GameOverScene';
      return;
    }
    this.state.scene = 'TownScene';
  }

  private overlapPadding = 18;

  getNearbyNpcId(): string | null {
    if (this.state.scene !== 'TownScene') return null;
    const player = this.state.player;
    for (const npc of this.state.npcs) {
      const nearX =
        player.x + player.width >= npc.x - this.overlapPadding &&
        player.x <= npc.x + npc.width + this.overlapPadding;
      const nearY =
        player.y + player.height >= npc.y - this.overlapPadding &&
        player.y <= npc.y + npc.height + this.overlapPadding;
      if (nearX && nearY) return npc.id;
    }
    return null;
  }

  interact(): void {
    if (this.state.scene !== 'TownScene') return;
    if (this.state.dialog.open) return;
    const npcId = this.getNearbyNpcId();
    if (!npcId) return;

    if (npcId === 'faction-leader') {
      this.state.dialog = {
        open: true,
        npcId,
        text: 'Choose your faction:',
        choices: ['Join the Guard', 'Join the Mages'],
      };
    }
  }

  selectDialogChoice(index: number): void {
    if (!this.state.dialog.open) return;
    const npcId = this.state.dialog.npcId;
    if (npcId === 'faction-leader') {
      if (index === 0) this.state.faction = 'guard';
      if (index === 1) this.state.faction = 'mages';
    }

    this.state.dialog = {
      open: false,
      npcId: null,
      text: '',
      choices: [],
    };
  }

  update(input: InputState, dtMs: number): void {
    if (this.state.scene !== 'TownScene') return;
    if (this.state.dialog.open) return;

    const distance = this.state.player.speedPerSec * (dtMs / 1000);
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= distance;
    if (input.right) dx += distance;
    if (input.up) dy -= distance;
    if (input.down) dy += distance;

    this.state.player.x = clamp(
      this.state.player.x + dx,
      0,
      this.state.world.width - this.state.player.width,
    );
    this.state.player.y = clamp(
      this.state.player.y + dy,
      0,
      this.state.world.height - this.state.player.height,
    );
  }
}
