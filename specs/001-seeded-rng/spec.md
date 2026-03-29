# Feature Specification: Seeded RNG

**Feature Branch**: `001-seeded-rng`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Build a seeded random number generator for the RPG engine. It must produce deterministic sequences given the same seed, support multiple named streams (combat, loot, world-gen), and be injectable into all game systems so tests can control randomness."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Deterministic Reproducibility (Priority: P1)

As a game developer, I want all randomness in the game to be deterministic when given a seed,
so that gameplay can be reproduced exactly for testing, replays, and bug reports.

**Why this priority**: Without determinism, tests are non-repeatable. This is the foundation
that every other game system depends on for testability.

**Independent Test**: Instantiate an RNG with seed 42, call `next()` ten times, record the
sequence. Destroy and re-instantiate with seed 42. Verify the sequence is identical. Delivers
a fully usable RNG before named streams or serialization exist.

**Acceptance Scenarios**:

1. **Given** an RNG initialized with seed 42, **When** `rng.next()` is called 10 times,
   **Then** the sequence is always identical across separate instances with the same seed.
2. **Given** an RNG initialized with seed 0, **When** `rng.next()` is called,
   **Then** a valid float in [0, 1) is returned without error.
3. **Given** an RNG initialized with seed `Number.MAX_SAFE_INTEGER`, **When** `rng.next()`
   is called, **Then** a valid float in [0, 1) is returned without error.
4. **Given** an RNG initialized with seed 42, **When** `rng.nextInt(5, 5)` is called,
   **Then** the result is always 5.
5. **Given** an RNG, **When** `rng.nextInt(min, max)` is called with any valid range,
   **Then** the result is an integer in `[min, max]` inclusive.
6. **Given** an RNG, **When** `rng.nextFloat()` is called,
   **Then** the result is a float in `[0, 1)`.

---

### User Story 2 — Independent Named Streams (Priority: P2)

As a game developer, I want to draw random numbers from named, independent streams
(e.g., `combat`, `loot`, `world-gen`), so that consuming numbers in one stream does not
affect sequences in another — enabling isolated testing of subsystems.

**Why this priority**: Named streams allow independent reproducibility per subsystem.
Combat tests can advance the combat stream without disturbing loot outcomes.

**Independent Test**: Create an RNG with seed 42. Draw 5 values from stream `'loot'`,
then draw 5 values from stream `'combat'`. Reset with seed 42. Draw 5 from `'combat'` first,
then 5 from `'loot'`. Verify each stream's sequence is unchanged regardless of draw order.

**Acceptance Scenarios**:

1. **Given** an RNG with seed 42, **When** `rng.stream('combat').next()` and
   `rng.stream('loot').next()` are called in any order, **Then** each stream's sequence
   is independent of the other.
2. **Given** an RNG, **When** `rng.stream('world-gen')` is called multiple times,
   **Then** the same stream object (or equivalent state) is returned.
3. **Given** a stream `'combat'` that has been advanced N times, **When** `rng.stream('loot')`
   is called, **Then** the loot stream is unaffected.

---

### User Story 3 — Array Shuffling (Priority: P2)

As a game developer, I want to shuffle arrays deterministically using the RNG, so that loot
tables, enemy spawn orders, and card decks can be shuffled reproducibly in tests.

**Why this priority**: Shuffle is a common game operation. Without deterministic shuffle,
any test involving ordered collections is non-reproducible.

**Independent Test**: Shuffle `[1, 2, 3, 4, 5]` with seed 42. Verify the result is a
permutation of the original. Repeat with same seed and verify identical output. Verify
the original array is not mutated.

**Acceptance Scenarios**:

1. **Given** an array `[1, 2, 3, 4, 5]` and an RNG with seed 42, **When** `rng.shuffle(array)`
   is called, **Then** the result is a permutation of the input and the input is not mutated.
2. **Given** `rng.shuffle([])`, **Then** the result is `[]`.
3. **Given** `rng.shuffle([x])`, **Then** the result is `[x]`.
4. **Given** two RNG instances both seeded 42, **When** each calls `rng.shuffle(array)` with
   the same input, **Then** both return identical results.

