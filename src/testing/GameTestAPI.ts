import { SeededRNG } from '../engine/rng/SeededRNG';

export type QuestState = 'INACTIVE' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };
export type ScenarioResult = { passed: boolean; log: string[] };

export interface Vector2 { x: number; y: number }
export interface ActorSnapshot { id: string; name: string; pos: Vector2; vel: Vector2; hp: number }
export interface PlayerSnapshot extends Vector2 { hp: number; maxHp: number; mp: number; maxMp: number; attack: number; defense: number; speed: number; luck: number; level: number; exp: number; }
export interface InventoryEntry { itemId: string; quantity: number }
export interface MapPosition { map: string; x: number; y: number }
export interface BattleState { active: boolean; enemies: string[]; outcome: 'win' | 'lose' | 'flee' | null }
export interface SaveData { scene: string; player: PlayerSnapshot; inventory: InventoryEntry[]; quests: Record<string, QuestState>; flags: Record<string, boolean>; mapPosition: MapPosition }

export type ScenarioStep =
  | { action: 'setSeed'; value: number }
  | { action: 'teleport'; x: number; y: number; map?: string }
  | { action: 'setPlayerStat'; stat: keyof PlayerSnapshot; value: number }
  | { action: 'addItem'; itemId: string; quantity?: number }
  | { action: 'removeItem'; itemId: string; quantity?: number }
  | { action: 'activateQuest'; questId: string }
  | { action: 'completeQuest'; questId: string }
  | { action: 'setFlag'; key: string; value: boolean }
  | { action: 'triggerDialog'; npcId: string }
  | { action: 'choose'; index: number }
  | { action: 'stepFrames'; frames: number }
  | { action: 'changeScene'; sceneName: string }
  | { action: 'startBattle'; enemyIds: string[] }
  | { action: 'endBattle'; outcome: 'win' | 'lose' | 'flee' }
  | { action: 'saveGame'; slot: 1 | 2 | 3 }
  | { action: 'loadGame'; slot: 1 | 2 | 3 }
  | { assert: { path: string; equals: unknown } };

export interface TestScenario { name?: string; steps: ScenarioStep[] }

export interface GameStateAdapter {
  getScene(): string;
  getActors(): ActorSnapshot[];
  getPlayer(): PlayerSnapshot;
  getInventory(): InventoryEntry[];
  getQuestState(): Record<string, QuestState>;
  getDialogState(): Record<string, unknown> | null;
  getMapPosition(): MapPosition;
  getBattleState(): BattleState | null;
  getFlags(): Record<string, boolean>;
  getSaveSlot(slot: 1 | 2 | 3): SaveData | null;
  teleport(x: number, y: number, map?: string): Promise<void>;
  setPlayerStat(stat: keyof PlayerSnapshot, value: number): void;
  addItem(itemId: string, quantity: number): Result<void, 'UNKNOWN_ITEM'>;
  removeItem(itemId: string, quantity: number): Result<void, 'INSUFFICIENT_QUANTITY'>;
  activateQuest(questId: string): void;
  completeQuest(questId: string): void;
  setFlag(key: string, value: boolean): void;
  triggerDialog(npcId: string): void;
  choose(index: number): void;
  startBattle(enemyIds: string[]): void;
  endBattle(outcome: 'win' | 'lose' | 'flee'): void;
  setSeed(seed: number): void;
  stepFrames(frames: number): void;
  skipDialog(): void;
  changeScene(sceneName: string): Promise<Result<void, 'UNKNOWN_SCENE'>>;
  saveGame(slot: 1 | 2 | 3): void;
  loadGame(slot: 1 | 2 | 3): Promise<void>;
}

