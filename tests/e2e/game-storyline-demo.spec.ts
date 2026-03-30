import { expect, test } from '@playwright/test';

test('src/game storyline demo page passes all beats', async ({ page }) => {
  await page.goto('/game-storyline-demo.html');
  await page.getByRole('button', { name: 'Run Storyline on Game Canvas' }).click();

  await expect(page.locator('#status')).toContainText('Complete storyline passed');
  await expect(page.locator('#summary-value')).toContainText('12 / 12 passed');
  await expect(page.locator('.card.fail')).toHaveCount(0);
  await expect(page.locator('.card.pass')).toHaveCount(12);
});
