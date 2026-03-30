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

    const scene = await page.evaluate(() => window.__game!.getScene());
    expect(scene).toBe('VictoryScene');
  });
});
