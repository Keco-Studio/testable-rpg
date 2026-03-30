import { test, expect } from '@playwright/test';

test.describe('Integration flows', () => {
  test('quest activation via dialog flow', async ({ page }) => {
    await page.goto('http://localhost:5173?seed=42&testMode=true');
    await page.waitForFunction(() => typeof window.__game !== 'undefined');

    await page.evaluate(() => {
      window.__game!.triggerDialog('npc-village-elder');
      window.__game!.choose(0);
    });

    const state = await page.evaluate(() => ({
      quest: window.__game!.getQuestLog()['main-quest'],
      flag: window.__game!.getFlags()['elder-greeted'],
    }));

    expect(state.quest).toBe('ACTIVE');
    expect(state.flag).toBe(true);
  });

  test('battle flow can reach victory scene', async ({ page }) => {
    await page.goto('http://localhost:5173?seed=42&testMode=true');
    await page.waitForFunction(() => typeof window.__game !== 'undefined');

    await page.evaluate(() => {
      window.__game!.startBattle(['goblin-boss']);
      window.__game!.endBattle('win');
    });

    const state = await page.evaluate(() => ({
      scene: window.__game!.getScene(),
      battle: window.__game!.getBattleState(),
      player: window.__game!.getPlayer(),
    }));

    expect((state.battle?.expGained ?? 0) > 0).toBe(true);
    expect((state.battle?.loot?.length ?? 0) > 0).toBe(true);
    expect(state.player.exp).toBeGreaterThan(0);
    expect(state.scene).toBe('VictoryScene');
  });

  test('side quest completes after hunter dialog and three slime wins', async ({ page }) => {
    await page.goto('http://localhost:5173?seed=42&testMode=true');
    await page.waitForFunction(() => typeof window.__game !== 'undefined');

    await page.evaluate(() => {
      window.__game!.triggerDialog('npc-hunter');
      window.__game!.choose(0);
      window.__game!.startBattle(['slime']);
      window.__game!.endBattle('win');
      window.__game!.startBattle(['slime']);
      window.__game!.endBattle('win');
      window.__game!.startBattle(['slime']);
      window.__game!.endBattle('win');
    });

    const state = await page.evaluate(() => ({
      quest: window.__game!.getQuestLog()['slime-hunt'],
      flag: window.__game!.getFlags()['hunter-greeted'],
    }));

    expect(state.flag).toBe(true);
    expect(state.quest).toBe('COMPLETED');
  });

  test('battle loss transitions scene and fails active quests', async ({ page }) => {
    await page.goto('http://localhost:5173?seed=42&testMode=true');
    await page.waitForFunction(() => typeof window.__game !== 'undefined');

    await page.evaluate(() => {
      window.__game!.triggerDialog('npc-village-elder');
      window.__game!.choose(0);
      window.__game!.startBattle(['slime']);
      window.__game!.endBattle('lose');
    });

    const state = await page.evaluate(() => ({
      scene: window.__game!.getScene(),
      quest: window.__game!.getQuestLog()['main-quest'],
    }));

    expect(state.scene).toBe('GameOverScene');
    expect(state.quest).toBe('FAILED');
  });

  test('faction branch dialog completes faction-choice quest', async ({ page }) => {
    await page.goto('http://localhost:5173?seed=42&testMode=true');
    await page.waitForFunction(() => typeof window.__game !== 'undefined');

    await page.evaluate(() => {
      window.__game!.triggerDialog('npc-faction-leader');
      window.__game!.choose(1);
    });

    const state = await page.evaluate(() => ({
      quest: window.__game!.getQuestLog()['faction-choice'],
      guard: window.__game!.getFlags()['joined-guard'],
      mages: window.__game!.getFlags()['joined-mages'],
    }));

    expect(state.quest).toBe('COMPLETED');
    expect(state.guard).toBe(false);
    expect(state.mages).toBe(true);
  });

  test('guard branch sets exclusive guard flag', async ({ page }) => {
    await page.goto('http://localhost:5173?seed=42&testMode=true');
    await page.waitForFunction(() => typeof window.__game !== 'undefined');

    await page.evaluate(() => {
      window.__game!.triggerDialog('npc-faction-leader');
      window.__game!.choose(0);
    });

    const state = await page.evaluate(() => ({
      quest: window.__game!.getQuestLog()['faction-choice'],
      guard: window.__game!.getFlags()['joined-guard'],
      mages: window.__game!.getFlags()['joined-mages'],
    }));

    expect(state.quest).toBe('COMPLETED');
    expect(state.guard).toBe(true);
    expect(state.mages).toBe(false);
  });
});
