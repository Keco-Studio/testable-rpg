import { expect, test } from '@playwright/test';

test.describe('Playable loop', () => {
  test('title to town movement and battle flow via keyboard', async ({ page }) => {
    await page.goto('http://localhost:5173?seed=42&testMode=true');

    const hud = page.locator('#hud');
    await expect(hud).toContainText('Scene: TitleScene');

    await page.keyboard.press('Enter');
    await expect(hud).toContainText('Scene: TownScene');

    const before = await hud.textContent();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');

    const afterMove = await hud.textContent();
    expect(afterMove).not.toEqual(before);

    await page.keyboard.press('b');
    await expect(hud).toContainText('Scene: BattleScene');

    await page.keyboard.press('w');
    await expect(hud).toContainText('Scene: VictoryScene');
  });
});
