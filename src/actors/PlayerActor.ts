import * as ex from 'excalibur';

export interface PlayerActorStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
  level: number;
  exp: number;
}

export class PlayerActor extends ex.Actor {
  private stats: PlayerActorStats;

  constructor(stats?: Partial<PlayerActorStats>) {
    super({ x: 0, y: 0, width: 16, height: 16 });
    this.stats = {
      hp: stats?.hp ?? 30,
      maxHp: stats?.maxHp ?? 30,
      mp: stats?.mp ?? 10,
      maxMp: stats?.maxMp ?? 10,
      attack: stats?.attack ?? 8,
      defense: stats?.defense ?? 5,
      speed: stats?.speed ?? 6,
      luck: stats?.luck ?? 1,
      level: stats?.level ?? 1,
      exp: stats?.exp ?? 0,
    };
  }

  getStats(): PlayerActorStats {
    return { ...this.stats };
  }

  setStat(stat: keyof PlayerActorStats, value: number): void {
    if (stat === 'hp') {
      this.stats.hp = Math.max(0, Math.min(value, this.stats.maxHp));
      return;
    }
    if (stat === 'mp') {
      this.stats.mp = Math.max(0, Math.min(value, this.stats.maxMp));
      return;
    }
    this.stats[stat] = value;
  }

  teleport(x: number, y: number): void {
    this.pos.x = x;
    this.pos.y = y;
  }
}
