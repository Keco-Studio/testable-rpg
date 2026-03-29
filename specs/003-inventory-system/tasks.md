---
description: "Task list for Inventory System implementation"
---

# Tasks: Inventory System

**Input**: Design documents from `/specs/003-inventory-system/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Included — TDD is MANDATORY per project constitution.
**Organization**: Tasks organized by user story for independent implementation and testing.

---

## Phase 1: Setup

- [ ] T001 Create directories `src/engine/inventory/` and `src/engine/inventory/__tests__/`
- [ ] T002 [P] Create stub `src/engine/inventory/InventoryTypes.ts`
- [ ] T003 [P] Create stub `src/engine/inventory/InventorySystem.ts`
- [ ] T004 [P] Create stub `src/engine/inventory/__tests__/InventorySystem.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Define `Item` interface (id, name, stackable, maxStack, equipSlot?, statBonuses?, weight?) in `src/engine/inventory/InventoryTypes.ts`
- [ ] T006 [P] Define `InventorySlot` interface (itemId: string|null, quantity: number) in `src/engine/inventory/InventoryTypes.ts`
- [ ] T007 [P] Define `EquipSlotName` type (`'head'|'body'|'weapon'|'offhand'|'accessory1'|'accessory2'`) in `src/engine/inventory/InventoryTypes.ts`
- [ ] T008 [P] Define `EquipmentSlots` type (Record of EquipSlotName → Item|null) in `src/engine/inventory/InventoryTypes.ts`
- [ ] T009 [P] Define `InventoryConfig` interface (maxSlots: number, weightEnabled: boolean) in `src/engine/inventory/InventoryTypes.ts`
- [ ] T010 [P] Define `Result<T, E>` discriminated union type in `src/engine/inventory/InventoryTypes.ts`

**Checkpoint**: All types defined — user story work can begin.

---

## Phase 3: User Story 1 — Add and Remove Items (Priority: P1) 🎯 MVP

**Goal**: `inventory.addItem(item, qty)` and `removeItem(itemId, qty)` manage slots correctly, emit events.

**Independent Test**: 24-slot inventory. Add a non-stackable item → 1 slot used, event emitted. Remove it → 0 slots, event emitted. Add to full inventory → `Result.err('INVENTORY_FULL')`.

### Tests for User Story 1 ⚠️ Write FIRST — confirm FAIL

- [ ] T011 [P] [US1] Write test: add non-stackable item to empty inventory succeeds, slot count increases in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T012 [P] [US1] Write test: add item to full (24/24) inventory returns `Result.err('INVENTORY_FULL')` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T013 [P] [US1] Write test: remove existing item frees slot, emits `inventory:itemRemoved` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T014 [P] [US1] Write test: remove non-existent item returns `Result.err('INSUFFICIENT_QUANTITY')` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T015 [P] [US1] Write test: add 0 quantity is a no-op with no event emitted in `src/engine/inventory/__tests__/InventorySystem.test.ts`

### Implementation for User Story 1

- [ ] T016 [US1] Implement `Inventory` class constructor (slots array, maxSlots, EventEmitter) in `src/engine/inventory/InventorySystem.ts` (depends on T011–T015 FAILING)
- [ ] T017 [US1] Implement `addItem(item, qty)` for non-stackable items with full-inventory guard in `src/engine/inventory/InventorySystem.ts`
- [ ] T018 [US1] Implement `removeItem(itemId, qty)` with insufficient-quantity guard in `src/engine/inventory/InventorySystem.ts`
- [ ] T019 [US1] Emit `inventory:itemAdded { itemId, quantity, slotIndex }` on successful add in `src/engine/inventory/InventorySystem.ts`
- [ ] T020 [US1] Emit `inventory:itemRemoved { itemId, quantity }` on successful remove in `src/engine/inventory/InventorySystem.ts`

**Checkpoint**: User Story 1 complete — T011–T015 must be GREEN.

---

## Phase 4: User Story 2 — Item Stacking (Priority: P1)

**Goal**: Stackable items fill existing stacks before creating new ones; overflow creates new stack.

**Independent Test**: Health Potion (maxStack: 10). Add 5 → 1 slot with qty 5. Add 3 more → 1 slot with qty 8. Add 5 more → slot fills to 10, new slot with qty 3.

### Tests for User Story 2 ⚠️ Write FIRST — confirm FAIL

