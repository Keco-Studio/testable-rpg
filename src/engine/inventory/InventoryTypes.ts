export type EquipSlotName =
  | 'head'
  | 'body'
  | 'weapon'
  | 'offhand'
  | 'accessory1'
  | 'accessory2';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface Item {
  id: string;
  name: string;
  stackable: boolean;
  maxStack: number;
  equipSlot?: EquipSlotName;
  statBonuses?: Record<string, number>;
  weight?: number;
}

export interface InventorySlot {
  itemId: string | null;
  quantity: number;
}

export type EquipmentSlots = Record<EquipSlotName, Item | null>;

export interface InventoryConfig {
  maxSlots?: number;
  weightEnabled?: boolean;
}

export type InventoryErrorCode =
  | 'INVENTORY_FULL'
  | 'INSUFFICIENT_QUANTITY'
  | 'ITEM_NOT_IN_INVENTORY'
  | 'ITEM_NOT_EQUIPPED'
  | 'INVALID_EQUIP_SLOT';

export interface ItemAddedEvent {
  itemId: string;
  quantity: number;
  slotIndex: number;
}

export interface ItemRemovedEvent {
  itemId: string;
  quantity: number;
}

export interface ItemEquippedEvent {
  itemId: string;
  slot: EquipSlotName;
}

export interface ItemUnequippedEvent {
  itemId: string;
  slot: EquipSlotName;
}

export interface InventoryEventMap {
  'inventory:itemAdded': ItemAddedEvent;
  'inventory:itemRemoved': ItemRemovedEvent;
  'inventory:itemEquipped': ItemEquippedEvent;
  'inventory:itemUnequipped': ItemUnequippedEvent;
}
