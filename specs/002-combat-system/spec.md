# Feature Specification: Combat System

**Feature Branch**: `002-combat-system`
**Created**: 2026-03-29
**Status**: Draft
**Input**: User description: "Build a turn-based combat system for the RPG engine. Players and enemies take turns attacking. Damage formula is attack minus defense (minimum 1). Support status effects (poison, stun, burn) with turn-based duration. Emit events for UI to consume. No rendering logic — pure game logic only."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Basic Turn-Based Combat (Priority: P1)

As a player, I want to engage in turn-based combat with enemies where my stats determine
outcomes, so that character building feels meaningful and battles are strategic.

**Why this priority**: Core combat loop is the foundation. Without it, status effects and
events have no context to operate in.

**Independent Test**: Create a player (attack 10, defense 5, speed 8) and an enemy (attack 6,
defense 3, speed 5). Run `CombatSystem.resolve(actors, rng)`. Verify the player acts first
(higher speed), damage = max(1, 10-3) = 7, and the returned BattleResult is non-null.

**Acceptance Scenarios**:

1. **Given** a player (attack 10, defense 3) vs an enemy (attack 5, defense 2), **When**
   combat resolves, **Then** player damage = max(1, 10-2) = 8 and enemy damage = max(1, 5-3) = 2.
2. **Given** an attacker with attack 3 and a defender with defense 10, **When** a hit is
   calculated, **Then** damage = 1 (minimum enforced).
3. **Given** all enemies die in the same turn, **When** that turn resolves, **Then** the
   battle ends immediately and no further turns are processed.
4. **Given** all players die, **When** that turn resolves, **Then** `BattleResult.winner = 'enemy'`.
5. **Given** 1 player vs 1 enemy up to 4 players vs 8 enemies, **When** combat resolves,
   **Then** a valid BattleResult is returned for all configurations.

---

### User Story 2 — Turn Order by Speed (Priority: P1)

As a player, I want faster characters to act before slower ones, so that the speed stat
has strategic value in combat.

**Why this priority**: Turn order is inseparable from basic combat — wrong turn order
makes combat non-functional. Treated as a separate story for focused testing.

**Independent Test**: Create 3 actors with speeds 10, 5, 1. Resolve one round. Verify the
turn log shows actions in descending speed order.

**Acceptance Scenarios**:

1. **Given** actors with speeds 10, 5, and 1, **When** a round begins, **Then** turns
   proceed in order: speed 10 → speed 5 → speed 1.
2. **Given** two actors with equal speed, **When** turn order is determined, **Then** the
   RNG `'combat'` stream breaks the tie deterministically (same seed = same winner always).
3. **Given** an actor with speed 0, **When** turn order is determined, **Then** that actor
   still takes a turn (last in queue).
4. **Given** an actor dies mid-round, **When** their turn comes, **Then** they are skipped
   (removed from queue immediately on death).

---

### User Story 3 — Status Effects (Priority: P2)

As a player, I want status effects (poison, stun, burn) to apply and tick over turns, so
that tactical decisions about applying effects have meaningful consequences.

**Why this priority**: Status effects add depth but are not required for a functional combat
loop. They build on the basic combat story.

**Independent Test**: Apply poison (duration 3) to an actor with 100 maxHP. Advance 3 turns.
Verify the actor took 10 damage each turn (3×10% of 100 = 30 total). Verify effect expires
after turn 3.

**Acceptance Scenarios**:

1. **Given** an actor with 100 maxHP and poison (duration 3), **When** 3 turns pass,
   **Then** the actor takes 10 damage per turn (10% maxHP) and the effect expires.
2. **Given** a stunned actor (duration 2), **When** their turn arrives, **Then** they skip
   their turn; after 2 stun turns the effect expires.
3. **Given** an actor with burn (duration 4), **When** their turn ticks, **Then** they take
   5 flat damage per turn.
4. **Given** an actor already poisoned (duration 2) receives poison again (duration 5),
   **When** the new effect is applied, **Then** duration refreshes to 5 (does not stack
   to 7; same-type effects never stack).
5. **Given** a 1 HP actor with poison, **When** poison ticks, **Then** the actor dies
   (`ActorDiedEvent` emitted) and is removed from the queue.

---

### User Story 4 — Combat Events (Priority: P2)

