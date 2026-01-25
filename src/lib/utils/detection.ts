// Spirit detection utilities - structure + symbols approach
// No vocabulary detection per "no technical tells" rule
import type { Method } from '$lib/methods';
import { isTransitionalSymbol } from './symbols';
import type { StructuralSignature } from '$lib/spirits/types';

export interface DetectionResult {
  id: string | null;
  source: 'symbol' | 'structure' | 'rotation' | null;
  confidence?: number;  // 0-1 for metrics
}

export interface DetectionState {
  recentSymbol: string | null;
  linesSinceDetection: number;
  lastMethodIndex: number;
  depthLevel: number;  // For progressive disclosure tracking
  // Spirit momentum: keep the current spirit for several lines
  currentSpiritId: string | null;
  spiritMomentum: number;  // Lines remaining for current spirit
}

export interface DetectionMetrics {
  symbolDetections: number;
  structureDetections: number;
  rotationDetections: number;
  depthEscalations: number;
}

// Create fresh metrics
export function createDetectionMetrics(): DetectionMetrics {
  return {
    symbolDetections: 0,
    structureDetections: 0,
    rotationDetections: 0,
    depthEscalations: 0,
  };
}

// Structural patterns mapped to spirits
// These are syntax/rhythm patterns, NOT vocabulary
interface StructuralPattern {
  test: (line: string) => boolean;
  spirits: string[];
  weight: number;
  description: string;  // For debugging
}

const STRUCTURAL_PATTERNS: StructuralPattern[] = [
  // Sentence length patterns
  {
    test: (line) => {
      const words = line.trim().split(/\s+/);
      return words.length <= 7 && line.endsWith('.') && !line.includes('?');
    },
    spirits: ['wittgenstein', 'herzog'],
    weight: 2,
    description: 'short-declarative',
  },
  {
    test: (line) => line.trim().split(/\s+/).length > 35,
    spirits: ['deleuze', 'grothendieck', 'calasso'],
    weight: 2,
    description: 'long-flowing',
  },

  // Punctuation patterns
  {
    test: (line) => {
      const commaCount = (line.match(/,/g) || []).length;
      const wordCount = line.trim().split(/\s+/).length;
      return commaCount >= 4 && wordCount > 15;
    },
    spirits: ['benjamin', 'warburg', 'calasso'],
    weight: 2,
    description: 'high-comma-density',
  },
  {
    test: (line) => /[—–]/.test(line),  // em-dash or en-dash
    spirits: ['derrida', 'benjamin', 'barthes'],
    weight: 1,
    description: 'dash-interruption',
  },
  {
    test: (line) => (line.match(/;/g) || []).length >= 1,
    spirits: ['grothendieck', 'derrida'],
    weight: 1,
    description: 'semicolon-usage',
  },

  // Syntactic structures
  {
    test: (line) => /not\s+\w+[\w\s,]*\s+but\s+/i.test(line),
    spirits: ['derrida', 'benjamin'],
    weight: 3,
    description: 'not-X-but-Y',
  },
  {
    test: (line) => /neither\s+[\w\s]+\s+nor\s+/i.test(line),
    spirits: ['derrida', 'bateson'],
    weight: 2,
    description: 'neither-nor',
  },
  {
    test: (line) => line.includes('?'),
    spirits: ['bateson', 'wittgenstein', 'barthes'],
    weight: 1,
    description: 'interrogative',
  },
  {
    test: (line) => /\b(if\s+[\w\s]+,\s+then)\b/i.test(line),
    spirits: ['bateson', 'grothendieck'],
    weight: 2,
    description: 'conditional',
  },

  // Rhetorical patterns
  {
    test: (line) => {
      // Parallel structure: similar clause beginnings
      const parts = line.split(/[,;]/);
      if (parts.length < 3) return false;
      const firstWords = parts.map(p => p.trim().split(/\s+/)[0]?.toLowerCase());
      const repeated = firstWords.filter((w, i, arr) => arr.indexOf(w) !== i);
      return repeated.length >= 1;
    },
    spirits: ['benjamin', 'warburg', 'borges'],
    weight: 2,
    description: 'parallel-structure',
  },
  {
    test: (line) => /\b(again|once more|return|back to)\b/i.test(line),
    spirits: ['ibn-khaldun', 'bateson', 'derrida'],
    weight: 1,
    description: 'return-motif',
  },

  // Perspective patterns
  {
    test: (line) => /\b(one\s+might|perhaps|it\s+seems)\b/i.test(line),
    spirits: ['simmel', 'barthes'],
    weight: 1,
    description: 'hedged-observation',
  },
  {
    test: (line) => /\b(every|all|each|always|never)\b/i.test(line) && line.trim().split(/\s+/).length < 15,
    spirits: ['wittgenstein', 'borges'],
    weight: 1,
    description: 'universal-claim',
  },

  // Temporal patterns
  {
    test: (line) => /\b(once|was|had been|before)\b/i.test(line) && /\b(now|is|becomes)\b/i.test(line),
    spirits: ['benjamin', 'warburg', 'ibn-khaldun'],
    weight: 2,
    description: 'past-present-juxtaposition',
  },

  // Documentary/observational patterns (for Herzog)
  {
    test: (line) => {
      // Physical description pattern: adjective + concrete noun
      return /\b(the\s+\w+\s+(light|sound|texture|surface|face|hands|eyes|silence|noise|darkness))\b/i.test(line);
    },
    spirits: ['herzog', 'warburg'],
    weight: 2,
    description: 'sensory-observation',
  },

  // Negation patterns
  {
    test: (line) => {
      const negations = (line.match(/\b(not|no|never|nothing|without|lacks|absence)\b/gi) || []).length;
      return negations >= 2;
    },
    spirits: ['derrida', 'wittgenstein'],
    weight: 2,
    description: 'multiple-negation',
  },

  // Spatial/geometric patterns
  {
    test: (line) => /\b(between|among|through|across|within|inside|outside)\b/i.test(line),
    spirits: ['simmel', 'deleuze', 'borges'],
    weight: 1,
    description: 'spatial-preposition',
  },
];