export interface GameTestAPI {
  getScene(): string;
  getActors(): ActorSnapshot[];
  getPlayer(): PlayerSnapshot;
  getInventory(): InventoryEntry[];
  getQuestState(): Record<string, QuestState>;
  getQuestLog(): Record<string, QuestState>;
  getDialogState(): Record<string, unknown> | null;
  getMapPosition(): MapPosition;
  getBattleState(): BattleState | null;
  getFlags(): Record<string, boolean>;
  getSaveSlot(slot: 1 | 2 | 3): SaveData | null;
  teleport(x: number, y: number, map?: string): Promise<void>;
  setHP(value: number): void;
  setPlayerStat(stat: keyof PlayerSnapshot, value: number): void;
  addItem(itemId: string, quantity?: number): Result<void, 'UNKNOWN_ITEM'>;
  removeItem(itemId: string, quantity?: number): Result<void, 'INSUFFICIENT_QUANTITY'>;
  triggerQuest(questId: string): void;
  activateQuest(questId: string): void;
  completeQuest(questId: string): void;
  setFlag(key: string, value: boolean): void;
  triggerDialog(npcId: string): void;
  choose(index: number): void;
  startBattle(enemyIds: string[]): void;
  endBattle(outcome: 'win' | 'lose' | 'flee'): void;
  setSeed(seed: number): void;
  stepFrames(frames: number): void;
  skipDialog(): void;
  changeScene(sceneName: string): Promise<Result<void, 'UNKNOWN_SCENE'>>;
  saveGame(slot: 1 | 2 | 3): void;
  loadGame(slot: 1 | 2 | 3): Promise<void>;
  runScenario(scenario: TestScenario): Promise<ScenarioResult>;
  runScenarioFile(url: string): Promise<ScenarioResult[]>;
}

declare global { interface Window { __game?: GameTestAPI } }

function getPathValue(target: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) return (current as Record<string, unknown>)[segment];
    return undefined;
  }, target);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!(key in b)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

async function execStep(adapter: GameStateAdapter, step: ScenarioStep): Promise<void> {
  if ('assert' in step) return;
  switch (step.action) {
    case 'setSeed': adapter.setSeed(step.value); return;
    case 'teleport': await adapter.teleport(step.x, step.y, step.map); return;
    case 'setPlayerStat': adapter.setPlayerStat(step.stat, step.value); return;
    case 'addItem': { const res = adapter.addItem(step.itemId, step.quantity ?? 1); if (!res.ok) throw new Error(res.error); return; }
    case 'removeItem': { const res = adapter.removeItem(step.itemId, step.quantity ?? 1); if (!res.ok) throw new Error(res.error); return; }
    case 'activateQuest': adapter.activateQuest(step.questId); return;
    case 'completeQuest': adapter.completeQuest(step.questId); return;
    case 'setFlag': adapter.setFlag(step.key, step.value); return;
    case 'triggerDialog': adapter.triggerDialog(step.npcId); return;
    case 'choose': adapter.choose(step.index); return;
    case 'stepFrames': adapter.stepFrames(step.frames); return;
    case 'changeScene': { const res = await adapter.changeScene(step.sceneName); if (!res.ok) throw new Error(res.error); return; }
    case 'startBattle': adapter.startBattle(step.enemyIds); return;
    case 'endBattle': adapter.endBattle(step.outcome); return;
    case 'saveGame': adapter.saveGame(step.slot); return;
    case 'loadGame': await adapter.loadGame(step.slot); return;
  }
}

