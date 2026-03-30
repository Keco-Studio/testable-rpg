import { test, expect } from '@playwright/test';

test('basic AI-controllable playthrough', async ({ page }) => {
  await page.goto('http://localhost:5173?seed=42&testMode=true');
  await page.waitForFunction(() => typeof window.__game !== 'undefined');

  await page.evaluate(async () => {
    await window.__game!.changeScene('TownScene');
    await window.__game!.teleport(240, 180, 'starting-village');
    window.__game!.triggerDialog('npc-village-elder');
    window.__game!.choose(0);
    window.__game!.addItem('sword', 1);
    window.__game!.startBattle(['goblin-boss']);
    window.__game!.endBattle('win');
  });

  const summary = await page.evaluate(() => ({
    scene: window.__game!.getScene(),
    quest: window.__game!.getQuestLog()['main-quest'],
    hasSword: (window.__game!.getInventory().find((i) => i.itemId === 'sword')?.quantity ?? 0) > 0,
  }));

  expect(summary.quest).toBe('ACTIVE');
  expect(summary.hasSword).toBe(true);
  expect(summary.scene).toBe('VictoryScene');
});
