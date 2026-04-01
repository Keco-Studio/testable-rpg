import { describe, expect, it } from 'vitest';

import { SeededRNG } from '../../rng/SeededRNG';
import { attemptFlee, calcDamage, CombatSystem, sortBySpeed } from '../CombatSystem';
import type { CombatActor } from '../CombatTypes';
import { refreshStatusEffects } from '../StatusEffects';

function createActor(overrides: Partial<CombatActor> & { id: string; side: 'player' | 'enemy' }): CombatActor {
  const stats = overrides.stats ?? ({} as CombatActor['stats']);
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    side: overrides.side,
    stats: {
      hp: stats.hp ?? 30,
      maxHp: stats.maxHp ?? 30,
      mp: stats.mp ?? 0,
      maxMp: stats.maxMp ?? 0,
      attack: stats.attack ?? 10,
      defense: stats.defense ?? 3,
      speed: stats.speed ?? 5,
      luck: stats.luck ?? 0,
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

  it('critical hits deal exactly 2x damage', () => {
    const attacker = createActor({
      id: 'crit-hero',
      side: 'player',
      stats: { hp: 30, maxHp: 30, mp: 0, maxMp: 0, attack: 10, defense: 0, speed: 5, luck: 100 },
    });
    const defender = createActor({
      id: 'target',
      side: 'enemy',
      stats: { hp: 100, maxHp: 100, mp: 0, maxMp: 0, attack: 5, defense: 3, speed: 1, luck: 0 },
    });

    const baseDmg = Math.max(1, attacker.stats.attack - defender.stats.defense); // 10 - 3 = 7
    expect(baseDmg).toBe(7);

    // Try multiple seeds to find one that triggers a crit
    let critDmg: number | null = null;
    let foundCrit = false;
    for (let seed = 0; seed < 100; seed++) {
      const testRng = new SeededRNG(seed);
      const result = calcDamage(attacker, defender, testRng, { critChanceBase: 0.15, critLuckScale: 0.01, critChanceMax: 0.75 });
      if (result.isCritical && result.damage === baseDmg * 2) {
        critDmg = result.damage;
        foundCrit = true;
        break;
      }
    }
    expect(foundCrit).toBe(true);
    expect(critDmg).toBe(14); // 7 * 2 = 14
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

describe('CombatSystem flee + skills', () => {
  it('attemptFlee succeeds for high speed/luck actors more reliably', () => {
    const fast = createActor({
      id: 'runner',
      side: 'player',
      stats: { hp: 10, maxHp: 10, attack: 1, defense: 1, speed: 20, luck: 10 } as CombatActor['stats'],
    });
    const slow = createActor({
      id: 'slowpoke',
      side: 'player',
      stats: { hp: 10, maxHp: 10, attack: 1, defense: 1, speed: 0, luck: 0 } as CombatActor['stats'],
    });

    const runs = 200;
    let fastWins = 0;
    let slowWins = 0;
    const rngFast = new SeededRNG(42);
    const rngSlow = new SeededRNG(42);
    for (let i = 0; i < runs; i++) {
      if (attemptFlee(fast, rngFast)) fastWins += 1;
      if (attemptFlee(slow, rngSlow)) slowWins += 1;
    }

    expect(fastWins).toBeGreaterThan(slowWins);
  });

  it('useSkill consumes mp, deals damage, and applies status', () => {
    const system = new CombatSystem();
    const attacker = createActor({
      id: 'mage',
      side: 'player',
      stats: { hp: 20, maxHp: 20, mp: 10, maxMp: 10, attack: 6, defense: 2, speed: 5, luck: 0 } as CombatActor['stats'],
    });
    const defender = createActor({
      id: 'enemy',
      side: 'enemy',
      stats: { hp: 30, maxHp: 30, attack: 4, defense: 2, speed: 4, luck: 0 } as CombatActor['stats'],
    });

    const result = system.useSkill(
      attacker,
      defender,
      { id: 'burn-strike', name: 'Burn Strike', mpCost: 3, power: 4, applyStatus: { type: 'burn', duration: 2 } },
      new SeededRNG(42),
      { critChanceBase: 0, critLuckScale: 0, critChanceMax: 0 },
    );

    expect(result.ok).toBe(true);
    expect(attacker.stats.mp).toBe(7);
    expect(defender.stats.hp).toBe(22);
    expect(defender.statusEffects).toContainEqual({ type: 'burn', duration: 2 });
  });

  it('useSkill fails when attacker lacks mp', () => {
    const system = new CombatSystem();
    const attacker = createActor({
      id: 'mage',
      side: 'player',
      stats: { hp: 20, maxHp: 20, mp: 1, maxMp: 10, attack: 6, defense: 2, speed: 5, luck: 0 } as CombatActor['stats'],
    });
    const defender = createActor({ id: 'enemy', side: 'enemy' });

    const result = system.useSkill(
      attacker,
      defender,
      { id: 'big-spell', name: 'Big Spell', mpCost: 5, power: 10 },
      new SeededRNG(42),
    );

    expect(result.ok).toBe(false);
    expect(attacker.stats.mp).toBe(1);
  });
});
