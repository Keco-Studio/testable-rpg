import type { CollisionZone, MapData, Tile, WorldGrid } from './types';

const TILE_SIZE = 16;
const COLS = 40; // 640 / 16
const ROWS = 23; // ceil(360 / 16) — last row partially visible

function makeGrid(): WorldGrid {
  const grid: WorldGrid = [];
  for (let row = 0; row < ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < COLS; col++) {
      const variant = (row * 7 + col * 3) % 4;
      grid[row][col] = { type: 'grass', variant };
    }
  }
  return grid;
}

function fill(grid: WorldGrid, col: number, row: number, cols: number, rows: number, tile: Tile): void {
  for (let r = row; r < row + rows && r < grid.length; r++) {
    for (let c = col; c < col + cols && c < grid[r].length; c++) {
      grid[r][c] = tile;
    }
  }
}

function fillBuilding(grid: WorldGrid, col: number, row: number, cols: number, rows: number): void {
  for (let r = row; r < row + rows && r < grid.length; r++) {
    for (let c = col; c < col + cols && c < grid[r].length; c++) {
      // Vary the variant so no 5x5+ area is uniform
      const variant = ((r - row) * 3 + (c - col) * 5) % 4;
      grid[r][c] = { type: 'wall', variant };
    }
  }
}

export function loadVillageMap(): MapData {
  const grid = makeGrid();

  // North-South crossroad — vertical path, cols 17-18, rows 0-15
  fill(grid, 17, 0, 2, 16, { type: 'path' });

  // River Veil — rows 16-18
  fill(grid, 0, 16, COLS, 3, { type: 'water' });

  // Buildings (wall tiles with variant — visual only)
  fillBuilding(grid, 2, 4, 6, 4);   // Elder Hall (collision zone below)
  fillBuilding(grid, 9, 2, 7, 5);   // Hunter Lodge (NPCs inside — no collision zone)
  fillBuilding(grid, 22, 2, 8, 6);  // Faction Plaza (NPCs inside — no collision zone)
  fillBuilding(grid, 33, 8, 6, 5);  // Guard Barracks (NPCs inside — no collision zone)

  // Market Road — horizontal path, rows 9-10 (drawn after buildings so it cuts through)
  fill(grid, 0, 9, COLS, 2, { type: 'path' });

  // Crossroad intersection floor
  fill(grid, 17, 9, 2, 2, { type: 'floor' });

  const zones: CollisionZone[] = [
    { id: 'river-veil', x: 0, y: 256, width: 640, height: 48, type: 'water' },
  ];

  return {
    grid,
    zones,
    tilesize: TILE_SIZE,
    width: COLS,
    height: ROWS,
  };
}
