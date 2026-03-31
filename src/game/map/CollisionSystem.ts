import type { CollisionZone } from './types';

export class CollisionSystem {
  constructor(private readonly zones: CollisionZone[]) {}

  isBlocked(x: number, y: number, width: number, height: number): boolean {
    for (const zone of this.zones) {
      if (
        x < zone.x + zone.width &&
        x + width > zone.x &&
        y < zone.y + zone.height &&
        y + height > zone.y
      ) {
        return true;
      }
    }
    return false;
  }

  resolvePosition(
    pos: { x: number; y: number },
    size: { width: number; height: number },
    desired: { x: number; y: number },
  ): { x: number; y: number } {
    if (!this.isBlocked(desired.x, desired.y, size.width, size.height)) {
      return desired;
    }
    if (!this.isBlocked(desired.x, pos.y, size.width, size.height)) {
      return { x: desired.x, y: pos.y };
    }
    if (!this.isBlocked(pos.x, desired.y, size.width, size.height)) {
      return { x: pos.x, y: desired.y };
    }
    return pos;
  }
}
