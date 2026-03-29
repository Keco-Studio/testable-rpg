# Feature Specification: Inventory System

**Feature Branch**: `003-inventory-system`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Build an inventory system for RPG actors. Support item slots, stacking, weight (optional), and equipment slots (head, body, weapon, offhand, two accessories). Items defined by JSON data. Emit events for UI. Pure logic, no rendering."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Add and Remove Items (Priority: P1)

As a player, I want to pick up items during my adventure and have them stored in my inventory,
so that I can manage my gear and consumables throughout the game.

**Why this priority**: Adding and removing items is the atomic unit of inventory. Everything
else (stacking, equipment) builds on it.

**Independent Test**: Create an inventory with 24 slots. Add a non-stackable item. Verify slot
count decreases by 1 and `inventory:itemAdded` is emitted. Remove the item. Verify slot count
restores and `inventory:itemRemoved` is emitted.

**Acceptance Scenarios**:

1. **Given** an inventory with 24 slots and 0 items, **When** a non-stackable item is added,
   **Then** the item appears in a slot and `inventory:itemAdded` is emitted.
2. **Given** an inventory at capacity (24/24 slots used), **When** a non-stackable item is
   added, **Then** `Result.err('INVENTORY_FULL')` is returned and no event is emitted.
3. **Given** an item in the inventory, **When** it is removed, **Then** the slot is freed
   and `inventory:itemRemoved` is emitted.
4. **Given** an empty inventory, **When** removal of a non-existent item is attempted,
   **Then** `Result.err('INSUFFICIENT_QUANTITY')` is returned.
5. **Given** adding 0 quantity of any item, **When** the operation runs, **Then** it is a
   no-op and no event is emitted.

---

### User Story 2 — Item Stacking (Priority: P1)

As a player, I want stackable items (like potions or arrows) to combine in a single slot
up to a maximum stack size, so that I don't waste inventory slots on multiples of the same item.

**Why this priority**: Stacking directly affects inventory slot usage and is core to usability.

**Independent Test**: Create a "Health Potion" with `maxStack: 10`. Add 5, then add 3 more.
Verify only 1 slot is used with quantity 8. Add 5 more: verify the first stack fills to 10
and a second stack of 3 is created in a new slot.

**Acceptance Scenarios**:

1. **Given** a stackable item (maxStack 10) with 5 in inventory, **When** 3 more are added,
   **Then** the quantity becomes 8 in the same slot (1 slot total).
2. **Given** a full stack (10/10), **When** more of the same item are added,
   **Then** a new stack is created in a new slot.
3. **Given** a full stack and no free slots, **When** more of the item are added,
   **Then** `Result.err('INVENTORY_FULL')` is returned.
4. **Given** a partial stack (7/10), **When** 5 are removed, **Then** the quantity becomes 2.
5. **Given** a partial stack (3/10), **When** 5 are removed, **Then**
   `Result.err('INSUFFICIENT_QUANTITY')` is returned.

---

### User Story 3 — Equipment Slots (Priority: P2)

As a player, I want to equip items to specific body slots (head, body, weapon, offhand,
accessory×2), so that my character's stats improve based on what I'm wearing.

**Why this priority**: Equipment is essential to progression but builds on add/remove
functionality. Can be delivered independently after basic inventory works.

**Independent Test**: Add a sword (type: weapon) to inventory. Equip it. Verify it moves
from the inventory to the weapon equip slot, the inventory slot is freed, and
`inventory:itemEquipped` is emitted. Equip a second sword: verify the first goes back to
inventory and the second takes the slot.

**Acceptance Scenarios**:

1. **Given** an item in inventory, **When** `equip(itemId, 'weapon')` is called,
   **Then** the item moves from inventory to the weapon slot and `inventory:itemEquipped` is emitted.
2. **Given** a weapon already in the weapon slot, **When** a new item is equipped to that slot,
   **Then** the old item swaps to inventory and `inventory:itemUnequipped` is emitted first.
