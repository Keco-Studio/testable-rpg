import { describe, expect, it } from 'vitest';

import { GameLoopModel } from '../GameLoopModel';

describe('GameLoopModel', () => {
  it('starts in TitleScene', () => {
    const model = new GameLoopModel();
    expect(model.getState().scene).toBe('TitleScene');
  });

  it('enters TownScene from title on start', () => {
    const model = new GameLoopModel();
    model.enterTownFromTitle();
    expect(model.getState().scene).toBe('TownScene');
  });

  it('moves player in town and clamps world bounds', () => {
    const model = new GameLoopModel();
    model.enterTownFromTitle();

    const before = model.getState().player;
    model.update({ left: false, right: true, up: false, down: false }, 1000);
    const moved = model.getState().player;
    expect(moved.x).toBeGreaterThan(before.x);

    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: true, up: false, down: false }, 100);
    }
    const clamped = model.getState();
    expect(clamped.player.x).toBeLessThanOrEqual(clamped.world.width - clamped.player.width);
  });

  it('resolves battle outcomes to scenes', () => {
    const model = new GameLoopModel();
    model.enterTownFromTitle();
    model.startBattle();
    model.resolveBattle('win');
    expect(model.getState().scene).toBe('VictoryScene');

    const model2 = new GameLoopModel();
    model2.enterTownFromTitle();
    model2.startBattle();
    model2.resolveBattle('lose');
    expect(model2.getState().scene).toBe('GameOverScene');
  });

  it('opens dialog when interacting near npc and resolves faction choice', () => {
    const model = new GameLoopModel();
    model.enterTownFromTitle();

    expect(model.getNearbyNpcId()).toBe('faction-leader');
    model.interact();
    expect(model.getState().dialog.open).toBe(true);

    model.selectDialogChoice(1);
    expect(model.getState().dialog.open).toBe(false);
    expect(model.getState().faction).toBe('mages');
  });
});
