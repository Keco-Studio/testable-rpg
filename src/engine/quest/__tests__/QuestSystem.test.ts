import { describe, expect, it } from 'vitest';

import { QuestSystem } from '../QuestSystem';
import type { QuestDefinition } from '../QuestTypes';

function quest(overrides: Partial<QuestDefinition> & { id: string }): QuestDefinition {
  return {
    id: overrides.id,
    title: overrides.title ?? overrides.id,
    prerequisites: overrides.prerequisites ?? [],
    objectives:
      overrides.objectives ?? [
        { id: `${overrides.id}-obj-1`, type: 'DEFEAT_ENEMY', required: 3, optional: false },
      ],
    paths: overrides.paths,
  };
}

describe('QuestSystem state machine', () => {
  it('newly registered quests start INACTIVE', () => {
    const system = new QuestSystem();
    system.registerQuest(quest({ id: 'q1' }));
    expect(system.getState('q1')).toBe('INACTIVE');
  });

  it('activate sets ACTIVE and emits quest:activated', () => {
    const system = new QuestSystem();
    const events: string[] = [];
    system.on('quest:activated', () => events.push('activated'));
    system.registerQuest(quest({ id: 'q1' }));

    const result = system.activate('q1');
    expect(result.ok).toBe(true);
    expect(system.getState('q1')).toBe('ACTIVE');
    expect(events).toEqual(['activated']);
  });

  it('fail sets FAILED and FAILED is terminal', () => {
    const system = new QuestSystem();
    system.registerQuest(quest({ id: 'q1' }));
    system.activate('q1');
    system.fail('q1');

    expect(system.getState('q1')).toBe('FAILED');
    const retry = system.activate('q1');
    expect(retry.ok).toBe(true);
    expect(system.getState('q1')).toBe('FAILED');
  });

  it('COMPLETED is terminal', () => {
    const system = new QuestSystem();
    system.registerQuest(quest({ id: 'q1' }));
    system.activate('q1');
    system.complete('q1');
    system.fail('q1');

    expect(system.getState('q1')).toBe('COMPLETED');
  });
});

describe('QuestSystem objective tracking', () => {
  it('progressObjective updates current and emits quest:progressed', () => {
    const system = new QuestSystem();
    const events: number[] = [];
    system.on('quest:progressed', (payload) => events.push(payload.current));

    system.registerQuest(
      quest({
        id: 'q1',
        objectives: [{ id: 'kill', type: 'DEFEAT_ENEMY', required: 3, optional: false }],
      }),
    );
    system.activate('q1');

    system.progressObjective('q1', 'kill', 2);
    expect(system.getRuntimeState('q1')?.objectiveProgress.kill).toBe(2);
    expect(events).toEqual([2]);
  });

  it('all required objectives met auto-completes quest', () => {
    const system = new QuestSystem();
    const completed: string[] = [];
    system.on('quest:completed', (payload) => completed.push(payload.questId));

    system.registerQuest(
      quest({
        id: 'q1',
        objectives: [{ id: 'kill', type: 'DEFEAT_ENEMY', required: 3, optional: false }],
      }),
    );
    system.activate('q1');

    system.progressObjective('q1', 'kill', 2);
    system.progressObjective('q1', 'kill', 1);

    expect(system.getState('q1')).toBe('COMPLETED');
    expect(completed).toEqual(['q1']);
  });

  it('optional objectives do not block completion', () => {
    const system = new QuestSystem();
    system.registerQuest(
      quest({
        id: 'q1',
        objectives: [
          { id: 'required', type: 'TALK_TO_NPC', required: 1, optional: false },
          { id: 'optional', type: 'COLLECT_ITEM', required: 10, optional: true },
        ],
      }),
    );
    system.activate('q1');
    system.progressObjective('q1', 'required', 1);

    expect(system.getState('q1')).toBe('COMPLETED');
    expect(system.getRuntimeState('q1')?.objectiveProgress.optional).toBe(0);
  });

  it('all objective types are trackable', () => {
    const system = new QuestSystem();
    system.registerQuest(
      quest({
        id: 'q1',
        objectives: [
          { id: 'talk', type: 'TALK_TO_NPC', required: 1, optional: false },
          { id: 'collect', type: 'COLLECT_ITEM', required: 1, optional: false },
          { id: 'defeat', type: 'DEFEAT_ENEMY', required: 1, optional: false },
          { id: 'enter', type: 'ENTER_ZONE', required: 1, optional: false },
        ],
      }),
    );
    system.activate('q1');
    system.progressObjective('q1', 'talk', 1);
    system.progressObjective('q1', 'collect', 1);
    system.progressObjective('q1', 'defeat', 1);
    system.progressObjective('q1', 'enter', 1);

    expect(system.getState('q1')).toBe('COMPLETED');
  });

  it('progress on COMPLETED quest is no-op with no event', () => {
    const system = new QuestSystem();
    let progressed = 0;
    system.on('quest:progressed', () => {
      progressed += 1;
    });

    system.registerQuest(quest({ id: 'q1' }));
    system.activate('q1');
    system.complete('q1');

    system.progressObjective('q1', 'q1-obj-1', 1);
    expect(progressed).toBe(0);
  });
});

