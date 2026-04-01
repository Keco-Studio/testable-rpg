/**
 * FUN — WORLD FEEL TESTS (Layer 2)
 *
 * Verify the map feels like a real place. These tests check
 * spatial logic, path connectivity, zone variety, and tile diversity.
 *
 * Invariants: WF-3 through WF-7 (WF-1, WF-2 require visual tests)
 * Spec: fun/world-feel.md
 */

import { describe, expect, it } from 'vitest';

import { loadVillageMap } from '../../game/map/villageMap';

// NPC positions from GameLoopModel (matches actual game data)
const NPC_POSITIONS = [
  { id: 'village-elder',   x: 188, y: 86,  building: 'elder-hall' },
  { id: 'hunter-roan',     x: 244, y: 138, building: 'hunter-lodge' },
  { id: 'faction-leader',  x: 156, y: 96,  building: 'elder-hall' },
  { id: 'guard-captain',   x: 470, y: 104, building: 'guard-barracks' },
  { id: 'arch-mage',       x: 530, y: 160, building: 'faction-plaza' },
];

// Building zones (tile coordinates from villageMap.ts fill() calls)
const BUILDING_ZONES = [
  { id: 'elder-hall',     colStart: 2,  rowStart: 4, cols: 6, rows: 4 },
  { id: 'hunter-lodge',   colStart: 9,  rowStart: 2, cols: 7, rows: 5 },
  { id: 'faction-plaza',  colStart: 22, rowStart: 2, cols: 8, rows: 6 },
  { id: 'guard-barracks', colStart: 33, rowStart: 8, cols: 6, rows: 5 },
];

const TILE_SIZE = 16;

describe('Fun: World Feel', () => {
  const map = loadVillageMap();

  describe('WF-3: Paths connect points of interest', () => {
    it('horizontal path (Market Road) spans the full map width', () => {
      for (let col = 0; col < map.width; col++) {
        const tile = map.grid[9][col];
        expect(
          tile.type === 'path' || tile.type === 'floor',
          `Market Road gap at col ${col}`,
        ).toBe(true);
      }
    });

    it('vertical path connects north gate to market road', () => {
      for (let row = 0; row < 16; row++) {
        const tile = map.grid[row][17];
        expect(
          tile.type === 'path' || tile.type === 'floor',
          `North-South path gap at row ${row}`,
        ).toBe(true);
      }
    });
  });

  describe('WF-4: NPCs are near their buildings', () => {
    for (const npc of NPC_POSITIONS) {
      it(`${npc.id} is within 160px of ${npc.building}`, () => {
        const building = BUILDING_ZONES.find((b) => b.id === npc.building);
        expect(building, `Building ${npc.building} not found`).toBeDefined();
        if (!building) return;

        const bx = (building.colStart + building.cols / 2) * TILE_SIZE;
        const by = (building.rowStart + building.rows / 2) * TILE_SIZE;

        const dist = Math.sqrt((npc.x - bx) ** 2 + (npc.y - by) ** 2);
        expect(
          dist,
          `${npc.id} is ${dist.toFixed(0)}px from ${npc.building} center`,
        ).toBeLessThanOrEqual(160);
      });
    }
  });

  describe('WF-5: At least 3 distinct visual zones', () => {
    it('map contains at least 3 tile types', () => {
      const types = new Set<string>();
      for (const row of map.grid) {
        for (const tile of row) {
          types.add(tile.type);
        }
      }
      expect(types.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('WF-6: Collision zones match visual boundaries', () => {
    it('river collision zone covers water tile rows', () => {
      const riverZone = map.zones.find((z) => z.id === 'river-veil');
      expect(riverZone).toBeDefined();
      if (!riverZone) return;

      const waterStartY = 16 * TILE_SIZE;
      const waterEndY = 19 * TILE_SIZE;

      expect(riverZone.y).toBeLessThanOrEqual(waterStartY);
      expect(riverZone.y + riverZone.height).toBeGreaterThanOrEqual(waterEndY - TILE_SIZE);
    });
  });

  describe('WF-7: No large uniform tile blocks', () => {
    it('no 5x5 area of identical tile type and variant', () => {
      const grid = map.grid;
      for (let row = 0; row <= grid.length - 5; row++) {
        for (let col = 0; col <= grid[0].length - 5; col++) {
          const ref = grid[row][col];
          let allSame = true;
          for (let dr = 0; dr < 5 && allSame; dr++) {
            for (let dc = 0; dc < 5 && allSame; dc++) {
              const tile = grid[row + dr][col + dc];
              if (tile.type !== ref.type || tile.variant !== ref.variant) {
                allSame = false;
              }
            }
          }
          expect(
            allSame,
            `Uniform 5x5 block of ${ref.type}:${ref.variant} at (${col},${row})`,
          ).toBe(false);
        }
      }
    });
  });
});
