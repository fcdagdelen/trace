// Store for tracking which spirits have appeared during trace generation
// Used by TraceLine (reports visibility) and LegendHud (displays accumulated spirits)

import { writable } from 'svelte/store';

// Cumulative set of all spirits that have appeared in this trace
const accumulatedSpirits = writable<Set<string>>(new Set());

// Report a line becoming visible - adds spirit to cumulative set
export function lineVisible(lineId: string, spiritHint: string | undefined) {
  if (!spiritHint) return;
  accumulatedSpirits.update(set => {
    if (set.has(spiritHint)) return set;
    const newSet = new Set(set);
    newSet.add(spiritHint);
    return newSet;
  });
}

// Report a line becoming hidden - no-op, spirits persist
export function lineHidden(_lineId: string) {
  // Spirits accumulate and persist - don't remove
}

// Clear all spirits (on trace reset)
export function clearVisibleLines() {
  accumulatedSpirits.set(new Set());
}

// Export the cumulative spirits store
export const visibleSpirits = accumulatedSpirits;