export function createGameTestAPI(adapter: GameStateAdapter): GameTestAPI {
  const runScenario = async (scenario: TestScenario): Promise<ScenarioResult> => {
    const log: string[] = [];
    let passed = true;
    for (const [index, step] of scenario.steps.entries()) {
      try {
        if ('assert' in step) {
          const actual = getPathValue({ scene: adapter.getScene(), player: adapter.getPlayer(), inventory: adapter.getInventory(), quests: adapter.getQuestState(), flags: adapter.getFlags(), map: adapter.getMapPosition(), battle: adapter.getBattleState() }, step.assert.path);
          if (!deepEqual(actual, step.assert.equals)) { passed = false; log.push(`step ${index + 1}: assert failed (${step.assert.path})`); } else log.push(`step ${index + 1}: assert ok`);
        } else {
          await execStep(adapter, step);
          log.push(`step ${index + 1}: ok`);
        }
      } catch (error) {
        passed = false;
        log.push(`step ${index + 1}: error (${error instanceof Error ? error.message : String(error)})`);
      }
    }
    return { passed, log };
  };

  return {
    getScene: () => adapter.getScene(),
    getActors: () => adapter.getActors(),
    getPlayer: () => adapter.getPlayer(),
    getInventory: () => adapter.getInventory(),
    getQuestState: () => adapter.getQuestState(),
    getQuestLog: () => adapter.getQuestState(),
    getDialogState: () => adapter.getDialogState(),
    getMapPosition: () => adapter.getMapPosition(),
    getBattleState: () => adapter.getBattleState(),
    getFlags: () => adapter.getFlags(),
    getSaveSlot: (slot) => adapter.getSaveSlot(slot),
    teleport: (x, y, map) => adapter.teleport(x, y, map),
    setHP: (value) => adapter.setPlayerStat('hp', value),
    setPlayerStat: (stat, value) => adapter.setPlayerStat(stat, value),
    addItem: (itemId, quantity = 1) => adapter.addItem(itemId, quantity),
    removeItem: (itemId, quantity = 1) => adapter.removeItem(itemId, quantity),
    triggerQuest: (questId) => adapter.activateQuest(questId),
    activateQuest: (questId) => adapter.activateQuest(questId),
    completeQuest: (questId) => adapter.completeQuest(questId),
    setFlag: (key, value) => adapter.setFlag(key, value),
    triggerDialog: (npcId) => adapter.triggerDialog(npcId),
    choose: (index) => adapter.choose(index),
    startBattle: (enemyIds) => adapter.startBattle(enemyIds),
    endBattle: (outcome) => adapter.endBattle(outcome),
    setSeed: (seed) => adapter.setSeed(seed),
    stepFrames: (frames) => adapter.stepFrames(frames),
    skipDialog: () => adapter.skipDialog(),
    changeScene: (sceneName) => adapter.changeScene(sceneName),
    saveGame: (slot) => adapter.saveGame(slot),
    loadGame: (slot) => adapter.loadGame(slot),
    runScenario,
    runScenarioFile: async (url) => {
      const response = await fetch(url);
      const json = (await response.json()) as TestScenario | TestScenario[];
      const scenarios = Array.isArray(json) ? json : [json];
      return Promise.all(scenarios.map((scenario) => runScenario(scenario)));
    },
  };
}

export function installGameTestAPI(mode: string, adapter: GameStateAdapter): void {
  if (mode === 'production') return;
  window.__game = createGameTestAPI(adapter);
}

