import { describe, expect, it } from 'vitest';

import { GameLoopModel } from '../GameLoopModel';

function inTown(): GameLoopModel {
  const model = new GameLoopModel();
  model.enterTownFromTitle();
  return model;
}

function inBattle(): GameLoopModel {
  const model = inTown();
  model.startBattle();
  return model;
}

describe('GameLoopModel — initial state', () => {
  it('starts in TitleScene', () => {
    const model = new GameLoopModel();
    expect(model.getState().scene).toBe('TitleScene');
  });

  it('returns a deep copy from getState so mutations do not leak', () => {
    const model = new GameLoopModel();
    const state = model.getState();
    state.scene = 'BattleScene';
    expect(model.getState().scene).toBe('TitleScene');
  });

  it('starts with dialog closed and faction none', () => {
    const model = new GameLoopModel();
    const { dialog, faction } = model.getState();
    expect(dialog.open).toBe(false);
    expect(dialog.npcId).toBeNull();
    expect(faction).toBe('none');
  });
});

describe('GameLoopModel — scene transitions', () => {
  it('enters TownScene from TitleScene', () => {
    const model = new GameLoopModel();
    model.enterTownFromTitle();
    expect(model.getState().scene).toBe('TownScene');
  });

  it('enterTownFromTitle is a no-op when not in TitleScene', () => {
    const model = inTown();
    model.enterTownFromTitle();
    expect(model.getState().scene).toBe('TownScene');
  });

  it('startBattle transitions TownScene → BattleScene', () => {
    const model = inTown();
    model.startBattle();
    expect(model.getState().scene).toBe('BattleScene');
  });

  it('startBattle is a no-op when not in TownScene', () => {
    const model = new GameLoopModel();
    model.startBattle();
    expect(model.getState().scene).toBe('TitleScene');
  });

  it('resolveBattle win → VictoryScene', () => {
    const model = inBattle();
    model.resolveBattle('win');
    expect(model.getState().scene).toBe('VictoryScene');
  });

  it('resolveBattle lose → GameOverScene', () => {
    const model = inBattle();
    model.resolveBattle('lose');
    expect(model.getState().scene).toBe('GameOverScene');
  });

  it('resolveBattle flee → TownScene', () => {
    const model = inBattle();
    model.resolveBattle('flee');
    expect(model.getState().scene).toBe('TownScene');
  });

  it('resolveBattle is a no-op when not in BattleScene', () => {
    const model = inTown();
    model.resolveBattle('win');
    expect(model.getState().scene).toBe('TownScene');
  });
});

describe('GameLoopModel — player movement', () => {
  it('moves right', () => {
    const model = inTown();
    const before = model.getState().player.x;
    model.update({ left: false, right: true, up: false, down: false }, 1000);
    expect(model.getState().player.x).toBeGreaterThan(before);
  });

  it('moves left', () => {
    const model = inTown();
    // push player away from left edge first
    model.update({ left: false, right: true, up: false, down: false }, 500);
    const before = model.getState().player.x;
    model.update({ left: true, right: false, up: false, down: false }, 100);
    expect(model.getState().player.x).toBeLessThan(before);
  });

  it('moves down', () => {
    const model = inTown();
    const before = model.getState().player.y;
    model.update({ left: false, right: false, up: false, down: true }, 1000);
    expect(model.getState().player.y).toBeGreaterThan(before);
  });

  it('moves up', () => {
    const model = inTown();
    model.update({ left: false, right: false, up: false, down: true }, 500);
    const before = model.getState().player.y;
    model.update({ left: false, right: false, up: true, down: false }, 100);
    expect(model.getState().player.y).toBeLessThan(before);
  });

  it('clamps player to right world boundary', () => {
    const model = inTown();
    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: true, up: false, down: false }, 100);
    }
    const { player, world } = model.getState();
    expect(player.x).toBe(world.width - player.width);
  });

  it('player is stopped by elder-hall building before reaching left world boundary', () => {
    const model = inTown();
    for (let i = 0; i < 100; i++) {
      model.update({ left: true, right: false, up: false, down: false }, 100);
    }
    // Elder-hall zone covers x=32..128; player starts at x=128 and cannot move left into it
    expect(model.getState().player.x).toBe(128);
  });

  it('player is stopped by river zone before reaching bottom world boundary', () => {
    const model = inTown();
    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: false, up: false, down: true }, 100);
    }
    const { player } = model.getState();
    // River zone starts at y=262; player (height=16) cannot cross it
    expect(player.y).toBeLessThan(262);
    expect(player.y).toBeGreaterThan(200);
  });

  it('clamps player to top world boundary', () => {
    const model = inTown();
    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: false, up: true, down: false }, 100);
    }
    expect(model.getState().player.y).toBe(0);
  });

  it('update is a no-op outside TownScene', () => {
    const model = new GameLoopModel();
    const before = model.getState().player;
    model.update({ left: true, right: true, up: true, down: true }, 1000);
    expect(model.getState().player).toEqual(before);
  });

  it('update is a no-op while dialog is open', () => {
    const model = inTown();
    model.interact(); // opens faction-leader dialog (player starts near NPC)
    const before = model.getState().player;
    model.update({ left: true, right: false, up: false, down: false }, 1000);
    expect(model.getState().player).toEqual(before);
  });
});

