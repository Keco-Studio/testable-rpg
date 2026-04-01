# Layer 2: World Feel

*"Does this feel like a real place?"*

## Principle

Every map zone has a purpose the player can intuit. Spatial relationships make sense — the elder lives near the center, the barracks are on the edge, the river separates safe from dangerous. Visual details reinforce the fiction.

## Invariants

| ID | Invariant | Test Strategy | Status |
|----|-----------|---------------|--------|
| WF-1 | Buildings have at least 2 visual elements (walls + roof/door/window) | Visual test | UNTESTED |
| WF-2 | Water has animated or varying visual treatment | Visual test | UNTESTED |
| WF-3 | Paths visually connect points of interest (no dead-end paths to nowhere) | Map data test | Tested |
| WF-4 | Map zones are spatially logical — related NPCs are near their associated buildings | Data test | Tested |
| WF-5 | At least 3 distinct visual zones exist on the village map | Map data test | Tested |
| WF-6 | Collision zones match visual boundaries | Integration test | Tested |
| WF-7 | Decorative variety — no 5x5 or larger area of identical tile appearance | Map data test | Tested |

## Anti-Patterns

- ANTI-WF1: Buildings that are just solid color blocks with a text label
- ANTI-WF2: Large uniform areas with zero visual variation
- ANTI-WF3: Collision zones that don't match what the player sees
