// Spirit detection utilities - multi-signal approach for abundant presence
import type { Method } from '$lib/methods';
import { isTransitionalSymbol } from './symbols';

export interface DetectionResult {
  id: string | null;
  source: 'symbol' | 'vocabulary' | 'pattern' | 'rotation' | null;
}

export interface DetectionState {
  recentSymbol: string | null;
  linesSinceDetection: number;
  lastMethodIndex: number;
}

// Expanded vocabulary for each spirit - natural words Claude uses when possessed
// These are NOT technical jargon, but semantic field words
export const EXPANDED_VOCABULARY: Record<string, string[]> = {
  barthes: [
    'position', 'posture', 'recognize', 'inhabit', 'stage', 'arrange', 'crystal',
    'gesture', 'feeling', 'wound', 'lover', 'scene', 'image', 'capture', 'catch',
    'language', 'visible', 'invisible', 'presence', 'absence', 'amorous', 'tender'
  ],
  warburg: [
    'survive', 'migrate', 'charge', 'emotion', 'gesture', 'persist', 'echo',
    'ancient', 'modern', 'image', 'atlas', 'body', 'inherited', 'form', 'charged',
    'travel', 'century', 'relief', 'painting', 'expression', 'memory', 'collective'
  ],
  benjamin: [
    'fragment', 'ruin', 'flash', 'instant', 'collapse', 'debris', 'image',
    'past', 'present', 'recognize', 'shatter', 'crystal', 'promise', 'arrest',
    'history', 'moment', 'particular', 'object', 'redeem', 'blast', 'open'
  ],
  deleuze: [
    'connect', 'flow', 'escape', 'transform', 'multiply', 'middle', 'vector',
    'territory', 'desire', 'machine', 'line', 'network', 'intensity', 'map',
    'copy', 'heterogeneous', 'function', 'charge', 'pressure', 'becoming'
  ],
  wittgenstein: [
    'use', 'practice', 'ordinary', 'show', 'describe', 'dissolve', 'therapy',
    'clear', 'see', 'game', 'word', 'meaning', 'look', 'simple', 'arrangement',
    'confusion', 'bewitched', 'remind', 'essence', 'overlap', 'similarity'
  ],
  bateson: [
    'pattern', 'context', 'relationship', 'level', 'frame', 'message', 'learn',
    'circuit', 'feedback', 'system', 'both', 'trap', 'bind', 'punish', 'perceive',
    'contradict', 'spiral', 'runaway', 'relationship', 'connect', 'crab', 'lobster'
  ],
  simmel: [
    'stranger', 'near', 'far', 'distance', 'form', 'relation', 'interact',
    'position', 'objective', 'geometry', 'social', 'secret', 'bridge', 'door',
    'miser', 'adventure', 'crystallize', 'alien', 'tragedy', 'culture'
  ],
  'ibn-khaldun': [
    'cycle', 'rise', 'fall', 'solidarity', 'bond', 'weaken', 'conquer', 'decay',
    'generation', 'luxury', 'desert', 'urban', 'spend', 'drain', 'dynasty',
    'civilization', 'nomad', 'settle', 'authority', 'cohesion', 'tribe'
  ],
  grothendieck: [
    'expand', 'dissolve', 'context', 'natural', 'structure', 'transform',
    'perspective', 'patience', 'sea', 'rise', 'setting', 'abstract', 'nut',
    'soften', 'visible', 'essential', 'geometry', 'space', 'recover', 'level'
  ],
  calasso: [
    'myth', 'sacrifice', 'transform', 'god', 'repeat', 'singular', 'pattern',
    'origin', 'theater', 'enter', 'possess', 'sacred', 'story', 'web', 'ritual',
    'intense', 'justify', 'substitution', 'rapture', 'divine', 'force'
  ],
  borges: [
    'mirror', 'infinite', 'branch', 'fork', 'center', 'contain', 'dream',
    'tiger', 'library', 'labyrinth', 'version', 'parallel', 'regress', 'vertiginous',
    'universe', 'encyclopedia', 'territory', 'map', 'forget', 'haunt'
  ],
  derrida: [
    'trace', 'differ', 'defer', 'slip', 'absence', 'mark', 'residue',
    'supplement', 'blind', 'reading', 'repeat', 'remain', 'never', 'always',
    'already', 'writing', 'speech', 'foundation', 'effect', 'misreading', 'ghost'
  ],
};

// Structural patterns that indicate specific spirits
interface PatternRule {
  test: (line: string) => boolean;
  spirits: string[];
  weight: number;
}

