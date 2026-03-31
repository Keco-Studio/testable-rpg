import { deriveActFlags, resolveFactionGate } from '../engine/storyline/StorylineEngine';
import { CollisionSystem } from './map/CollisionSystem';
import { loadVillageMap } from './map/villageMap';

export type SceneName = 'TitleScene' | 'TownScene' | 'BattleScene' | 'VictoryScene' | 'GameOverScene';

type QuestState = 'INACTIVE' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
type QuestId =
  | 'main-quest'
  | 'slime-hunt'
  | 'faction-choice'
  | 'guard-patrol'
  | 'veil-mending'
  | 'guard-march'
  | 'expose-the-traitor'
  | 'decode-the-ruins'
  | 'solens-sacrifice'
  | 'defeat-the-lieutenant'
  | 'final-confrontation';

interface DialogChoice {
  text: string;
  action: () => void;
}

interface BattleSnapshot {
  active: boolean;
  enemies: string[];
  outcome: 'win' | 'lose' | 'flee' | null;
}

export interface GameLoopState {
  scene: SceneName;
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    speedPerSec: number;
    hp: number;
    maxHp: number;
    level: number;
    exp: number;
  };
  world: {
    width: number;
    height: number;
  };
  npcs: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
  }>;
  dialog: {
    open: boolean;
    npcId: string | null;
    text: string;
    choices: string[];
  };
  faction: 'none' | 'guard' | 'mages';
  quests: Record<QuestId, QuestState>;
  flags: Record<string, boolean>;
  inventory: Array<{ itemId: string; quantity: number }>;
  battle: BattleSnapshot | null;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function questSeed(): Record<QuestId, QuestState> {
  return {
    'main-quest': 'INACTIVE',
    'slime-hunt': 'INACTIVE',
    'faction-choice': 'INACTIVE',
    'guard-patrol': 'INACTIVE',
    'veil-mending': 'INACTIVE',
    'guard-march': 'INACTIVE',
    'expose-the-traitor': 'INACTIVE',
    'decode-the-ruins': 'INACTIVE',
    'solens-sacrifice': 'INACTIVE',
    'defeat-the-lieutenant': 'INACTIVE',
    'final-confrontation': 'INACTIVE',
  };
}

export class GameLoopModel {
  private state: GameLoopState = {
    scene: 'TitleScene',
    player: {
      x: 128,
      y: 96,
      width: 16,
      height: 16,
      speedPerSec: 110,
      hp: 30,
      maxHp: 30,
      level: 1,
      exp: 0,
    },
    world: {
      width: 640,
      height: 360,
    },
    npcs: [
      { id: 'village-elder', x: 188, y: 86, width: 16, height: 16, title: 'Elder Aldric' },
      { id: 'hunter-roan', x: 244, y: 138, width: 16, height: 16, title: 'Hunter Roan' },
      { id: 'faction-leader', x: 156, y: 96, width: 16, height: 16, title: 'Kael Thornback' },
      { id: 'guard-captain', x: 470, y: 104, width: 16, height: 16, title: 'Captain Vera' },
      { id: 'arch-mage', x: 530, y: 160, width: 16, height: 16, title: 'Arch-Mage Solen' },
      { id: 'npc-sergeant-davan', x: 320, y: 80, width: 16, height: 16, title: 'Sergeant Davan' },
      { id: 'npc-officer-crest', x: 360, y: 100, width: 16, height: 16, title: 'Officer Crest' },
      { id: 'npc-scholar-lira', x: 420, y: 140, width: 16, height: 16, title: 'Scholar Lira' },
      { id: 'npc-solen-sacrifice', x: 560, y: 180, width: 16, height: 16, title: 'Arch-Mage Solen' },
      { id: 'npc-lieutenant-herald', x: 480, y: 80, width: 16, height: 16, title: 'Veil Ruins Herald' },
      { id: 'npc-sanctum-herald', x: 500, y: 120, width: 16, height: 16, title: 'Sanctum Herald' },
      { id: 'npc-epilog', x: 540, y: 160, width: 16, height: 16, title: 'Epilog Narrator' },
    ],
    dialog: {
      open: false,
      npcId: null,
      text: '',
      choices: [],
    },
    faction: 'none',
    quests: questSeed(),
    flags: {},
    inventory: [],
    battle: null,
  };

