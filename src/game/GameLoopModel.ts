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

  update(input: InputState, dtMs: number): void {
    if (this.state.scene !== 'TownScene') return;

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
