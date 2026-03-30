import { describe, expect, it } from 'vitest';

import {
  createGameTestAPI,
  createInMemoryAdapter,
  installGameTestAPI,
  type TestScenario,
} from '../GameTestAPI';

describe('GameTestAPI exposure', () => {
  it('installs window.__game in non-production mode', () => {
    delete window.__game;
    installGameTestAPI('test', createInMemoryAdapter());
    const api = (window as unknown as { __game?: { getScene: () => string } }).__game;
    expect(api).toBeDefined();
    expect(api?.getScene()).toBe('TitleScene');
  });

  it('does not install window.__game in production mode', () => {
    delete window.__game;
    installGameTestAPI('production', createInMemoryAdapter());
    expect(window.__game).toBeUndefined();
  });
});

describe('GameTestAPI read and control operations', () => {
  it('teleport updates player position immediately', async () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    await api.teleport(100, 200, 'forest');
    expect({ x: api.getPlayer().x, y: api.getPlayer().y }).toEqual({ x: 100, y: 200 });
    expect(api.getMapPosition().map).toBe('forest');
  });

  it('setHP clamps and updates player hp', () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    api.setHP(999);
    expect(api.getPlayer().hp).toBe(api.getPlayer().maxHp);
    api.setHP(0);
    expect(api.getPlayer().hp).toBe(0);
  });

  it('addItem unknown id returns error result', () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    const result = api.addItem('unknown-item', 1);
    expect(result.ok).toBe(false);
  });

  it('changeScene unknown scene returns error result', async () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    const result = await api.changeScene('NopeScene');
    expect(result.ok).toBe(false);
  });

  it('saveGame and loadGame restore state from slot', async () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    await api.teleport(3, 4, 'town');
    api.addItem('sword', 2);
    api.activateQuest('q-main');
    api.setFlag('gate-open', true);
    api.saveGame(1);

    await api.teleport(99, 99, 'castle');
    api.removeItem('sword', 1);
    api.completeQuest('q-main');
    api.setFlag('gate-open', false);

    await api.loadGame(1);

    expect(api.getMapPosition()).toEqual({ map: 'town', x: 3, y: 4 });
    expect(api.getInventory()).toEqual([{ itemId: 'sword', quantity: 2 }]);
    expect(api.getQuestLog()['q-main']).toBe('ACTIVE');
    expect(api.getFlags()['gate-open']).toBe(true);
  });

  it('startBattle/endBattle and dialog methods update readable state', () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    api.startBattle(['slime', 'bat']);
    expect(api.getBattleState()).toEqual({ active: true, enemies: ['slime', 'bat'], outcome: null });

    api.endBattle('win');
    expect(api.getBattleState()).toEqual({ active: false, enemies: ['slime', 'bat'], outcome: 'win' });

    api.triggerDialog('npc-1');
    expect(api.getDialogState()).toEqual({ npcId: 'npc-1', node: 'root' });
    api.choose(2);
    expect(api.getDialogState()).toEqual({ npcId: 'npc-1', node: 'root', choice: 2 });
    api.skipDialog();
    expect(api.getDialogState()).toBeNull();
  });
});

describe('GameTestAPI scenario runner', () => {
  it('executes valid scenario and returns passed true', async () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    const scenario: TestScenario = {
      steps: [
        { action: 'setSeed', value: 42 },
        { action: 'addItem', itemId: 'sword' },
        { action: 'teleport', x: 50, y: 50 },
        { assert: { path: 'player.x', equals: 50 } },
      ],
    };

    const result = await api.runScenario(scenario);
    expect(result.passed).toBe(true);
  });

  it('captures assertion failure and returns passed false', async () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    const scenario: TestScenario = {
      steps: [{ assert: { path: 'player.x', equals: 999 } }],
    };

    const result = await api.runScenario(scenario);
    expect(result.passed).toBe(false);
    expect(result.log[0]).toContain('assert failed');
  });

  it('captures invalid step errors and does not throw', async () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    const scenario: TestScenario = {
      steps: [{ action: 'changeScene', sceneName: 'BadScene' }],
    };

    await expect(api.runScenario(scenario)).resolves.toEqual(
      expect.objectContaining({ passed: false }),
    );
  });

  it('runScenarioFile executes scenario arrays fetched by URL', async () => {
    const api = createGameTestAPI(createInMemoryAdapter());
    const scenarios: TestScenario[] = [
      { steps: [{ action: 'setFlag', key: 'a', value: true }, { assert: { path: 'flags.a', equals: true } }] },
      { steps: [{ action: 'activateQuest', questId: 'quest-1' }, { assert: { path: 'quests.quest-1', equals: 'ACTIVE' } }] },
    ];

    const encoded = encodeURIComponent(JSON.stringify(scenarios));
    const url = `data:application/json,${encoded}`;
    const results = await api.runScenarioFile(url);

    expect(results).toHaveLength(2);
    expect(results.every((entry) => entry.passed)).toBe(true);
  });
});
