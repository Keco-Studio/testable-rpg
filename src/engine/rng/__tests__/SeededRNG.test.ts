import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../SeededRNG';

// ============================================================
// User Story 1: Deterministic Reproducibility (P1)
// ============================================================

describe('SeededRNG — US1: Deterministic Reproducibility', () => {
  it('T007: nextFloat() returns a float in [0, 1)', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('T008: given seed 42, nextFloat() returns same sequence on two instances', () => {
    const a = new SeededRNG(42);
    const b = new SeededRNG(42);
    for (let i = 0; i < 10; i++) {
      expect(a.nextFloat()).toBe(b.nextFloat());
    }
  });

  it('T009: seed 0 produces valid output', () => {
    const rng = new SeededRNG(0);
    const v = rng.nextFloat();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('T009: seed Number.MAX_SAFE_INTEGER produces valid output', () => {
    const rng = new SeededRNG(Number.MAX_SAFE_INTEGER);
    const v = rng.nextFloat();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('T010: nextInt(5, 5) always returns 5', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 10; i++) {
      expect(rng.nextInt(5, 5)).toBe(5);
    }
  });

  it('T011: nextInt(min, max) returns integer in [min, max] inclusive', () => {
    const rng = new SeededRNG(42);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

// ============================================================
// User Story 2: Independent Named Streams (P2)
// ============================================================

describe('SeededRNG — US2: Independent Named Streams', () => {
  it('T015: stream("combat") and stream("loot") produce independent sequences', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);

    // Advance loot on rng1 first, then get combat
    rng1.stream('loot').next();
    rng1.stream('loot').next();
    rng1.stream('loot').next();
    const combatVal1 = rng1.stream('combat').next();

    // On rng2, get combat first (no loot calls)
    const combatVal2 = rng2.stream('combat').next();

    expect(combatVal1).toBe(combatVal2);
  });

  it('T016: stream(name) returns the same object on repeated calls', () => {
    const rng = new SeededRNG(42);
    const s1 = rng.stream('combat');
    const s2 = rng.stream('combat');
    expect(s1).toBe(s2);
  });

  it('T017: advancing "combat" stream does not affect "loot" stream', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);

    // Advance combat many times on rng1
    for (let i = 0; i < 100; i++) rng1.stream('combat').next();
    const lootVal1 = rng1.stream('loot').next();

    // rng2: never touch combat
    const lootVal2 = rng2.stream('loot').next();

    expect(lootVal1).toBe(lootVal2);
  });
});

// ============================================================
// User Story 3: Array Shuffling (P2)
// ============================================================

describe('SeededRNG — US3: Array Shuffling', () => {
  it('T021: shuffle([]) returns []', () => {
    const rng = new SeededRNG(42);
    expect(rng.shuffle([])).toEqual([]);
  });

  it('T022: shuffle([x]) returns [x]', () => {
    const rng = new SeededRNG(42);
    expect(rng.shuffle([99])).toEqual([99]);
  });

  it('T023: shuffle returns a permutation and does not mutate the input', () => {
    const rng = new SeededRNG(42);
    const input = [1, 2, 3, 4, 5];
    const result = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]); // original unchanged
    expect(result).toHaveLength(5);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]); // same elements
  });

  it('T024: two SeededRNG(42) instances produce identical shuffle', () => {
    const a = new SeededRNG(42);
    const b = new SeededRNG(42);
    expect(a.shuffle([1, 2, 3, 4, 5])).toEqual(b.shuffle([1, 2, 3, 4, 5]));
  });
});

// ============================================================
// User Story 4: State Serialization & Restoration (P3)
// ============================================================

describe('SeededRNG — US4: State Serialization & Restoration', () => {
  it('T026: serialize() returns a valid JSON string', () => {
    const rng = new SeededRNG(42);
    rng.nextFloat();
    rng.stream('combat').next();
    const json = rng.serialize();
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('T027: deserialize restores root and all stream states exactly', () => {
    const rng = new SeededRNG(42);
    // Advance root and streams
    rng.nextFloat();
    rng.nextFloat();
    rng.stream('combat').next();
    rng.stream('loot').next();
    rng.stream('loot').next();
    const json = rng.serialize();

    const restored = new SeededRNG(0);
    const result = restored.deserialize(json);
    expect(result.ok).toBe(true);

    // Next calls on both should match
    expect(restored.nextFloat()).toBe(rng.nextFloat());
    expect(restored.stream('combat').next()).toBe(rng.stream('combat').next());
    expect(restored.stream('loot').next()).toBe(rng.stream('loot').next());
  });

  it('T028: deserialize with invalid JSON returns Result.err without throwing', () => {
    const rng = new SeededRNG(42);
    const result = rng.deserialize('not valid json {{');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});

// ============================================================
// T033: Performance — shuffle 10,000 items < 50ms
// ============================================================

describe('SeededRNG — Performance', () => {
  it('T033: shuffle 10,000 items completes in < 50ms', () => {
    const rng = new SeededRNG(42);
    const large = Array.from({ length: 10000 }, (_, i) => i);
    const start = performance.now();
    rng.shuffle(large);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