  private currentDialogChoices: DialogChoice[] = [];
  private overlapPadding = 18;
  private slimeKills = 0;
  private scoutKills = 0;
  private defeatedBoss = false;
  private readonly collision: CollisionSystem;

  constructor() {
    const mapData = loadVillageMap();
    this.collision = new CollisionSystem(mapData.zones);
  }

  getState(): GameLoopState {
    return clone(this.state);
  }

  reset(): void {
    this.state.scene = 'TitleScene';
    this.state.player.x = 128;
    this.state.player.y = 96;
    this.state.player.hp = this.state.player.maxHp;
    this.state.player.level = 1;
    this.state.player.exp = 0;
    this.state.dialog = { open: false, npcId: null, text: '', choices: [] };
    this.state.faction = 'none';
    this.state.quests = questSeed();
    this.state.flags = {};
    this.state.inventory = [];
    this.state.battle = null;
    this.currentDialogChoices = [];
    this.slimeKills = 0;
    this.scoutKills = 0;
    this.defeatedBoss = false;
  }

  enterTownFromTitle(): void {
    if (this.state.scene === 'TitleScene') {
      this.state.scene = 'TownScene';
      this.state.quests['faction-choice'] = 'ACTIVE';
    }
  }

  returnToTown(): void {
    if (this.state.scene === 'VictoryScene' || this.state.scene === 'GameOverScene') {
      this.state.scene = 'TownScene';
    }
  }

  private chooseEncounter(): string[] {
    if (this.state.quests['main-quest'] === 'ACTIVE' && !this.defeatedBoss) {
      return ['goblin-boss'];
    }
    if (this.state.quests['guard-patrol'] === 'ACTIVE' && this.scoutKills < 2) {
      return ['goblin-scout'];
    }
    if (this.state.quests['slime-hunt'] === 'ACTIVE' && this.slimeKills < 3) {
      return ['slime'];
    }
    return ['slime'];
  }

  startBattle(): void {
    if (this.state.scene !== 'TownScene' || this.state.dialog.open) return;
    this.state.scene = 'BattleScene';
    this.state.battle = { active: true, enemies: this.chooseEncounter(), outcome: null };
  }

  startBattleWith(enemyIds: string[]): void {
    if (this.state.scene !== 'TownScene' || this.state.dialog.open) return;
    const enemies = enemyIds.length > 0 ? [...enemyIds] : this.chooseEncounter();
    this.state.scene = 'BattleScene';
    this.state.battle = { active: true, enemies, outcome: null };
  }

  private grantItem(itemId: string, quantity = 1): void {
    const slot = this.state.inventory.find((entry) => entry.itemId === itemId);
    if (slot) {
      slot.quantity += quantity;
      return;
    }
    this.state.inventory.push({ itemId, quantity });
  }

  private grantExp(amount: number): void {
    this.state.player.exp += amount;
    while (this.state.player.exp >= this.state.player.level * 20) {
      this.state.player.level += 1;
      this.state.player.maxHp += 6;
      this.state.player.hp = this.state.player.maxHp;
    }
  }

