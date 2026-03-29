# Data Model: Seeded RNG

**Feature**: 001-seeded-rng
**Date**: 2026-03-29

## Entities

### SeededRNG

The root RNG object. Holds the master seed and a registry of lazily-initialized named streams.

| Field | Type | Description |
|-------|------|-------------|
| `seed` | `number` | Master seed (32-bit integer). Immutable after construction. |
| `_state` | `number` | Current Mulberry32 internal state for the root stream. |
| `_streams` | `Map<string, RNGStream>` | Lazily-initialized named sub-streams. |

**Validation rules**:
- `seed` MUST be a finite, non-NaN number. Floats are truncated to uint32 via `>>> 0`.
- Seed 0 and `Number.MAX_SAFE_INTEGER` are valid.

**Lifecycle**:
- Constructed with `new SeededRNG(seed: number)`.
- Root stream state starts at `seed`.
- Named streams are created on first `stream(name)` call.

---

### RNGStream

An independent sub-generator. Derived from the root seed + stream name hash.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Identifier for this stream (e.g., `'combat'`, `'loot'`). |
| `_state` | `number` | Current Mulberry32 internal state for this stream. |

**Validation rules**:
- `name` MUST be a non-empty string.
- `_state` is derived as `djb2(name) ^ rootSeed` on creation — never user-supplied directly.

---

### Result\<T, E\>

A discriminated union for error-returning operations. Not an entity in the domain model, but
used as the return type for all fallible operations.

```typescript
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E };
```

---

### SerializedRNG

The shape of the JSON-serialized RNG state. Used by `serialize()` / `deserialize()`.

| Field | Type | Description |
|-------|------|-------------|
| `seed` | `number` | Original root seed. |
| `state` | `number` | Current root stream state at serialization time. |
| `streams` | `Record<string, number>` | Map of stream name → current stream state. |

---

## State Transitions

### SeededRNG Lifecycle

```
new SeededRNG(seed)
  → state = seed
  → streams = {}

.next() / .nextFloat() / .nextInt()
  → state advances via Mulberry32

.stream(name)
  → streams[name] ?? create(djb2(name) ^ seed)
  → returns RNGStream

.shuffle(array)
  → consumes from root stream (nextInt calls)

.serialize()
  → returns JSON of { seed, state, streams: {name: state} }

.deserialize(json)
  → replaces state and streams atomically
  → returns Result<void, Error>
```
