import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  const snapshots = [
    {
      name: 'title-screen',
      setup: async (page: import('@playwright/test').Page) => {
        await page.evaluate(() => window.__game?.changeScene('TitleScene'));
      },
    },
    {
      name: 'battle-start-goblin',
      setup: async (page: import('@playwright/test').Page) => {
        await page.evaluate(async () => {
          await window.__game?.changeScene('BattleScene');
          window.__game?.startBattle(['goblin-basic']);
          window.__game?.stepFrames(2);
        });
      },
    },
    {
      name: 'inventory-with-items',
      setup: async (page: import('@playwright/test').Page) => {
        await page.evaluate(() => {
          window.__game?.addItem('health-potion', 3);
          window.__game?.addItem('sword', 1);
          window.__game?.addItem('shield', 1);
        });
      },
    },
  ];

  for (const snap of snapshots) {
    test(`matches snapshot: ${snap.name}`, async ({ page }) => {
      await page.goto('http://localhost:5173?seed=42&testMode=true');
      await page.waitForFunction(() => typeof window.__game !== 'undefined');
      await snap.setup(page);
      await expect(page).toHaveScreenshot(`${snap.name}.png`, { maxDiffPixelRatio: 0.01 });
    });
  }
});