  private onBattleWin(): void {
    const enemies = this.state.battle?.enemies ?? [];
    for (const enemyId of enemies) {
      if (enemyId === 'slime') {
        this.slimeKills += 1;
        this.grantExp(3);
        if (this.slimeKills >= 3) {
          this.state.quests['slime-hunt'] = 'COMPLETED';
        }
      }
      if (enemyId === 'goblin-scout') {
        this.scoutKills += 1;
        this.grantExp(8);
        if (this.scoutKills >= 2) {
          this.state.quests['guard-patrol'] = 'COMPLETED';
        }
      }
      if (enemyId === 'goblin-boss') {
        this.grantExp(18);
        this.defeatedBoss = true;
        this.state.quests['main-quest'] = 'COMPLETED';
        if (this.state.quests['final-confrontation'] === 'ACTIVE') {
          this.state.quests['final-confrontation'] = 'COMPLETED';
        }
      }
      if (enemyId === 'goblin-lieutenant') {
        this.grantExp(12);
        this.state.flags['lieutenant-defeated'] = true;
        this.state.quests['defeat-the-lieutenant'] = 'COMPLETED';
        const derived = deriveActFlags(this.state.flags);
        for (const [k, v] of Object.entries(derived)) {
          if (v !== undefined) this.state.flags[k] = v as boolean;
        }
      }
    }
    if (enemies.includes('goblin-boss')) {
      this.state.scene = 'VictoryScene';
      return;
    }
    this.state.scene = 'VictoryScene';
  }

  resolveBattle(outcome: 'win' | 'lose' | 'flee'): void {
    if (this.state.scene !== 'BattleScene') return;
    if (!this.state.battle) return;

    this.state.battle = { ...this.state.battle, active: false, outcome };
    if (outcome === 'win') {
      this.onBattleWin();
      return;
    }
    if (outcome === 'lose') {
      this.state.scene = 'GameOverScene';
      return;
    }
    this.state.scene = 'TownScene';
  }

  getNearbyNpcId(): string | null {
    if (this.state.scene !== 'TownScene') return null;
    const player = this.state.player;
    for (const npc of this.state.npcs) {
      const nearX =
        player.x + player.width >= npc.x - this.overlapPadding &&
        player.x <= npc.x + npc.width + this.overlapPadding;
      const nearY =
        player.y + player.height >= npc.y - this.overlapPadding &&
        player.y <= npc.y + npc.height + this.overlapPadding;
      if (nearX && nearY) return npc.id;
    }
    return null;
  }

  setPlayerNearNpc(npcId: string): boolean {
    const npc = this.state.npcs.find((entry) => entry.id === npcId);
    if (!npc) return false;
    this.state.player.x = clamp(npc.x - 18, 0, this.state.world.width - this.state.player.width);
    this.state.player.y = clamp(npc.y, 0, this.state.world.height - this.state.player.height);
    return true;
  }

  private openDialog(npcId: string, text: string, choices: DialogChoice[]): void {
    this.currentDialogChoices = choices;
    this.state.dialog = {
      open: true,
      npcId,
      text,
      choices: choices.map((choice) => choice.text),
    };
  }

