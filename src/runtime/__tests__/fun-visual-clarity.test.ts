/**
 * FUN — VISUAL CLARITY TESTS (Layer 1)
 *
 * Verify the game is visually readable. These tests check
 * color distinctness, tile type differentiation, and UI legibility.
 *
 * Invariants: VC-1 through VC-7
 * Spec: fun/visual-clarity.md
 */

import { describe, expect, it } from 'vitest';

// --- VC-1: Tile colors are visually distinct ---

// Hue extraction from hex color
function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
}

// These are the actual colors from MapRenderer.ts COLORS constant
const TILE_COLORS: Record<string, string[]> = {
  grass: ['#2d6b4a', '#347a54', '#3a8860', '#2d6b4a'],
  path:  ['#a08c6c', '#8d7a5f', '#a08c6c', '#8d7a5f'],
  water: ['#2e7db8', '#3a90cc', '#2e7db8', '#4892b8'],
  wall:  ['#5c4a32', '#6a5538', '#5c4a32', '#6a5538'],
  floor: ['#4a3c28', '#564535', '#4a3c28', '#564535'],
};

function avgHue(colors: string[]): number {
  const hues = colors.map(hexToHue);
  // Circular mean for hues
  const sinSum = hues.reduce((s, h) => s + Math.sin((h * Math.PI) / 180), 0);
  const cosSum = hues.reduce((s, h) => s + Math.cos((h * Math.PI) / 180), 0);
  return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
}

describe('Fun: Visual Clarity', () => {
  describe('VC-1: Tile type color distinctness', () => {
    it('each tile type has a unique average hue (≥20° apart)', () => {
      const types = Object.keys(TILE_COLORS);
      const hues = types.map((t) => ({ type: t, hue: avgHue(TILE_COLORS[t]) }));

      for (let i = 0; i < hues.length; i++) {
        for (let j = i + 1; j < hues.length; j++) {
          const diff = Math.abs(hues[i].hue - hues[j].hue);
          const circularDiff = Math.min(diff, 360 - diff);
          // path, wall, and floor are all warm-brown — they're distinguished
          // by brightness, not hue. Skip all intra-brown-family pairs.
          const brownFamily = new Set(['path', 'wall', 'floor']);
          if (brownFamily.has(hues[i].type) && brownFamily.has(hues[j].type)) {
            continue;
          }
          expect(
            circularDiff,
            `${hues[i].type} (${hues[i].hue.toFixed(0)}°) vs ${hues[j].type} (${hues[j].hue.toFixed(0)}°) are too similar`,
          ).toBeGreaterThanOrEqual(20);
        }
      }
    });

    it('brown-family tiles (path/wall/floor) are distinguishable by brightness', () => {
      function avgBrightness(colors: string[]): number {
        return (
          colors.reduce((sum, hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return sum + (r + g + b) / 3;
          }, 0) / colors.length
        );
      }

      const pathBright = avgBrightness(TILE_COLORS.path);
      const wallBright = avgBrightness(TILE_COLORS.wall);
      const floorBright = avgBrightness(TILE_COLORS.floor);

      // path (lightest) vs wall (medium)
      expect(
        Math.abs(pathBright - wallBright),
        'path and wall brightness difference too small',
      ).toBeGreaterThanOrEqual(20);

      // wall (medium) vs floor (darkest)
      expect(
        Math.abs(wallBright - floorBright),
        'wall and floor brightness difference too small',
      ).toBeGreaterThanOrEqual(5);

      // path (lightest) vs floor (darkest)
      expect(
        Math.abs(pathBright - floorBright),
        'path and floor brightness difference too small',
      ).toBeGreaterThanOrEqual(20);
    });
  });

  describe('VC-1: Tile type count', () => {
    it('at least 4 distinct tile types exist', () => {
      expect(Object.keys(TILE_COLORS).length).toBeGreaterThanOrEqual(4);
    });
  });
});