/**
 * Detect which spirit is active based on structure + symbols
 * Priority: momentum > symbol resonance > structural patterns > rotation
 *
 * Spirits have "momentum" - once detected, they stay active for several lines
 * to allow for more coherent, immersive possession.
 */
export function detectActiveSpirit(
  line: string,
  methods: Method[],
  state: DetectionState
): DetectionResult {
  const trimmed = line.trim();

  // Skip empty lines and symbols themselves
  if (!trimmed || isTransitionalSymbol(trimmed)) {
    return { id: null, source: null };
  }

  // 0. Spirit momentum - current spirit stays active if it has momentum
  // Only strong signals (symbols) can interrupt momentum
  if (state.currentSpiritId && state.spiritMomentum > 0) {
    // Check if symbol triggers a DIFFERENT spirit (can interrupt)
    if (state.recentSymbol) {
      const resonantMethods = methods.filter(m =>
        m.resonantSymbols.includes(state.recentSymbol!) && m.id !== state.currentSpiritId
      );
      if (resonantMethods.length > 0) {
        // Symbol interrupts current spirit with a different one
        const method = resonantMethods[Math.floor(Math.random() * resonantMethods.length)];
        return { id: method.id, source: 'symbol', confidence: 0.9 };
      }
    }
    // No interruption - continue with current spirit
    return { id: state.currentSpiritId, source: 'structure', confidence: 0.7 };
  }

  // 1. Symbol resonance (highest priority for starting new possession)
  if (state.recentSymbol) {
    const resonantMethods = methods.filter(m =>
      m.resonantSymbols.includes(state.recentSymbol!)
    );
    if (resonantMethods.length > 0) {
      const method = resonantMethods[Math.floor(Math.random() * resonantMethods.length)];
      return { id: method.id, source: 'symbol', confidence: 0.9 };
    }
  }

  // 2. Structural pattern detection
  const structureMatch = detectByStructure(line, methods);
  if (structureMatch) {
    return { id: structureMatch.id, source: 'structure', confidence: structureMatch.confidence };
  }

  // 3. Round-robin rotation (ensures all spirits speak)
  // Increased threshold since spirits now persist longer
  if (state.linesSinceDetection >= 8 && methods.length > 0) {
    const nextIndex = (state.lastMethodIndex + 1) % methods.length;
    return { id: methods[nextIndex].id, source: 'rotation', confidence: 0.3 };
  }

  return { id: null, source: null };
}

/**
 * Detect spirit by structural patterns only
 */
function detectByStructure(
  line: string,
  methods: Method[]
): { id: string; confidence: number } | null {
  const methodIds = new Set(methods.map(m => m.id));
  const scores: Record<string, number> = {};
  let maxPossibleScore = 0;

  for (const pattern of STRUCTURAL_PATTERNS) {
    if (pattern.test(line)) {
      for (const spirit of pattern.spirits) {
        if (methodIds.has(spirit)) {
          scores[spirit] = (scores[spirit] || 0) + pattern.weight;
        }
      }
      maxPossibleScore += pattern.weight;
    }
  }

  const entries = Object.entries(scores);
  if (entries.length === 0) return null;

  // Sort by score, highest first
  entries.sort((a, b) => b[1] - a[1]);

  const [topId, topScore] = entries[0];

  // Require minimum score of 2 to avoid false positives
  if (topScore < 2) return null;

  // Calculate confidence based on score relative to theoretical max
  const confidence = Math.min(topScore / 6, 0.85);  // Cap at 0.85

  return { id: topId, confidence };
}

/**
 * Enhanced structural detection using compiled signatures
 * Used when spirits have compiled.json with structuralSignature
 */
