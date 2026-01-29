// Store for tracking which spirits are currently visible in the viewport
// Used by TraceLine (reports visibility) and LegendHud (displays visible spirits)

import { writable, derived } from 'svelte/store';

// Map of line IDs to their spirit hint (only for visible lines)
const visibleLines = writable<Map<string, string>>(new Map());

// Report a line becoming visible
export function lineVisible(lineId: string, spiritHint: string | undefined) {
  if (!spiritHint) return;
  visibleLines.update(map => {
    const newMap = new Map(map);
    newMap.set(lineId, spiritHint);
    return newMap;
  });
}

// Report a line becoming hidden
export function lineHidden(lineId: string) {
  visibleLines.update(map => {
    const newMap = new Map(map);
    newMap.delete(lineId);
    return newMap;
  });
}

// Clear all visible lines (on trace reset)
export function clearVisibleLines() {
  visibleLines.set(new Map());
}

// Derived store: set of currently visible spirit IDs
export const visibleSpirits = derived(visibleLines, ($visibleLines) => {
  const spirits = new Set<string>();
  for (const spirit of $visibleLines.values()) {
    spirits.add(spirit);
  }
  return spirits;
});