const STRUCTURAL_PATTERNS: PatternRule[] = [
  // Very short declarative sentences → Wittgenstein
  {
    test: (line) => {
      const words = line.trim().split(/\s+/);
      return words.length <= 6 && line.endsWith('.') && !line.includes('?');
    },
    spirits: ['wittgenstein'],
    weight: 1,
  },
  // Questions → Bateson (metacommunication, inquiry)
  {
    test: (line) => line.includes('?'),
    spirits: ['bateson', 'wittgenstein'],
    weight: 1,
  },
  // "not X but Y" construction → Derrida, Benjamin
  {
    test: (line) => /not\s+\w+\s+but\s+/i.test(line),
    spirits: ['derrida', 'benjamin'],
    weight: 2,
  },
  // Long flowing sentences (>35 words) → Deleuze, Grothendieck
  {
    test: (line) => line.trim().split(/\s+/).length > 35,
    spirits: ['deleuze', 'grothendieck'],
    weight: 1,
  },
  // Parallel structures (commas with similar phrases) → Benjamin, Warburg
  {
    test: (line) => {
      const commaCount = (line.match(/,/g) || []).length;
      return commaCount >= 3;
    },
    spirits: ['benjamin', 'warburg'],
    weight: 1,
  },
  // References to time/memory/past → Benjamin, Warburg
  {
    test: (line) => /\b(memory|remember|past|history|time|moment|instant)\b/i.test(line),
    spirits: ['benjamin', 'warburg'],
    weight: 1,
  },
  // References to cycles/return → Ibn Khaldun, Bateson
  {
    test: (line) => /\b(cycle|return|repeat|again|spiral|generation)\b/i.test(line),
    spirits: ['ibn-khaldun', 'bateson'],
    weight: 1,
  },
  // References to infinity/recursion → Borges
  {
    test: (line) => /\b(infinite|endless|forever|recursive|contain|within)\b/i.test(line),
    spirits: ['borges', 'grothendieck'],
    weight: 1,
  },
  // References to social forms/relations → Simmel
  {
    test: (line) => /\b(stranger|distance|near|far|relation|form|social)\b/i.test(line),
    spirits: ['simmel'],
    weight: 1,
  },
];

/**
 * Detect which spirit is active based on multiple signals
 */
export function detectActiveSpirit(
  line: string,
  methods: Method[],
  state: DetectionState
): DetectionResult {
  // Skip empty lines and symbols themselves
  const trimmed = line.trim();
  if (!trimmed || isTransitionalSymbol(trimmed)) {
    return { id: null, source: null };
  }

  // 1. Symbol resonance (highest priority) - use recent symbol to trigger spirit
  if (state.recentSymbol) {
    const resonantMethods = methods.filter(m =>
      m.resonantSymbols.includes(state.recentSymbol!)
    );
    if (resonantMethods.length > 0) {
      // Pick based on position for determinism, or weighted random for variety
      const method = resonantMethods[Math.floor(Math.random() * resonantMethods.length)];
      return { id: method.id, source: 'symbol' };
    }
  }

  // 2. Vocabulary scoring (expanded vocabulary)
  const vocabMatch = detectByVocabulary(line, methods);
  if (vocabMatch) {
    return { id: vocabMatch, source: 'vocabulary' };
  }

  // 3. Structural pattern detection
  const patternMatch = detectByPattern(line, methods);
  if (patternMatch) {
    return { id: patternMatch, source: 'pattern' };
  }

  // 4. Round-robin rotation (ensures abundant presence)
  if (state.linesSinceDetection >= 3 && methods.length > 0) {
    const nextIndex = (state.lastMethodIndex + 1) % methods.length;
    return { id: methods[nextIndex].id, source: 'rotation' };
  }

  return { id: null, source: null };
}

/**
 * Detect spirit by vocabulary matching (expanded + original)
 */
function detectByVocabulary(line: string, methods: Method[]): string | null {
  const lower = line.toLowerCase();
  let bestMatch: { id: string; score: number } | null = null;

  for (const method of methods) {
    let score = 0;

    // Check original vocabulary (higher weight for specificity)
    for (const word of method.vocabulary) {
      const wordLower = word.toLowerCase();
      if (lower.includes(wordLower)) {
        // Original vocab words get 3 points (signature terms)
        score += 3;
      }
    }

    // Check expanded vocabulary
    const expanded = EXPANDED_VOCABULARY[method.id] || [];
    for (const word of expanded) {
      const wordLower = word.toLowerCase();
      // Use word boundary matching to avoid false positives
      const regex = new RegExp(`\\b${wordLower}\\b`, 'i');
      if (regex.test(line)) {
        // Expanded vocab gets 1 point
        score += 1;
      }
    }

    // Lower threshold: 2 points (either 2 expanded words, or partial signature match)
    if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: method.id, score };
    }
  }

  return bestMatch?.id ?? null;
}

/**
 * Detect spirit by structural patterns
 */
function detectByPattern(line: string, methods: Method[]): string | null {
  const methodIds = new Set(methods.map(m => m.id));
  const scores: Record<string, number> = {};

  for (const pattern of STRUCTURAL_PATTERNS) {
    if (pattern.test(line)) {
      for (const spirit of pattern.spirits) {
        // Only count if this spirit is among the summoned methods
        if (methodIds.has(spirit)) {
          scores[spirit] = (scores[spirit] || 0) + pattern.weight;
        }
      }
    }
  }

  // Return the highest scoring spirit if any scored
  const entries = Object.entries(scores);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/**
 * Create initial detection state
 */
export function createDetectionState(): DetectionState {
  return {
    recentSymbol: null,
    linesSinceDetection: 0,
    lastMethodIndex: -1,
  };
}

/**
 * Update detection state after processing a line
 */
export function updateDetectionState(
  state: DetectionState,
  line: string,
  result: DetectionResult,
  methods: Method[]
): DetectionState {
  const trimmed = line.trim();
  const isSymbol = isTransitionalSymbol(trimmed);

  // Update recent symbol
  const recentSymbol = isSymbol ? trimmed : null;

  // Update lines since detection
  const linesSinceDetection = result.id ? 0 : state.linesSinceDetection + 1;

  // Update last method index
  let lastMethodIndex = state.lastMethodIndex;
  if (result.id) {
    const idx = methods.findIndex(m => m.id === result.id);
    if (idx >= 0) lastMethodIndex = idx;
  }

  return {
    recentSymbol,
    linesSinceDetection,
    lastMethodIndex,
  };
}
