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
});
