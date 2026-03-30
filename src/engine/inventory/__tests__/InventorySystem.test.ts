import { describe, expect, it } from 'vitest';

import { Inventory } from '../InventorySystem';
import type { EquipSlotName, Item } from '../InventoryTypes';

function item(overrides: Partial<Item> & { id: string }): Item {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    stackable: overrides.stackable ?? false,
    maxStack: overrides.maxStack ?? 1,
    equipSlot: overrides.equipSlot,
    statBonuses: overrides.statBonuses,
    weight: overrides.weight,
  };
}

describe('Inventory add/remove', () => {
  it('adds non-stackable item and emits event', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const events: string[] = [];
    inv.on('inventory:itemAdded', () => events.push('added'));

    const sword = item({ id: 'sword', stackable: false, maxStack: 1, equipSlot: 'weapon' });
    const result = inv.addItem(sword, 1);

    expect(result.ok).toBe(true);
    expect(inv.getUsedSlotCount()).toBe(1);
    expect(events).toEqual(['added']);
  });

  it('adding item to full inventory returns INVENTORY_FULL', () => {
    const inv = new Inventory({ maxSlots: 2 });
    const sword = item({ id: 'sword', stackable: false, maxStack: 1 });
    const shield = item({ id: 'shield', stackable: false, maxStack: 1 });
    const helm = item({ id: 'helm', stackable: false, maxStack: 1 });

    inv.addItem(sword, 1);
    inv.addItem(shield, 1);
    const result = inv.addItem(helm, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVENTORY_FULL');
  });

  it('remove existing item frees slot and emits event', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const events: string[] = [];
    inv.on('inventory:itemRemoved', () => events.push('removed'));

    const sword = item({ id: 'sword' });
    inv.addItem(sword, 1);
    const result = inv.removeItem('sword', 1);

    expect(result.ok).toBe(true);
    expect(inv.getUsedSlotCount()).toBe(0);
    expect(events).toEqual(['removed']);
  });

  it('remove non-existent item returns INSUFFICIENT_QUANTITY', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const result = inv.removeItem('ghost-item', 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INSUFFICIENT_QUANTITY');
  });

  it('adding 0 quantity is no-op and emits no event', () => {
    const inv = new Inventory({ maxSlots: 24 });
    let addedEvents = 0;
    inv.on('inventory:itemAdded', () => {
      addedEvents += 1;
    });

    const potion = item({ id: 'potion', stackable: true, maxStack: 10 });
    const result = inv.addItem(potion, 0);

    expect(result.ok).toBe(true);
    expect(inv.getUsedSlotCount()).toBe(0);
    expect(addedEvents).toBe(0);
  });
});

describe('Inventory stacking', () => {
  it('stackable items fill same slot then overflow to next', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const potion = item({ id: 'health-potion', stackable: true, maxStack: 10 });

    inv.addItem(potion, 5);
    inv.addItem(potion, 3);
    expect(inv.getUsedSlotCount()).toBe(1);
    expect(inv.getQuantity('health-potion')).toBe(8);

    inv.addItem(potion, 5);
    expect(inv.getUsedSlotCount()).toBe(2);

    const potionSlots = inv.getSlots().filter((slot) => slot.itemId === 'health-potion');
    expect(potionSlots.map((slot) => slot.quantity).sort((a, b) => a - b)).toEqual([3, 10]);
  });

  it('stackable add to full inventory returns INVENTORY_FULL', () => {
    const inv = new Inventory({ maxSlots: 1 });
    const potion = item({ id: 'health-potion', stackable: true, maxStack: 10 });

    inv.addItem(potion, 10);
    const result = inv.addItem(potion, 1);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVENTORY_FULL');
  });

  it('removing partial quantity from stack works', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const potion = item({ id: 'health-potion', stackable: true, maxStack: 10 });

    inv.addItem(potion, 7);
    const result = inv.removeItem('health-potion', 5);

    expect(result.ok).toBe(true);
    expect(inv.getQuantity('health-potion')).toBe(2);
  });

  it('removing more than owned returns INSUFFICIENT_QUANTITY', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const potion = item({ id: 'health-potion', stackable: true, maxStack: 10 });

    inv.addItem(potion, 3);
    const result = inv.removeItem('health-potion', 5);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INSUFFICIENT_QUANTITY');
  });
});

