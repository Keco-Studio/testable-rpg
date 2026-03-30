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
    runtime.triggerDialog('npc-village-elder');
    runtime.choose(0);
    runtime.startBattle(['goblin-boss']);
    runtime.endBattle('win');

    expect(runtime.getScene()).toBe('VictoryScene');
    expect(runtime.getQuestState()['main-quest']).toBe('COMPLETED');
  });

  it('hunter dialog + slime wins complete slime-hunt quest', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.triggerDialog('npc-hunter');
    runtime.choose(0);

    runtime.startBattle(['slime']);
    runtime.endBattle('win');
    runtime.startBattle(['slime']);
    runtime.endBattle('win');
    runtime.startBattle(['slime']);
    runtime.endBattle('win');

    expect(runtime.getFlags()['hunter-greeted']).toBe(true);
    expect(runtime.getQuestState()['slime-hunt']).toBe('COMPLETED');
  });

  it('lose battle fails active quests', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.triggerDialog('npc-village-elder');
    runtime.choose(0);

    runtime.startBattle(['slime']);
    runtime.endBattle('lose');

    expect(runtime.getScene()).toBe('GameOverScene');
    expect(runtime.getQuestState()['main-quest']).toBe('FAILED');
  });

  it('save/load restores quest runtime progress exactly', async () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.triggerDialog('npc-hunter');
    runtime.choose(0);
    runtime.startBattle(['slime']);
    runtime.endBattle('win');
    runtime.saveGame(2);

    runtime.startBattle(['slime']);
    runtime.endBattle('win');
    runtime.startBattle(['slime']);
    runtime.endBattle('win');
    expect(runtime.getQuestState()['slime-hunt']).toBe('COMPLETED');

    await runtime.loadGame(2);
    expect(runtime.getQuestState()['slime-hunt']).toBe('ACTIVE');

    runtime.startBattle(['slime']);
    runtime.endBattle('win');
    runtime.startBattle(['slime']);
    runtime.endBattle('win');
    expect(runtime.getQuestState()['slime-hunt']).toBe('COMPLETED');
  });

  it('faction dialog choice resolves branching quest path', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.triggerDialog('npc-faction-leader');
    runtime.choose(1);

    expect(runtime.getFlags()['joined-guard']).toBe(false);
    expect(runtime.getFlags()['joined-mages']).toBe(true);
    expect(runtime.getQuestState()['faction-choice']).toBe('COMPLETED');
  });

  it('guard branch sets exclusive faction flag', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.triggerDialog('npc-faction-leader');
    runtime.choose(0);

    expect(runtime.getFlags()['joined-guard']).toBe(true);
    expect(runtime.getFlags()['joined-mages']).toBe(false);
    expect(runtime.getQuestState()['faction-choice']).toBe('COMPLETED');
  });

  it('battle win grants exp, loot, and level progression', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    const before = runtime.getPlayer();

    runtime.startBattle(['goblin-boss']);
    runtime.endBattle('win');

    const after = runtime.getPlayer();
    const battle = runtime.getBattleState();

    expect(after.exp).toBeGreaterThan(before.exp);
    expect(after.level).toBeGreaterThanOrEqual(before.level);
    expect((battle?.expGained ?? 0) > 0).toBe(true);
    expect((battle?.loot?.length ?? 0) > 0).toBe(true);
  });

  it('stepFrames resolves active battle rounds to completion', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.setPlayerStat('attack', 50);
    runtime.startBattle(['slime']);
    runtime.stepFrames(300);

    expect(runtime.getScene()).toBe('TownScene');
    expect(runtime.getBattleState()?.outcome).toBe('win');
  });

  it('stepFrames can cause player defeat in battle', () => {
    const runtime = new RuntimeGameState(new MemoryStorageAdapter());
    runtime.setPlayerStat('hp', 1);
    runtime.startBattle(['goblin-boss']);
    runtime.stepFrames(300);

    expect(runtime.getScene()).toBe('GameOverScene');
    expect(runtime.getBattleState()?.outcome).toBe('lose');
  });
});
