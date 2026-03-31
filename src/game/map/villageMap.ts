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

export function loadVillageMap(): MapData {
  const grid = makeGrid();

  // Market Road — horizontal path, rows 9-10
  fill(grid, 0, 9, COLS, 2, { type: 'path' });

  // North-South crossroad — vertical path, cols 17-18, rows 0-15
  fill(grid, 17, 0, 2, 16, { type: 'path' });

  // Crossroad intersection floor
  fill(grid, 17, 9, 2, 2, { type: 'floor' });

  // River Veil — rows 16-18
  fill(grid, 0, 16, COLS, 3, { type: 'water' });

  // Buildings (wall tiles — visual only)
  fill(grid, 2, 4, 6, 4, { type: 'wall' });   // Elder Hall (collision zone below)
  fill(grid, 9, 2, 7, 5, { type: 'wall' });   // Hunter Lodge (NPCs inside — no collision zone)
  fill(grid, 22, 2, 8, 6, { type: 'wall' });  // Faction Plaza (NPCs inside — no collision zone)
  fill(grid, 33, 8, 6, 5, { type: 'wall' });  // Guard Barracks (NPCs inside — no collision zone)

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
