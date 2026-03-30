export type CombatSide = 'player' | 'enemy';

export type StatusEffectType = 'poison' | 'stun' | 'burn';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
}

export interface CombatStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  luck: number;
}

export interface CombatActor {
  id: string;
  name: string;
  side: CombatSide;
  stats: CombatStats;
  statusEffects: StatusEffect[];
}

export interface TurnRecord {
  actorId: string;
  action: 'attack' | 'skip';
  targetId?: string;
  damage?: number;
  isCritical?: boolean;
  statusApplied?: StatusEffectType;
}

export interface BattleResult {
  winner: CombatSide;
  turns: ReadonlyArray<Readonly<TurnRecord>>;
  survivingActors: ReadonlyArray<Readonly<CombatActor>>;
}

export interface CombatConfig {
  critChanceBase?: number;
  critLuckScale?: number;
  critChanceMax?: number;
  maxRounds?: number;
}

export interface CombatDamageEvent {
  attackerId: string;
  defenderId: string;
  damage: number;
  isCritical: boolean;
}

export interface CombatStatusEvent {
  actorId: string;
  effect: StatusEffectType;
  duration: number;
}

export interface CombatActorDiedEvent {
  actorId: string;
}

export interface CombatBattleEndedEvent {
  winningSide: CombatSide;
}

export interface CombatEventMap {
  'combat:damage': CombatDamageEvent;
  'combat:statusApplied': CombatStatusEvent;
  'combat:actorDied': CombatActorDiedEvent;
  'combat:battleEnded': CombatBattleEndedEvent;
}
