import { Inventory, type Item } from '../engine/inventory/InventorySystem';
import { QuestSystem, type QuestDefinition } from '../engine/quest/QuestSystem';
import { DialogSystem } from '../engine/dialog/DialogSystem';
import type { DialogTree } from '../engine/dialog/DialogSystem';
import { SaveSystem, type StorageAdapter } from '../engine/save/SaveSystem';
import { SeededRNG } from '../engine/rng/SeededRNG';
import itemsData from '../data/items.json';
import questsData from '../data/quests.json';
import dialogData from '../data/dialog.json';
import type {
  ActorSnapshot,
  BattleState,
  GameStateAdapter,
  MapPosition,
  PlayerSnapshot,
  QuestState,
  Result,
  SaveData,
} from '../testing/GameTestAPI';

function toItemCatalog(rows: unknown[]): Record<string, Item> {
  const catalog: Record<string, Item> = {};
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    const id = typeof entry.id === 'string' ? entry.id : '';
    if (!id) continue;

    const statBonus =
      entry.statBonus && typeof entry.statBonus === 'object' ? (entry.statBonus as Record<string, number>) : undefined;

    catalog[id] = {
      id,
      name: typeof entry.name === 'string' ? entry.name : id,
      stackable: Boolean(entry.stackable),
      maxStack: typeof entry.maxStack === 'number' ? entry.maxStack : 1,
      equipSlot: typeof entry.equipSlot === 'string' ? (entry.equipSlot as Item['equipSlot']) : undefined,
      statBonuses: statBonus,
    };
  }
  return catalog;
}

function toQuestDefinitions(rows: unknown[]): QuestDefinition[] {
  const quests: QuestDefinition[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    const id = typeof entry.id === 'string' ? entry.id : '';
    const title = typeof entry.title === 'string' ? entry.title : id;
    const prerequisites = Array.isArray(entry.prerequisites)
      ? entry.prerequisites.filter((x): x is string => typeof x === 'string')
      : [];

    const objectives = Array.isArray(entry.objectives)
      ? entry.objectives
          .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
          .map((objective) => ({
            id: typeof objective.id === 'string' ? objective.id : 'objective',
            type:
              typeof objective.type === 'string' &&
              ['TALK_TO_NPC', 'COLLECT_ITEM', 'DEFEAT_ENEMY', 'ENTER_ZONE'].includes(objective.type)
                ? (objective.type as 'TALK_TO_NPC' | 'COLLECT_ITEM' | 'DEFEAT_ENEMY' | 'ENTER_ZONE')
                : 'TALK_TO_NPC',
            required: typeof objective.required === 'number' ? objective.required : 1,
            optional: Boolean(objective.optional),
          }))
      : [];

    if (!id || objectives.length === 0) continue;
    quests.push({ id, title, prerequisites, objectives });
  }
  return quests;
}

function toDialogTrees(rows: unknown[]): DialogTree[] {
  const trees: DialogTree[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    if (typeof entry.npcId !== 'string' || typeof entry.rootNodeId !== 'string' || !Array.isArray(entry.nodes)) {
      continue;
    }

    const nodes = entry.nodes
      .filter((node): node is Record<string, unknown> => Boolean(node) && typeof node === 'object')
      .map((node) => ({
        id: typeof node.id === 'string' ? node.id : 'node',
        text: typeof node.text === 'string' ? node.text : '',
        choices: Array.isArray(node.choices)
          ? node.choices
              .filter((choice): choice is Record<string, unknown> => Boolean(choice) && typeof choice === 'object')
              .map((choice) => ({
                text: typeof choice.text === 'string' ? choice.text : '',
                nextNodeId: typeof choice.nextNodeId === 'string' ? choice.nextNodeId : '',
                actions: choice.actions as DialogTree['nodes'][number]['choices'][number]['actions'],
                conditions: choice.conditions as DialogTree['nodes'][number]['choices'][number]['conditions'],
              }))
          : [],
      }))
      .filter((node) => node.id.length > 0);

    trees.push({ npcId: entry.npcId, rootNodeId: entry.rootNodeId, nodes });
  }
  return trees;
}

const ITEM_CATALOG = toItemCatalog(itemsData as unknown[]);
const QUESTS = toQuestDefinitions(questsData as unknown[]);
const DIALOG_TREES = toDialogTrees(dialogData as unknown[]);

