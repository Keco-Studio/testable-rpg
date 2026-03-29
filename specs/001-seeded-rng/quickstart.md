# Quickstart: Seeded RNG

**Feature**: 001-seeded-rng
**Date**: 2026-03-29

## Prerequisites

- Node.js 20+ / Vitest ^1.6 for running tests
- TypeScript ^5.4

## Installation

The `SeededRNG` module lives at `src/engine/rng/SeededRNG.ts`. No external dependencies.

## Basic Usage

```typescript
import { SeededRNG } from '@/engine/rng/SeededRNG';

// 1. Create an RNG with a seed
const rng = new SeededRNG(42);

// 2. Generate a float [0, 1)
const value = rng.nextFloat();

// 3. Generate an integer [1, 6] (like a die roll)
const roll = rng.nextInt(1, 6);

// 4. Shuffle an array (non-destructive)
const shuffled = rng.shuffle(['a', 'b', 'c', 'd']);

// 5. Named streams (independent per-system randomness)
const combatRng = rng.stream('combat');
const lootRng   = rng.stream('loot');
combatRng.nextInt(0, 100); // does NOT affect lootRng

// 6. Save and restore state
const snapshot = rng.serialize();
// ... later ...
const restored = new SeededRNG(0);
const result = restored.deserialize(snapshot);
if (!result.ok) {
  console.error('Failed to restore RNG:', result.error);
}
```

## Injecting into Game Systems

All game systems accept an `SeededRNG` instance as a constructor parameter:

```typescript
const rng = new SeededRNG(42);
const combat = new CombatSystem(rng);         // uses rng.stream('combat')
const inventory = new InventorySystem(rng);   // uses rng.stream('loot')
```

## Testing

Always seed with `42` in tests for reproducibility:

```typescript
import { describe, it, expect } from 'vitest';
import { SeededRNG } from '@/engine/rng/SeededRNG';

describe('SeededRNG', () => {
  it('produces deterministic sequences', () => {
    const a = new SeededRNG(42);
    const b = new SeededRNG(42);
    expect(a.nextFloat()).toBe(b.nextFloat());
  });
});
```

## Running Tests

```bash
npx vitest run src/engine/rng/__tests__/SeededRNG.test.ts
```
