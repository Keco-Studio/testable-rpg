# Contract: SeededRNG TypeScript Public API

**Feature**: 001-seeded-rng
**Date**: 2026-03-29

## Public Interface

```typescript
// Result type — used by all fallible operations
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

// Serialized state shape — what serialize()/deserialize() exchange
interface SerializedRNG {
  seed:    number;
  state:   number;
  streams: Record<string, number>;
}

// A named, independent sub-stream
interface IRNGStream {
  readonly name: string;
  next():    number;          // float [0, 1)
  nextInt(min: number, max: number): number; // integer [min, max]
}

// The main SeededRNG class
class SeededRNG {
  constructor(seed: number);

  // Root stream operations
  nextFloat(): number;                             // float in [0, 1)
  nextInt(min: number, max: number): number;       // integer in [min, max] inclusive
  shuffle<T>(array: readonly T[]): T[];             // new shuffled array, original unchanged

  // Named streams
  stream(name: string): IRNGStream;                // returns/creates independent stream

  // Serialization
  serialize():   string;                           // JSON string of SerializedRNG
  deserialize(json: string): Result<void, Error>; // restores state atomically
}
```

## Behaviour Contracts

### `nextFloat()`
- Returns a float in the half-open interval `[0, 1)`.
- Advances the root stream state by exactly one Mulberry32 step.
- MUST NOT return exactly `1.0`.

### `nextInt(min, max)`
- Returns an integer in `[min, max]` inclusive.
- When `min === max`, always returns `min` without consuming RNG state.
- Precondition: `min <= max`. Behaviour undefined if `min > max`.

### `shuffle<T>(array)`
- Returns a new array that is a permutation of `array`.
- The input `array` MUST NOT be mutated.
- `shuffle([])` → `[]`.
- `shuffle([x])` → `[x]`.
- Consumes `array.length - 1` calls from the root stream.

### `stream(name)`
- Returns the same `IRNGStream` object on repeated calls with the same name.
- The stream state is independent of all other named streams and the root stream.
- First call lazily initializes the stream from `djb2(name) ^ seed`.

### `serialize()`
- Always succeeds. Returns a JSON string.
- The returned JSON is valid input for `deserialize()`.

### `deserialize(json)`
- Replaces all state atomically (root + all streams).
- If `json` is invalid or malformed → returns `{ ok: false, error: Error }`.
- MUST NOT throw.

## Usage Example

```typescript
const rng = new SeededRNG(42);

// Root stream
const f = rng.nextFloat();         // e.g., 0.7419...
const n = rng.nextInt(1, 6);       // e.g., 4

// Named stream (combat — independent of root)
const combatRng = rng.stream('combat');
const attackRoll = combatRng.nextInt(0, 100);

// Shuffle
const deck = rng.shuffle([1, 2, 3, 4, 5]);

// Serialize / restore
const saved = rng.serialize();
const fresh = new SeededRNG(0);
fresh.deserialize(saved); // restores exact state
```
