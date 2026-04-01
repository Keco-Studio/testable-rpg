# Hybrid Tile/Zone Map System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `drawTownMap()` with a tile-based renderer and add zone-based collision detection to player movement.

**Architecture:** A `MapRenderer` draws a `WorldGrid` of typed tiles; a `CollisionSystem` checks rectangular `CollisionZone[]` against player position and resolves movement with wall-sliding. `GameLoopModel` owns collision, `PlayableGame` owns rendering — both load their map data from `loadVillageMap()`.

**Tech Stack:** TypeScript 5.4, Vitest, Canvas 2D API

---

## File Map

| Status | File | Purpose |
|--------|------|---------|
| Create | `src/game/map/types.ts` | `Tile`, `WorldGrid`, `CollisionZone`, `MapData` interfaces |
| Create | `src/game/map/CollisionSystem.ts` | `isBlocked()` and `resolvePosition()` |
| Create | `src/game/map/villageMap.ts` | `loadVillageMap()` — grid + zone data |
| Create | `src/game/map/MapRenderer.ts` | Tile-based canvas renderer |
| Create | `src/game/map/__tests__/CollisionSystem.test.ts` | Collision unit tests |
| Create | `src/game/map/__tests__/villageMap.test.ts` | Map data validation tests |
| Modify | `src/game/GameLoopModel.ts` | Wire `CollisionSystem` into `update()` |
| Modify | `src/game/GameLoopModel.ts` | Update broken "clamps to bottom" test (river blocks first) |
| Modify | `src/game/PlayableGame.ts` | Replace `drawTownMap()` with `MapRenderer` |

---

## Task 1: Type Definitions

**Files:**
- Create: `src/game/map/types.ts`

- [ ] **Step 1: Create types file**

```typescript
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
```

- [ ] **Step 2: Verify file compiles**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors related to new file (may show pre-existing errors — ignore those).

- [ ] **Step 3: Commit**

```bash
git add src/game/map/types.ts
git commit -m "feat: add map system type definitions"
```

---

## Task 2: CollisionSystem (TDD)

**Files:**
- Create: `src/game/map/__tests__/CollisionSystem.test.ts`
- Create: `src/game/map/CollisionSystem.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/game/map/__tests__/CollisionSystem.test.ts
import { describe, expect, it } from 'vitest';
import { CollisionSystem } from '../CollisionSystem';
import type { CollisionZone } from '../types';

const box: CollisionZone = { id: 'box', x: 100, y: 100, width: 50, height: 50, type: 'building' };
const system = new CollisionSystem([box]);

describe('CollisionSystem — isBlocked', () => {
  it('returns false when player is outside zone', () => {
    expect(system.isBlocked(200, 100, 16, 16)).toBe(false);
  });

  it('returns true when player rect overlaps zone', () => {
    expect(system.isBlocked(110, 110, 16, 16)).toBe(true);
  });

  it('returns true when player is fully inside zone', () => {
    expect(system.isBlocked(120, 120, 10, 10)).toBe(true);
  });

  it('returns false when player right edge touches zone left edge exactly', () => {
    // player at x=84, width=16 → right edge = 100 (equals zone left, not >)
    expect(system.isBlocked(84, 110, 16, 16)).toBe(false);
  });

  it('returns false with no zones', () => {
    expect(new CollisionSystem([]).isBlocked(110, 110, 16, 16)).toBe(false);
  });
});

describe('CollisionSystem — resolvePosition', () => {
  it('allows full movement when destination is clear', () => {
    const result = system.resolvePosition(
      { x: 50, y: 50 },
      { width: 16, height: 16 },
      { x: 60, y: 60 },
    );
    expect(result).toEqual({ x: 60, y: 60 });
  });

  it('slides vertically when only x movement is blocked', () => {
    // Tall wall on the right
    const wall: CollisionZone = { id: 'wall', x: 100, y: 0, width: 50, height: 300, type: 'building' };
    const sys = new CollisionSystem([wall]);
    // Moving diagonally right+down into the wall
    const result = sys.resolvePosition(
      { x: 50, y: 50 },
      { width: 16, height: 16 },
      { x: 95, y: 60 }, // right edge 111 overlaps wall at 100
    );
    // horizontal blocked, vertical only (x=50, y=60) is clear
    expect(result.x).toBe(50);
    expect(result.y).toBe(60);
  });

  it('slides horizontally when only y movement is blocked', () => {
    // Wide floor obstacle below
    const floor: CollisionZone = { id: 'floor', x: 0, y: 100, width: 300, height: 50, type: 'building' };
    const sys = new CollisionSystem([floor]);
    // Moving diagonally right+down into the floor
    const result = sys.resolvePosition(
      { x: 50, y: 50 },
      { width: 16, height: 16 },
      { x: 60, y: 95 }, // bottom edge 111 overlaps floor at 100
    );
    // vertical blocked, horizontal only (x=60, y=50) is clear
    expect(result.x).toBe(60);
    expect(result.y).toBe(50);
  });

  it('returns original position when blocked in both axes', () => {
    // Right wall and floor below together trap the player
    const rightWall: CollisionZone = { id: 'r', x: 100, y: 0, width: 50, height: 300, type: 'building' };
    const downFloor: CollisionZone = { id: 'd', x: 0, y: 100, width: 300, height: 50, type: 'building' };
    const sys = new CollisionSystem([rightWall, downFloor]);
    const pos = { x: 50, y: 50 };
    const result = sys.resolvePosition(pos, { width: 16, height: 16 }, { x: 110, y: 110 });
    expect(result).toEqual(pos);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- src/game/map/__tests__/CollisionSystem.test.ts 2>&1 | tail -20
```

