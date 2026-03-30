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

  expect(summary.quest).toBe('COMPLETED');
  expect(summary.hasSword).toBe(true);
  expect(summary.scene).toBe('VictoryScene');
});

test('faction guard branch persists through save/load', async ({ page }) => {
  await page.goto('http://localhost:5173?seed=42&testMode=true');
  await page.waitForFunction(() => typeof window.__game !== 'undefined');

  await page.evaluate(async () => {
    window.__game!.triggerDialog('npc-faction-leader');
    window.__game!.choose(0);
    window.__game!.saveGame(1);
    window.__game!.triggerDialog('npc-faction-leader');
    window.__game!.choose(1);
    await window.__game!.loadGame(1);
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
