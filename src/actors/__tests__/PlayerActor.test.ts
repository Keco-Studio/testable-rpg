import { describe, expect, it } from 'vitest';

import { PlayerActor } from '../PlayerActor';

describe('PlayerActor', () => {
  it('clamps hp/mp and updates position', () => {
    const actor = new PlayerActor({ maxHp: 20, maxMp: 8 });

    actor.setStat('hp', 99);
    actor.setStat('mp', -1);
    actor.teleport(12, 34);

    expect(actor.getStats().hp).toBe(20);
    expect(actor.getStats().mp).toBe(0);
    expect(actor.pos.x).toBe(12);
    expect(actor.pos.y).toBe(34);
  });
});
