import { describe, expect, it } from 'vitest';

import { DialogSystem } from '../DialogSystem';
import dialogData from '../../../data/dialog.json';

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

  it('multi-node traversal reaches correct end node', () => {
    const system = new DialogSystem();
    system.registerTree({
      npcId: 'guide',
      rootNodeId: 'start',
      nodes: [
        { id: 'start', text: 'Welcome', choices: [{ text: 'Continue', nextNodeId: 'middle' }] },
        { id: 'middle', text: 'Almost there', choices: [{ text: 'Finish', nextNodeId: 'end' }] },
        { id: 'end', text: 'Goodbye', choices: [] },
      ],
    });

    const context = { level: 1, inventory: {}, quests: {}, flags: {} };

    const root = system.triggerDialog('guide', context);
    expect(root?.nodeId).toBe('start');
    expect(root?.choices).toHaveLength(1);

    const step1 = system.choose('guide', 'start', 0, context);
    expect(step1.next?.nodeId).toBe('middle');
    expect(step1.next?.text).toBe('Almost there');

    const step2 = system.choose('guide', 'middle', 0, context);
    expect(step2.next?.nodeId).toBe('end');
    expect(step2.next?.text).toBe('Goodbye');
    expect(step2.next?.choices).toHaveLength(0);
  });

  it('condition combinations require ALL conditions to pass', () => {
    const system = new DialogSystem();
    system.registerTree({
      npcId: 'gatekeeper',
      rootNodeId: 'root',
      nodes: [
        {
          id: 'root',
          text: 'Halt!',
          choices: [
            {
              text: 'Enter (requires level 5 AND key)',
              nextNodeId: 'inside',
              conditions: { minLevel: 5, hasItem: 'key' },
            },
            {
              text: 'Leave',
              nextNodeId: 'outside',
            },
          ],
        },
        { id: 'inside', text: 'Welcome', choices: [] },
        { id: 'outside', text: 'Farewell', choices: [] },
      ],
    });

    // Has key but too low level — should NOT see "Enter"
    const lowLevel = { level: 3, inventory: { key: 1 }, quests: {}, flags: {} };
    const r1 = system.triggerDialog('gatekeeper', lowLevel);
    expect(r1?.choices).toEqual([{ index: 0, text: 'Leave' }]);

    // High level but no key — should NOT see "Enter"
    const noKey = { level: 5, inventory: {}, quests: {}, flags: {} };
    const r2 = system.triggerDialog('gatekeeper', noKey);
    expect(r2?.choices).toEqual([{ index: 0, text: 'Leave' }]);

    // Both conditions met — should see both choices
    const both = { level: 5, inventory: { key: 1 }, quests: {}, flags: {} };
    const r3 = system.triggerDialog('gatekeeper', both);
    expect(r3?.choices).toEqual([
      { index: 0, text: 'Enter (requires level 5 AND key)' },
      { index: 1, text: 'Leave' },
    ]);
  });

  it('invalid node reference returns null, does not crash', () => {
    const system = new DialogSystem();
    system.registerTree({
      npcId: 'broken',
      rootNodeId: 'root',
      nodes: [
        {
          id: 'root',
          text: 'Hello',
          choices: [{ text: 'Go nowhere', nextNodeId: 'nonexistent' }],
        },
      ],
    });

    const context = { level: 1, inventory: {}, quests: {}, flags: {} };
    const result = system.choose('broken', 'root', 0, context);
    expect(result.next).toBeNull();
    expect(result.mutations).toEqual({ addItems: [], activateQuests: [], flags: [] });
  });

  it('triggerDialog for unregistered NPC returns null', () => {
    const system = new DialogSystem();
    const context = { level: 1, inventory: {}, quests: {}, flags: {} };
    expect(system.triggerDialog('nobody', context)).toBeNull();
  });

  it('choose with out-of-bounds index returns null', () => {
    const system = new DialogSystem();
    system.registerTree({
      npcId: 'elder',
      rootNodeId: 'root',
      nodes: [
        { id: 'root', text: 'Hello', choices: [{ text: 'Hi', nextNodeId: 'end' }] },
        { id: 'end', text: 'Bye', choices: [] },
      ],
    });

    const context = { level: 1, inventory: {}, quests: {}, flags: {} };
    const result = system.choose('elder', 'root', 99, context);
    expect(result.next).toBeNull();
  });

  it('all NPC dialog trees from data file load and trigger without error', () => {
    const system = new DialogSystem();
    const context = { level: 1, inventory: {}, quests: {}, flags: {} };

    for (const tree of dialogData) {
      system.registerTree(tree);
      const runtime = system.triggerDialog(tree.npcId, context);
      expect(runtime).not.toBeNull();
      expect(runtime?.nodeId).toBe(tree.rootNodeId);
      expect(runtime?.text).toBe(
        tree.nodes.find((n) => n.id === tree.rootNodeId)?.text,
      );
    }
  });
});