const SCENES = new Set(['TitleScene', 'TownScene', 'BattleScene', 'VictoryScene', 'GameOverScene']);

function browserStorageAdapter(): StorageAdapter {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  };
}

function clonePlayer(player: PlayerSnapshot): PlayerSnapshot {
  return { ...player };
}

export class RuntimeGameState implements GameStateAdapter {
  private readonly inventory = new Inventory({ maxSlots: 24 });
  private readonly quests = new QuestSystem();
  private readonly dialog = new DialogSystem();
  private readonly saveSystem: SaveSystem;
  private readonly questIds = new Set<string>();

  private scene = 'TitleScene';
  private mapPosition: MapPosition = { map: 'starting-village', x: 0, y: 0 };
  private player: PlayerSnapshot = {
    x: 0,
    y: 0,
    hp: 30,
    maxHp: 30,
    mp: 10,
    maxMp: 10,
    attack: 8,
    defense: 5,
    speed: 6,
    luck: 1,
    level: 1,
    exp: 0,
  };
  private flags: Record<string, boolean> = {};
  private battle: BattleState | null = null;
  private rng = new SeededRNG(42);
  private dialogState: { npcId: string; nodeId: string; text: string; choices: Array<{ index: number; text: string }> } | null = null;

  constructor(storage: StorageAdapter = browserStorageAdapter()) {
    this.saveSystem = new SaveSystem(storage);

    for (const quest of QUESTS) {
      this.quests.registerQuest(quest);
      this.questIds.add(quest.id);
    }

    for (const tree of DIALOG_TREES) {
      this.dialog.registerTree(tree);
    }
  }