export function createInMemoryAdapter(): GameStateAdapter {
  const inventory = new Map<string, number>();
  const knownItems = new Set(['health-potion', 'sword', 'shield']);
  const knownScenes = new Set(['TitleScene', 'TownScene', 'BattleScene']);
  const saves: Record<1 | 2 | 3, SaveData | null> = { 1: null, 2: null, 3: null };
  const quests: Record<string, QuestState> = {};
  const flags: Record<string, boolean> = {};
  const state = {
    scene: 'TitleScene',
    mapPosition: { map: 'starting-village', x: 0, y: 0 },
    player: { hp: 30, maxHp: 30, mp: 10, maxMp: 10, attack: 8, defense: 5, speed: 6, luck: 1, level: 1, exp: 0, x: 0, y: 0 },
    actors: [{ id: 'player-1', name: 'Hero', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, hp: 30 }] as ActorSnapshot[],
    battle: null as BattleState | null,
    rng: new SeededRNG(42),
    dialog: null as Record<string, unknown> | null,
  };

  const snapshot = (): SaveData => ({ scene: state.scene, player: { ...state.player }, inventory: Array.from(inventory.entries()).map(([itemId, quantity]) => ({ itemId, quantity })), quests: { ...quests }, flags: { ...flags }, mapPosition: { ...state.mapPosition } });

  return {
    getScene: () => state.scene,
    getActors: () => state.actors.map((a) => ({ ...a, pos: { ...a.pos }, vel: { ...a.vel } })),
    getPlayer: () => ({ ...state.player }),
    getInventory: () => Array.from(inventory.entries()).map(([itemId, quantity]) => ({ itemId, quantity })),
    getQuestState: () => ({ ...quests }),
    getDialogState: () => state.dialog,
    getMapPosition: () => ({ ...state.mapPosition }),
    getBattleState: () => (state.battle ? { ...state.battle, enemies: [...state.battle.enemies] } : null),
    getFlags: () => ({ ...flags }),
    getSaveSlot: (slot) => (saves[slot] ? { ...saves[slot]!, player: { ...saves[slot]!.player }, inventory: saves[slot]!.inventory.map((e) => ({ ...e })), quests: { ...saves[slot]!.quests }, flags: { ...saves[slot]!.flags }, mapPosition: { ...saves[slot]!.mapPosition } } : null),
    teleport: async (x, y, map) => { state.player.x = x; state.player.y = y; state.mapPosition.x = x; state.mapPosition.y = y; state.actors[0].pos = { x, y }; if (map) state.mapPosition.map = map; },
    setPlayerStat: (stat, value) => {
      if (stat === 'x' || stat === 'y') {
        state.player[stat] = value;
        return;
      }
      if (stat === 'hp') state.player.hp = Math.max(0, Math.min(value, state.player.maxHp));
      else if (stat === 'mp') state.player.mp = Math.max(0, Math.min(value, state.player.maxMp));
      else state.player[stat] = value as never;
      state.actors[0].hp = state.player.hp;
    },
    addItem: (itemId, quantity) => { if (!knownItems.has(itemId)) return { ok: false, error: 'UNKNOWN_ITEM' }; inventory.set(itemId, (inventory.get(itemId) ?? 0) + quantity); return { ok: true, value: undefined }; },
    removeItem: (itemId, quantity) => { const current = inventory.get(itemId) ?? 0; if (current < quantity) return { ok: false, error: 'INSUFFICIENT_QUANTITY' }; const next = current - quantity; if (next === 0) inventory.delete(itemId); else inventory.set(itemId, next); return { ok: true, value: undefined }; },
    activateQuest: (questId) => { quests[questId] = 'ACTIVE'; },
    completeQuest: (questId) => { quests[questId] = 'COMPLETED'; },
    setFlag: (key, value) => { flags[key] = value; },
    triggerDialog: (npcId) => { state.dialog = { npcId, node: 'root' }; },
    choose: (index) => {
      if (!state.dialog) return;
      state.dialog = { ...state.dialog, choice: index };
    },
    startBattle: (enemyIds) => { state.battle = { active: true, enemies: [...enemyIds], outcome: null }; },
    endBattle: (outcome) => { if (state.battle) state.battle = { ...state.battle, active: false, outcome }; },
    setSeed: (seed) => { state.rng = new SeededRNG(seed); },
    stepFrames: (frames) => { for (let i = 0; i < Math.max(0, frames); i++) state.rng.nextFloat(); },
    skipDialog: () => { state.dialog = null; },
    changeScene: async (sceneName) => { if (!knownScenes.has(sceneName)) return { ok: false, error: 'UNKNOWN_SCENE' }; state.scene = sceneName; return { ok: true, value: undefined }; },
    saveGame: (slot) => { saves[slot] = snapshot(); },
    loadGame: async (slot) => { const data = saves[slot]; if (!data) return; state.scene = data.scene; state.player = { ...data.player }; state.mapPosition = { ...data.mapPosition }; inventory.clear(); data.inventory.forEach((e) => inventory.set(e.itemId, e.quantity)); Object.keys(quests).forEach((k) => delete quests[k]); Object.assign(quests, data.quests); Object.keys(flags).forEach((k) => delete flags[k]); Object.assign(flags, data.flags); state.actors[0].pos = { x: state.player.x, y: state.player.y }; state.actors[0].hp = state.player.hp; },
  };
}
