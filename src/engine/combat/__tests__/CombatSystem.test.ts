import { describe, expect, it } from 'vitest';

import { SeededRNG } from '../../rng/SeededRNG';
import { calcDamage, CombatSystem, sortBySpeed } from '../CombatSystem';
import type { CombatActor } from '../CombatTypes';
import { refreshStatusEffects } from '../StatusEffects';

function createActor(overrides: Partial<CombatActor> & { id: string; side: 'player' | 'enemy' }): CombatActor {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    side: overrides.side,
    stats: {
      hp: overrides.stats?.hp ?? 30,
      maxHp: overrides.stats?.maxHp ?? 30,
      attack: overrides.stats?.attack ?? 10,
      defense: overrides.stats?.defense ?? 3,
      speed: overrides.stats?.speed ?? 5,
      luck: overrides.stats?.luck ?? 0,
    },
    statusEffects: overrides.statusEffects ?? [],
  };
}

describe('CombatSystem damage rules', () => {
  it('uses max(1, attack - defense)', () => {
    const rng = new SeededRNG(42);
    const attacker = createActor({ id: 'p1', side: 'player', stats: { attack: 10 } as CombatActor['stats'] });
    const defender = createActor({ id: 'e1', side: 'enemy', stats: { defense: 3 } as CombatActor['stats'] });
    const result = calcDamage(attacker, defender, rng, { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0 });
    expect(result.damage).toBe(7);
    expect(result.isCritical).toBe(false);
  });

  it('enforces minimum damage of 1', () => {
    const rng = new SeededRNG(42);
    const attacker = createActor({ id: 'p1', side: 'player', stats: { attack: 3 } as CombatActor['stats'] });
    const defender = createActor({ id: 'e1', side: 'enemy', stats: { defense: 10 } as CombatActor['stats'] });
    const result = calcDamage(attacker, defender, rng, { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0 });
    expect(result.damage).toBe(1);
  });
});

describe('CombatSystem turn order and outcomes', () => {
  it('sorts by speed descending', () => {
    const rng = new SeededRNG(42);
    const actors = [
      createActor({ id: 'slow', side: 'player', stats: { speed: 1 } as CombatActor['stats'] }),
      createActor({ id: 'fast', side: 'enemy', stats: { speed: 10 } as CombatActor['stats'] }),
      createActor({ id: 'mid', side: 'enemy', stats: { speed: 5 } as CombatActor['stats'] }),
    ];
    const sorted = sortBySpeed(actors, rng);
    expect(sorted.map((actor) => actor.id)).toEqual(['fast', 'mid', 'slow']);
  });

  it('breaks speed ties deterministically for same seed', () => {
    const actors = [
      createActor({ id: 'a', side: 'player', stats: { speed: 5 } as CombatActor['stats'] }),
      createActor({ id: 'b', side: 'enemy', stats: { speed: 5 } as CombatActor['stats'] }),
    ];
    const orderA = sortBySpeed(actors, new SeededRNG(42)).map((actor) => actor.id);
    const orderB = sortBySpeed(actors, new SeededRNG(42)).map((actor) => actor.id);
    expect(orderA).toEqual(orderB);
  });

  it('returns winner player when enemies die first', () => {
    const system = new CombatSystem();
    const result = system.resolve(
      [
        createActor({ id: 'p1', side: 'player', stats: { attack: 12, speed: 10, hp: 25, maxHp: 25 } as CombatActor['stats'] }),
        createActor({ id: 'e1', side: 'enemy', stats: { attack: 1, defense: 1, hp: 5, maxHp: 5, speed: 1 } as CombatActor['stats'] }),
      ],
      new SeededRNG(42),
      { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0 },
    );
    expect(result.winner).toBe('player');
  });

  it('does not mutate input actors', () => {
    const actors = [
      createActor({ id: 'p1', side: 'player' }),
      createActor({ id: 'e1', side: 'enemy' }),
    ];
    const snapshot = JSON.parse(JSON.stringify(actors)) as CombatActor[];

    const system = new CombatSystem();
    system.resolve(actors, new SeededRNG(42), { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0 });

    expect(actors).toEqual(snapshot);
  });
});

describe('CombatSystem status effects', () => {
  it('poison ticks for 10% max hp each turn and expires', () => {
    const system = new CombatSystem();
    const result = system.resolve(
      [
        createActor({
          id: 'p1',
          side: 'player',
          stats: { hp: 100, maxHp: 100, attack: 1, defense: 2, speed: 8, luck: 0 } as CombatActor['stats'],
          statusEffects: [{ type: 'poison', duration: 3 }],
        }),
        createActor({ id: 'e1', side: 'enemy', stats: { hp: 200, maxHp: 200, attack: 1, defense: 2, speed: 1, luck: 0 } as CombatActor['stats'] }),
      ],
      new SeededRNG(42),
      { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0, maxRounds: 3 },
    );

    const player = result.survivingActors.find((actor) => actor.id === 'p1');
    expect(player?.stats.hp).toBe(67);
    expect(player?.statusEffects).toEqual([]);
  });

  it('stun skips actor turns while duration lasts', () => {
    const system = new CombatSystem();
    const result = system.resolve(
      [
        createActor({
          id: 'p1',
          side: 'player',
          stats: { hp: 30, maxHp: 30, attack: 8, defense: 2, speed: 10, luck: 0 } as CombatActor['stats'],
          statusEffects: [{ type: 'stun', duration: 2 }],
        }),
        createActor({ id: 'e1', side: 'enemy', stats: { hp: 30, maxHp: 30, attack: 1, defense: 2, speed: 1, luck: 0 } as CombatActor['stats'] }),
      ],
      new SeededRNG(42),
      { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0, maxRounds: 2 },
    );

    const playerTurns = result.turns.filter((turn) => turn.actorId === 'p1');
    expect(playerTurns.every((turn) => turn.action === 'skip')).toBe(true);
  });

  it('refreshes same status type instead of stacking', () => {
    const effects = refreshStatusEffects([{ type: 'poison', duration: 2 }], { type: 'poison', duration: 5 });
    expect(effects).toEqual([{ type: 'poison', duration: 5 }]);
  });
});

describe('CombatSystem events', () => {
  it('emits damage, status, death, and battleEnded events', () => {
    const system = new CombatSystem();
    const log: string[] = [];

    system.on('combat:damage', () => log.push('damage'));
    system.on('combat:statusApplied', () => log.push('status'));
    system.on('combat:actorDied', () => log.push('died'));
    system.on('combat:battleEnded', () => log.push('end'));

    system.resolve(
      [
        createActor({
          id: 'p1',
          side: 'player',
          stats: { hp: 25, maxHp: 25, attack: 12, defense: 2, speed: 9, luck: 0 } as CombatActor['stats'],
          statusEffects: [{ type: 'burn', duration: 1 }],
        }),
        createActor({ id: 'e1', side: 'enemy', stats: { hp: 5, maxHp: 5, attack: 1, defense: 1, speed: 1, luck: 0 } as CombatActor['stats'] }),
      ],
      new SeededRNG(42),
      { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0 },
    );

    expect(log).toContain('status');
    expect(log).toContain('damage');
    expect(log).toContain('died');
    expect(log.at(-1)).toBe('end');
  });
});
