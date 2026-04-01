/**
 * FUN — MOMENT-TO-MOMENT TESTS (Layer 3)
 *
 * Verify each interaction gives immediate, visible feedback.
 * Tests only invariants NOT already covered by playtest.test.ts.
 *
 * New invariants tested: MM-3, MM-5, MM-7
 * Already covered: MM-1, MM-2, MM-4 (in playtest.test.ts)
 * Spec: fun/moment-to-moment.md
 */

import { describe, expect, it } from 'vitest';

import { MemoryStorageAdapter } from '../../engine/save/SaveSystem';
import { RuntimeGameState } from '../GameRuntime';

function rt(): RuntimeGameState {
  const r = new RuntimeGameState(new MemoryStorageAdapter());
  r.setSeed(42);
  return r;
}

describe('Fun: Moment-to-Moment', () => {
  describe('MM-3: Dialog choices produce visible state changes', () => {
    it('elder dialog sets flag and activates quest (two visible changes)', () => {
      const game = rt();
      const flagsBefore = { ...game.getFlags() };
      const questsBefore = { ...game.getQuestState() };

      game.triggerDialog('npc-village-elder');
      game.choose(0);

      const flagsAfter = game.getFlags();
      const questsAfter = game.getQuestState();

      // At least one flag changed
      const flagChanged = Object.keys(flagsAfter).some(
        (k) => flagsAfter[k] !== flagsBefore[k],
      );
      expect(flagChanged, 'No flag changed after dialog choice').toBe(true);

      // At least one quest state changed
      const questChanged = Object.keys(questsAfter).some(
        (k) => questsAfter[k] !== questsBefore[k],
      );
      expect(questChanged, 'No quest changed after dialog choice').toBe(true);
    });

    it('faction dialog produces exclusive flag change (visible consequence)', () => {
      const game = rt();
      game.triggerDialog('npc-faction-leader');
      game.choose(0); // guard

      expect(game.getFlags()['joined-guard']).toBe(true);
      expect(game.getFlags()['joined-mages']).toBe(false);
    });
  });

  describe('MM-5: Battle state exposes combat events', () => {
    it('battle state has outcome and rewards after resolution', () => {
      const game = rt();
      game.startBattle(['slime']);
      game.endBattle('win');

      const battle = game.getBattleState();
      expect(battle).toBeDefined();
      expect(battle?.outcome).toBe('win');
      expect(battle?.expGained).toBeGreaterThan(0);
    });
  });

  describe('MM-7: Scene transitions are immediate', () => {
    it('boss win transitions to VictoryScene on the same call', () => {
      const game = rt();
      game.triggerDialog('npc-village-elder');
      game.choose(0);
      game.startBattle(['goblin-boss']);
      game.endBattle('win');

      // Scene should already be VictoryScene — no extra step needed
      expect(game.getScene()).toBe('VictoryScene');
    });

    it('death transitions to GameOverScene on the same call', () => {
      const game = rt();
      game.setPlayerStat('hp', 1);
      game.startBattle(['goblin-boss']);
      game.stepFrames(300);

      expect(game.getScene()).toBe('GameOverScene');
    });
  });
});
