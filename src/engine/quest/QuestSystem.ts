import type {
  Objective,
  QuestDefinition,
  QuestErrorCode,
  QuestEventMap,
  QuestRuntimeState,
  QuestStateEnum,
  Result,
} from './QuestTypes';

type EventName = keyof QuestEventMap;
type EventHandler<K extends EventName> = (payload: QuestEventMap[K]) => void;

function cloneDefinition(definition: QuestDefinition): QuestDefinition {
  return {
    ...definition,
    objectives: definition.objectives.map((objective) => ({ ...objective })),
    prerequisites: [...definition.prerequisites],
    paths: definition.paths?.map((path) => ({ ...path, objectiveIds: [...path.objectiveIds] })),
  };
}

function isTerminal(state: QuestStateEnum): boolean {
  return state === 'COMPLETED' || state === 'FAILED';
}

function objectiveMet(objective: Objective, progress: Record<string, number>): boolean {
  return (progress[objective.id] ?? 0) >= objective.required;
}

export class QuestSystem {
  private readonly defs = new Map<string, QuestDefinition>();
  private readonly runtime = new Map<string, QuestRuntimeState>();
  private readonly listeners: { [K in EventName]: Set<EventHandler<K>> } = {
    'quest:activated': new Set(),
    'quest:failed': new Set(),
    'quest:progressed': new Set(),
    'quest:completed': new Set(),
  };

  on<K extends EventName>(eventName: K, handler: EventHandler<K>): () => void {
    this.listeners[eventName].add(handler);
    return () => this.listeners[eventName].delete(handler);
  }

  registerQuest(definition: QuestDefinition): void {
    const def = cloneDefinition(definition);
    this.defs.set(def.id, def);

    const objectiveProgress: Record<string, number> = {};
    for (const objective of def.objectives) {
      objectiveProgress[objective.id] = objective.current ?? 0;
    }

    this.runtime.set(def.id, {
      questId: def.id,
      state: 'INACTIVE',
      objectiveProgress,
      resolvedPathId: null,
    });
  }

  getState(questId: string): QuestStateEnum | undefined {
    return this.runtime.get(questId)?.state;
  }

  getRuntimeState(questId: string): QuestRuntimeState | undefined {
    const state = this.runtime.get(questId);
    if (!state) return undefined;
    return {
      ...state,
      objectiveProgress: { ...state.objectiveProgress },
    };
  }

  activate(questId: string): Result<void, QuestErrorCode> {
    const state = this.runtime.get(questId);
    const def = this.defs.get(questId);
    if (!state || !def) return { ok: false, error: 'QUEST_NOT_FOUND' };
    if (isTerminal(state.state)) return { ok: true, value: undefined };
    if (state.state !== 'INACTIVE') return { ok: true, value: undefined };

    for (const prerequisiteId of def.prerequisites) {
      if (this.runtime.get(prerequisiteId)?.state !== 'COMPLETED') {
        return { ok: false, error: 'PREREQUISITES_NOT_MET' };
      }
    }

    state.state = 'ACTIVE';
    this.emit('quest:activated', { questId });
    return { ok: true, value: undefined };
  }

  fail(questId: string): Result<void, QuestErrorCode> {
    const state = this.runtime.get(questId);
    if (!state) return { ok: false, error: 'QUEST_NOT_FOUND' };
    if (isTerminal(state.state)) return { ok: true, value: undefined };
    if (state.state !== 'ACTIVE') return { ok: true, value: undefined };

    state.state = 'FAILED';
    this.emit('quest:failed', { questId });
    return { ok: true, value: undefined };
  }

  complete(questId: string): Result<void, QuestErrorCode> {
    const state = this.runtime.get(questId);
    if (!state) return { ok: false, error: 'QUEST_NOT_FOUND' };
    if (isTerminal(state.state)) return { ok: true, value: undefined };

    state.state = 'COMPLETED';
    this.emit('quest:completed', { questId, pathId: state.resolvedPathId });
    return { ok: true, value: undefined };
  }

  progressObjective(questId: string, objectiveId: string, amount = 1): Result<void, QuestErrorCode> {
    const state = this.runtime.get(questId);
    const def = this.defs.get(questId);
    if (!state || !def) return { ok: false, error: 'QUEST_NOT_FOUND' };
    if (state.state !== 'ACTIVE') return { ok: true, value: undefined };

    const objective = def.objectives.find((entry) => entry.id === objectiveId);
    if (!objective) return { ok: false, error: 'INVALID_OBJECTIVE' };

    const next = Math.max(0, (state.objectiveProgress[objectiveId] ?? 0) + amount);
    state.objectiveProgress[objectiveId] = Math.min(next, objective.required);

    this.emit('quest:progressed', {
      questId,
      objectiveId,
      current: state.objectiveProgress[objectiveId],
      required: objective.required,
    });

    const pathId = this.resolvePath(def, state.objectiveProgress);
    if (pathId !== null) {
      state.resolvedPathId = pathId;
      state.state = 'COMPLETED';
      this.emit('quest:completed', { questId, pathId });
      return { ok: true, value: undefined };
    }

    const allRequiredMet = def.objectives
      .filter((entry) => entry.optional !== true)
      .every((entry) => objectiveMet(entry, state.objectiveProgress));

    if (allRequiredMet) {
      state.state = 'COMPLETED';
      this.emit('quest:completed', { questId, pathId: null });
    }

    return { ok: true, value: undefined };
  }

  resolvePath(definition: QuestDefinition, progress: Record<string, number>): string | null {
    if (!definition.paths || definition.paths.length === 0) {
      return null;
    }

    for (const path of definition.paths) {
      const complete = path.objectiveIds.every((objectiveId) => {
        const objective = definition.objectives.find((entry) => entry.id === objectiveId);
        if (!objective) return false;
        return objectiveMet(objective, progress);
      });
      if (complete) return path.id;
    }

    return null;
  }

  serialize(): string {
    return JSON.stringify(Array.from(this.runtime.entries()));
  }

  deserialize(json: string): Result<void, QuestErrorCode> {
    try {
      const parsed = JSON.parse(json) as Array<[string, QuestRuntimeState]>;
      if (!Array.isArray(parsed)) {
        return { ok: false, error: 'DESERIALIZE_ERROR' };
      }

      for (const entry of parsed) {
        if (!Array.isArray(entry) || entry.length !== 2) {
          return { ok: false, error: 'DESERIALIZE_ERROR' };
        }
        const [questId, state] = entry;
        if (!this.defs.has(questId)) {
          continue;
        }
        this.runtime.set(questId, {
          questId,
          state: state.state,
          objectiveProgress: { ...state.objectiveProgress },
          resolvedPathId: state.resolvedPathId,
        });
      }

      return { ok: true, value: undefined };
    } catch {
      return { ok: false, error: 'DESERIALIZE_ERROR' };
    }
  }

  private emit<K extends EventName>(eventName: K, payload: QuestEventMap[K]): void {
    for (const listener of this.listeners[eventName]) {
      listener(payload);
    }
  }
}

export type {
  Objective,
  QuestDefinition,
  QuestErrorCode,
  QuestRuntimeState,
  QuestStateEnum,
  Result,
} from './QuestTypes';
