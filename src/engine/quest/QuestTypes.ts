export type QuestStateEnum = 'INACTIVE' | 'ACTIVE' | 'COMPLETED' | 'FAILED';

export type ObjectiveType = 'TALK_TO_NPC' | 'COLLECT_ITEM' | 'DEFEAT_ENEMY' | 'ENTER_ZONE';

export interface Objective {
  id: string;
  type: ObjectiveType;
  required: number;
  optional?: boolean;
  current?: number;
}

export interface QuestPath {
  id: string;
  objectiveIds: string[];
}

export interface QuestDefinition {
  id: string;
  title: string;
  objectives: Objective[];
  prerequisites: string[];
  paths?: QuestPath[];
}

export interface QuestRuntimeState {
  questId: string;
  state: QuestStateEnum;
  objectiveProgress: Record<string, number>;
  resolvedPathId: string | null;
}

export type QuestErrorCode =
  | 'QUEST_NOT_FOUND'
  | 'PREREQUISITES_NOT_MET'
  | 'INVALID_OBJECTIVE'
  | 'DESERIALIZE_ERROR';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface QuestActivatedEvent {
  questId: string;
}

export interface QuestFailedEvent {
  questId: string;
}

export interface QuestProgressedEvent {
  questId: string;
  objectiveId: string;
  current: number;
  required: number;
}

export interface QuestCompletedEvent {
  questId: string;
  pathId: string | null;
}

export interface QuestEventMap {
  'quest:activated': QuestActivatedEvent;
  'quest:failed': QuestFailedEvent;
  'quest:progressed': QuestProgressedEvent;
  'quest:completed': QuestCompletedEvent;
}
