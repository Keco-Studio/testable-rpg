import type { SaveData } from '../../testing/GameTestAPI';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

export class SaveSystem {
  private readonly storage: StorageAdapter;
  private readonly keyPrefix: string;

  constructor(storage: StorageAdapter, keyPrefix = 'ironveil-save') {
    this.storage = storage;
    this.keyPrefix = keyPrefix;
  }

  save(slot: 1 | 2 | 3, data: SaveData): void {
    this.storage.setItem(this.key(slot), JSON.stringify(data));
  }

  load(slot: 1 | 2 | 3): SaveData | null {
    const raw = this.storage.getItem(this.key(slot));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SaveData;
    } catch {
      return null;
    }
  }

  clear(slot: 1 | 2 | 3): void {
    this.storage.removeItem(this.key(slot));
  }

  private key(slot: 1 | 2 | 3): string {
    return `${this.keyPrefix}:${slot}`;
  }
}
