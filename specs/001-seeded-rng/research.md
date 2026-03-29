# Research: Seeded RNG

**Feature**: 001-seeded-rng
**Date**: 2026-03-29

## Decision 1: Primary PRNG Algorithm — Mulberry32

**Decision**: Mulberry32

**Rationale**:
- Pure 32-bit integer arithmetic; no 64-bit BigInt required in JavaScript.
- Single 32-bit state value — trivially serializable to one integer.
- Well-known, well-tested; used in many game engines and JS RNG libraries.
- Produces full-period sequences of 2³² values.
- Implementation is ~6 lines of code — no external dependency needed.
- Passes PractRand and TestU01 SmallCrush for game use cases.

**Alternatives Considered**:
- **xoshiro128\*\***: Better statistical quality, but requires 4×32-bit state (more complex serialization). Overkill for game RNG.
- **LCG (Linear Congruential Generator)**: Too predictable; poor low-bit quality.
- **PCG64**: Excellent quality but requires BigInt for 64-bit math in JS — adds runtime complexity.
- **Math.random()**: Non-seeded, non-deterministic. Constitution explicitly forbids it.

**Algorithm reference (pseudocode)**:
```
mulberry32(seed):
  t = seed + 0x6D2B79F5
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
```

---

## Decision 2: Named Stream Derivation — Seed Hashing

**Decision**: Derive each named stream's initial seed by hashing the stream name string using
a simple djb2-variant hash, then XOR-mixing with the root seed.

**Rationale**:
- Ensures streams are independent — different names → different initial states.
- Hash + XOR is deterministic and trivially reproducible.
- No lookup table needed; stream states lazily initialized on first access.
- djb2 variant is ~5 lines, well-known in game dev.

**Stream derivation formula**:
```
streamSeed = djb2Hash(streamName) ^ rootSeed
```

Where `djb2Hash` iterates over char codes: `hash = hash * 33 ^ charCode`.

**Alternatives Considered**:
- **FNV-1a hash**: Slightly better distribution but more complex; overkill.
- **SHA-based derivation**: Cryptographic overkill; much slower; no benefit for game RNG.
- **Counter-based streams**: Simpler but creates predictable seed relationships between streams.

---

## Decision 3: Result<T, Error> Pattern

**Decision**: Inline `Result` type using a discriminated union — no external library.

**Rationale**:
- Constitution mandates game systems return `Result<T, Error>` instead of throwing.
- A lightweight inline type avoids introducing a dependency (e.g., `neverthrow`) for a ~4-line definition.
- TypeScript discriminated unions provide full type narrowing.

**Type definition**:
```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

**Alternatives Considered**:
- **neverthrow library**: Good API but adds a dependency for a trivial type.
- **Throwing exceptions**: Forbidden by constitution.
- **Optional / undefined returns**: Loses error context.

---

## Decision 4: Shuffle Algorithm — Fisher-Yates (Knuth Shuffle)

**Decision**: Fisher-Yates (inside-out variant) consuming from the `SeededRNG` root stream
(or a stream passed by the caller).

**Rationale**:
- O(n) time, O(n) space (returns new array — no mutation).
- Standard algorithm; every developer recognizes it.
- Deterministic given the same RNG state at call time.

**Algorithm**:
```
shuffle(array):
  result = [...array]
  for i from result.length - 1 to 1:
    j = nextInt(0, i)
    swap(result[i], result[j])
  return result
```
