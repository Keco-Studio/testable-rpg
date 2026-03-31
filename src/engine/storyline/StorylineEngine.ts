/**
 * StorylineEngine — pure narrative logic shared by GameRuntime and GameLoopModel.
 * No side effects, no DOM, no external dependencies.
 */

/**
 * When setting a faction flag, clears the opposing faction.
 * Returns a new flags object; does not mutate input.
 */
export function resolveFactionExclusivity(
  flags: Record<string, boolean>,
  key: string,
  value: boolean,
): Record<string, boolean> {
  const next: Record<string, boolean> = { ...flags, [key]: value };
  if (key === 'joined-guard' && value) next['joined-mages'] = false;
  if (key === 'joined-mages' && value) next['joined-guard'] = false;
  return next;
}

/**
 * Returns true if the player has joined the specified faction.
 */
export function resolveFactionGate(
  flags: Record<string, boolean>,
  requiredFaction: 'guard' | 'mages',
): boolean {
  return flags[`joined-${requiredFaction}`] === true;
}

/**
 * Returns true if all prerequisites are present in completedQuestIds.
 */
export function checkQuestPrerequisites(
  prerequisites: string[],
  completedQuestIds: string[],
): boolean {
  const completed = new Set(completedQuestIds);
  return prerequisites.every((id) => completed.has(id));
}

/**
 * Given current flags, returns any act-completion flags that should now be set.
 * Only returns flags not already set — apply by merging into existing flags.
 */
export function deriveActFlags(flags: Record<string, boolean>): Partial<Record<string, boolean>> {
  const derived: Partial<Record<string, boolean>> = {};
  if (!flags['act-complete-1'] && (flags['joined-guard'] === true || flags['joined-mages'] === true)) {
    derived['act-complete-1'] = true;
  }
  if (!flags['act-complete-2'] && flags['lieutenant-defeated'] === true) {
    derived['act-complete-2'] = true;
  }
  return derived;
}
