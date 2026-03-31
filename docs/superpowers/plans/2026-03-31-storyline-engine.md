# StorylineEngine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pure StorylineEngine module with shared narrative logic and unit tests.

**Architecture:** Create a stateless module exporting pure functions for faction exclusivity, faction gating, quest prerequisites, and act flag derivation. Add Vitest unit tests to validate behavior and immutability.

**Tech Stack:** TypeScript 5.4, Vitest.

---

## File Map

- Create: `src/engine/storyline/StorylineEngine.ts` — pure narrative functions, no side effects.
- Create: `src/engine/storyline/__tests__/StorylineEngine.test.ts` — unit tests for StorylineEngine.

---

### Task 1: Add StorylineEngine tests

**Files:**
- Create: `src/engine/storyline/__tests__/StorylineEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from 'vitest';
import {
  checkQuestPrerequisites,
  deriveActFlags,
  resolveFactionExclusivity,
  resolveFactionGate,
} from '../StorylineEngine';

describe('resolveFactionExclusivity', () => {
  it('sets the target flag to true', () => {
    const result = resolveFactionExclusivity({}, 'joined-guard', true);
    expect(result['joined-guard']).toBe(true);
  });

  it('clears joined-mages when joined-guard is set', () => {
    const result = resolveFactionExclusivity({ 'joined-mages': true }, 'joined-guard', true);
    expect(result['joined-guard']).toBe(true);
    expect(result['joined-mages']).toBe(false);
  });

  it('clears joined-guard when joined-mages is set', () => {
    const result = resolveFactionExclusivity({ 'joined-guard': true }, 'joined-mages', true);
    expect(result['joined-mages']).toBe(true);
    expect(result['joined-guard']).toBe(false);
  });

  it('does not mutate the input flags object', () => {
    const flags = { 'joined-guard': true };
    resolveFactionExclusivity(flags, 'joined-mages', true);
    expect(flags['joined-guard']).toBe(true);
  });

  it('preserves unrelated flags', () => {
    const result = resolveFactionExclusivity({ 'elder-greeted': true }, 'joined-guard', true);
    expect(result['elder-greeted']).toBe(true);
  });
});

describe('resolveFactionGate', () => {
  it('returns true when player has joined the required faction', () => {
    expect(resolveFactionGate({ 'joined-guard': true }, 'guard')).toBe(true);
    expect(resolveFactionGate({ 'joined-mages': true }, 'mages')).toBe(true);
  });

  it('returns false when player has not joined the required faction', () => {
    expect(resolveFactionGate({}, 'guard')).toBe(false);
    expect(resolveFactionGate({ 'joined-mages': true }, 'guard')).toBe(false);
  });
});

describe('checkQuestPrerequisites', () => {
  it('returns true when prerequisites list is empty', () => {
    expect(checkQuestPrerequisites([], [])).toBe(true);
  });

  it('returns true when all prerequisites are completed', () => {
    expect(checkQuestPrerequisites(['q1', 'q2'], ['q1', 'q2', 'q3'])).toBe(true);
  });

  it('returns false when any prerequisite is not completed', () => {
    expect(checkQuestPrerequisites(['q1', 'q2'], ['q1'])).toBe(false);
  });
});

describe('deriveActFlags', () => {
  it('sets act-complete-1 when a faction has been joined', () => {
    expect(deriveActFlags({ 'joined-guard': true })['act-complete-1']).toBe(true);
    expect(deriveActFlags({ 'joined-mages': true })['act-complete-1']).toBe(true);
  });

  it('does not set act-complete-1 when no faction joined', () => {
    expect(deriveActFlags({})['act-complete-1']).toBeUndefined();
  });

  it('does not override act-complete-1 if already set', () => {
    const result = deriveActFlags({ 'joined-guard': true, 'act-complete-1': true });
    expect(result['act-complete-1']).toBeUndefined();
  });

  it('sets act-complete-2 when lieutenant-defeated flag is present', () => {
    expect(deriveActFlags({ 'lieutenant-defeated': true })['act-complete-2']).toBe(true);
  });

  it('does not override act-complete-2 if already set', () => {
    const result = deriveActFlags({ 'lieutenant-defeated': true, 'act-complete-2': true });
    expect(result['act-complete-2']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/engine/storyline/__tests__/StorylineEngine.test.ts
```

Expected: FAIL with module not found for `../StorylineEngine`.

---

### Task 2: Implement StorylineEngine

**Files:**
- Create: `src/engine/storyline/StorylineEngine.ts`

- [ ] **Step 1: Write the minimal implementation**

```typescript
/**
 * StorylineEngine — pure narrative logic shared by runtime and playable loop.
 * No side effects, no DOM, no external dependencies.
 */

/**
 * When setting a faction flag, clears the opposing faction.
 * Returns a new flags object; does not mutate input.
 */
export function resolveFactionExclusivity(
  flags: Record<string, boolean>,
  key: string,
  value: boolean,
): Record<string, boolean> {
  const next: Record<string, boolean> = { ...flags, [key]: value };
  if (key === 'joined-guard' && value) next['joined-mages'] = false;
  if (key === 'joined-mages' && value) next['joined-guard'] = false;
  return next;
}

/**
 * Returns true if the player has joined the specified faction.
 */
export function resolveFactionGate(
  flags: Record<string, boolean>,
  requiredFaction: 'guard' | 'mages',
): boolean {
  return flags[`joined-${requiredFaction}`] === true;
}

/**
 * Returns true if all prerequisites are present in completedQuestIds.
 */
export function checkQuestPrerequisites(
  prerequisites: string[],
  completedQuestIds: string[],
): boolean {
  const completed = new Set(completedQuestIds);
  return prerequisites.every((id) => completed.has(id));
}

/**
 * Returns act-completion flags that should now be set.
 * Only returns flags not already set.
 */
export function deriveActFlags(
  flags: Record<string, boolean>,
): Partial<Record<string, boolean>> {
  const derived: Partial<Record<string, boolean>> = {};
  if (!flags['act-complete-1'] && (flags['joined-guard'] === true || flags['joined-mages'] === true)) {
    derived['act-complete-1'] = true;
  }
  if (!flags['act-complete-2'] && flags['lieutenant-defeated'] === true) {
    derived['act-complete-2'] = true;
  }
  return derived;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run:

```bash
npx vitest run src/engine/storyline/__tests__/StorylineEngine.test.ts
```

Expected: PASS — all tests green.

- [ ] **Step 3: Commit**

```bash
git add src/engine/storyline/StorylineEngine.ts src/engine/storyline/__tests__/StorylineEngine.test.ts
git commit -m "feat: add StorylineEngine with pure narrative functions"
```

---

## Plan Self-Review

- Spec coverage: All items from `docs/superpowers/specs/2026-03-31-storyline-engine-design.md` are covered by Task 1 (tests) and Task 2 (implementation).
- Placeholder scan: No TODO/TBD placeholders.
- Type consistency: Function signatures in tests match the implementation.
