import { expect, test } from '@playwright/test';

test('complete storyline demo page shows all beats passing', async ({ page }) => {
  await page.goto('/storyline-demo.html');
  await page.getByRole('button', { name: 'Run Complete Storyline' }).click();

  await expect(page.locator('#status')).toContainText('Complete storyline passed');
  await expect(page.locator('#summary-value')).toContainText('4 / 4 passed');
  await expect(page.locator('.card.fail')).toHaveCount(0);
  await expect(page.locator('.card.pass')).toHaveCount(4);
});