describe('GameLoopModel — NPC proximity', () => {
  it('detects faction-leader when player is at default position', () => {
    const model = inTown();
    expect(model.getNearbyNpcId()).toBe('faction-leader');
  });

  it('returns null when player is far from all NPCs', () => {
    const model = inTown();
    // Move up first to clear elder-hall zone, then move right far from NPCs
    for (let i = 0; i < 20; i++) {
      model.update({ left: false, right: false, up: true, down: false }, 100);
    }
    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: true, up: false, down: false }, 100);
    }
    expect(model.getNearbyNpcId()).toBeNull();
  });

  it('returns null when not in TownScene', () => {
    const model = new GameLoopModel();
    expect(model.getNearbyNpcId()).toBeNull();
  });
});

describe('GameLoopModel — dialog and faction', () => {
  it('interact opens dialog when near NPC', () => {
    const model = inTown();
    model.interact();
    const { dialog } = model.getState();
    expect(dialog.open).toBe(true);
    expect(dialog.npcId).toBe('faction-leader');
    expect(dialog.text).toBe('Choose your faction:');
    expect(dialog.choices).toHaveLength(2);
  });

  it('interact is a no-op when not in TownScene', () => {
    const model = new GameLoopModel();
    model.interact();
    expect(model.getState().dialog.open).toBe(false);
  });

  it('interact is a no-op when dialog already open', () => {
    const model = inTown();
    model.interact();
    const textBefore = model.getState().dialog.text;
    model.interact();
    expect(model.getState().dialog.text).toBe(textBefore);
  });

  it('interact is a no-op when no NPC nearby', () => {
    const model = inTown();
    // Move up first to clear elder-hall zone, then move right far from NPCs
    for (let i = 0; i < 20; i++) {
      model.update({ left: false, right: false, up: true, down: false }, 100);
    }
    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: true, up: false, down: false }, 100);
    }
    model.interact();
    expect(model.getState().dialog.open).toBe(false);
  });

  it('selectDialogChoice 0 joins the Guard and closes dialog', () => {
    const model = inTown();
    model.interact();
    model.selectDialogChoice(0);
    expect(model.getState().faction).toBe('guard');
    expect(model.getState().dialog.open).toBe(false);
    expect(model.getState().dialog.npcId).toBeNull();
  });

  it('selectDialogChoice 1 joins the Mages and closes dialog', () => {
    const model = inTown();
    model.interact();
    model.selectDialogChoice(1);
    expect(model.getState().faction).toBe('mages');
    expect(model.getState().dialog.open).toBe(false);
  });

  it('selectDialogChoice is a no-op when dialog is closed', () => {
    const model = inTown();
    model.selectDialogChoice(0);
    expect(model.getState().faction).toBe('none');
  });
});
