import type {
  EquipSlotName,
  EquipmentSlots,
  InventoryConfig,
  InventoryErrorCode,
  InventoryEventMap,
  InventorySlot,
  Item,
  Result,
} from './InventoryTypes';

type EventName = keyof InventoryEventMap;
type EventHandler<K extends EventName> = (payload: InventoryEventMap[K]) => void;

export class Inventory {
  private readonly maxSlots: number;
  private readonly slots: InventorySlot[];
  private readonly itemById: Map<string, Item>;
  private readonly listeners: { [K in EventName]: Set<EventHandler<K>> };

  readonly equipmentSlots: EquipmentSlots;

  constructor(config: InventoryConfig = {}) {
    this.maxSlots = config.maxSlots ?? 24;
    this.slots = Array.from({ length: this.maxSlots }, () => ({ itemId: null, quantity: 0 }));
    this.itemById = new Map();
    this.listeners = {
      'inventory:itemAdded': new Set(),
      'inventory:itemRemoved': new Set(),
      'inventory:itemEquipped': new Set(),
      'inventory:itemUnequipped': new Set(),
    };
    this.equipmentSlots = {
      head: null,
      body: null,
      weapon: null,
      offhand: null,
      accessory1: null,
      accessory2: null,
    };
  }

  on<K extends EventName>(eventName: K, handler: EventHandler<K>): () => void {
    this.listeners[eventName].add(handler);
    return () => this.listeners[eventName].delete(handler);
  }

  getSlots(): InventorySlot[] {
    return this.slots.map((slot) => ({ ...slot }));
  }

  getUsedSlotCount(): number {
    return this.slots.filter((slot) => slot.itemId !== null).length;
  }

  getQuantity(itemId: string): number {
    return this.slots.reduce((sum, slot) => {
      if (slot.itemId !== itemId) return sum;
      return sum + slot.quantity;
    }, 0);
  }

  addItem(item: Item, qty = 1): Result<void, InventoryErrorCode> {
    this.itemById.set(item.id, item);
    if (qty <= 0) return { ok: true, value: undefined };

    if (!item.stackable || item.maxStack <= 1) {
      return this.addNonStackable(item, qty);
    }
    return this.addStackable(item, qty);
  }

  removeItem(itemId: string, qty = 1): Result<void, InventoryErrorCode> {
    if (qty <= 0) return { ok: true, value: undefined };
    if (this.getQuantity(itemId) < qty) {
      return { ok: false, error: 'INSUFFICIENT_QUANTITY' };
    }

    let remaining = qty;
    for (const slot of this.slots) {
      if (slot.itemId !== itemId || remaining === 0) continue;
      const removed = Math.min(remaining, slot.quantity);
      slot.quantity -= removed;
      remaining -= removed;
      if (slot.quantity === 0) {
        slot.itemId = null;
      }
    }

    this.emit('inventory:itemRemoved', { itemId, quantity: qty });
    return { ok: true, value: undefined };
  }

  equip(itemId: string, slot: EquipSlotName): Result<void, InventoryErrorCode> {
    const sourceSlotIndex = this.findFirstSlotIndex(itemId);
    if (sourceSlotIndex < 0) {
      return { ok: false, error: 'ITEM_NOT_IN_INVENTORY' };
    }

    const item = this.itemById.get(itemId);
    if (!item) {
      return { ok: false, error: 'ITEM_NOT_IN_INVENTORY' };
    }
    if (item.equipSlot && item.equipSlot !== slot) {
      return { ok: false, error: 'INVALID_EQUIP_SLOT' };
    }

    const previous = this.equipmentSlots[slot];
    if (previous !== null && this.getUsedSlotCount() >= this.maxSlots) {
      return { ok: false, error: 'INVENTORY_FULL' };
    }

    this.decrementSlotQuantity(sourceSlotIndex, 1);
    this.equipmentSlots[slot] = item;

    if (previous !== null) {
      this.forceInsertToFirstEmpty(previous);
      this.emit('inventory:itemUnequipped', { itemId: previous.id, slot });
    }

    this.emit('inventory:itemEquipped', { itemId, slot });
    return { ok: true, value: undefined };
  }