  getScene(): string { return this.scene; }
  getActors(): ActorSnapshot[] {
    return [{ id: 'player-1', name: 'Hero', pos: { x: this.player.x, y: this.player.y }, vel: { x: 0, y: 0 }, hp: this.player.hp }];
  }
  getPlayer(): PlayerSnapshot { return clonePlayer(this.player); }
  getInventory() {
    const totals = new Map<string, number>();
    for (const slot of this.inventory.getSlots()) {
      if (!slot.itemId || slot.quantity <= 0) continue;
      totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.quantity);
    }
    return Array.from(totals.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));
  }
  getQuestState(): Record<string, QuestState> {
    const entries: Record<string, QuestState> = {};
    for (const id of this.questIds) {
      entries[id] = (this.quests.getState(id) ?? 'INACTIVE') as QuestState;
    }
    return entries;
  }
  getDialogState(): Record<string, unknown> | null { return this.dialogState ? { ...this.dialogState } : null; }
  getMapPosition(): MapPosition { return { ...this.mapPosition }; }
  getBattleState(): BattleState | null { return this.battle ? { ...this.battle, enemies: [...this.battle.enemies] } : null; }
  getFlags(): Record<string, boolean> { return { ...this.flags }; }
  getSaveSlot(slot: 1 | 2 | 3): SaveData | null { return this.saveSystem.load(slot); }

  async teleport(x: number, y: number, map?: string): Promise<void> {
    this.player.x = x;
    this.player.y = y;
    this.mapPosition.x = x;
    this.mapPosition.y = y;
    if (map) this.mapPosition.map = map;
  }

  setPlayerStat(stat: keyof PlayerSnapshot, value: number): void {
    if (stat === 'hp') {
      this.player.hp = Math.max(0, Math.min(value, this.player.maxHp));
      if (this.player.hp <= 0) this.scene = 'GameOverScene';
      return;
    }
    if (stat === 'mp') {
      this.player.mp = Math.max(0, Math.min(value, this.player.maxMp));
      return;
    }
    this.player[stat] = value;
  }

  addItem(itemId: string, quantity: number): Result<void, 'UNKNOWN_ITEM' | 'INVENTORY_FULL'> {
    const item = ITEM_CATALOG[itemId];
    if (!item) return { ok: false, error: 'UNKNOWN_ITEM' };
    const result = this.inventory.addItem(item, quantity);
    if (!result.ok && result.error === 'INVENTORY_FULL') return { ok: false, error: 'INVENTORY_FULL' };
    return { ok: true, value: undefined };
  }

  removeItem(itemId: string, quantity: number): Result<void, 'INSUFFICIENT_QUANTITY'> {
    const result = this.inventory.removeItem(itemId, quantity);
    if (!result.ok) return { ok: false, error: 'INSUFFICIENT_QUANTITY' };
    return { ok: true, value: undefined };
  }

  activateQuest(questId: string): void { this.quests.activate(questId); }
  completeQuest(questId: string): void { this.quests.complete(questId); }
  setFlag(key: string, value: boolean): void { this.flags[key] = value; }

  triggerDialog(npcId: string): void {
    const runtime = this.dialog.triggerDialog(npcId, {
      level: this.player.level,
      inventory: Object.fromEntries(this.getInventory().map((entry) => [entry.itemId, entry.quantity])),
      quests: this.getQuestState(),
      flags: this.flags,
    });
    this.dialogState = runtime;
  }

  choose(index: number): void {
    if (!this.dialogState) return;
    const activeNpcId = this.dialogState.npcId;
    const outcome = this.dialog.choose(
      this.dialogState.npcId,
      this.dialogState.nodeId,
      index,
      {
        level: this.player.level,
        inventory: Object.fromEntries(this.getInventory().map((entry) => [entry.itemId, entry.quantity])),
        quests: this.getQuestState(),
        flags: this.flags,
      },
    );

    for (const item of outcome.mutations.addItems) {
      this.addItem(item.itemId, item.quantity);
    }
    for (const questId of outcome.mutations.activateQuests) {
      this.activateQuest(questId);
    }
    for (const flag of outcome.mutations.flags) {
      this.setFlag(flag.key, flag.value);
    }

    if (activeNpcId === 'npc-village-elder') {
      this.quests.progressObjective('main-quest', 'talk-elder', 1);
    }

    this.dialogState = outcome.next;
  }

  startBattle(enemyIds: string[]): void {
    this.scene = 'BattleScene';
    this.battle = { active: true, enemies: [...enemyIds], outcome: null };
  }

  endBattle(outcome: 'win' | 'lose' | 'flee'): void {
    if (!this.battle) return;
    const defeatedEnemies = [...this.battle.enemies];
    this.battle = { ...this.battle, active: false, outcome };
    if (outcome === 'win' && defeatedEnemies.includes('goblin-boss')) {
      this.quests.progressObjective('main-quest', 'defeat-goblin-boss', 1);
    }
    if (outcome === 'win' && defeatedEnemies.includes('goblin-boss')) {
      this.scene = 'VictoryScene';
      return;
    }
    if (outcome === 'lose') {
      this.scene = 'GameOverScene';
      return;
    }
    this.scene = 'TownScene';
  }

  setSeed(seed: number): void { this.rng = new SeededRNG(seed); }

  stepFrames(frames: number): void {
    const steps = Math.max(0, frames);
    for (let i = 0; i < steps; i++) this.rng.nextFloat();
  }

  skipDialog(): void { this.dialogState = null; }

  async changeScene(sceneName: string): Promise<Result<void, 'UNKNOWN_SCENE'>> {
    if (!SCENES.has(sceneName)) return { ok: false, error: 'UNKNOWN_SCENE' };
    this.scene = sceneName;
    return { ok: true, value: undefined };
  }

  saveGame(slot: 1 | 2 | 3): void {
    this.saveSystem.save(slot, {
      scene: this.scene,
      player: this.getPlayer(),
      inventory: this.getInventory(),
      quests: this.getQuestState(),
      flags: this.getFlags(),
      mapPosition: this.getMapPosition(),
    });
  }

  async loadGame(slot: 1 | 2 | 3): Promise<void> {
    const data = this.saveSystem.load(slot);
    if (!data) return;
    this.scene = data.scene;
    this.player = clonePlayer(data.player);
    this.mapPosition = { ...data.mapPosition };
    this.flags = { ...data.flags };

    for (const entry of this.getInventory()) {
      this.removeItem(entry.itemId, entry.quantity);
    }
    for (const entry of data.inventory) {
      this.addItem(entry.itemId, entry.quantity);
    }

    for (const [questId, state] of Object.entries(data.quests)) {
      if (state === 'ACTIVE') this.activateQuest(questId);
      if (state === 'COMPLETED') {
        this.activateQuest(questId);
        this.completeQuest(questId);
      }
    }
  }
}

export function createRuntimeAdapter(): GameStateAdapter {
  return new RuntimeGameState();
}