---

### User Story 4 — State Serialization & Restoration (Priority: P3)

As a game developer, I want to serialize and restore the full RNG state (including all named
streams), so that saved games can be resumed with exactly the same random sequences — enabling
save/load determinism and mid-session bug reproduction.

**Why this priority**: Essential for save-game correctness and advanced bug reproduction,
but not required to deliver a working testable RNG.

**Independent Test**: Initialize an RNG with seed 42, advance it and several named streams
by varying amounts, call `rng.serialize()`, restore via `rng.deserialize(json)`, then verify
subsequent calls to each stream return identical values as the original.

**Acceptance Scenarios**:

1. **Given** an RNG advanced 100 calls across multiple streams, **When** `rng.serialize()`
   is called, **Then** the result is a valid JSON string.
2. **Given** a serialized RNG state, **When** `rng.deserialize(json)` is called on a fresh
   instance, **Then** subsequent `next()` calls on all streams match the original exactly.
3. **Given** a corrupted JSON string, **When** `rng.deserialize(json)` is called,
   **Then** a `Result.err` is returned without throwing.

---

### Edge Cases

- `seed = 0` must work without error.
- `seed = Number.MAX_SAFE_INTEGER` must work without error.
- `nextInt(5, 5)` always returns `5`.
- `shuffle([])` returns `[]`.
- `shuffle([x])` returns `[x]`.
- Accessing a named stream that has never been used before initializes it cleanly from the
  root seed (deterministically).
- Deserializing into an already-active RNG must replace all state atomically.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The RNG MUST produce identical number sequences when initialized with the same seed.
- **FR-002**: The RNG MUST expose a `nextFloat()` method returning a float in `[0, 1)`.
- **FR-003**: The RNG MUST expose a `nextInt(min, max)` method returning an integer in `[min, max]` inclusive.
- **FR-004**: The RNG MUST expose named, independent streams via `rng.stream(name: string)`.
- **FR-005**: Named streams MUST be isolated — advancing one stream MUST NOT affect any other.
- **FR-006**: The RNG MUST expose a `shuffle(array)` method returning a new shuffled array without mutating the original.
- **FR-007**: The RNG MUST expose `serialize()` returning a JSON string of full state.
- **FR-008**: The RNG MUST expose `deserialize(json)` restoring full state and returning `Result<void, Error>`.
- **FR-009**: All game systems MUST accept an RNG instance as a constructor/function parameter (injectable).
- **FR-010**: The RNG MUST NOT use `Math.random()` — all randomness flows through the seeded algorithm.

### Key Entities

- **SeededRNG**: Root RNG instance. Holds the master seed and a registry of named streams.
- **RNGStream**: An independent sub-generator tied to a name. Maintains its own internal state derived from the root seed and stream name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Given any seed, repeated instantiation and identical call sequences produce byte-for-byte identical outputs.
- **SC-002**: Named streams can be advanced independently with zero cross-stream interference, verifiable by test.
- **SC-003**: Full RNG state serializes to JSON and restores with no loss of determinism across 1,000 sequential calls.
- **SC-004**: All game systems (combat, inventory, quest, dialog) accept and use an injected RNG — zero calls to `Math.random()` exist in game logic.
- **SC-005**: `shuffle` on an array of 10,000 elements completes in under 50ms.

## Assumptions

- The underlying PRNG algorithm is a well-known deterministic algorithm (e.g., Mulberry32 or xoshiro128**); the exact algorithm is an implementation detail determined at planning time.
- Named streams derive their initial state from the root seed plus a hash of the stream name — the exact derivation is an implementation detail.
- `deserialize` is not required to be safe against adversarial inputs beyond basic JSON parsing; game saves are treated as trusted data.
- `shuffle` uses a Fisher-Yates algorithm consuming values from the calling stream.
- The RNG targets browser + Node.js (Vitest/jsdom) environments only; mobile/server environments are out of scope for this spec.
