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
