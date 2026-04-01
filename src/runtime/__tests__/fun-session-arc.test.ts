/**
 * FUN — SESSION ARC TESTS (Layer 4)
 *
 * All SA invariants are already covered by playtest.test.ts.
 * This file exists as a reference and for future invariants.
 *
 * Existing coverage:
 *   SA-1: playtest.test.ts > "title → town → NPC → dialog → quest"
 *   SA-2: playtest.test.ts > "default player can kill a slime without dying"
 *   SA-3: playtest.test.ts > "player takes multiple hits in a boss fight"
 *   SA-4: playtest.test.ts > "player still has HP left after beating first slime"
 *   SA-5: playtest.test.ts > "player loses meaningful HP during boss fight"
 *   SA-6: playtest.test.ts > "grinding three slimes is enough exp to level up"
 *   SA-7: playtest.test.ts > "boss gives 10x more exp than slime"
 *   SA-8: playtest.test.ts > "exp is non-zero" + "loot is present"
 *   SA-9: playtest.test.ts > "active quests fail on death"
 *
 * Spec: fun/session-arc.md
 */

import { describe, expect, it } from 'vitest';

import enemyData from '../../data/enemies.json';

describe('Fun: Session Arc', () => {
  describe('SA-7: Boss rewards proportional to risk', () => {
    it('boss exp reward is at least 5x slime reward', () => {
      const slime = enemyData.find((e) => e.id === 'slime');
      const boss = enemyData.find((e) => e.id === 'goblin-boss');
      expect(slime).toBeDefined();
      expect(boss).toBeDefined();
      expect(boss!.expReward / slime!.expReward).toBeGreaterThanOrEqual(5);
    });

    it('lieutenant reward is between slime and boss', () => {
      const slime = enemyData.find((e) => e.id === 'slime');
      const lt = enemyData.find((e) => e.id === 'goblin-lieutenant');
      const boss = enemyData.find((e) => e.id === 'goblin-boss');
      expect(lt!.expReward).toBeGreaterThan(slime!.expReward);
      expect(lt!.expReward).toBeLessThan(boss!.expReward);
    });
  });

  describe('SA anti-pattern checks', () => {
    it('no enemy has 0 exp reward (ANTI-SA3: no pointless fights)', () => {
      for (const enemy of enemyData) {
        expect(
          enemy.expReward,
          `${enemy.id} has 0 exp reward`,
        ).toBeGreaterThan(0);
      }
    });
  });
});
