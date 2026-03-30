import { Inventory, type Item } from '../engine/inventory/InventorySystem';
import { QuestSystem, type QuestDefinition } from '../engine/quest/QuestSystem';
import { DialogSystem } from '../engine/dialog/DialogSystem';
import { SaveSystem, type StorageAdapter } from '../engine/save/SaveSystem';
import { SeededRNG } from '../engine/rng/SeededRNG';
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

const ITEM_CATALOG: Record<string, Item> = {
  'health-potion': { id: 'health-potion', name: 'Health Potion', stackable: true, maxStack: 10 },
  sword: { id: 'sword', name: 'Iron Sword', stackable: false, maxStack: 1, equipSlot: 'weapon', statBonuses: { attack: 2 } },
  shield: { id: 'shield', name: 'Wood Shield', stackable: false, maxStack: 1, equipSlot: 'offhand', statBonuses: { defense: 2 } },
};

const QUESTS: QuestDefinition[] = [
  {
    id: 'main-quest',
    title: 'First Steps',
    prerequisites: [],
    objectives: [{ id: 'talk-elder', type: 'TALK_TO_NPC', required: 1 }],
  },
];

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

    this.dialog.registerTree({
      npcId: 'npc-village-elder',
      rootNodeId: 'root',
      nodes: [
        {
          id: 'root',
          text: 'Will you help the village?',
          choices: [
            {
              text: 'Yes',
              nextNodeId: 'accepted',
              actions: { activateQuest: 'main-quest', setFlag: { key: 'elder-greeted', value: true } },
            },
          ],
        },
        { id: 'accepted', text: 'Return when done.', choices: [] },
      ],
    });
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

  addItem(itemId: string, quantity: number): Result<void, 'UNKNOWN_ITEM'> {
    const item = ITEM_CATALOG[itemId];
    if (!item) return { ok: false, error: 'UNKNOWN_ITEM' };
    const result = this.inventory.addItem(item, quantity);
    if (!result.ok && result.error === 'INVENTORY_FULL') return { ok: false, error: 'UNKNOWN_ITEM' };
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

    this.dialogState = outcome.next;
  }

  startBattle(enemyIds: string[]): void {
    this.scene = 'BattleScene';
    this.battle = { active: true, enemies: [...enemyIds], outcome: null };
  }

  endBattle(outcome: 'win' | 'lose' | 'flee'): void {
    if (!this.battle) return;
    this.battle = { ...this.battle, active: false, outcome };
    if (outcome === 'win' && this.battle.enemies.includes('goblin-boss')) {
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
