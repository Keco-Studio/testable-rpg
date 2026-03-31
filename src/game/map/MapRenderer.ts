import type { MapData, Tile } from './types';

type TileColors = Record<Tile['type'], string[]>;

const COLORS: TileColors = {
  grass: ['#254a36', '#2a5040', '#2f6244', '#274d38'],
  path:  ['#8d7a5f', '#7d6a4f', '#8d7a5f', '#7d6a4f'],
  water: ['#3f83a8', '#4892b8', '#3f83a8', '#3a7da0'],
  wall:  ['#4c3e2d', '#4a3c2a', '#4c3e2d', '#4a3c2a'],
  floor: ['#3d322a', '#3a302a', '#3d322a', '#3a302a'],
};

export class MapRenderer {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly mapData: MapData,
  ) {}

  draw(): void {
    const { grid, tilesize } = this.mapData;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const tile = grid[row][col];
        this.drawTile(col * tilesize, row * tilesize, tile, tilesize);
      }
    }
    this.drawLabels();
  }

  private drawTile(px: number, py: number, tile: Tile, size: number): void {
    const colors = COLORS[tile.type];
    const variant = tile.variant ?? 0;
    this.ctx.fillStyle = colors[variant % colors.length];
    this.ctx.fillRect(px, py, size, size);

    if (tile.type === 'grass' && variant % 3 === 0) {
      this.ctx.fillStyle = '#1f3d2d';
      this.ctx.fillRect(px, py, size, 1);
    }
    if (tile.type === 'water') {
      this.ctx.fillStyle = '#61a7c7';
      this.ctx.fillRect(px, py, size, 2);
    }
    if (tile.type === 'wall') {
      this.ctx.strokeStyle = '#3c3020';
      this.ctx.lineWidth = 0.5;
      this.ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
    }
    if (tile.type === 'path') {
      this.ctx.fillStyle = '#d7c7a3';
      this.ctx.fillRect(px + size / 2 - 1, py + 2, 2, size - 4);
    }
  }

  private drawLabels(): void {
    this.ctx.fillStyle = '#dbeafe';
    this.ctx.font = '11px monospace';
    this.ctx.fillText('NORTH GATE', 270, 16);
    this.ctx.fillText('MARKET ROAD', 16, 148);
    this.ctx.fillText('RIVER VEIL', 16, 258);
    this.ctx.fillText('ELDER HALL', 34, 60);
    this.ctx.fillText('HUNTER LODGE', 146, 132);
    this.ctx.fillText('FACTION PLAZA', 334, 132);
    this.ctx.fillText('GUARD BARRACKS', 500, 214);
  }
}
