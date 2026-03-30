import { describe, expect, it, vi } from 'vitest';

import { DataLoadError, DataLoader, DataValidationError, UnknownIdError } from '../DataLoader';

const sources = {
  items: '/data/items.json',
  enemies: '/data/enemies.json',
  skills: '/data/skills.json',
  quests: '/data/quests.json',
  dialog: '/data/dialog.json',
  maps: '/data/maps.json',
  lootTables: '/data/loot-tables.json',
};

function validBundle(): Record<string, unknown[]> {
  return {
    [sources.items]: [{ id: 'potion' }, { id: 'sword' }],
    [sources.enemies]: [{ id: 'slime' }],
    [sources.skills]: [{ id: 'slash' }],
    [sources.quests]: [{ id: 'q-1' }],
    [sources.dialog]: [{ id: 'npc-1' }],
    [sources.maps]: [{ id: 'starting-village' }],
    [sources.lootTables]: [{ id: 'loot-basic' }],
  };
}

describe('DataLoader', () => {
  it('loads all configured files and supports lookups', async () => {
    const data = validBundle();
    const fetcher = vi.fn(async (url: string) => data[url]);
    const loader = new DataLoader(sources, fetcher);

    await loader.init();
    expect((loader.getItem('potion') as { id: string }).id).toBe('potion');
    expect((loader.getEnemy('slime') as { id: string }).id).toBe('slime');
    expect(loader.getAllItems().map((entry) => (entry as { id: string }).id)).toEqual(['potion', 'sword']);
  });

  it('throws DataLoadError when a source fails', async () => {
    const data = validBundle();
    const fetcher = vi.fn(async (url: string) => {
      if (url === sources.enemies) throw new Error('404');
      return data[url];
    });
    const loader = new DataLoader(sources, fetcher);
    await expect(loader.init()).rejects.toBeInstanceOf(DataLoadError);
  });

  it('throws DataValidationError on malformed shape', async () => {
    const data = validBundle();
    const fetcher = vi.fn(async (url: string) => {
      if (url === sources.skills) return { bad: true };
      return data[url];
    });
    const loader = new DataLoader(sources, fetcher);
    await expect(loader.init()).rejects.toBeInstanceOf(DataValidationError);
  });

  it('throws UnknownIdError for unknown IDs', async () => {
    const data = validBundle();
    const fetcher = vi.fn(async (url: string) => data[url]);
    const loader = new DataLoader(sources, fetcher);
    await loader.init();
    expect(() => loader.getItem('missing')).toThrow(UnknownIdError);
  });

  it('init() is cached and does not re-fetch', async () => {
    const data = validBundle();
    const fetcher = vi.fn(async (url: string) => data[url]);
    const loader = new DataLoader(sources, fetcher);

    await loader.init();
    await loader.init();
    expect(fetcher).toHaveBeenCalledTimes(7);
  });
});
