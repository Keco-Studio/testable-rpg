// src/game/map/types.ts

export interface Tile {
  type: 'grass' | 'path' | 'water' | 'wall' | 'floor';
  variant?: number; // 0-3 for visual variety
}

export type WorldGrid = Tile[][];

export interface CollisionZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'fence' | 'water' | 'decor';
}

export interface MapData {
  grid: WorldGrid;
  zones: CollisionZone[];
  tilesize: number;
  width: number;  // in tiles
  height: number; // in tiles
}
