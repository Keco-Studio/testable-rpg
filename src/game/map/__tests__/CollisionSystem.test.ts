import { describe, expect, it } from 'vitest';
import { CollisionSystem } from '../CollisionSystem';
import type { CollisionZone } from '../types';

const box: CollisionZone = { id: 'box', x: 100, y: 100, width: 50, height: 50, type: 'building' };
const system = new CollisionSystem([box]);

describe('CollisionSystem — isBlocked', () => {
  it('returns false when player is outside zone', () => {
    expect(system.isBlocked(200, 100, 16, 16)).toBe(false);
  });

  it('returns true when player rect overlaps zone', () => {
    expect(system.isBlocked(110, 110, 16, 16)).toBe(true);
  });

  it('returns true when player is fully inside zone', () => {
    expect(system.isBlocked(120, 120, 10, 10)).toBe(true);
  });

  it('returns false when player right edge touches zone left edge exactly', () => {
    // player at x=84, width=16 → right edge = 100 (equals zone left, not >)
    expect(system.isBlocked(84, 110, 16, 16)).toBe(false);
  });

  it('returns false with no zones', () => {
    expect(new CollisionSystem([]).isBlocked(110, 110, 16, 16)).toBe(false);
  });
});

describe('CollisionSystem — resolvePosition', () => {
  it('allows full movement when destination is clear', () => {
    const result = system.resolvePosition(
      { x: 50, y: 50 },
      { width: 16, height: 16 },
      { x: 60, y: 60 },
    );
    expect(result).toEqual({ x: 60, y: 60 });
  });

  it('slides vertically when only x movement is blocked', () => {
    const wall: CollisionZone = { id: 'wall', x: 100, y: 0, width: 50, height: 300, type: 'building' };
    const sys = new CollisionSystem([wall]);
    const result = sys.resolvePosition(
      { x: 50, y: 50 },
      { width: 16, height: 16 },
      { x: 95, y: 60 },
    );
    expect(result.x).toBe(50);
    expect(result.y).toBe(60);
  });

  it('slides horizontally when only y movement is blocked', () => {
    const floor: CollisionZone = { id: 'floor', x: 0, y: 100, width: 300, height: 50, type: 'building' };
    const sys = new CollisionSystem([floor]);
    const result = sys.resolvePosition(
      { x: 50, y: 50 },
      { width: 16, height: 16 },
      { x: 60, y: 95 },
    );
    expect(result.x).toBe(60);
    expect(result.y).toBe(50);
  });

  it('returns original position when blocked in both axes', () => {
    const rightWall: CollisionZone = { id: 'r', x: 100, y: 0, width: 50, height: 300, type: 'building' };
    const downFloor: CollisionZone = { id: 'd', x: 0, y: 100, width: 300, height: 50, type: 'building' };
    const sys = new CollisionSystem([rightWall, downFloor]);
    const pos = { x: 50, y: 50 };
    const result = sys.resolvePosition(pos, { width: 16, height: 16 }, { x: 110, y: 110 });
    expect(result).toEqual(pos);
  });
});
