import type { CombatActor, StatusEffect } from './CombatTypes';

export interface StatusTickEvent {
  effect: StatusEffect['type'];
  duration: number;
}

export interface TickStatusResult {
  updatedActor: CombatActor;
  events: StatusTickEvent[];
  skippedTurn: boolean;
  actorDied: boolean;
}

function cloneActor(actor: CombatActor): CombatActor {
  return {
    ...actor,
    stats: { ...actor.stats },
    statusEffects: actor.statusEffects.map((effect) => ({ ...effect })),
  };
}

export function refreshStatusEffects(
  existing: readonly StatusEffect[],
  incoming: StatusEffect,
): StatusEffect[] {
  const index = existing.findIndex((effect) => effect.type === incoming.type);
  if (index < 0) {
    return [...existing, { ...incoming }];
  }

  const next = existing.map((effect) => ({ ...effect }));
  next[index] = { type: incoming.type, duration: incoming.duration };
  return next;
}

export function tickStatus(actor: CombatActor): TickStatusResult {
  const updatedActor = cloneActor(actor);
  const events: StatusTickEvent[] = [];
  let skippedTurn = false;

  const nextEffects: StatusEffect[] = [];
  for (const effect of updatedActor.statusEffects) {
    if (effect.duration <= 0) {
      continue;
    }

    if (effect.type === 'poison') {
      const damage = Math.max(1, Math.floor(updatedActor.stats.maxHp * 0.1));
      updatedActor.stats.hp = Math.max(0, updatedActor.stats.hp - damage);
      effect.duration -= 1;
      events.push({ effect: 'poison', duration: effect.duration });
    } else if (effect.type === 'burn') {
      updatedActor.stats.hp = Math.max(0, updatedActor.stats.hp - 5);
      effect.duration -= 1;
      events.push({ effect: 'burn', duration: effect.duration });
    } else if (effect.type === 'stun') {
      skippedTurn = true;
      effect.duration -= 1;
      events.push({ effect: 'stun', duration: effect.duration });
    }

    if (effect.duration > 0) {
      nextEffects.push(effect);
    }
  }

  updatedActor.statusEffects = nextEffects;

  return {
    updatedActor,
    events,
    skippedTurn,
    actorDied: updatedActor.stats.hp <= 0,
  };
}
