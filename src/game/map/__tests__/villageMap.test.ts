import { describe, expect, it } from 'vitest';
import { loadVillageMap } from '../villageMap';

describe('loadVillageMap', () => {
  const map = loadVillageMap();

  it('returns a grid with at least 22 rows and 40 columns', () => {
    expect(map.grid.length).toBeGreaterThanOrEqual(22);
    expect(map.grid[0].length).toBeGreaterThanOrEqual(40);
  });

  it('uses tilesize 16', () => {
    expect(map.tilesize).toBe(16);
  });

  it('width and height match grid dimensions', () => {
    expect(map.width).toBe(map.grid[0].length);
    expect(map.height).toBe(map.grid.length);
  });

  it('has grass tiles as the default tile type', () => {
    expect(map.grid[0][0].type).toBe('grass');
  });

  it('has path tiles at the Market Road rows (rows 9-10)', () => {
    expect(map.grid[9][20].type).toBe('path');
    expect(map.grid[10][20].type).toBe('path');
  });

  it('has path tiles at the North-South crossroad columns (cols 17-18)', () => {
    expect(map.grid[5][17].type).toBe('path');
    expect(map.grid[5][18].type).toBe('path');
  });

  it('has water tiles at the River Veil rows (rows 16-18)', () => {
    expect(map.grid[16][20].type).toBe('water');
    expect(map.grid[17][20].type).toBe('water');
  });

  it('has wall tiles in the Elder Hall building area (cols 2-7, rows 4-7)', () => {
    expect(map.grid[4][3].type).toBe('wall');
    expect(map.grid[6][5].type).toBe('wall');
  });

  it('defines at least one collision zone', () => {
    expect(map.zones.length).toBeGreaterThan(0);
  });

  it('includes the river-veil collision zone at y=256', () => {
    const river = map.zones.find((z) => z.id === 'river-veil');
    expect(river).toBeDefined();
    expect(river!.y).toBe(256);
    expect(river!.width).toBe(640);
    expect(river!.type).toBe('water');
  });

  it('all zones have positive width and height', () => {
    for (const zone of map.zones) {
      expect(zone.width).toBeGreaterThan(0);
      expect(zone.height).toBeGreaterThan(0);
    }
  });
});
