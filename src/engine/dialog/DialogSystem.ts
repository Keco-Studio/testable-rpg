export interface DialogCondition {
  minLevel?: number;
  hasItem?: string;
  questState?: { questId: string; state: string };
  flag?: { key: string; value: boolean };
}

export interface DialogAction {
  giveItem?: { itemId: string; quantity?: number };
  activateQuest?: string;
  setFlag?: { key: string; value: boolean };
}

export interface DialogChoice {
  text: string;
  nextNodeId: string;
  conditions?: DialogCondition;
  actions?: DialogAction;
}

export interface DialogNode {
  id: string;
  text: string;
  choices: DialogChoice[];
}

export interface DialogTree {
  npcId: string;
  rootNodeId: string;
  nodes: DialogNode[];
}

export interface DialogContext {
  level: number;
  inventory: Record<string, number>;
  quests: Record<string, string>;
  flags: Record<string, boolean>;
}

export interface DialogRuntime {
  npcId: string;
  nodeId: string;
  text: string;
  choices: Array<{ index: number; text: string }>;
}

export interface DialogMutations {
  addItems: Array<{ itemId: string; quantity: number }>;
  activateQuests: string[];
  flags: Array<{ key: string; value: boolean }>;
}

export class DialogSystem {
  private readonly trees = new Map<string, DialogTree>();

  registerTree(tree: DialogTree): void {
    this.trees.set(tree.npcId, {
      ...tree,
      nodes: tree.nodes.map((node) => ({ ...node, choices: node.choices.map((choice) => ({ ...choice })) })),
    });
  }

  triggerDialog(npcId: string, context: DialogContext): DialogRuntime | null {
    const tree = this.trees.get(npcId);
    if (!tree) return null;
    return this.nodeToRuntime(tree, tree.rootNodeId, context);
  }

  choose(
    npcId: string,
    currentNodeId: string,
    choiceIndex: number,
    context: DialogContext,
  ): { next: DialogRuntime | null; mutations: DialogMutations } {
    const tree = this.trees.get(npcId);
    if (!tree) return { next: null, mutations: { addItems: [], activateQuests: [], flags: [] } };
    const node = tree.nodes.find((entry) => entry.id === currentNodeId);
    if (!node) return { next: null, mutations: { addItems: [], activateQuests: [], flags: [] } };

    const available = node.choices.filter((choice) => this.isChoiceAvailable(choice, context));
    const choice = available[choiceIndex];
    if (!choice) return { next: null, mutations: { addItems: [], activateQuests: [], flags: [] } };

    const mutations: DialogMutations = { addItems: [], activateQuests: [], flags: [] };
    if (choice.actions?.giveItem) {
      mutations.addItems.push({ itemId: choice.actions.giveItem.itemId, quantity: choice.actions.giveItem.quantity ?? 1 });
    }
    if (choice.actions?.activateQuest) {
      mutations.activateQuests.push(choice.actions.activateQuest);
    }
    if (choice.actions?.setFlag) {
      mutations.flags.push(choice.actions.setFlag);
    }

    return {
      next: this.nodeToRuntime(tree, choice.nextNodeId, context),
      mutations,
    };
  }

  private nodeToRuntime(tree: DialogTree, nodeId: string, context: DialogContext): DialogRuntime | null {
    const node = tree.nodes.find((entry) => entry.id === nodeId);
    if (!node) return null;
    const choices = node.choices
      .filter((choice) => this.isChoiceAvailable(choice, context))
      .map((choice, index) => ({ index, text: choice.text }));
    return { npcId: tree.npcId, nodeId: node.id, text: node.text, choices };
  }

  private isChoiceAvailable(choice: DialogChoice, context: DialogContext): boolean {
    const c = choice.conditions;
    if (!c) return true;
    if (typeof c.minLevel === 'number' && context.level < c.minLevel) return false;
    if (c.hasItem && (context.inventory[c.hasItem] ?? 0) <= 0) return false;
    if (c.questState && context.quests[c.questState.questId] !== c.questState.state) return false;
    if (c.flag && (context.flags[c.flag.key] ?? false) !== c.flag.value) return false;
    return true;
  }
}