  unequip(slot: EquipSlotName): Result<void, InventoryErrorCode> {
    const item = this.equipmentSlots[slot];
    if (!item) {
      return { ok: false, error: 'ITEM_NOT_EQUIPPED' };
    }

    const added = this.addItem(item, 1);
    if (!added.ok) return added;

    this.equipmentSlots[slot] = null;
    this.emit('inventory:itemUnequipped', { itemId: item.id, slot });
    return { ok: true, value: undefined };
  }

  getComputedStats(baseStats: Record<string, number> = {}): Record<string, number> {
    const stats = { ...baseStats };
    for (const equipped of Object.values(this.equipmentSlots)) {
      if (!equipped?.statBonuses) continue;
      for (const [key, value] of Object.entries(equipped.statBonuses)) {
        stats[key] = (stats[key] ?? 0) + value;
      }
    }
    return stats;
  }

  private addNonStackable(item: Item, qty: number): Result<void, InventoryErrorCode> {
    const emptyIndexes = this.getEmptySlotIndexes();
    if (emptyIndexes.length < qty) {
      return { ok: false, error: 'INVENTORY_FULL' };
    }

    for (let i = 0; i < qty; i++) {
      const slotIndex = emptyIndexes[i];
      this.slots[slotIndex].itemId = item.id;
      this.slots[slotIndex].quantity = 1;
      this.emit('inventory:itemAdded', { itemId: item.id, quantity: 1, slotIndex });
    }
    return { ok: true, value: undefined };
  }

  private addStackable(item: Item, qty: number): Result<void, InventoryErrorCode> {
    const draft = this.slots.map((slot) => ({ ...slot }));
    const mutations: Array<{ slotIndex: number; quantity: number }> = [];
    let remaining = qty;

    for (let i = 0; i < draft.length && remaining > 0; i++) {
      const slot = draft[i];
      if (slot.itemId !== item.id) continue;
      const space = item.maxStack - slot.quantity;
      if (space <= 0) continue;
      const added = Math.min(space, remaining);
      slot.quantity += added;
      remaining -= added;
      mutations.push({ slotIndex: i, quantity: added });
    }

    for (let i = 0; i < draft.length && remaining > 0; i++) {
      const slot = draft[i];
      if (slot.itemId !== null) continue;
      const added = Math.min(item.maxStack, remaining);
      slot.itemId = item.id;
      slot.quantity = added;
      remaining -= added;
      mutations.push({ slotIndex: i, quantity: added });
    }

    if (remaining > 0) {
      return { ok: false, error: 'INVENTORY_FULL' };
    }

    for (let i = 0; i < draft.length; i++) {
      this.slots[i] = draft[i];
    }
    for (const mutation of mutations) {
      this.emit('inventory:itemAdded', {
        itemId: item.id,
        quantity: mutation.quantity,
        slotIndex: mutation.slotIndex,
      });
    }

    return { ok: true, value: undefined };
  }

  private findFirstSlotIndex(itemId: string): number {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].itemId === itemId && this.slots[i].quantity > 0) {
        return i;
      }
    }
    return -1;
  }

  private decrementSlotQuantity(slotIndex: number, amount: number): void {
    const slot = this.slots[slotIndex];
    slot.quantity = Math.max(0, slot.quantity - amount);
    if (slot.quantity === 0) {
      slot.itemId = null;
    }
  }

  private getEmptySlotIndexes(): number[] {
    const result: number[] = [];
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].itemId === null) {
        result.push(i);
      }
    }
    return result;
  }

  private forceInsertToFirstEmpty(item: Item): void {
    const empty = this.getEmptySlotIndexes()[0];
    if (empty === undefined) return;
    this.slots[empty].itemId = item.id;
    this.slots[empty].quantity = 1;
  }

  private emit<K extends EventName>(eventName: K, payload: InventoryEventMap[K]): void {
    for (const listener of this.listeners[eventName]) {
      listener(payload);
    }
  }
}

export type {
  EquipSlotName,
  EquipmentSlots,
  InventoryConfig,
  InventoryErrorCode,
  InventorySlot,
  Item,
  Result,
} from './InventoryTypes';
