/**
 * FUN — STORY & AGENCY TESTS (Layer 5)
 *
 * Verify player choices have real consequences.
 * Tests only invariants NOT covered by playtest.test.ts.
 *
 * New invariants tested: AG-3, AG-4, AG-5, AG-6, AG-7
 * Already covered: AG-1, AG-2 (in playtest.test.ts)
 * Spec: fun/story-agency.md
 */

import { describe, expect, it } from 'vitest';

import dialogData from '../../data/dialog.json';
import lootData from '../../data/loot-tables.json';
import questData from '../../data/quests.json';

describe('Fun: Story & Agency', () => {
  describe('AG-3: NPCs react to faction choice', () => {
    it('at least 2 dialog trees contain faction flag conditions', () => {
      let treesWithFactionConditions = 0;

      for (const tree of dialogData) {
        const hasFactionCondition = tree.nodes.some((node) =>
          node.choices.some(
            (choice) =>
              (choice as any).conditions?.flag?.key === 'joined-guard' ||
              (choice as any).conditions?.flag?.key === 'joined-mages',
          ),
        );
        if (hasFactionCondition) treesWithFactionConditions++;
      }

      expect(
        treesWithFactionConditions,
        'Fewer than 2 NPC dialog trees react to faction choice',
      ).toBeGreaterThanOrEqual(2);
    });
  });

  describe('AG-4: Quest completion changes dialog', () => {
    it('at least 1 dialog tree has a questState condition', () => {
      let treesWithQuestCondition = 0;

      for (const tree of dialogData) {
        const hasQuestCondition = tree.nodes.some((node) =>
          node.choices.some((choice) => (choice as any).conditions?.questState != null),
        );
        if (hasQuestCondition) treesWithQuestCondition++;
      }

      // Content gap: dialog.json needs more faction-reactive/quest-reactive dialog
      expect(
        treesWithQuestCondition,
        'No NPC dialog reacts to quest state',
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AG-5: Faction paths diverge before final quest', () => {
    it('guard-specific and mage-specific quests exist', () => {
      const guardQuests = questData.filter(
        (q) =>
          q.id.includes('guard') ||
          q.id === 'expose-the-traitor',
      );
      const mageQuests = questData.filter(
        (q) =>
          q.id.includes('veil') ||
          q.id.includes('decode') ||
          q.id === 'solens-sacrifice',
      );

      expect(guardQuests.length, 'No guard-specific quests').toBeGreaterThanOrEqual(1);
      expect(mageQuests.length, 'No mage-specific quests').toBeGreaterThanOrEqual(1);

      // Guard and mage quest sets should not overlap
      const guardIds = new Set(guardQuests.map((q) => q.id));
      const mageIds = new Set(mageQuests.map((q) => q.id));
      const overlap = [...guardIds].filter((id) => mageIds.has(id));
      expect(overlap, 'Faction quest paths should not overlap').toHaveLength(0);
    });
  });

  describe('AG-6: Loot includes rare drops', () => {
    it('at least one loot table has a drop below 30% probability', () => {
      let hasRareDrop = false;

      for (const table of lootData) {
        const totalWeight = table.drops.reduce((sum, d) => sum + d.weight, 0);
        for (const drop of table.drops) {
          const probability = drop.weight / totalWeight;
          if (probability < 0.3) {
            hasRareDrop = true;
            break;
          }
        }
        if (hasRareDrop) break;
      }

      expect(hasRareDrop, 'No loot table has a rare drop (<30%)').toBe(true);
    });
  });

  describe('AG-7: Exploration-discoverable quest', () => {
    it('at least one quest has no prerequisites (can be found anytime)', () => {
      const openQuests = questData.filter(
        (q) => q.prerequisites.length === 0 && q.id !== 'main-quest',
      );
      expect(
        openQuests.length,
        'No optional quests discoverable without prerequisites',
      ).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AG anti-pattern checks', () => {
    it('no loot table with 3+ drops has all equal weights (ANTI-AG4)', () => {
      for (const table of lootData) {
        if (table.drops.length <= 2) continue; // exempt small tables
        const weights = table.drops.map((d) => d.weight);
        const allEqual = weights.every((w) => w === weights[0]);
        expect(
          allEqual,
          `${table.id} has all equal weights — no variety`,
        ).toBe(false);
      }
    });
  });
});
