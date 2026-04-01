# Map System Design

**Date:** 2026-03-31  
**Feature:** Hybrid Tile/Zone Map System

---

## Overview

Redesign the village map from procedural drawing to a proper system with tile-based rendering and rectangular collision zones. This creates separation between visual representation and collision logic, making the map easier to expand, maintain, and style.

## Architecture

```
┌─────────────────────────────────────────┐
│           PlayableGame.ts               │
│  (renders canvas, handles input)         │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   ┌─────────┐   ┌─────────────┐
   │Renderer │   │Collision    │
   │(tiles)  │   │(zones)      │
   └─────────┘   └─────────────┘
```

- **Renderer** draws visual tiles based on grid position
- **Collision** checks rectangular zones against player position
- **Model** (GameLoopModel) coordinates both

## Data Structures

### Tile Definition

```typescript
interface Tile {
  type: 'grass' | 'path' | 'water' | 'wall' | 'floor';
  variant?: number; // 0-3 for visual variety
}

type WorldGrid = Tile[][];
```

### Collision Zone Definition

```typescript
interface CollisionZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'fence' | 'water' | 'decor';
}

type CollisionSystem = CollisionZone[];
```

### Map Data

```typescript
interface MapData {
  grid: WorldGrid;
  zones: CollisionSystem;
  tilesize: number;
  width: number;  // in tiles
  height: number; // in tiles
}
```

**Key separation:**
- `grid` = what to DRAW (visual)
- `zones` = what to BLOCK (collision)

## Rendering System

### Tile-based Drawing

```typescript
class MapRenderer {
  constructor(
    private ctx: CanvasRenderingContext2D,
    private tilesize: number = 16,
  ) {}

  drawTile(x: number, y: number, tile: Tile): void {
    const px = x * this.tilesize;
    const py = y * this.tilesize;

    switch (tile.type) {
      case 'grass':
        this.drawGrass(px, py, tile.variant);
        break;
      case 'path':
        this.drawPath(px, py);
        break;
      case 'water':
        this.drawWater(px, py);
        break;
      case 'wall':
        this.drawWall(px, py);
        break;
      case 'floor':
        this.drawFloor(px, py);
        break;
    }
  }
}
```

**Visual style per tile type:**
- `grass` - Green with variant noise for natural look
- `path` - Brown/dirt tones, worn edges
- `water` - Blue with subtle shimmer animation
- `wall` - Stone texture, brick pattern
- `floor` - Stone tiles for indoor areas

## Collision System

### Zone-based Collision

```typescript
class CollisionSystem {
  constructor(private zones: CollisionZone[]) {}

  isBlocked(x: number, y: number, width: number, height: number): boolean {
    const playerRect = { x, y, width, height };

    for (const zone of this.zones) {
      if (this.rectIntersect(playerRect, zone)) {
        return true;
      }
    }
    return false;
  }

  private rectIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: CollisionZone,
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  resolvePosition(
    pos: { x: number; y: number },
    size: { width: number; height: number },
    desired: { x: number; y: number },
  ): { x: number; y: number } {
    const newX = desired.x;
    const newY = desired.y;

    // Try full movement
    if (!this.isBlocked(newX, newY, size.width, size.height)) {
      return { x: newX, y: newY };
    }

    // Try horizontal only (slide along walls)
    if (!this.isBlocked(newX, pos.y, size.width, size.height)) {
      return { x: newX, y: pos.y };
    }

    // Try vertical only
    if (!this.isBlocked(pos.x, newY, size.width, size.height)) {
      return { x: pos.x, y: newY };
    }

    // Blocked completely
    return pos;
  }
}
```

**Key behaviors:**
- Full movement → partial movement → blocked (slide along walls)
- Works with any sized player/npc
- Easy to add/remove zones dynamically

## Integration

### GameLoopModel Update Flow

```typescript
class GameLoopModel {
  private mapData: MapData;
  private collision: CollisionSystem;

  constructor() {
    this.mapData = loadVillageMap();
    this.collision = new CollisionSystem(this.mapData.zones);
  }

  update(input: InputState, dtMs: number): void {
    const distance = this.player.speedPerSec * (dtMs / 1000);
    const desired = this.calculateDesiredPosition(input, distance);

    const resolved = this.collision.resolvePosition(
      { x: this.player.x, y: this.player.y },
      { width: this.player.width, height: this.player.height },
      desired,
    );

    this.player.x = resolved.x;
    this.player.y = resolved.y;
  }
}
```

**The flow:**
1. Input → calculate desired position
2. Collision.resolvePosition → tries movement, slides along walls
3. Player position updated

## Map Size

- Small world: ~1-2 screens (640x360 pixels with 16px tiles = 40x22.5 tiles)
- Tile size: 16 pixels

## Future Considerations

- Map editor for visual tile placement
- Multiple maps for different areas (town, forest, dungeon)
- Dynamic zones (doors that open/close)
- Layered rendering (foreground elements)