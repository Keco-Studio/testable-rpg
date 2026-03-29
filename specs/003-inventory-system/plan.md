# Implementation Plan: Inventory System

**Branch**: `003-inventory-system` | **Date**: 2026-03-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-inventory-system/spec.md`

## Summary

Implement a pure-logic inventory system. The `Inventory` class manages a slot array and
an equipment map, returning `Result<T, Error>` for all fallible operations and emitting
events via `EventEmitter`. Item definitions are passed in as plain JSON objects. No Excalibur
or DOM dependencies. Weight system is off by default.

## Technical Context

**Language/Version**: TypeScript ^5.4
**Primary Dependencies**: Node.js `EventEmitter` (available via Vite); `Result<T,Error>` type from project
**Storage**: N/A — in-memory; callers persist serialized state
**Testing**: Vitest ^1.6, jsdom environment
**Target Platform**: Browser + Node.js
**Project Type**: Library module
**Performance Goals**: 1,000 item operations < 100ms total
**Constraints**: No Excalibur imports; Result<T,Error> — never throw; no DOM

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec as Source of Truth | ✅ PASS | Plan derived from spec.md |
| II. Test-First | ✅ PASS | Tests written and FAIL before implementation |
| III. Browser-Independent Testability | ✅ PASS | No Excalibur; Vitest + jsdom |
| IV. Determinism by Default | ✅ PASS | No randomness in inventory; N/A |

## Project Structure

### Documentation (this feature)

```text
specs/003-inventory-system/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── Inventory.ts.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
└── engine/
    └── inventory/
        ├── InventoryTypes.ts           ← Item, InventorySlot, EquipSlot interfaces
        ├── InventorySystem.ts          ← Inventory class with add/remove/equip
        └── __tests__/
            └── InventorySystem.test.ts ← Vitest unit tests (write FIRST)
```

**Structure Decision**: Two-file split (types + logic). Equipment logic lives in
`InventorySystem.ts` — not complex enough to warrant its own file.

## Implementation Phases

1. **Types** — `InventoryTypes.ts`: Item, InventorySlot, EquipmentSlots, EquipSlotName.
2. **Add/Remove** — `addItem()` / `removeItem()` with stacking and slot management.
3. **Equipment** — `equip()` / `unequip()` with swap logic.
4. **Computed stats** — `getComputedStats()` summing equipped item bonuses.
5. **Events** — wire all 4 event types.
6. **Weight** — optional feature, off by default (guarded by `weightEnabled` flag).

## Complexity Tracking

> Not required — no Constitution Check violations.