3. **Given** a full inventory and an occupied equip slot, **When** a new item is equipped,
   **Then** `Result.err('INVENTORY_FULL')` is returned (old item can't return).
4. **Given** an item not in inventory, **When** equip is attempted,
   **Then** `Result.err('ITEM_NOT_IN_INVENTORY')` is returned.
5. **Given** an equipped item, **When** unequip is called with a full inventory,
   **Then** `Result.err('INVENTORY_FULL')` is returned.
6. **Given** equipped items, **When** actor stats are computed,
   **Then** equipped item stat bonuses are included in the computed total.

---

### Edge Cases

- Add 0 quantity → no-op, no event.
- Remove from empty inventory → `Result.err('INSUFFICIENT_QUANTITY')`.
- Equip item not in inventory → `Result.err('ITEM_NOT_IN_INVENTORY')`.
- Unequip to full inventory → `Result.err('INVENTORY_FULL')`.
- Two accessories can be equipped simultaneously (accessory1, accessory2 are distinct slots).
- Adding a non-stackable item when all slots are full → `Result.err('INVENTORY_FULL')`.
- Item with `maxStack: 1` behaves like a non-stackable item.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Inventory MUST have a configurable maximum slot count (default: 24).
- **FR-002**: Stackable items (`stackable: true`) MUST stack up to `item.maxStack`.
- **FR-003**: Adding a stackable item to a full stack MUST create a new stack in a new slot.
- **FR-004**: Adding any item to a full inventory MUST return `Result.err('INVENTORY_FULL')`.
- **FR-005**: Removing more than available quantity MUST return `Result.err('INSUFFICIENT_QUANTITY')`.
- **FR-006**: Equip slots MUST be: `head`, `body`, `weapon`, `offhand`, `accessory1`, `accessory2`.
- **FR-007**: Equipping an item MUST move it from inventory to the equip slot.
- **FR-008**: Equipping when a slot is occupied MUST swap the old item back to inventory.
- **FR-009**: Equipping when the slot is occupied and inventory is full MUST return `Result.err('INVENTORY_FULL')`.
- **FR-010**: Equipped items MUST contribute their stat bonuses to the actor's computed stats.
- **FR-011**: System MUST emit `inventory:itemAdded { itemId, quantity, slotIndex }`.
- **FR-012**: System MUST emit `inventory:itemRemoved { itemId, quantity }`.
- **FR-013**: System MUST emit `inventory:itemEquipped { itemId, slot }`.
- **FR-014**: System MUST emit `inventory:itemUnequipped { itemId, slot }`.
- **FR-015**: Weight system is optional and MUST be disabled by default.

### Key Entities

- **Item**: Defined by JSON data. Key properties: id, name, stackable (bool), maxStack (number), equip slot (optional), stat bonuses (optional object), weight (optional number).
- **InventorySlot**: A slot in the inventory grid. Contains itemId and quantity.
- **EquipmentSlots**: A fixed map of slot names to equipped item (or null).
- **Inventory**: Manages the slot array, equipment map, max slots, and event emission.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All acceptance scenarios above pass as automated unit tests with no browser required.
- **SC-002**: Adding, removing, and equipping 1,000 items completes in under 100ms.
- **SC-003**: All Result errors are returned (not thrown) — zero uncaught exceptions from inventory operations.
- **SC-004**: All four event types are emitted correctly in every tested scenario.
- **SC-005**: Computed actor stats correctly reflect all equipped item bonuses, verifiable by unit test.

## Assumptions

- Item definitions are loaded from JSON at game startup; the inventory system does not manage item data loading.
- Weight system defaults to disabled; enabling it requires passing `{ weightEnabled: true }` to the constructor.
- Stat bonuses are additive (no multiplicative bonuses in this spec).
- The inventory system is pure logic — no Excalibur or DOM dependencies.
- Items can only be equipped to their designated slot type (e.g., a weapon cannot go in the head slot).