describe('QuestSystem prerequisites and paths', () => {
  it('unmet prerequisites block activation', () => {
    const system = new QuestSystem();
    system.registerQuest(quest({ id: 'A' }));
    system.registerQuest(quest({ id: 'B', prerequisites: ['A'] }));

    const blocked = system.activate('B');
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe('PREREQUISITES_NOT_MET');

    system.activate('A');
    system.complete('A');
    const allowed = system.activate('B');
    expect(allowed.ok).toBe(true);
    expect(system.getState('B')).toBe('ACTIVE');
  });

  it('branching quest resolves first satisfied path in order', () => {
    const system = new QuestSystem();
    const completionPath: Array<string | null> = [];
    system.on('quest:completed', (payload) => completionPath.push(payload.pathId));

    system.registerQuest(
      quest({
        id: 'q1',
        objectives: [
          { id: 'obj-1', type: 'DEFEAT_ENEMY', required: 1, optional: false },
          { id: 'obj-2', type: 'COLLECT_ITEM', required: 1, optional: false },
        ],
        paths: [
          { id: 'pathA', objectiveIds: ['obj-1'] },
          { id: 'pathB', objectiveIds: ['obj-2'] },
        ],
      }),
    );
    system.activate('q1');
    system.progressObjective('q1', 'obj-1', 1);

    expect(system.getState('q1')).toBe('COMPLETED');
    expect(completionPath).toEqual(['pathA']);
  });
});

describe('QuestSystem persistence', () => {
  it('serialize and deserialize restore runtime state', () => {
    const source = new QuestSystem();
    source.registerQuest(
      quest({
        id: 'q1',
        objectives: [{ id: 'kill', type: 'DEFEAT_ENEMY', required: 3, optional: false }],
      }),
    );
    source.activate('q1');
    source.progressObjective('q1', 'kill', 2);

    const saved = source.serialize();

    const restored = new QuestSystem();
    restored.registerQuest(
      quest({
        id: 'q1',
        objectives: [{ id: 'kill', type: 'DEFEAT_ENEMY', required: 3, optional: false }],
      }),
    );

    const result = restored.deserialize(saved);
    expect(result.ok).toBe(true);
    expect(restored.getState('q1')).toBe('ACTIVE');
    expect(restored.getRuntimeState('q1')?.objectiveProgress.kill).toBe(2);
  });

  it('deserialize invalid json returns DESERIALIZE_ERROR', () => {
    const system = new QuestSystem();
    const result = system.deserialize('{not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DESERIALIZE_ERROR');
  });
});
