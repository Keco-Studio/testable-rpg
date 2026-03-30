import type { SeededRNG } from '../rng/SeededRNG';
import {
  type BattleResult,
  type CombatActor,
  type CombatConfig,
  type CombatEventMap,
  type CombatSide,
  type TurnRecord,
} from './CombatTypes';
import { tickStatus } from './StatusEffects';

const DEFAULT_CONFIG: Required<CombatConfig> = {
  critChanceBase: 0.15,
  critLuckScale: 0.01,
  critChanceMax: 0.75,
  maxRounds: 1_000,
};

type EventName = keyof CombatEventMap;
type EventHandler<K extends EventName> = (payload: CombatEventMap[K]) => void;

function cloneActor(actor: CombatActor): CombatActor {
  return {
    ...actor,
    stats: { ...actor.stats },
    statusEffects: actor.statusEffects.map((effect) => ({ ...effect })),
  };
}

function freezeResult(result: BattleResult): BattleResult {
  const frozenTurns = result.turns.map((turn) => Object.freeze({ ...turn }));
  const frozenSurvivors = result.survivingActors.map((actor) =>
    Object.freeze({
      ...actor,
      stats: { ...actor.stats },
      statusEffects: actor.statusEffects.map((effect) => ({ ...effect })),
    }),
  );

  return Object.freeze({
    winner: result.winner,
    turns: Object.freeze(frozenTurns),
    survivingActors: Object.freeze(frozenSurvivors),
  });
}

function mergeConfig(config?: CombatConfig): Required<CombatConfig> {
  return {
    critChanceBase: config?.critChanceBase ?? DEFAULT_CONFIG.critChanceBase,
    critLuckScale: config?.critLuckScale ?? DEFAULT_CONFIG.critLuckScale,
    critChanceMax: config?.critChanceMax ?? DEFAULT_CONFIG.critChanceMax,
    maxRounds: config?.maxRounds ?? DEFAULT_CONFIG.maxRounds,
  };
}

function sideAlive(actors: readonly CombatActor[], side: CombatSide): boolean {
  return actors.some((actor) => actor.side === side && actor.stats.hp > 0);
}

function firstLivingTarget(actors: readonly CombatActor[], side: CombatSide): CombatActor | undefined {
  return actors.find((actor) => actor.side === side && actor.stats.hp > 0);
}

export function sortBySpeed(actors: readonly CombatActor[], rng: SeededRNG): CombatActor[] {
  const tieBreaker = rng.stream('combat');
  return [...actors].sort((a, b) => {
    if (a.stats.speed !== b.stats.speed) {
      return b.stats.speed - a.stats.speed;
    }
    return tieBreaker.next() < 0.5 ? -1 : 1;
  });
}

export function calcDamage(
  attacker: CombatActor,
  defender: CombatActor,
  rng: SeededRNG,
  config?: CombatConfig,
): { damage: number; isCritical: boolean } {
  const merged = mergeConfig(config);
  const baseDamage = Math.max(1, attacker.stats.attack - defender.stats.defense);
  const critChance = Math.min(
    merged.critChanceMax,
    Math.max(0, merged.critChanceBase + attacker.stats.luck * merged.critLuckScale),
  );
  const isCritical = rng.stream('combat').next() < critChance;
  return {
    damage: isCritical ? baseDamage * 2 : baseDamage,
    isCritical,
  };
}

export class CombatSystem {
  private readonly listeners: { [K in EventName]: Set<EventHandler<K>> } = {
    'combat:damage': new Set(),
    'combat:statusApplied': new Set(),
    'combat:actorDied': new Set(),
    'combat:battleEnded': new Set(),
  };

  on<K extends EventName>(eventName: K, handler: EventHandler<K>): () => void {
    this.listeners[eventName].add(handler);
    return () => {
      this.listeners[eventName].delete(handler);
    };
  }

  private emit<K extends EventName>(eventName: K, payload: CombatEventMap[K]): void {
    for (const listener of this.listeners[eventName]) {
      listener(payload);
    }
  }

  resolve(actors: readonly CombatActor[], rng: SeededRNG, config?: CombatConfig): BattleResult {
    const merged = mergeConfig(config);
    const workingActors = actors.map(cloneActor);

    const players = workingActors.filter((actor) => actor.side === 'player');
    const enemies = workingActors.filter((actor) => actor.side === 'enemy');
    if (players.length === 0 || enemies.length === 0) {
      throw new Error('Combat requires at least one player and one enemy actor.');
    }

    const turns: TurnRecord[] = [];
    let roundCount = 0;

    while (
      sideAlive(workingActors, 'player') &&
      sideAlive(workingActors, 'enemy') &&
      roundCount < merged.maxRounds
    ) {
      roundCount += 1;
      const queue = sortBySpeed(
        workingActors.filter((actor) => actor.stats.hp > 0),
        rng,
      );

      for (const queuedActor of queue) {
        const actor = workingActors.find((candidate) => candidate.id === queuedActor.id);
        if (!actor || actor.stats.hp <= 0) {
          continue;
        }

        const tickResult = tickStatus(actor);
        actor.stats = tickResult.updatedActor.stats;
        actor.statusEffects = tickResult.updatedActor.statusEffects;

        for (const statusEvent of tickResult.events) {
          this.emit('combat:statusApplied', {
            actorId: actor.id,
            effect: statusEvent.effect,
            duration: statusEvent.duration,
          });
        }

        if (tickResult.actorDied) {
          this.emit('combat:actorDied', { actorId: actor.id });
          continue;
        }

        if (tickResult.skippedTurn) {
          turns.push({ actorId: actor.id, action: 'skip', statusApplied: 'stun' });
          continue;
        }

        const targetSide: CombatSide = actor.side === 'player' ? 'enemy' : 'player';
        const target = firstLivingTarget(workingActors, targetSide);
        if (!target) {
          break;
        }

        const { damage, isCritical } = calcDamage(actor, target, rng, merged);
        target.stats.hp = Math.max(0, target.stats.hp - damage);

        const turn: TurnRecord = {
          actorId: actor.id,
          action: 'attack',
          targetId: target.id,
          damage,
          isCritical,
        };
        turns.push(turn);

        this.emit('combat:damage', {
          attackerId: actor.id,
          defenderId: target.id,
          damage,
          isCritical,
        });

        if (target.stats.hp <= 0) {
          this.emit('combat:actorDied', { actorId: target.id });
        }

        if (!sideAlive(workingActors, 'player') || !sideAlive(workingActors, 'enemy')) {
          break;
        }
      }
    }

    const winner: CombatSide = sideAlive(workingActors, 'enemy') ? 'enemy' : 'player';
    this.emit('combat:battleEnded', { winningSide: winner });

    const result: BattleResult = {
      winner,
      turns,
      survivingActors: workingActors.filter((actor) => actor.stats.hp > 0),
    };

    return freezeResult(result);
  }
}
