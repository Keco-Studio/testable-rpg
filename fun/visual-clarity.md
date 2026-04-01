# Layer 1: Visual Clarity

*"Can the player instantly read the game?"*

## Principle

Every visual element communicates one thing clearly. Walkable ground looks different from walls. Interactable NPCs look different from decorations. Water looks impassable. The player's eyes should answer questions before their brain has to.

## Invariants

| ID | Invariant | Test Strategy | Status |
|----|-----------|---------------|--------|
| VC-1 | Each tile type (grass, path, water, wall, floor) uses a visually distinct color family — no two types share the same hue range | Unit test: verify COLORS map hue values don't overlap | Tested |
| VC-2 | Tile transitions between types have visual edges (not hard-cut solid colors) | Visual test: screenshot comparison at tile boundaries | UNTESTED |
| VC-3 | NPCs are visually distinct from background at any position on the map | Visual test: NPC contrast ratio against all tile types | UNTESTED |
| VC-4 | Interactable NPCs have a visible indicator when player is in range | Integration test: proximity trigger renders indicator | UNTESTED |
| VC-5 | The player character is always the most visually prominent element on screen | Visual test: player contrast and size relative to other elements | UNTESTED |
| VC-6 | UI text (labels, HUD, dialog) is readable against any background it appears over | Visual test: text contrast ratio meets minimum threshold | UNTESTED |
| VC-7 | Battle scene visually distinguishes player from enemies at a glance | Visual test: player vs enemy color/shape differentiation | UNTESTED |

## Anti-Patterns

- ANTI-VC1: Flat solid-color rectangles for tiles — no texture means no readability cues
- ANTI-VC2: Labels floating without background contrast — hard to read over some tiles
- ANTI-VC3: Color-only differentiation with no shape/pattern backup — accessibility issue
