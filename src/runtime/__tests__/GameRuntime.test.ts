import { describe, expect, it } from 'vitest';

import { RuntimeGameState } from '../GameRuntime';
import { MemoryStorageAdapter } from '../../engine/save/SaveSystem';

describe('RuntimeGameState', () => {
  it('dialog choice mutates quest + flags', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.triggerDialog('npc-village-elder');
    runtime.choose(0);

    expect(runtime.getQuestState()['main-quest']).toBe('ACTIVE');
    expect(runtime.getFlags()['elder-greeted']).toBe(true);
  });

  it('save/load restores scene, inventory and map position', async () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    await runtime.teleport(7, 8, 'dungeon');
    runtime.addItem('health-potion', 3);
    await runtime.changeScene('TownScene');
    runtime.saveGame(1);

    await runtime.teleport(1, 2, 'elsewhere');
    runtime.removeItem('health-potion', 2);
    await runtime.changeScene('BattleScene');

    await runtime.loadGame(1);

    expect(runtime.getMapPosition()).toEqual({ map: 'dungeon', x: 7, y: 8 });
    expect(runtime.getInventory()).toEqual([{ itemId: 'health-potion', quantity: 3 }]);
    expect(runtime.getScene()).toBe('TownScene');
  });

  it('boss win transitions to VictoryScene', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.startBattle(['goblin-boss']);
    runtime.endBattle('win');
    expect(runtime.getScene()).toBe('VictoryScene');
  });
});
