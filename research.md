# Testable RPG Game - POC Research Report

## 1) Executive Summary

This project is a deterministic RPG prototype designed for rapid automated verification. The proof-of-concept (POC) succeeds in demonstrating that storyline-heavy game behavior can be validated through both:

1. a runtime test adapter (`src/runtime`) with strong browser automation controls, and
2. a playable canvas game loop (`src/game`) that is now also demoable and testable in browser.

The key POC value is not visual fidelity; it is confidence in repeatable behavior across quest logic, faction branching, battle outcomes, and save/load flows.

## 2) POC Goals

The implementation shows these goals are achievable:

- Deterministic game logic through seeded behavior.
- Automation-first testing through browser-exposed control APIs.
- Storyline validation across branching narrative paths.
- Browser-demoable outputs for stakeholders, not only unit tests.

## 3) Technical Scope Reviewed

- Language/runtime: TypeScript + Vite.
- Test stack: Vitest + Playwright.
- Core folders reviewed:
  - `src/engine/*` (domain systems)
  - `src/runtime/*` (automation adapter and test-facing game state)
  - `src/game/*` (playable canvas loop)
  - `tests/*` (integration/e2e/visual and storyline specs)
  - demo pages (`index.html`, `playtest.html`, `storyline-demo.html`, `game-storyline-demo.html`)

## 4) Architecture Findings

### A. Dual Runtime Model

The codebase intentionally supports two execution surfaces:

- **Automation surface (`src/runtime`)**
  - Optimized for deterministic state mutation and test control.
  - Exposes `window.__game` in non-production mode.
  - Used by e2e/integration storyline automation.

- **Playable surface (`src/game`)**
  - Real-time canvas loop with keyboard input and HUD.
  - Contains map rendering, character rendering, and local storyline progression logic.
  - Now includes a long-form browser storyline playtest page.

### B. Determinism and Testability

Determinism is central to the POC:

- seeded behavior is used to stabilize expected results,
- quest/dialog/battle transitions are asserted repeatedly via tests,
- browser demos can be run repeatedly with stable outcomes.

## 5) Storyline POC Coverage

The project currently demonstrates storyline validation at multiple levels:

- Runtime storyline/unit depth: `src/runtime/__tests__/storyline.test.ts`
- Runtime browser demo e2e: `tests/e2e/storyline-demo.spec.ts`
- `/src/game` browser demo e2e: `tests/e2e/game-storyline-demo.spec.ts`

The `/src/game` storyline demo (`game-storyline-demo.html`) now includes long-form beats covering:

- Act I onboarding and quest activation,
- guard and mages branch behavior,
- faction-gating checks,
- side quest progression,
- flee/lose/win battle outcomes,
- full campaign run-through.

## 6) Demo Readiness (Stakeholder View)

The project is demo-ready for POC presentations:

- Playable game: `http://localhost:5173/`
- `/src/game` long storyline demo: `http://localhost:5173/game-storyline-demo.html`
- Runtime playtest dashboard: `http://localhost:5173/playtest.html`
- Runtime storyline demo: `http://localhost:5173/storyline-demo.html`

This is important for POC reporting because it provides both an experiential demo and objective pass/fail artifacts.

## 7) Quality Signals

Observed quality signals include:

- Broad automated tests across systems and browser paths.
- Reproducible scenario execution.
- Explicit branch validation (guard vs mages).
- Save/load and failure-state coverage in runtime demos.

## 8) POC Strengths

- Clear automation-first architecture.
- Deterministic behavior suitable for CI and AI-driven testing.
- Storyline assertions are meaningful (not only smoke tests).
- Browser-facing demo pages communicate test outcomes to non-engineers.

## 9) POC Risks / Gaps

- Narrative logic exists in both `src/runtime` and `src/game`; long-term drift risk.
- Visual map readability improved, but map mechanics (collisions/pathing constraints) remain relatively lightweight.
- Documentation needed periodic alignment as project surfaces evolve (now improved, but should stay part of release checklist).

## 10) Recommended Next Steps After POC

1. **Unify storyline transition rules** into a shared module consumed by both `src/runtime` and `src/game`.
2. **Add map interaction constraints** (collision/zones) to match visual world intent.
3. **Add CI gates** for key storyline browser demos (`storyline-demo` + `game-storyline-demo`).
4. **Define release acceptance criteria** for narrative completeness and regression protection.

## 11) POC Conclusion

This project is a strong POC for a testable RPG architecture. It proves that branching RPG storyline behavior can be validated deterministically and demonstrated live in browser with clear, automation-backed evidence. The main opportunity for production hardening is consolidation of duplicated narrative logic between runtime and playable surfaces.
