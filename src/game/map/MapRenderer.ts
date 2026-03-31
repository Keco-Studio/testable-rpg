import type { MapData, Tile } from './types';

type TileColors = Record<Tile['type'], string[]>;

const COLORS: TileColors = {
  grass: ['#2d6b4a', '#347a54', '#3a8860', '#2d6b4a'],
  path:  ['#a08c6c', '#8d7a5f', '#a08c6c', '#8d7a5f'],
  water: ['#2e7db8', '#3a90cc', '#2e7db8', '#4892b8'],
  wall:  ['#5c4a32', '#6a5538', '#5c4a32', '#6a5538'],
  floor: ['#4a3c28', '#564535', '#4a3c28', '#564535'],
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

    // Subtle tile grid lines on all tiles
    this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);

    if (tile.type === 'grass' && variant % 3 === 0) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
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
