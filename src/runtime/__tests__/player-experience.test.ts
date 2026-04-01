/**
 * PLAYER EXPERIENCE CONTRACT TESTS
 *
 * End-to-end scenarios verifying the actual player journey
 * through the game. Each test maps to a contract item in
 * contracts/player-experience.contract.md.
 */

import { describe, expect, it } from 'vitest';

import { MemoryStorageAdapter } from '../../engine/save/SaveSystem';
import { RuntimeGameState } from '../GameRuntime';

function rt(): RuntimeGameState {
  const r = new RuntimeGameState(new MemoryStorageAdapter());
  r.setSeed(42);
  return r;
}

describe('Player Experience Contracts', () => {
  it('new game → talk to Elder → accept main quest', () => {
    const game = rt();

    // Player starts in default state
    expect(game.getScene()).toBe('TitleScene');
    expect(game.getQuestState()['main-quest']).toBe('INACTIVE');

    // Talk to Elder, accept quest
    game.triggerDialog('npc-village-elder');
    game.choose(0);

    expect(game.getQuestState()['main-quest']).toBe('ACTIVE');
    expect(game.getFlags()['elder-greeted']).toBe(true);
  });

  it('accept quest → fight goblin boss → win → quest completes', () => {
    const game = rt();

    // Accept main quest
    game.triggerDialog('npc-village-elder');
    game.choose(0);
    expect(game.getQuestState()['main-quest']).toBe('ACTIVE');

    // Fight and defeat the boss
    game.startBattle(['goblin-boss']);
    game.endBattle('win');

    expect(game.getQuestState()['main-quest']).toBe('COMPLETED');
    expect(game.getScene()).toBe('VictoryScene');
  });

  it('choose guard faction → guard content available, mage locked', () => {
    const game = rt();

    // Choose guard faction
    game.triggerDialog('npc-faction-leader');
    game.choose(0); // "With the Iron Guard"

    expect(game.getFlags()['joined-guard']).toBe(true);
    expect(game.getFlags()['joined-mages']).toBe(false);
    expect(game.getQuestState()['faction-choice']).toBe('COMPLETED');
  });

  it('choose mage faction → mage content available, guard locked', () => {
    const game = rt();

    // Choose mages faction
    game.triggerDialog('npc-faction-leader');
    game.choose(1); // "With the Veil Mages"

    expect(game.getFlags()['joined-mages']).toBe(true);
    expect(game.getFlags()['joined-guard']).toBe(false);
    expect(game.getQuestState()['faction-choice']).toBe('COMPLETED');
  });

  it('win battle → gain EXP → level up → stats increase', () => {
    const game = rt();
    const before = game.getPlayer();

    // Grind enough battles to level up
    for (let i = 0; i < 10; i++) {
      game.startBattle(['slime']);
      game.endBattle('win');
    }

    const after = game.getPlayer();
    expect(after.exp).toBeGreaterThan(before.exp);
    expect(after.level).toBeGreaterThan(before.level);
    expect(after.maxHp).toBeGreaterThan(before.maxHp);
    expect(after.attack).toBeGreaterThan(before.attack);
  });

  it('win battle → receive loot → appears in inventory', () => {
    const game = rt();
    const inventoryBefore = game.getInventory();

    game.startBattle(['goblin-boss']);
    game.endBattle('win');

    const battle = game.getBattleState();
    expect(battle?.loot?.length).toBeGreaterThan(0);

    const inventoryAfter = game.getInventory();
    expect(inventoryAfter.length).toBeGreaterThan(inventoryBefore.length);
  });

  it('die in battle → game over → can restart', () => {
    const game = rt();

    // Weaken player so they lose
    game.setPlayerStat('hp', 1);
    game.setPlayerStat('defense', 0);
    game.startBattle(['goblin-boss']);
    game.stepFrames(300);

    expect(game.getScene()).toBe('GameOverScene');
    expect(game.getBattleState()?.outcome).toBe('lose');
  });
});