  interact(): void {
    if (this.state.scene !== 'TownScene' || this.state.dialog.open) return;
    const npcId = this.getNearbyNpcId();
    if (!npcId) return;

    if (npcId === 'village-elder') {
      this.openDialog(
        npcId,
        'The Veil is collapsing. Gorak the Ironbreaker marches at dawn.',
        [
          {
            text: 'I will stop Gorak',
            action: () => {
              this.state.flags['elder-greeted'] = true;
              this.state.quests['main-quest'] = 'ACTIVE';
            },
          },
          { text: 'I need more time', action: () => {} },
        ],
      );
      return;
    }

    if (npcId === 'hunter-roan') {
      this.openDialog(
        npcId,
        'The eastern cave is full of slimes. Clear it before nightfall.',
        [
          {
            text: 'I will clear the cave',
            action: () => {
              this.state.flags['hunter-greeted'] = true;
              this.state.quests['slime-hunt'] = 'ACTIVE';
            },
          },
          { text: 'Not now', action: () => {} },
        ],
      );
      return;
    }

    if (npcId === 'faction-leader') {
      this.openDialog(
        npcId,
        'Choose your faction:',
        [
          {
            text: 'Join the Guard',
            action: () => {
              this.state.faction = 'guard';
              this.state.flags['joined-guard'] = true;
              this.state.flags['joined-mages'] = false;
              this.state.quests['faction-choice'] = 'COMPLETED';
            },
          },
          {
            text: 'Join the Mages',
            action: () => {
              this.state.faction = 'mages';
              this.state.flags['joined-guard'] = false;
              this.state.flags['joined-mages'] = true;
              this.state.quests['faction-choice'] = 'COMPLETED';
            },
          },
        ],
      );
      return;
    }

    if (npcId === 'guard-captain') {
      if (!resolveFactionGate(this.state.flags, 'guard')) {
        this.openDialog(npcId, 'I answer only to Iron Guard recruits.', [{ text: 'Understood', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        'Goblin scouts are probing the west gate. Hunt two of them.',
        [
          {
            text: 'I will hunt them down',
            action: () => {
              this.state.flags['captain-met'] = true;
              this.state.quests['guard-patrol'] = 'ACTIVE';
            },
          },
          { text: 'I will return later', action: () => {} },
        ],
      );
      return;
    }

    if (npcId === 'arch-mage') {
      if (!resolveFactionGate(this.state.flags, 'mages')) {
        this.openDialog(npcId, 'Only sworn mages may carry a Veil shard.', [{ text: 'I understand', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        'Take this Veil shard and restore the ancient lattice.',
        [
          {
            text: 'I will find the Veil Stone',
            action: () => {
              this.state.flags['arch-mage-met'] = true;
              this.state.quests['veil-mending'] = 'COMPLETED';
              this.grantItem('veil-shard', 1);
            },
          },
          { text: 'Maybe later', action: () => {} },
        ],
      );
    }

    if (npcId === 'npc-sergeant-davan') {
      if (!resolveFactionGate(this.state.flags, 'guard')) {
        this.openDialog(npcId, 'I answer to the Iron Guard only.', [{ text: 'Understood', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        'Sergeant Davan, Iron Guard. Captain Vera sent you? Good. The garrison at north gate is stretched thin. We need your blade on the march.',
        [
          {
            text: 'I am ready to march.',
            action: () => {
              this.state.flags['davan-met'] = true;
              this.state.quests['guard-march'] = 'ACTIVE';
            },
          },
          { text: 'Not yet', action: () => {} },
        ],
      );
      return;
    }

    if (npcId === 'npc-officer-crest') {
      if (!resolveFactionGate(this.state.flags, 'guard')) {
        this.openDialog(npcId, 'Move along, civilian.', [{ text: 'Fine', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        'Officer Crest. I... did not expect visitors. Whatever you heard — it is not what it looks like.',
        [
          {
            text: 'I am reporting this to the Captain.',
            action: () => {
              this.state.flags['guard-betrayal-exposed'] = true;
              this.state.quests['expose-the-traitor'] = 'COMPLETED';
            },
          },
          {
            text: 'I saw nothing. Carry on.',
            action: () => {
              this.state.quests['expose-the-traitor'] = 'COMPLETED';
            },
          },
        ],
      );
      return;
    }

    if (npcId === 'npc-scholar-lira') {
      if (!resolveFactionGate(this.state.flags, 'mages')) {
        this.openDialog(npcId, 'I study the ancient ruins. Only mages may enter the archive.', [{ text: 'I understand', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        'I have deciphered the Veil runes. The ancient lattice can be restored at the stone circle.',
        [
          {
            text: 'Tell me more',
            action: () => {
              this.state.flags['lira-met'] = true;
              this.state.quests['decode-the-ruins'] = 'ACTIVE';
            },
          },
          { text: 'Later', action: () => {} },
        ],
      );
      return;
    }

    if (npcId === 'npc-solen-sacrifice') {
      if (!resolveFactionGate(this.state.flags, 'mages')) {
        this.openDialog(npcId, 'The Veil must be restored. This task is for mages only.', [{ text: 'I understand', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        'I am old, but the Veil needs me still. Will you help me complete the ritual?',
        [
          {
            text: 'I will help you',
            action: () => {
              this.state.flags['solen-met'] = true;
              this.state.quests['solens-sacrifice'] = 'ACTIVE';
            },
          },
          { text: 'Not yet', action: () => {} },
        ],
      );
      return;
    }

    if (npcId === 'npc-lieutenant-herald') {
      if (!this.state.flags['act-complete-1']) {
        this.openDialog(npcId, 'You should speak with the faction leaders first. The Lieutenant can wait.', [{ text: 'Understood', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        "Gorak's Lieutenant guards the Veil Ruins. He knows you are coming. Both factions must move now — together or not at all.",
        [
          {
            text: 'We face him now.',
            action: () => {
              this.state.flags['lieutenant-briefed'] = true;
              this.state.quests['defeat-the-lieutenant'] = 'ACTIVE';
            },
          },
          {
            text: 'We are not ready yet.',
            action: () => {},
          },
        ],
      );
      return;
    }

    if (npcId === 'npc-sanctum-herald') {
      if (!this.state.flags['act-complete-2']) {
        this.openDialog(npcId, 'You must complete the Lieutenants task before entering the sanctum.', [{ text: 'Understood', action: () => {} }]);
        return;
      }
      this.openDialog(
        npcId,
        'The sanctum opens before you. Beyond lies Gorak\'s throne — the final confrontation awaits. Are you prepared?',
        [
          {
            text: 'I am ready. Let us end this.',
            action: () => {
              this.state.flags['sanctum-entered'] = true;
              this.state.quests['final-confrontation'] = 'ACTIVE';
            },
          },
          {
            text: 'I must prepare first.',
            action: () => {},
          },
        ],
      );
      return;
    }

    if (npcId === 'npc-epilog') {
      if (this.state.flags['joined-guard']) {
        this.openDialog(npcId, 'The Iron Guard welcomes you, hero. The kingdom is safer with you at our side.', [{ text: 'Continue', action: () => {} }]);
        return;
      }
      if (this.state.flags['joined-mages']) {
        this.openDialog(npcId, 'The Veil Mages honor your sacrifice. The lattice glows brighter with your name in its runes.', [{ text: 'Continue', action: () => {} }]);
        return;
      }
      this.openDialog(npcId, 'A wanderer\'s heart, yet tied to Ironveil\'s fate. The village will remember you always.', [{ text: 'Continue', action: () => {} }]);
      return;
    }
  }

  selectDialogChoice(index: number): void {
    if (!this.state.dialog.open) return;
    const selected = this.currentDialogChoices[index];
    if (selected) {
      selected.action();
    }

    const derived = deriveActFlags(this.state.flags);
    for (const [k, v] of Object.entries(derived)) {
      if (v !== undefined) this.state.flags[k] = v as boolean;
    }

    this.currentDialogChoices = [];
    this.state.dialog = {
      open: false,
      npcId: null,
      text: '',
      choices: [],
    };
  }

  update(input: InputState, dtMs: number): void {
    if (this.state.scene !== 'TownScene') return;
    if (this.state.dialog.open) return;

    const distance = this.state.player.speedPerSec * (dtMs / 1000);
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= distance;
    if (input.right) dx += distance;
    if (input.up) dy -= distance;
    if (input.down) dy += distance;

    const desired = {
      x: this.state.player.x + dx,
      y: this.state.player.y + dy,
    };
    const resolved = this.collision.resolvePosition(
      { x: this.state.player.x, y: this.state.player.y },
      { width: this.state.player.width, height: this.state.player.height },
      desired,
    );

    this.state.player.x = clamp(resolved.x, 0, this.state.world.width - this.state.player.width);
    this.state.player.y = clamp(resolved.y, 0, this.state.world.height - this.state.player.height);
  }
}