- [ ] T021 [P] [US2] Write test: adding stackable items combines into same slot up to maxStack in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T022 [P] [US2] Write test: adding stackable beyond maxStack creates new stack in new slot in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T023 [P] [US2] Write test: full stack + no free slots returns `Result.err('INVENTORY_FULL')` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T024 [P] [US2] Write test: removing partial quantity from stack reduces quantity in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T025 [P] [US2] Write test: removing more than stack quantity returns `Result.err('INSUFFICIENT_QUANTITY')` in `src/engine/inventory/__tests__/InventorySystem.test.ts`

### Implementation for User Story 2

- [ ] T026 [US2] Extend `addItem()` to handle stackable items: find existing partial stack first in `src/engine/inventory/InventorySystem.ts` (depends on T021–T025 FAILING)
- [ ] T027 [US2] Extend `addItem()` overflow logic: create new stack when existing stack is full in `src/engine/inventory/InventorySystem.ts`
- [ ] T028 [US2] Extend `removeItem()` to reduce stack quantity (remove slot only when qty reaches 0) in `src/engine/inventory/InventorySystem.ts`

**Checkpoint**: User Story 2 complete — T021–T025 must be GREEN.

---

## Phase 5: User Story 3 — Equipment Slots (Priority: P2)

**Goal**: `equip(itemId, slot)` moves item from inventory to equip slot; occupied slot swaps.

**Independent Test**: Add sword to inventory. Equip to `'weapon'`. Verify inventory slot freed, weapon slot occupied, `inventory:itemEquipped` emitted. Equip second sword → first goes back to inventory.

### Tests for User Story 3 ⚠️ Write FIRST — confirm FAIL

- [ ] T029 [P] [US3] Write test: equip item moves it from inventory to equip slot, emits `inventory:itemEquipped` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T030 [P] [US3] Write test: equipping when slot occupied swaps old item back to inventory in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T031 [P] [US3] Write test: equip with occupied slot + full inventory returns `Result.err('INVENTORY_FULL')` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T032 [P] [US3] Write test: equip item not in inventory returns `Result.err('ITEM_NOT_IN_INVENTORY')` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T033 [P] [US3] Write test: unequip to full inventory returns `Result.err('INVENTORY_FULL')` in `src/engine/inventory/__tests__/InventorySystem.test.ts`
- [ ] T034 [P] [US3] Write test: `getComputedStats()` includes equipped item stat bonuses in `src/engine/inventory/__tests__/InventorySystem.test.ts`

### Implementation for User Story 3

- [ ] T035 [US3] Add `equipmentSlots: EquipmentSlots` to `Inventory` class in `src/engine/inventory/InventorySystem.ts` (depends on T029–T034 FAILING)
- [ ] T036 [US3] Implement `equip(itemId, slot)` with item-lookup, slot-check, swap logic in `src/engine/inventory/InventorySystem.ts`
- [ ] T037 [US3] Implement `unequip(slot)` with full-inventory guard in `src/engine/inventory/InventorySystem.ts`
- [ ] T038 [US3] Implement `getComputedStats()` summing equipped item `statBonuses` in `src/engine/inventory/InventorySystem.ts`
- [ ] T039 [US3] Emit `inventory:itemEquipped { itemId, slot }` and `inventory:itemUnequipped { itemId, slot }` in `src/engine/inventory/InventorySystem.ts`

**Checkpoint**: All user stories complete — T029–T034 must be GREEN.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T040 [P] Add exports to `src/engine/inventory/InventorySystem.ts`
- [ ] T041 [P] Grep `src/engine/inventory/` for any thrown exceptions — must be zero (all Result.err)
- [ ] T042 Performance test: 1,000 addItem + removeItem calls complete in < 100ms (add to test file)
- [ ] T043 [P] Write test: two accessories can be equipped simultaneously via `accessory1` and `accessory2` slots in `src/engine/inventory/__tests__/InventorySystem.test.ts`

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → US1 (P1) → US2 (P1) → US3 (P2) → Polish**
- US1 and US2 are both P1; US2 depends on US1's `addItem` scaffolding.
- US3 depends on US1 (item removal for swap logic).

### TDD Checkpoints (MANDATORY per Constitution)

| Gate | Requirement |
|------|-------------|
| ✅ Tests Written | All story tests exist in `InventorySystem.test.ts` |
| ✅ Tests FAILING | `vitest run` shows new tests RED |
| ✅ Implementation | Code written until tests GREEN |
| ✅ No Regressions | All prior tests still GREEN |