describe('Inventory equipment', () => {
  it('equip moves item to slot and emits event', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const events: string[] = [];
    inv.on('inventory:itemEquipped', () => events.push('equipped'));

    const sword = item({ id: 'iron-sword', equipSlot: 'weapon' });
    inv.addItem(sword, 1);
    const result = inv.equip('iron-sword', 'weapon');

    expect(result.ok).toBe(true);
    expect(inv.getQuantity('iron-sword')).toBe(0);
    expect(inv.equipmentSlots.weapon?.id).toBe('iron-sword');
    expect(events).toEqual(['equipped']);
  });

  it('equipping occupied slot swaps old item back and emits unequipped before equipped', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const events: string[] = [];
    inv.on('inventory:itemUnequipped', () => events.push('unequipped'));
    inv.on('inventory:itemEquipped', () => events.push('equipped'));

    const swordA = item({ id: 'sword-a', equipSlot: 'weapon' });
    const swordB = item({ id: 'sword-b', equipSlot: 'weapon' });

    inv.addItem(swordA, 1);
    inv.addItem(swordB, 1);
    inv.equip('sword-a', 'weapon');
    events.length = 0;

    const result = inv.equip('sword-b', 'weapon');

    expect(result.ok).toBe(true);
    expect(inv.equipmentSlots.weapon?.id).toBe('sword-b');
    expect(inv.getQuantity('sword-a')).toBe(1);
    expect(events).toEqual(['unequipped', 'equipped']);
  });

  it('equip with occupied slot and full inventory returns INVENTORY_FULL', () => {
    const inv = new Inventory({ maxSlots: 2 });
    const swordA = item({ id: 'sword-a', equipSlot: 'weapon' });
    const swordB = item({ id: 'sword-b', equipSlot: 'weapon' });

    inv.addItem(swordA, 1);
    inv.addItem(swordB, 1);
    inv.equip('sword-a', 'weapon');
    inv.addItem(swordA, 1);

    const result = inv.equip('sword-b', 'weapon');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVENTORY_FULL');
  });

  it('equip item not in inventory returns ITEM_NOT_IN_INVENTORY', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const result = inv.equip('missing', 'weapon');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('ITEM_NOT_IN_INVENTORY');
  });

  it('unequip to full inventory returns INVENTORY_FULL', () => {
    const inv = new Inventory({ maxSlots: 1 });
    const sword = item({ id: 'sword', equipSlot: 'weapon' });
    const helm = item({ id: 'helm', equipSlot: 'head' });

    inv.addItem(sword, 1);
    inv.equip('sword', 'weapon');
    inv.addItem(helm, 1);

    const result = inv.unequip('weapon');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVENTORY_FULL');
  });

  it('getComputedStats includes equipped bonuses', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const sword = item({ id: 'sword', equipSlot: 'weapon', statBonuses: { attack: 5, speed: 1 } });
    const armor = item({ id: 'armor', equipSlot: 'body', statBonuses: { defense: 7 } });

    inv.addItem(sword, 1);
    inv.addItem(armor, 1);
    inv.equip('sword', 'weapon');
    inv.equip('armor', 'body');

    const stats = inv.getComputedStats({ attack: 10, defense: 3, speed: 2 });
    expect(stats).toEqual({ attack: 15, defense: 10, speed: 3 });
  });

  it('supports two accessory slots independently', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const ringA = item({ id: 'ring-a', equipSlot: 'accessory1', statBonuses: { luck: 1 } });
    const ringB = item({ id: 'ring-b', equipSlot: 'accessory2', statBonuses: { luck: 2 } });

    inv.addItem(ringA, 1);
    inv.addItem(ringB, 1);
    expect(inv.equip('ring-a', 'accessory1').ok).toBe(true);
    expect(inv.equip('ring-b', 'accessory2').ok).toBe(true);

    expect(inv.equipmentSlots.accessory1?.id).toBe('ring-a');
    expect(inv.equipmentSlots.accessory2?.id).toBe('ring-b');
    expect(inv.getComputedStats({ luck: 0 }).luck).toBe(3);
  });

  it('blocks equipping item to invalid slot type', () => {
    const inv = new Inventory({ maxSlots: 24 });
    const helm = item({ id: 'helm', equipSlot: 'head' });
    inv.addItem(helm, 1);

    const result = inv.equip('helm', 'weapon' as EquipSlotName);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_EQUIP_SLOT');
  });
});
