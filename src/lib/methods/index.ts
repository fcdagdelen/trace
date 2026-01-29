// Method cloud system - philosophical/analytical spirits that possess the thinking
// Now powered by Skills.md format via spirits loader

import { loadSpirits, loadSpirit, getSkillsSpiritIds, loadedSpiritToMethod } from '$lib/spirits/loader';

export interface Method {
  id: string;
  name: string;
  source: string;
  color: string;
  letterSpacing: number;
  resonantSymbols: string[];
  vocabulary: string[];
  expandedVocabulary?: string[]; // broader semantic field words for detection
  domains: string[];
  compatibleWith: string[];
  tensionsWith: string[];
  promptContent: string;
}

// Cache for loaded methods
let methodsCache: Method[] | null = null;

/**
 * Get all available methods (async, loads from Skills.md format)
 */
export async function getAllMethods(): Promise<Method[]> {
  if (methodsCache) {
    return methodsCache;
  }

  const spiritIds = getSkillsSpiritIds();
  const spirits = await loadSpirits(spiritIds, { format: 'skills' });
  methodsCache = spirits.map(loadedSpiritToMethod);
  return methodsCache;
}

/**
 * Get method by ID (async)
 */
export async function getMethodAsync(id: string): Promise<Method | undefined> {
  const spirit = await loadSpirit(id, { format: 'skills' });
  return spirit ? loadedSpiritToMethod(spirit) : undefined;
}

/**
 * Get methods by IDs (async)
 */
export async function getMethods(ids: string[]): Promise<Method[]> {
  const spirits = await loadSpirits(ids, { format: 'skills' });
  return spirits.map(loadedSpiritToMethod);
}

/**
 * Get all method IDs
 */
export function getMethodIds(): string[] {
  return getSkillsSpiritIds();
}

/**
 * Clear the methods cache (useful for hot reload)
 */
export function clearMethodsCache(): void {
  methodsCache = null;
}

// Legacy synchronous functions - deprecated but kept for backward compatibility
// These will throw if called before methods are loaded

let syncMethods: Method[] = [];

/**
 * Initialize synchronous methods (call once at app startup)
 * This allows legacy synchronous access patterns to work
 */
export async function initializeMethods(): Promise<void> {
  syncMethods = await getAllMethods();
}

/**
 * @deprecated Use getAllMethods() instead
 * Synchronous access to methods array - requires initializeMethods() to be called first
 */
export function getMethodsSync(): Method[] {
  if (syncMethods.length === 0) {
    console.warn('[methods] getMethodsSync() called before initializeMethods()');
  }
  return syncMethods;
}

/**
 * @deprecated Use getMethodAsync() instead
 * Synchronous method lookup - requires initializeMethods() to be called first
 */
export function getMethod(id: string): Method | undefined {
  return syncMethods.find(m => m.id === id);
}

// For backward compatibility with modules that import `methods` directly
// This is a getter that returns the cached array
export const methods: Method[] = new Proxy([] as Method[], {
  get(target, prop) {
    if (syncMethods.length > 0) {
      return Reflect.get(syncMethods, prop);
    }
    if (prop === 'length') return 0;
    if (prop === 'map' || prop === 'filter' || prop === 'find' || prop === 'forEach') {
      return Reflect.get(syncMethods, prop).bind(syncMethods);
    }
    return Reflect.get(target, prop);
  },
});
