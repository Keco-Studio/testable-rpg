import { describe, expect, it } from 'vitest';

import { MemoryStorageAdapter, SaveSystem } from '../SaveSystem';

const sample = {
  scene: 'TownScene',
  player: { hp: 10, maxHp: 30, mp: 5, maxMp: 10, attack: 6, defense: 4, speed: 5, luck: 1, level: 2, exp: 120, x: 4, y: 9 },
  inventory: [{ itemId: 'potion', quantity: 2 }],
  quests: { q1: 'ACTIVE' as const },
  flags: { gateOpen: true },
  mapPosition: { map: 'starting-village', x: 4, y: 9 },
};

describe('SaveSystem', () => {
  it('saves and loads slot data', () => {
    const storage = new MemoryStorageAdapter();
    const save = new SaveSystem(storage);
    save.save(1, sample);

    expect(save.load(1)).toEqual(sample);
  });

  it('returns null for empty slot', () => {
    const save = new SaveSystem(new MemoryStorageAdapter());
    expect(save.load(2)).toBeNull();
  });

  it('clears slot data', () => {
    const storage = new MemoryStorageAdapter();
    const save = new SaveSystem(storage);
    save.save(3, sample);
    save.clear(3);

    expect(save.load(3)).toBeNull();
  });

  it('overwriting a slot replaces data completely', () => {
    const storage = new MemoryStorageAdapter();
    const save = new SaveSystem(storage);

    const first = { ...sample, scene: 'TownScene' as const };
    const second = { ...sample, scene: 'BattleScene' as const };

    save.save(1, first);
    expect(save.load(1)?.scene).toBe('TownScene');

    save.save(1, second);
    expect(save.load(1)?.scene).toBe('BattleScene');
    expect(save.load(1)).toEqual(second);
  });

  it('loading malformed JSON returns null, never throws', () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem('ironveil-save:1', 'not valid json {{{');

    const save = new SaveSystem(storage);
    expect(() => save.load(1)).not.toThrow();
    expect(save.load(1)).toBeNull();
  });

  it('all 3 slots are independent', () => {
    const storage = new MemoryStorageAdapter();
    const save = new SaveSystem(storage);

    const data1 = { ...sample, scene: 'TownScene' as const };
    const data2 = { ...sample, scene: 'BattleScene' as const };
    const data3 = { ...sample, scene: 'GameOverScene' as const };

    save.save(1, data1);
    save.save(2, data2);
    save.save(3, data3);

    expect(save.load(1)?.scene).toBe('TownScene');
    expect(save.load(2)?.scene).toBe('BattleScene');
    expect(save.load(3)?.scene).toBe('GameOverScene');

    save.clear(2);
    expect(save.load(1)?.scene).toBe('TownScene');
    expect(save.load(2)).toBeNull();
    expect(save.load(3)?.scene).toBe('GameOverScene');
  });
});
