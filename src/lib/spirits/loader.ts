// Spirit loader - loads from skills.md format
import { parseSpirit, spiritToPromptContent, type ParsedSpirit } from './parser';
import type { LoadedSpirit, CompiledSpirit, SpiritLoadOptions, DisclosureDepth, TransmutationProtocol } from './types';

// Cache for loaded spirits
const spiritCache = new Map<string, LoadedSpirit>();
const parsedCache = new Map<string, ParsedSpirit>();

/**
 * Load a spirit from the skills.md format
 */
export async function loadSkillsSpirit(
  id: string,
  depth: DisclosureDepth = 1
): Promise<LoadedSpirit | null> {
  try {
    // Check cache for parsed spirit
    let parsed = parsedCache.get(id);

    if (!parsed) {
      // Dynamic import of the markdown file
      const indexModule = await import(`./${id}/index.md?raw`);
      const content = indexModule.default;
      parsed = parseSpirit(content);
      parsedCache.set(id, parsed);
    }

    // Try to load compiled metadata
    let compiled: CompiledSpirit | null = null;
    try {
      const compiledModule = await import(`./${id}/compiled.json`);
      compiled = compiledModule.default;
    } catch {
      // No compiled.json yet - use defaults
    }

    // Try to load deep content if depth >= 2
    let deepContent: string | undefined;
    if (depth >= 2) {
      try {
        const deepModule = await import(`./${id}/deep.md?raw`);
        deepContent = deepModule.default;
      } catch {
        // No deep.md available
      }
    }

    // Convert parsed transmutation to the types.ts format
    let transmutation: TransmutationProtocol | undefined;
    if (parsed.transmutation) {
      transmutation = {
        handToWhen: parsed.transmutation.handToWhen,
        handFromRules: parsed.transmutation.handFromRules.map(r => ({
          targetSpirit: r.targetSpirit,
          condition: r.condition,
        })),
        hookLines: parsed.transmutation.hookLines.map(h => ({
          text: h.text,
          targetSpirit: h.targetSpirit,
        })),
      };
    }

    const loaded: LoadedSpirit = {
      id: parsed.meta.id,
      name: parsed.meta.name,
      source: parsed.meta.source,
      format: 'skills',

      kernel: parsed.kernel,
      thinkingMode: parsed.thinkingMode,
      voice: parsed.voice,
      antiPatterns: parsed.antiPatterns,
      fullPromptContent: spiritToPromptContent(parsed, depth),

      resonantSymbols: parsed.meta.resonantSymbols,
      domains: parsed.meta.domains,
      compatibleWith: parsed.meta.compatibleWith,
      tensionsWith: parsed.meta.tensionsWith,

      // Use compiled values or sensible defaults
      color: compiled?.color || '#4a4a4a',
      letterSpacing: compiled?.letterSpacing || 0.02,
      structuralSignature: compiled?.structuralSignature,

      // Handoff choreography
      transmutation,

      hasDeepContent: !!deepContent,
      deepContent,
    };

    return loaded;
  } catch (error) {
    console.warn(`Failed to load skills spirit ${id}:`, error);
    return null;
  }
}

/**
 * Method interface for backward compatibility with legacy code
 * This is duplicated here to avoid circular imports with $lib/methods
 */
interface Method {
  id: string;
  name: string;
  source: string;
  color: string;
  letterSpacing: number;
  resonantSymbols: string[];
  vocabulary: string[];
  expandedVocabulary?: string[];
  domains: string[];
  compatibleWith: string[];
  tensionsWith: string[];
  promptContent: string;
}

/**
 * Convert LoadedSpirit to Method interface for backward compatibility
 */
export function loadedSpiritToMethod(spirit: LoadedSpirit): Method {
  return {
    id: spirit.id,
    name: spirit.name,
    source: spirit.source,
    color: spirit.color,
    letterSpacing: spirit.letterSpacing,
    resonantSymbols: spirit.resonantSymbols,
    vocabulary: [], // Skills format doesn't use vocabulary detection
    expandedVocabulary: [],
    domains: spirit.domains,
    compatibleWith: spirit.compatibleWith,
    tensionsWith: spirit.tensionsWith,
    promptContent: spirit.fullPromptContent,
  };
}

/**
 * Get available skills-format spirit IDs
 */
export function getSkillsSpiritIds(): string[] {
  return [
    'herzog', 'benjamin', 'wittgenstein', 'simmel', 'ibn-khaldun', 'flusser',
    'barthes', 'bateson', 'warburg', 'borges', 'calasso',
    'deleuze', 'derrida', 'grothendieck'
  ];
}

/**
 * Check if a spirit ID has skills.md format available
 */
export function hasSkillsFormat(id: string): boolean {
  return getSkillsSpiritIds().includes(id);
}

/**
 * Load spirit by ID
 * All spirits now use Skills.md format
 */
export async function loadSpirit(
  id: string,
  options: SpiritLoadOptions = {}
): Promise<LoadedSpirit | null> {
  const { depth = 1 } = options;

  // Check cache first
  const cacheKey = `${id}:${depth}`;
  if (spiritCache.has(cacheKey)) {
    return spiritCache.get(cacheKey)!;
  }

  // Load from Skills.md format
  const spirit = await loadSkillsSpirit(id, depth);

  if (spirit) {
    spiritCache.set(cacheKey, spirit);
  }

  return spirit;
}

/**
 * Load multiple spirits
 */
export async function loadSpirits(
  ids: string[],
  options: SpiritLoadOptions = {}
): Promise<LoadedSpirit[]> {
  const results = await Promise.all(ids.map(id => loadSpirit(id, options)));
  return results.filter((s): s is LoadedSpirit => s !== null);
}

/**
 * Clear spirit caches (useful for hot reload in development)
 */
export function clearSpiritCache(): void {
  spiritCache.clear();
  parsedCache.clear();
}
