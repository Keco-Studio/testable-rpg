export interface GameDataBundle {
  items: Record<string, unknown>[];
  enemies: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  quests: Record<string, unknown>[];
  dialog: Record<string, unknown>[];
  maps: Record<string, unknown>[];
  lootTables: Record<string, unknown>[];
}

export interface DataLoaderSources {
  items: string;
  enemies: string;
  skills: string;
  quests: string;
  dialog: string;
  maps: string;
  lootTables: string;
}

type FetchJson = (url: string) => Promise<unknown>;

const REQUIRED_ARRAY_FIELDS: Array<keyof GameDataBundle> = [
  'items',
  'enemies',
  'skills',
  'quests',
  'dialog',
  'maps',
  'lootTables',
];

export class DataLoadError extends Error {}
export class DataValidationError extends Error {}
export class UnknownIdError extends Error {}

export class DataLoader {
  private readonly sources: DataLoaderSources;
  private readonly fetchJson: FetchJson;
  private cache: GameDataBundle | null = null;
  private indexes: { items: Map<string, unknown>; enemies: Map<string, unknown>; skills: Map<string, unknown>; quests: Map<string, unknown>; } | null = null;

  constructor(sources: DataLoaderSources, fetchJson: FetchJson) {
    this.sources = sources;
    this.fetchJson = fetchJson;
  }

  async init(): Promise<void> {
    if (this.cache) return;
    const entries = await Promise.all(
      REQUIRED_ARRAY_FIELDS.map(async (field) => {
        try {
          const payload = await this.fetchJson(this.sources[field]);
          return [field, payload] as const;
        } catch (error) {
          throw new DataLoadError(`Failed loading ${field}: ${String(error)}`);
        }
      }),
    );

    const data = Object.fromEntries(entries) as Record<string, unknown>;
    for (const field of REQUIRED_ARRAY_FIELDS) {
      if (!Array.isArray(data[field])) {
        throw new DataValidationError(`Invalid ${field}: expected array`);
      }
    }

    const bundle: GameDataBundle = {
      items: data.items as Record<string, unknown>[],
      enemies: data.enemies as Record<string, unknown>[],
      skills: data.skills as Record<string, unknown>[],
      quests: data.quests as Record<string, unknown>[],
      dialog: data.dialog as Record<string, unknown>[],
      maps: data.maps as Record<string, unknown>[],
      lootTables: data.lootTables as Record<string, unknown>[],
    };

    this.cache = bundle;
    this.indexes = {
      items: this.toIndex(bundle.items, 'items'),
      enemies: this.toIndex(bundle.enemies, 'enemies'),
      skills: this.toIndex(bundle.skills, 'skills'),
      quests: this.toIndex(bundle.quests, 'quests'),
    };
  }

  getItem(id: string): unknown {
    return this.getById('items', id);
  }

  getEnemy(id: string): unknown {
    return this.getById('enemies', id);
  }

  getSkill(id: string): unknown {
    return this.getById('skills', id);
  }

  getQuest(id: string): unknown {
    return this.getById('quests', id);
  }

  getAllItems(): unknown[] {
    this.ensureReady();
    return [...this.cache!.items].sort((a, b) => String((a as { id: string }).id).localeCompare(String((b as { id: string }).id)));
  }

  getAllEnemies(): unknown[] {
    this.ensureReady();
    return [...this.cache!.enemies];
  }

  private ensureReady(): void {
    if (!this.cache || !this.indexes) throw new DataLoadError('DataLoader not initialized');
  }

  private toIndex(entries: Record<string, unknown>[], label: string): Map<string, unknown> {
    const map = new Map<string, unknown>();
    for (const entry of entries) {
      const id = entry.id;
      if (typeof id !== 'string' || id.length === 0) {
        throw new DataValidationError(`Invalid ${label} entry: missing id`);
      }
      if (map.has(id)) {
        throw new DataValidationError(`Duplicate ${label} id: ${id}`);
      }
      map.set(id, entry);
    }
    return map;
  }

  private getById(kind: keyof NonNullable<DataLoader['indexes']>, id: string): unknown {
    this.ensureReady();
    if (!id) throw new UnknownIdError(`Unknown ${kind} id: ${id}`);
    const value = this.indexes![kind].get(id);
    if (!value) throw new UnknownIdError(`Unknown ${kind} id: ${id}`);
    return value;
  }
}