export function detectBySignature(
  line: string,
  spiritSignatures: Map<string, StructuralSignature>
): { id: string; confidence: number } | null {
  const words = line.trim().split(/\s+/);
  const wordCount = words.length;
  const commas = (line.match(/,/g) || []).length;
  const punctDensity = commas / Math.max(wordCount, 1);

  const scores: { id: string; score: number }[] = [];

  for (const [id, sig] of spiritSignatures) {
    let score = 0;

    // Match sentence length
    if (sig.sentenceLength === 'short' && wordCount <= 10) score += 2;
    if (sig.sentenceLength === 'long' && wordCount >= 25) score += 2;
    if (sig.sentenceLength === 'medium' && wordCount > 10 && wordCount < 25) score += 1;
    if (sig.sentenceLength === 'varied') score += 0.5; // Always partial match

    // Match punctuation density
    if (sig.punctuationDensity === 'sparse' && punctDensity < 0.1) score += 1;
    if (sig.punctuationDensity === 'dense' && punctDensity > 0.2) score += 1;
    if (sig.punctuationDensity === 'moderate' && punctDensity >= 0.1 && punctDensity <= 0.2) score += 0.5;

    // Check rhetorical moves
    for (const move of sig.rhetoricalMoves) {
      if (move === 'aphorism' && wordCount <= 10 && line.endsWith('.')) score += 1;
      if (move === 'accumulation' && commas >= 3) score += 1;
      if (move === 'interrogation' && line.includes('?')) score += 1;
      if (move === 'juxtaposition' && /not\s+\w+\s+but/.test(line)) score += 2;
    }

    if (score > 0) {
      scores.push({ id, score });
    }
  }

  if (scores.length === 0) return null;

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score < 2) return null;

  return { id: best.id, confidence: Math.min(best.score / 5, 0.8) };
}

// Minimum lines a spirit stays active once detected
const SPIRIT_MOMENTUM_MIN = 4;
const SPIRIT_MOMENTUM_MAX = 8;

/**
 * Create initial detection state
 */
export function createDetectionState(): DetectionState {
  return {
    recentSymbol: null,
    linesSinceDetection: 0,
    lastMethodIndex: -1,
    depthLevel: 0,
    currentSpiritId: null,
    spiritMomentum: 0,
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

  // Update recent symbol (cleared if not a symbol line)
  const recentSymbol = isSymbol ? trimmed : null;

  // Update lines since detection
  const linesSinceDetection = result.id ? 0 : state.linesSinceDetection + 1;

  // Update last method index
  let lastMethodIndex = state.lastMethodIndex;
  if (result.id) {
    const idx = methods.findIndex(m => m.id === result.id);
    if (idx >= 0) lastMethodIndex = idx;
  }

  // Depth escalation: increase when symbol detected (signals deeper possession)
  let depthLevel = state.depthLevel;
  if (isSymbol && result.id && state.depthLevel < 2) {
    depthLevel = state.depthLevel + 1;
  }

  // Spirit momentum management
  let currentSpiritId = state.currentSpiritId;
  let spiritMomentum = state.spiritMomentum;

  if (result.id) {
    if (result.id !== state.currentSpiritId) {
      // New spirit detected - reset momentum
      currentSpiritId = result.id;
      // Random momentum between min and max for variety
      spiritMomentum = SPIRIT_MOMENTUM_MIN + Math.floor(Math.random() * (SPIRIT_MOMENTUM_MAX - SPIRIT_MOMENTUM_MIN + 1));
    } else {
      // Same spirit continues - decrement momentum
      spiritMomentum = Math.max(0, state.spiritMomentum - 1);
    }
  } else {
    // No detection this line
    spiritMomentum = Math.max(0, state.spiritMomentum - 1);
    if (spiritMomentum === 0) {
      currentSpiritId = null;
    }
  }

  return {
    recentSymbol,
    linesSinceDetection,
    lastMethodIndex,
    depthLevel,
    currentSpiritId,
    spiritMomentum,
  };
}

/**
 * Update detection metrics based on result
 */
export function updateDetectionMetrics(
  metrics: DetectionMetrics,
  result: DetectionResult,
  state: DetectionState,
  prevState: DetectionState
): void {
  if (result.source === 'symbol') {
    metrics.symbolDetections++;
  } else if (result.source === 'structure') {
    metrics.structureDetections++;
  } else if (result.source === 'rotation') {
    metrics.rotationDetections++;
  }

  // Track depth escalations
  if (state.depthLevel > prevState.depthLevel) {
    metrics.depthEscalations++;
  }
}

/**
 * Check if depth should escalate (for progressive disclosure)
 */
export function shouldEscalateDepth(
  state: DetectionState,
  result: DetectionResult,
  line: string
): boolean {
  // Escalate when:
  // 1. Symbol detected after content (signals transition into deeper possession)
  // 2. Multiple consecutive detections of same spirit
  // 3. High confidence structural match

  if (isTransitionalSymbol(line.trim())) {
    return state.depthLevel < 2;
  }

  if (result.source === 'symbol' && result.confidence && result.confidence > 0.8) {
    return state.depthLevel < 2;
  }

  return false;
}
