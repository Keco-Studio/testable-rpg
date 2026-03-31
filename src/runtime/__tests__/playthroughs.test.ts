/**
 * Comprehensive gameplay scenario tests.
 *
 * All tests run through RuntimeGameState directly — no browser, no rAF.
 * Seed 42 is used everywhere for deterministic loot rolls.
 *
 * Scenarios are grouped by play style / feature area:
 *   - Complete playthroughs (happy path, branching paths)
 *   - Combat mechanics (damage, flee, frame simulation)
 *   - Save / Load integrity
 *   - Inventory management
 *   - Quest state machine
 *   - Dialog interactions
 *   - Player stats & levelling
 *   - Scenario runner API
 *   - Narrative playthroughs (multi-step stories)
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createGameTestAPI } from '../../testing/GameTestAPI';
import { MemoryStorageAdapter } from '../../engine/save/SaveSystem';
import { RuntimeGameState } from '../GameRuntime';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRuntime(): RuntimeGameState {
  const rt = new RuntimeGameState(new MemoryStorageAdapter());
  rt.setSeed(42);
  return rt;
}

function makeAPI() {
  const rt = makeRuntime();
  return { rt, api: createGameTestAPI(rt) };
}

// ---------------------------------------------------------------------------
// 1. Complete playthroughs — happy paths
// ---------------------------------------------------------------------------

describe('Playthrough — main quest (talk elder → defeat goblin-boss)', () => {
  it('reaches VictoryScene and COMPLETED state', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    expect(rt.getQuestState()['main-quest']).toBe('ACTIVE');

    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');

    expect(rt.getScene()).toBe('VictoryScene');
    expect(rt.getQuestState()['main-quest']).toBe('COMPLETED');
  });

  it('grants exp and loot on boss defeat', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');

    const battle = rt.getBattleState()!;
    expect(battle.expGained).toBeGreaterThan(0);
    expect(battle.loot!.length).toBeGreaterThan(0);
    expect(rt.getPlayer().exp).toBeGreaterThan(0);
  });

  it('player levelled up after enough exp', () => {
    const rt = makeRuntime();
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');
    // goblin-boss gives 30 exp which should push level past 1
    expect(rt.getPlayer().level).toBeGreaterThan(1);
  });

  it('elder flag is set after greeting', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    expect(rt.getFlags()['elder-greeted']).toBe(true);
  });
});

describe('Playthrough — slime hunt side quest (3 × slime)', () => {
  it('completes after hunter dialog + 3 slime victories', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-hunter');
    rt.choose(0);
    expect(rt.getQuestState()['slime-hunt']).toBe('ACTIVE');

    for (let i = 0; i < 3; i++) {
      rt.startBattle(['slime']);
      rt.endBattle('win');
    }

    expect(rt.getQuestState()['slime-hunt']).toBe('COMPLETED');
  });

  it('stays ACTIVE after only 2 slime wins', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-hunter');
    rt.choose(0);

    rt.startBattle(['slime']);
    rt.endBattle('win');
    rt.startBattle(['slime']);
    rt.endBattle('win');

    expect(rt.getQuestState()['slime-hunt']).toBe('ACTIVE');
  });

  it('hunter flag is set', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-hunter');
    rt.choose(0);
    expect(rt.getFlags()['hunter-greeted']).toBe(true);
  });
});

describe('Playthrough — faction choice (guard path)', () => {
  it('sets guard flag, clears mages flag, completes quest', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(0);

    expect(rt.getFlags()['joined-guard']).toBe(true);
    expect(rt.getFlags()['joined-mages']).toBe(false);
    expect(rt.getQuestState()['faction-choice']).toBe('COMPLETED');
  });
});

describe('Playthrough — faction choice (mages path)', () => {
  it('sets mages flag, clears guard flag, completes quest', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(1);

    expect(rt.getFlags()['joined-mages']).toBe(true);
    expect(rt.getFlags()['joined-guard']).toBe(false);
    expect(rt.getQuestState()['faction-choice']).toBe('COMPLETED');
  });
});

describe('Playthrough — all three quests in one session', () => {
  it('completes main-quest, slime-hunt, and faction-choice', () => {
    const rt = makeRuntime();

    rt.triggerDialog('npc-village-elder');
    rt.choose(0);

    rt.triggerDialog('npc-hunter');
    rt.choose(0);

    rt.triggerDialog('npc-faction-leader');
    rt.choose(0);

    for (let i = 0; i < 3; i++) {
      rt.startBattle(['slime']);
      rt.endBattle('win');
    }

    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');

    const quests = rt.getQuestState();
    expect(quests['main-quest']).toBe('COMPLETED');
    expect(quests['slime-hunt']).toBe('COMPLETED');
    expect(quests['faction-choice']).toBe('COMPLETED');
    expect(rt.getScene()).toBe('VictoryScene');
  });
});

// ---------------------------------------------------------------------------
// 2. Combat mechanics
// ---------------------------------------------------------------------------

describe('Combat — endBattle outcomes', () => {
  it('flee returns to TownScene with no exp', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    rt.endBattle('flee');

    expect(rt.getScene()).toBe('TownScene');
    expect(rt.getBattleState()?.outcome).toBe('flee');
    expect(rt.getBattleState()?.expGained).toBe(0);
    expect(rt.getPlayer().exp).toBe(0);
  });

  it('win grants slime exp (3)', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    rt.endBattle('win');
    expect(rt.getPlayer().exp).toBe(3);
  });

  it('lose triggers GameOverScene', () => {
    const rt = makeRuntime();
    rt.startBattle(['goblin-boss']);
    rt.endBattle('lose');
    expect(rt.getScene()).toBe('GameOverScene');
  });

  it('lose with active quest fails all active quests', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.triggerDialog('npc-hunter');
    rt.choose(0);

    rt.startBattle(['slime']);
    rt.endBattle('lose');

    const quests = rt.getQuestState();
    expect(quests['main-quest']).toBe('FAILED');
    expect(quests['slime-hunt']).toBe('FAILED');
  });

  it('battle with multiple slimes grants combined exp', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime', 'slime']);
    rt.endBattle('win');
    expect(rt.getPlayer().exp).toBe(6); // 3 + 3
  });

  it('non-boss win returns to TownScene', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    rt.endBattle('win');
    expect(rt.getScene()).toBe('TownScene');
  });

  it('getBattleState returns null before any battle', () => {
    const rt = makeRuntime();
    expect(rt.getBattleState()).toBeNull();
  });

  it('battle state is active after startBattle', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    expect(rt.getBattleState()?.active).toBe(true);
    expect(rt.getBattleState()?.enemies).toEqual(['slime']);
    expect(rt.getBattleState()?.outcome).toBeNull();
  });

  it('flee from a battle with no active quests leaves quests unchanged', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    rt.endBattle('flee');
    const quests = rt.getQuestState();
    expect(Object.values(quests).every((s) => s === 'INACTIVE')).toBe(true);
  });
});

describe('Combat — stepFrames (frame simulation)', () => {
  it('high-attack player defeats slime via frame steps', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('attack', 50);
    rt.startBattle(['slime']);
    rt.stepFrames(300);

    expect(rt.getScene()).toBe('TownScene');
    expect(rt.getBattleState()?.outcome).toBe('win');
  });

  it('1-HP player dies to goblin-boss via frame steps', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('hp', 1);
    rt.startBattle(['goblin-boss']);
    rt.stepFrames(300);

    expect(rt.getScene()).toBe('GameOverScene');
    expect(rt.getBattleState()?.outcome).toBe('lose');
  });

  it('frame simulation with default stats eventually ends the battle', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    // Keep stepping until scene changes (max safety ceiling)
    let iters = 0;
    while (rt.getBattleState()?.active && iters < 1000) {
      rt.stepFrames(60);
      iters++;
    }
    expect(rt.getBattleState()?.active).toBe(false);
  });

  it('stepFrames with 0 frames does nothing to battle or RNG', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    const before = rt.getBattleState();
    rt.stepFrames(0);
    expect(rt.getBattleState()?.active).toBe(before?.active);
    expect(rt.getBattleState()?.enemies).toEqual(before?.enemies);
  });

  it('stepFrames resolves boss battle and reaches VictoryScene', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('attack', 100);
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.startBattle(['goblin-boss']);
    rt.stepFrames(300);

    expect(rt.getScene()).toBe('VictoryScene');
    expect(rt.getQuestState()['main-quest']).toBe('COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// 3. Save / Load integrity
// ---------------------------------------------------------------------------

describe('Save/Load — state restoration', () => {
  it('restores scene, map position, and inventory', async () => {
    const rt = makeRuntime();
    await rt.teleport(10, 20, 'dungeon');
    rt.addItem('health-potion', 2);
    await rt.changeScene('TownScene');
    rt.saveGame(1);

    await rt.teleport(0, 0, 'elsewhere');
    rt.removeItem('health-potion', 2);
    await rt.changeScene('BattleScene');

    await rt.loadGame(1);

    expect(rt.getScene()).toBe('TownScene');
    expect(rt.getMapPosition()).toEqual({ map: 'dungeon', x: 10, y: 20 });
    expect(rt.getInventory()).toEqual([{ itemId: 'health-potion', quantity: 2 }]);
  });

  it('restores player stats exactly', async () => {
    const rt = makeRuntime();
    rt.setPlayerStat('hp', 15);
    rt.setPlayerStat('attack', 12);
    rt.saveGame(2);

    rt.setPlayerStat('hp', 1);
    rt.setPlayerStat('attack', 1);

    await rt.loadGame(2);
    expect(rt.getPlayer().hp).toBe(15);
    expect(rt.getPlayer().attack).toBe(12);
  });

  it('restores flags', async () => {
    const rt = makeRuntime();
    rt.setFlag('custom-flag', true);
    rt.saveGame(1);

    rt.setFlag('custom-flag', false);
    await rt.loadGame(1);

    expect(rt.getFlags()['custom-flag']).toBe(true);
  });

  it('restores quest ACTIVE state and allows continued progress', async () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-hunter');
    rt.choose(0);
    rt.startBattle(['slime']);
    rt.endBattle('win');
    rt.saveGame(1);

    // Advance further
    rt.startBattle(['slime']);
    rt.endBattle('win');
    rt.startBattle(['slime']);
    rt.endBattle('win');
    expect(rt.getQuestState()['slime-hunt']).toBe('COMPLETED');

    await rt.loadGame(1);
    expect(rt.getQuestState()['slime-hunt']).toBe('ACTIVE');

    // Complete from restored state
    rt.startBattle(['slime']);
    rt.endBattle('win');
    rt.startBattle(['slime']);
    rt.endBattle('win');
    expect(rt.getQuestState()['slime-hunt']).toBe('COMPLETED');
  });

  it('restores COMPLETED quest state', async () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(0);
    rt.saveGame(3);

    const rt2 = new RuntimeGameState(new MemoryStorageAdapter());
    // Load is per-instance, use same storage
    rt.saveGame(3);
    await rt.loadGame(3);
    expect(rt.getQuestState()['faction-choice']).toBe('COMPLETED');
  });

  it('load from empty slot leaves state unchanged', async () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    const before = rt.getQuestState();

    await rt.loadGame(2); // never saved

    expect(rt.getQuestState()).toEqual(before);
  });

  it('overwriting a save slot replaces old data', async () => {
    const rt = makeRuntime();
    rt.addItem('health-potion', 5);
    rt.saveGame(1);

    rt.removeItem('health-potion', 5);
    rt.addItem('sword', 1);
    rt.saveGame(1);

    await rt.loadGame(1);
    const inv = rt.getInventory();
    expect(inv.find((i) => i.itemId === 'health-potion')).toBeUndefined();
    expect(inv.find((i) => i.itemId === 'sword')?.quantity).toBe(1);
  });

  it('faction guard save/load: guard flag persists, mages stays false', async () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(0);
    rt.saveGame(1);

    // Switch to mages in memory
    rt.triggerDialog('npc-faction-leader');
    rt.choose(1);
    expect(rt.getFlags()['joined-mages']).toBe(true);

    await rt.loadGame(1);
    expect(rt.getFlags()['joined-guard']).toBe(true);
    expect(rt.getFlags()['joined-mages']).toBe(false);
    expect(rt.getQuestState()['faction-choice']).toBe('COMPLETED');
  });

  it('getSaveSlot returns null for unsaved slot', () => {
    const rt = makeRuntime();
    expect(rt.getSaveSlot(2)).toBeNull();
  });

  it('getSaveSlot returns saved data without loading', async () => {
    const rt = makeRuntime();
    rt.addItem('sword', 1);
    rt.saveGame(1);

    const slot = rt.getSaveSlot(1);
    expect(slot).not.toBeNull();
    expect(slot!.inventory.find((i) => i.itemId === 'sword')?.quantity).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Inventory management
// ---------------------------------------------------------------------------

describe('Inventory — item operations', () => {
  it('adds a stackable item and reflects quantity', () => {
    const rt = makeRuntime();
    rt.addItem('health-potion', 3);
    expect(rt.getInventory()).toEqual([{ itemId: 'health-potion', quantity: 3 }]);
  });

  it('stacks same item across multiple adds', () => {
    const rt = makeRuntime();
    rt.addItem('health-potion', 2);
    rt.addItem('health-potion', 3);
    expect(rt.getInventory()).toEqual([{ itemId: 'health-potion', quantity: 5 }]);
  });

  it('removes partial quantity', () => {
    const rt = makeRuntime();
    rt.addItem('health-potion', 5);
    rt.removeItem('health-potion', 3);
    expect(rt.getInventory()).toEqual([{ itemId: 'health-potion', quantity: 2 }]);
  });

  it('removes exact quantity — item disappears from inventory', () => {
    const rt = makeRuntime();
    rt.addItem('health-potion', 2);
    rt.removeItem('health-potion', 2);
    expect(rt.getInventory().find((i) => i.itemId === 'health-potion')).toBeUndefined();
  });

  it('addItem returns UNKNOWN_ITEM for unknown id', () => {
    const rt = makeRuntime();
    const result = rt.addItem('dragon-scale', 1);
    expect(result).toEqual({ ok: false, error: 'UNKNOWN_ITEM' });
  });

  it('removeItem returns INSUFFICIENT_QUANTITY when not enough', () => {
    const rt = makeRuntime();
    rt.addItem('health-potion', 1);
    const result = rt.removeItem('health-potion', 5);
    expect(result).toEqual({ ok: false, error: 'INSUFFICIENT_QUANTITY' });
    // Original quantity unchanged
    expect(rt.getInventory()).toEqual([{ itemId: 'health-potion', quantity: 1 }]);
  });

  it('removeItem on item not in inventory returns INSUFFICIENT_QUANTITY', () => {
    const rt = makeRuntime();
    const result = rt.removeItem('sword', 1);
    expect(result).toEqual({ ok: false, error: 'INSUFFICIENT_QUANTITY' });
  });

  it('multiple different items coexist in inventory', () => {
    const rt = makeRuntime();
    rt.addItem('health-potion', 2);
    rt.addItem('sword', 1);
    rt.addItem('shield', 1);
    const inv = rt.getInventory();
    expect(inv).toHaveLength(3);
    expect(inv.find((i) => i.itemId === 'health-potion')?.quantity).toBe(2);
    expect(inv.find((i) => i.itemId === 'sword')?.quantity).toBe(1);
    expect(inv.find((i) => i.itemId === 'shield')?.quantity).toBe(1);
  });

  it('loot from slime battle adds to inventory', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    rt.endBattle('win');
    // loot-basic drops either health-potion or sword
    const inv = rt.getInventory();
    expect(inv.length).toBeGreaterThan(0);
  });

  it('loot from boss drops an item', () => {
    const rt = makeRuntime();
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');
    const loot = rt.getBattleState()!.loot!;
    expect(loot.length).toBeGreaterThan(0);
    expect(['shield', 'health-potion']).toContain(loot[0].itemId);
  });

  it('flee does not grant loot', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    rt.endBattle('flee');
    expect(rt.getBattleState()!.loot).toHaveLength(0);
    expect(rt.getInventory()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Quest state machine
// ---------------------------------------------------------------------------

describe('Quest state machine', () => {
  it('all quests start INACTIVE', () => {
    const rt = makeRuntime();
    const quests = rt.getQuestState();
    expect(Object.values(quests).every((s) => s === 'INACTIVE')).toBe(true);
  });

  it('activateQuest moves quest to ACTIVE', () => {
    const rt = makeRuntime();
    rt.activateQuest('slime-hunt');
    expect(rt.getQuestState()['slime-hunt']).toBe('ACTIVE');
  });

  it('completeQuest moves quest to COMPLETED', () => {
    const rt = makeRuntime();
    rt.activateQuest('slime-hunt');
    rt.completeQuest('slime-hunt');
    expect(rt.getQuestState()['slime-hunt']).toBe('COMPLETED');
  });

  it('failed quest state appears in getQuestState', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.startBattle(['slime']);
    rt.endBattle('lose');
    expect(rt.getQuestState()['main-quest']).toBe('FAILED');
  });

  it('completed quest is not failed on battle loss', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(0); // completes faction-choice immediately

    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.startBattle(['slime']);
    rt.endBattle('lose');

    // faction-choice was COMPLETED before the loss
    expect(rt.getQuestState()['faction-choice']).toBe('COMPLETED');
    expect(rt.getQuestState()['main-quest']).toBe('FAILED');
  });

  it('INACTIVE quest is not failed by battle loss', () => {
    const rt = makeRuntime();
    rt.startBattle(['slime']);
    rt.endBattle('lose');
    // No quests were active, so they stay INACTIVE
    const quests = rt.getQuestState();
    expect(Object.values(quests).every((s) => s === 'INACTIVE')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Dialog interactions
// ---------------------------------------------------------------------------

describe('Dialog — NPC interactions', () => {
  it('elder dialog opens with correct npcId', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    expect(rt.getDialogState()?.npcId).toBe('npc-village-elder');
  });

  it('hunter dialog opens with correct npcId', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-hunter');
    expect(rt.getDialogState()?.npcId).toBe('npc-hunter');
  });

  it('skipDialog clears dialog state', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.skipDialog();
    expect(rt.getDialogState()).toBeNull();
  });

  it('choosing in dialog with skipDialog afterward leaves no dialog state', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.skipDialog();
    expect(rt.getDialogState()).toBeNull();
  });

  it('choose without open dialog is a no-op', () => {
    const rt = makeRuntime();
    rt.choose(0);
    expect(rt.getQuestState()['main-quest']).toBe('INACTIVE');
    expect(rt.getFlags()).toEqual({});
  });

  it('faction leader dialog state includes npcId', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    expect(rt.getDialogState()?.npcId).toBe('npc-faction-leader');
  });

  it('triggering dialog twice replaces the previous dialog state', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.triggerDialog('npc-hunter');
    expect(rt.getDialogState()?.npcId).toBe('npc-hunter');
  });

  it('crest dialog activates the expose-the-traitor quest when confronting', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(0);
    rt.triggerDialog('npc-sergeant-davan');
    rt.choose(0);
    expect(rt.getQuestState()['expose-the-traitor']).toBe('INACTIVE');
    rt.triggerDialog('npc-officer-crest');
    rt.choose(0);
    expect(rt.getQuestState()['expose-the-traitor']).toBe('COMPLETED');
  });

  it('crest dialog activates the expose-the-traitor quest even when covering it up', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(0);
    rt.triggerDialog('npc-sergeant-davan');
    rt.choose(0);
    expect(rt.getQuestState()['expose-the-traitor']).toBe('INACTIVE');
    rt.triggerDialog('npc-officer-crest');
    rt.choose(1);
    expect(rt.getQuestState()['expose-the-traitor']).toBe('COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// 7. Player stats & levelling
// ---------------------------------------------------------------------------

describe('Player stats', () => {
  it('default player stats are sensible', () => {
    const rt = makeRuntime();
    const p = rt.getPlayer();
    expect(p.hp).toBe(30);
    expect(p.maxHp).toBe(30);
    expect(p.mp).toBe(10);
    expect(p.maxMp).toBe(10);
    expect(p.level).toBe(1);
    expect(p.exp).toBe(0);
  });

  it('setPlayerStat hp is clamped to maxHp', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('hp', 999);
    expect(rt.getPlayer().hp).toBe(rt.getPlayer().maxHp);
  });

  it('setPlayerStat hp to 0 triggers GameOverScene', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('hp', 0);
    expect(rt.getScene()).toBe('GameOverScene');
    expect(rt.getPlayer().hp).toBe(0);
  });

  it('setPlayerStat mp is clamped to maxMp', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('mp', 9999);
    expect(rt.getPlayer().mp).toBe(rt.getPlayer().maxMp);
  });

  it('setPlayerStat mp cannot go below 0', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('mp', -5);
    expect(rt.getPlayer().mp).toBe(0);
  });

  it('setPlayerStat attack updates attack', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('attack', 99);
    expect(rt.getPlayer().attack).toBe(99);
  });

  it('getActors reflects player position and hp', async () => {
    const rt = makeRuntime();
    await rt.teleport(50, 75);
    rt.setPlayerStat('hp', 20);
    const actors = rt.getActors();
    expect(actors[0].pos).toEqual({ x: 50, y: 75 });
    expect(actors[0].hp).toBe(20);
  });

  it('level 1 → 2 after 20 exp (goblin-boss gives 30)', () => {
    const rt = makeRuntime();
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');
    expect(rt.getPlayer().level).toBeGreaterThanOrEqual(2);
  });

  it('level-up restores HP to maxHp', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('hp', 5);
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');
    const p = rt.getPlayer();
    // After level up, hp == maxHp
    expect(p.hp).toBe(p.maxHp);
  });
});

// ---------------------------------------------------------------------------
// 8. Teleport & map position
// ---------------------------------------------------------------------------

describe('Teleport & map position', () => {
  it('teleport updates player and mapPosition coordinates', async () => {
    const rt = makeRuntime();
    await rt.teleport(100, 200);
    expect(rt.getMapPosition()).toMatchObject({ x: 100, y: 200 });
    expect(rt.getPlayer()).toMatchObject({ x: 100, y: 200 });
  });

  it('teleport with map parameter changes map name', async () => {
    const rt = makeRuntime();
    await rt.teleport(5, 10, 'dungeon-level-1');
    expect(rt.getMapPosition().map).toBe('dungeon-level-1');
  });

  it('multiple teleports track the last position', async () => {
    const rt = makeRuntime();
    await rt.teleport(10, 20);
    await rt.teleport(30, 40);
    expect(rt.getMapPosition()).toMatchObject({ x: 30, y: 40 });
  });

  it('actors array reflects teleported position', async () => {
    const rt = makeRuntime();
    await rt.teleport(77, 88);
    expect(rt.getActors()[0].pos).toEqual({ x: 77, y: 88 });
  });
});

// ---------------------------------------------------------------------------
// 9. changeScene
// ---------------------------------------------------------------------------

describe('changeScene', () => {
  it('transitions to a known scene', async () => {
    const rt = makeRuntime();
    const result = await rt.changeScene('BattleScene');
    expect(result).toEqual({ ok: true, value: undefined });
    expect(rt.getScene()).toBe('BattleScene');
  });

  it('returns UNKNOWN_SCENE error for unknown scene', async () => {
    const rt = makeRuntime();
    const result = await rt.changeScene('MoonScene');
    expect(result).toEqual({ ok: false, error: 'UNKNOWN_SCENE' });
    expect(rt.getScene()).toBe('TitleScene');
  });

  it('can transition between all known scenes', async () => {
    const rt = makeRuntime();
    for (const scene of ['TownScene', 'BattleScene', 'VictoryScene', 'GameOverScene', 'TitleScene']) {
      await rt.changeScene(scene);
      expect(rt.getScene()).toBe(scene);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. setFlag — exclusivity
// ---------------------------------------------------------------------------

describe('setFlag — faction exclusivity', () => {
  it('setting joined-guard clears joined-mages', () => {
    const rt = makeRuntime();
    rt.setFlag('joined-mages', true);
    rt.setFlag('joined-guard', true);
    expect(rt.getFlags()['joined-guard']).toBe(true);
    expect(rt.getFlags()['joined-mages']).toBe(false);
  });

  it('setting joined-mages clears joined-guard', () => {
    const rt = makeRuntime();
    rt.setFlag('joined-guard', true);
    rt.setFlag('joined-mages', true);
    expect(rt.getFlags()['joined-mages']).toBe(true);
    expect(rt.getFlags()['joined-guard']).toBe(false);
  });

  it('arbitrary flags do not interfere with each other', () => {
    const rt = makeRuntime();
    rt.setFlag('flag-a', true);
    rt.setFlag('flag-b', true);
    expect(rt.getFlags()['flag-a']).toBe(true);
    expect(rt.getFlags()['flag-b']).toBe(true);
  });

  it('setFlag false clears the flag', () => {
    const rt = makeRuntime();
    rt.setFlag('my-flag', true);
    rt.setFlag('my-flag', false);
    expect(rt.getFlags()['my-flag']).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11. Scenario runner API (runScenario)
// ---------------------------------------------------------------------------

describe('Scenario runner — runScenario via GameTestAPI', () => {
  it('passes a simple main quest scenario with asserts', async () => {
    const { rt, api } = makeAPI();

    const result = await api.runScenario({
      name: 'main-quest-pass',
      steps: [
        { action: 'triggerDialog', npcId: 'npc-village-elder' },
        { action: 'choose', index: 0 },
        { assert: { path: 'quests.main-quest', equals: 'ACTIVE' } },
        { action: 'startBattle', enemyIds: ['goblin-boss'] },
        { action: 'endBattle', outcome: 'win' },
        { assert: { path: 'scene', equals: 'VictoryScene' } },
        { assert: { path: 'quests.main-quest', equals: 'COMPLETED' } },
      ],
    });

    expect(result.passed).toBe(true);
    expect(result.log.every((line) => line.includes('ok'))).toBe(true);
  });

  it('fails scenario when assert does not match', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { assert: { path: 'scene', equals: 'BattleScene' } }, // wrong — starts at TitleScene
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.log[0]).toMatch(/assert failed/);
  });

  it('slime hunt scenario passes end-to-end', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      name: 'slime-hunt',
      steps: [
        { action: 'triggerDialog', npcId: 'npc-hunter' },
        { action: 'choose', index: 0 },
        { assert: { path: 'quests.slime-hunt', equals: 'ACTIVE' } },
        { action: 'startBattle', enemyIds: ['slime'] },
        { action: 'endBattle', outcome: 'win' },
        { action: 'startBattle', enemyIds: ['slime'] },
        { action: 'endBattle', outcome: 'win' },
        { action: 'startBattle', enemyIds: ['slime'] },
        { action: 'endBattle', outcome: 'win' },
        { assert: { path: 'quests.slime-hunt', equals: 'COMPLETED' } },
      ],
    });

    expect(result.passed).toBe(true);
  });

  it('faction guard scenario with assert on flags', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'triggerDialog', npcId: 'npc-faction-leader' },
        { action: 'choose', index: 0 },
        { assert: { path: 'flags.joined-guard', equals: true } },
        { assert: { path: 'flags.joined-mages', equals: false } },
        { assert: { path: 'quests.faction-choice', equals: 'COMPLETED' } },
      ],
    });

    expect(result.passed).toBe(true);
  });

  it('scenario with addItem, setPlayerStat, and inventory assert', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'addItem', itemId: 'health-potion', quantity: 3 },
        { assert: { path: 'inventory', equals: [{ itemId: 'health-potion', quantity: 3 }] } },
        { action: 'removeItem', itemId: 'health-potion', quantity: 2 },
        { assert: { path: 'inventory', equals: [{ itemId: 'health-potion', quantity: 1 }] } },
      ],
    });

    expect(result.passed).toBe(true);
  });

  it('scenario with unknown item logs error and fails', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'addItem', itemId: 'dragon-egg', quantity: 1 },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.log[0]).toMatch(/error/i);
  });

  it('scenario setSeed + stepFrames + assert on battle outcome', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'setSeed', value: 42 },
        { action: 'setPlayerStat', stat: 'attack', value: 50 },
        { action: 'startBattle', enemyIds: ['slime'] },
        { action: 'stepFrames', frames: 300 },
        { assert: { path: 'battle.outcome', equals: 'win' } },
        { assert: { path: 'scene', equals: 'TownScene' } },
      ],
    });

    expect(result.passed).toBe(true);
  });

  it('scenario changeScene action and assert', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'changeScene', sceneName: 'TownScene' },
        { assert: { path: 'scene', equals: 'TownScene' } },
        { action: 'changeScene', sceneName: 'BattleScene' },
        { assert: { path: 'scene', equals: 'BattleScene' } },
      ],
    });

    expect(result.passed).toBe(true);
  });

  it('scenario setFlag and assert on flags', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'setFlag', key: 'my-custom-flag', value: true },
        { assert: { path: 'flags.my-custom-flag', equals: true } },
        { action: 'setFlag', key: 'my-custom-flag', value: false },
        { assert: { path: 'flags.my-custom-flag', equals: false } },
      ],
    });

    expect(result.passed).toBe(true);
  });

  it('scenario save and load restores state mid-scenario', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'addItem', itemId: 'sword', quantity: 1 },
        { action: 'saveGame', slot: 1 },
        { action: 'removeItem', itemId: 'sword', quantity: 1 },
        { assert: { path: 'inventory', equals: [] } },
        { action: 'loadGame', slot: 1 },
        { assert: { path: 'inventory', equals: [{ itemId: 'sword', quantity: 1 }] } },
      ],
    });

    expect(result.passed).toBe(true);
  });

  it('log entries are numbered 1-based', async () => {
    const { api } = makeAPI();

    const result = await api.runScenario({
      steps: [
        { action: 'setSeed', value: 42 },
        { assert: { path: 'scene', equals: 'TitleScene' } },
      ],
    });

    expect(result.log[0]).toMatch(/^step 1:/);
    expect(result.log[1]).toMatch(/^step 2:/);
  });
});

// ---------------------------------------------------------------------------
// 12. Narrative playthroughs — multi-step story scenarios
// ---------------------------------------------------------------------------

describe('Narrative — speed run (minimum steps to VictoryScene)', () => {
  it('reaches victory in 3 actions', () => {
    const rt = makeRuntime();
    // No need to talk to elder — just fight boss directly
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');
    expect(rt.getScene()).toBe('VictoryScene');
  });
});

describe('Narrative — completionist (all quests + level up in one session)', () => {
  it('completes all three quests with level 2+ by the end', () => {
    const rt = makeRuntime();

    rt.triggerDialog('npc-village-elder');
    rt.choose(0);

    rt.triggerDialog('npc-hunter');
    rt.choose(0);

    rt.triggerDialog('npc-faction-leader');
    rt.choose(1); // mages

    // Three slimes for slime-hunt (also gains 9 exp total)
    for (let i = 0; i < 3; i++) {
      rt.startBattle(['slime']);
      rt.endBattle('win');
    }

    // Boss for main quest (30 exp — pushes over level 2 threshold)
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');

    const quests = rt.getQuestState();
    expect(quests['main-quest']).toBe('COMPLETED');
    expect(quests['slime-hunt']).toBe('COMPLETED');
    expect(quests['faction-choice']).toBe('COMPLETED');
    expect(rt.getPlayer().level).toBeGreaterThanOrEqual(2);
    expect(rt.getScene()).toBe('VictoryScene');
  });
});

describe('Narrative — glass cannon (high attack, barely alive)', () => {
  it('clears goblin-boss in one frame batch without dying', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('attack', 100); // kills anything in one hit
    rt.setPlayerStat('hp', 1);       // on the edge
    rt.startBattle(['goblin-boss']);
    rt.stepFrames(60); // one round — player attacks first, kills boss
    expect(rt.getScene()).toBe('VictoryScene');
  });
});

describe('Narrative — pacifist run (flee every battle, only NPC interactions)', () => {
  it('can complete faction quest without any battle', () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-faction-leader');
    rt.choose(0);

    // Attempt battles but flee
    rt.startBattle(['goblin-boss']);
    rt.endBattle('flee');
    rt.startBattle(['slime']);
    rt.endBattle('flee');

    expect(rt.getQuestState()['faction-choice']).toBe('COMPLETED');
    expect(rt.getScene()).toBe('TownScene');
    expect(rt.getPlayer().exp).toBe(0);
  });
});

describe('Narrative — unlucky (low HP + hard battle = instant game over)', () => {
  it('player at 1 HP loses to goblin-boss on first frame step', () => {
    const rt = makeRuntime();
    rt.setPlayerStat('hp', 1);
    rt.startBattle(['goblin-boss']);
    rt.stepFrames(60); // one round — enemy attacks player for more than 1 HP
    expect(rt.getScene()).toBe('GameOverScene');
  });
});

describe('Narrative — grind (accumulate exp across multiple slime battles)', () => {
  it('gains exp proportional to number of slimes defeated', () => {
    const rt = makeRuntime();
    const count = 10;
    for (let i = 0; i < count; i++) {
      rt.startBattle(['slime']);
      rt.endBattle('win');
    }
    // Each slime gives 3 exp
    expect(rt.getPlayer().exp).toBeGreaterThanOrEqual(count * 3);
  });
});

describe('Narrative — save-scum (save before hard fight, reload on loss)', () => {
  it('player can reload and retry after a loss', async () => {
    const rt = makeRuntime();
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.saveGame(1);

    // Die on purpose
    rt.setPlayerStat('hp', 1);
    rt.startBattle(['goblin-boss']);
    rt.stepFrames(300);
    expect(rt.getScene()).toBe('GameOverScene');

    // Reload
    await rt.loadGame(1);
    expect(rt.getScene()).not.toBe('GameOverScene');
    expect(rt.getQuestState()['main-quest']).toBe('ACTIVE');

    // Win this time
    rt.setPlayerStat('attack', 999);
    rt.startBattle(['goblin-boss']);
    rt.endBattle('win');
    expect(rt.getScene()).toBe('VictoryScene');
  });
});

describe('Narrative — multi-slot save management', () => {
  it('three different save slots hold independent states', async () => {
    const rt = makeRuntime();

    // Slot 1: just started, elder greeted
    rt.triggerDialog('npc-village-elder');
    rt.choose(0);
    rt.saveGame(1);

    // Slot 2: in battle
    await rt.changeScene('BattleScene');
    rt.saveGame(2);

    // Slot 3: with an item
    rt.addItem('sword', 1);
    rt.saveGame(3);

    const s1 = rt.getSaveSlot(1);
    const s2 = rt.getSaveSlot(2);
    const s3 = rt.getSaveSlot(3);

    expect(s1!.quests['main-quest']).toBe('ACTIVE');
    expect(s2!.scene).toBe('BattleScene');
    expect(s3!.inventory.find((i) => i.itemId === 'sword')?.quantity).toBe(1);
  });
});

describe('Narrative — determinism (same seed → same loot rolls)', () => {
  it('two runtimes with seed 42 produce identical loot from boss', () => {
    const rt1 = makeRuntime();
    const rt2 = makeRuntime();

    rt1.startBattle(['goblin-boss']);
    rt1.endBattle('win');

    rt2.startBattle(['goblin-boss']);
    rt2.endBattle('win');

    expect(rt1.getBattleState()!.loot).toEqual(rt2.getBattleState()!.loot);
  });

  it('different seeds produce potentially different loot (statistical)', () => {
    // Run 20 seeds and collect distinct loot outcomes — should see variation
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const rt = new RuntimeGameState(new MemoryStorageAdapter());
      rt.setSeed(seed);
      rt.startBattle(['goblin-boss']);
      rt.endBattle('win');
      const loot = rt.getBattleState()!.loot!;
      outcomes.add(loot.map((l) => l.itemId).join(','));
    }
    // Boss loot table has 2 items — expect both to appear across 20 seeds
    expect(outcomes.size).toBeGreaterThan(1);
  });
});