Expected: FAIL — `CollisionSystem` not found.

- [ ] **Step 3: Implement CollisionSystem**

```typescript
// src/game/map/CollisionSystem.ts
import type { CollisionZone } from './types';

export class CollisionSystem {
  constructor(private readonly zones: CollisionZone[]) {}

  isBlocked(x: number, y: number, width: number, height: number): boolean {
    for (const zone of this.zones) {
      if (
        x < zone.x + zone.width &&
        x + width > zone.x &&
        y < zone.y + zone.height &&
        y + height > zone.y
      ) {
        return true;
      }
    }
    return false;
  }

  resolvePosition(
    pos: { x: number; y: number },
    size: { width: number; height: number },
    desired: { x: number; y: number },
  ): { x: number; y: number } {
    if (!this.isBlocked(desired.x, desired.y, size.width, size.height)) {
      return desired;
    }
    if (!this.isBlocked(desired.x, pos.y, size.width, size.height)) {
      return { x: desired.x, y: pos.y };
    }
    if (!this.isBlocked(pos.x, desired.y, size.width, size.height)) {
      return { x: pos.x, y: desired.y };
    }
    return pos;
  }
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npm test -- src/game/map/__tests__/CollisionSystem.test.ts 2>&1 | tail -20
```

Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/map/CollisionSystem.ts src/game/map/__tests__/CollisionSystem.test.ts
git commit -m "feat: add CollisionSystem with zone-based rect intersection"
```

---

## Task 3: Village Map Data (TDD)

**Files:**
- Create: `src/game/map/__tests__/villageMap.test.ts`
- Create: `src/game/map/villageMap.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/game/map/__tests__/villageMap.test.ts
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
    // Top-left corner should be grass (not a road or building)
    expect(map.grid[0][0].type).toBe('grass');
  });

  it('has path tiles at the Market Road rows (rows 9-10)', () => {
    // Market Road runs horizontally across the middle
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

  it('includes the river-veil collision zone at y=262', () => {
    const river = map.zones.find((z) => z.id === 'river-veil');
    expect(river).toBeDefined();
    expect(river!.y).toBe(262);
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
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- src/game/map/__tests__/villageMap.test.ts 2>&1 | tail -20
```

Expected: FAIL — `loadVillageMap` not found.

- [ ] **Step 3: Implement loadVillageMap**

```typescript
// src/game/map/villageMap.ts
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

  // Buildings (wall tiles for visual distinction)
  fill(grid, 2, 4, 6, 4, { type: 'wall' });   // Elder Hall
  fill(grid, 9, 2, 7, 5, { type: 'wall' });   // Hunter Lodge
  fill(grid, 22, 2, 8, 6, { type: 'wall' });  // Faction Plaza
  fill(grid, 33, 8, 6, 5, { type: 'wall' });  // Guard Barracks

  const zones: CollisionZone[] = [
    // River Veil — player cannot walk on water
    { id: 'river-veil', x: 0, y: 262, width: 640, height: 42, type: 'water' },
    // Elder Hall — building with no NPCs inside
    { id: 'elder-hall', x: 32, y: 64, width: 96, height: 64, type: 'building' },
  ];

  return {
    grid,
    zones,
    tilesize: TILE_SIZE,
    width: COLS,
    height: ROWS,
  };
}
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npm test -- src/game/map/__tests__/villageMap.test.ts 2>&1 | tail -20
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/map/villageMap.ts src/game/map/__tests__/villageMap.test.ts
git commit -m "feat: add loadVillageMap with tile grid and collision zones"
```

---

## Task 4: MapRenderer

**Files:**
- Create: `src/game/map/MapRenderer.ts`

No unit tests — canvas rendering is covered by existing visual/e2e tests in `tests/visual/` and `tests/e2e/`.

- [ ] **Step 1: Create MapRenderer**

```typescript
// src/game/map/MapRenderer.ts
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors in new files.

- [ ] **Step 3: Commit**

```bash
git add src/game/map/MapRenderer.ts
git commit -m "feat: add tile-based MapRenderer"
```

---

## Task 5: Wire CollisionSystem into GameLoopModel

**Files:**
- Modify: `src/game/GameLoopModel.ts`
- Modify: `src/game/__tests__/GameLoopModel.test.ts`

- [ ] **Step 1: Update GameLoopModel imports and add collision field**

At the top of `src/game/GameLoopModel.ts`, add imports after the existing import:

```typescript
import { CollisionSystem } from './map/CollisionSystem';
import { loadVillageMap } from './map/villageMap';
```

Inside the `GameLoopModel` class, after the existing private fields (`currentDialogChoices`, `overlapPadding`, `slimeKills`, `scoutKills`, `defeatedBoss`), add:

```typescript
  private readonly collision: CollisionSystem;
```

- [ ] **Step 2: Initialize collision in constructor**

The class has an inline field initializer for `state`. After the class body opens (line 99), and after the `state` field declaration (ends at line 142), the class has no explicit constructor. Add a constructor before `getState()`:

```typescript
  constructor() {
    const mapData = loadVillageMap();
    this.collision = new CollisionSystem(mapData.zones);
  }
```

Place this block between the `private defeatedBoss = false;` line and the `getState()` method.

- [ ] **Step 3: Replace movement clamping with collision resolution**

Find the `update()` method (lines 612-626). Replace the body after the early-return guards:

**Old code (lines 616-625):**
```typescript
    const distance = this.state.player.speedPerSec * (dtMs / 1000);
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= distance;
    if (input.right) dx += distance;
    if (input.up) dy -= distance;
    if (input.down) dy += distance;

    this.state.player.x = clamp(this.state.player.x + dx, 0, this.state.world.width - this.state.player.width);
    this.state.player.y = clamp(this.state.player.y + dy, 0, this.state.world.height - this.state.player.height);
```

**New code:**
```typescript
    const distance = this.state.player.speedPerSec * (dtMs / 1000);
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= distance;
    if (input.right) dx += distance;
    if (input.up) dy -= distance;
    if (input.down) dy += distance;

    const desired = {
      x: this.state.player.x + dx,
      y: this.state.player.y + dy,
    };
    const resolved = this.collision.resolvePosition(
      { x: this.state.player.x, y: this.state.player.y },
      { width: this.state.player.width, height: this.state.player.height },
      desired,
    );

    this.state.player.x = clamp(resolved.x, 0, this.state.world.width - this.state.player.width);
    this.state.player.y = clamp(resolved.y, 0, this.state.world.height - this.state.player.height);
```

- [ ] **Step 4: Run existing tests to see what breaks**

```bash
npm test -- src/game/__tests__/GameLoopModel.test.ts 2>&1 | tail -30
```

Expected: most pass, but "clamps player to bottom world boundary" FAILS because the river zone at y=262 stops the player before reaching y=344.

- [ ] **Step 5: Update the broken test**

In `src/game/__tests__/GameLoopModel.test.ts`, find and replace the test "clamps player to bottom world boundary":

**Old:**
```typescript
  it('clamps player to bottom world boundary', () => {
    const model = inTown();
    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: false, up: false, down: true }, 100);
    }
    const { player, world } = model.getState();
    expect(player.y).toBe(world.height - player.height);
  });
```

**New:**
```typescript
  it('player is stopped by river zone before reaching bottom world boundary', () => {
    const model = inTown();
    for (let i = 0; i < 100; i++) {
      model.update({ left: false, right: false, up: false, down: true }, 100);
    }
    const { player } = model.getState();
    // River zone starts at y=262; player (height=16) cannot cross it
    expect(player.y).toBeLessThan(262);
    expect(player.y).toBeGreaterThan(200);
  });
```

- [ ] **Step 6: Run all GameLoopModel tests**

```bash
npm test -- src/game/__tests__/GameLoopModel.test.ts 2>&1 | tail -30
```

Expected: all tests PASS.

- [ ] **Step 7: Run full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: all tests PASS (or same failures as before this task — no regressions).

- [ ] **Step 8: Commit**

```bash
git add src/game/GameLoopModel.ts src/game/__tests__/GameLoopModel.test.ts
git commit -m "feat: wire CollisionSystem into GameLoopModel movement"
```

---

## Task 6: Replace drawTownMap() with MapRenderer in PlayableGame

**Files:**
- Modify: `src/game/PlayableGame.ts`

- [ ] **Step 1: Add imports to PlayableGame**

At the top of `src/game/PlayableGame.ts`, add after the existing import:

```typescript
import { MapRenderer } from './map/MapRenderer';
import { loadVillageMap } from './map/villageMap';
```

- [ ] **Step 2: Add mapRenderer field**

Inside `PlayableGame`, after `private readonly ctx: CanvasRenderingContext2D;`, add:

```typescript
  private readonly mapRenderer: MapRenderer;
```

- [ ] **Step 3: Initialize mapRenderer in constructor**

The constructor currently ends after `this.ctx = ctx;` and `this.canvas.width/height` assignments. Add initialization after those lines:

```typescript
    const mapData = loadVillageMap();
    this.mapRenderer = new MapRenderer(this.ctx, mapData);
```

- [ ] **Step 4: Replace drawTownMap() call in render()**

In `render()`, find:
```typescript
      this.drawTownMap();
```

Replace with:
```typescript
      this.mapRenderer.draw();
```

- [ ] **Step 5: Delete the drawTownMap() method**

Remove the entire `private drawTownMap(): void { ... }` method (lines 175-258 in the original file). All its functionality is now in `MapRenderer`.

- [ ] **Step 6: Run build**

```bash
npm run build 2>&1 | head -30
```

Expected: no TypeScript errors.

- [ ] **Step 7: Run full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: all tests PASS.

- [ ] **Step 8: Run e2e tests**

```bash
npm run test:e2e 2>&1 | tail -30
```

Expected: all e2e tests PASS (visual output is equivalent to the old hardcoded map).

- [ ] **Step 9: Commit**

```bash
git add src/game/PlayableGame.ts
git commit -m "feat: replace hardcoded drawTownMap with tile-based MapRenderer"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `Tile` / `WorldGrid` / `CollisionZone` / `MapData` interfaces → Task 1
- ✅ `MapRenderer.drawTile()` per tile type → Task 4
- ✅ Grass, path, water, wall, floor visual styles → Task 4 `COLORS` map
- ✅ `CollisionSystem.isBlocked()` → Task 2
- ✅ `CollisionSystem.resolvePosition()` with full/horizontal/vertical/blocked → Task 2
- ✅ `GameLoopModel` uses `CollisionSystem` in `update()` → Task 5
- ✅ `loadVillageMap()` → Task 3
- ✅ `PlayableGame` uses `MapRenderer` instead of hardcoded drawing → Task 6

**Type consistency:**
- `CollisionZone` used in `CollisionSystem` constructor matches `MapData.zones` type ✅
- `MapData` returned by `loadVillageMap()` used by both `CollisionSystem` (zones) and `MapRenderer` (grid) ✅
- `resolvePosition` signature in tests matches implementation ✅
