import { describe, expect, it } from 'vitest';

import { DialogSystem } from '../DialogSystem';

const context = {
  level: 3,
  inventory: { key: 1 },
  quests: { q1: 'ACTIVE' },
  flags: { greeted: false },
};

describe('DialogSystem', () => {
  it('filters choices by conditions and returns runtime node', () => {
    const system = new DialogSystem();
    system.registerTree({
      npcId: 'elder',
      rootNodeId: 'root',
      nodes: [
        {
          id: 'root',
          text: 'Hello',
          choices: [
            { text: 'Open gate', nextNodeId: 'gate', conditions: { hasItem: 'key' } },
            { text: 'High level', nextNodeId: 'elite', conditions: { minLevel: 5 } },
          ],
        },
        { id: 'gate', text: 'Gate opened', choices: [] },
        { id: 'elite', text: 'Elite path', choices: [] },
      ],
    });

    const runtime = system.triggerDialog('elder', context);
    expect(runtime?.choices).toEqual([{ index: 0, text: 'Open gate' }]);
  });

  it('applies actions from selected choice and advances node', () => {
    const system = new DialogSystem();
    system.registerTree({
      npcId: 'elder',
      rootNodeId: 'root',
      nodes: [
        {
          id: 'root',
          text: 'Choose',
          choices: [
            {
              text: 'Accept quest',
              nextNodeId: 'end',
              actions: {
                activateQuest: 'main-quest',
                giveItem: { itemId: 'potion', quantity: 2 },
                setFlag: { key: 'greeted', value: true },
              },
            },
          ],
        },
        { id: 'end', text: 'Done', choices: [] },
      ],
    });

    const result = system.choose('elder', 'root', 0, context);
    expect(result.next?.nodeId).toBe('end');
    expect(result.mutations).toEqual({
      addItems: [{ itemId: 'potion', quantity: 2 }],
      activateQuests: ['main-quest'],
      flags: [{ key: 'greeted', value: true }],
    });
  });
});