As a UI developer, I want the combat system to emit structured events, so that animations,
sound effects, and HUD updates can react to battle outcomes without coupling to game logic.

**Why this priority**: Events are the seam between pure logic and the rendering/UI layer.
They are independent of the combat rules themselves.

**Independent Test**: Subscribe to all events. Run a full combat. Verify `combat:damage`
is emitted for each hit, `combat:actorDied` for each death, and `combat:battleEnded` once.

**Acceptance Scenarios**:

1. **Given** a successful attack, **When** damage is resolved, **Then**
   `combat:damage { attackerId, defenderId, damage, isCritical }` is emitted.
2. **Given** a status effect is applied, **Then** `combat:statusApplied { actorId, effect, duration }` is emitted.
3. **Given** an actor's HP reaches 0, **Then** `combat:actorDied { actorId }` is emitted.
4. **Given** all actors on one side are dead, **Then** `combat:battleEnded { winningSide: 'player' | 'enemy' }` is emitted exactly once.

---

### Edge Cases

- Attacker with attack 0 vs defender with defense 0 → damage = max(1, 0-0) = 1.
- Player with speed 0 still takes a turn (last in queue).
- All enemies die in the same turn → battle ends, no further turns processed.
- Stun duration 0 has no effect (no-op).
- Poison on a 1 HP actor kills it.
- Battle with 0 actors on either side is not a valid input (behavior undefined, treated as caller error).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `CombatSystem.resolve(actors, rng)` MUST accept a list of actors and an injected RNG; MUST NOT use global state.
- **FR-002**: Damage formula MUST be `max(1, attacker.attack - defender.defense)`.
- **FR-003**: Critical hits MUST deal 2× damage with a 15% base chance, modified by the attacker's luck stat, using the `'combat'` RNG stream.
- **FR-004**: Damage MUST always be a positive integer ≥ 1.
- **FR-005**: Turn order MUST be determined by speed stat (descending); ties MUST use the `'combat'` RNG stream.
- **FR-006**: Dead actors MUST be removed from the turn queue immediately on death.
- **FR-007**: Poison MUST deal 10% of the target's maxHP per turn for N turns.
- **FR-008**: Stun MUST skip the affected actor's next N turns.
- **FR-009**: Burn MUST deal 5 flat damage per turn for N turns.
- **FR-010**: Multiple applications of the same status effect type MUST refresh duration (not stack).
- **FR-011**: The system MUST emit `combat:damage`, `combat:statusApplied`, `combat:actorDied`, and `combat:battleEnded` events.
- **FR-012**: `CombatSystem.resolve()` MUST return an immutable `BattleResult`; it MUST NOT mutate the input actor objects.
- **FR-013**: The system MUST support 1v1 up to 4 players vs 8 enemies without error.

### Key Entities

- **CombatActor**: Represents a participant. Holds id, name, side (`'player'|'enemy'`), stats (hp, maxHp, attack, defense, speed, luck), and active status effects.
- **StatusEffect**: Describes an active effect: type (`poison|stun|burn`), remaining duration in turns.
- **BattleResult**: Immutable record of combat outcome: winner, ordered list of TurnRecords, surviving actors.
- **TurnRecord**: A record of one actor's action in one turn: actorId, action type, optional target, damage, critical flag, status applied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 17 acceptance scenarios above pass as automated tests with seed 42.
- **SC-002**: `CombatSystem.resolve()` with 4 players vs 8 enemies completes in under 5ms (no rendering).
- **SC-003**: Zero calls to `Math.random()` exist in the combat implementation — all randomness uses the injected RNG.
- **SC-004**: BattleResult is referentially immutable — input actor objects are unchanged after `resolve()`.
- **SC-005**: All four event types are emitted in the correct order for every battle configuration tested.

## Assumptions

- The `CombatActor` interface is plain data (no Excalibur imports in the logic layer); Excalibur actors are adapted at the scene boundary.
- Critical hit chance formula: `baseCritChance (0.15) + luck * 0.01`; capped at 0.75 (75% max crit).
- Status effects are applied at the start of the affected actor's turn (tick-on-turn).
- Flee mechanic and magic/skills system are out of scope for this spec (separate specs).
- Animations, sounds, and rendering are out of scope; those layers subscribe to emitted events.
- The `BattleResult` turns array represents the canonical log; callers use it for replay/history.
