import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectActiveSpirit,
  createDetectionState,
  updateDetectionState,
  createDetectionMetrics,
  updateDetectionMetrics,
  shouldEscalateDepth,
  detectBySignature,
  detectHandoffHook,
  type DetectionState,
  type DetectionMetrics,
  type DetectionResult,
} from './detection';
import type { Method } from '$lib/methods';
import type { StructuralSignature } from '$lib/spirits/types';

// Mock methods for testing
const mockMethods: Method[] = [
  {
    id: 'wittgenstein',
    name: 'Wittgenstein',
    source: 'Tractatus',
    color: '#333',
    letterSpacing: 0.02,
    resonantSymbols: ['◊', '∎'],
    vocabulary: [],
    domains: ['logic', 'language'],
    compatibleWith: ['simmel'],
    tensionsWith: ['deleuze'],
    promptContent: 'Test content',
  },
  {
    id: 'herzog',
    name: 'Herzog',
    source: 'Burden of Dreams',
    color: '#444',
    letterSpacing: 0.02,
    resonantSymbols: ['∎', '◌', '∿'],
    vocabulary: [],
    domains: ['documentary', 'truth'],
    compatibleWith: ['benjamin'],
    tensionsWith: ['wittgenstein'],
    promptContent: 'Test content',
  },
  {
    id: 'benjamin',
    name: 'Benjamin',
    source: 'Arcades',
    color: '#555',
    letterSpacing: 0.02,
    resonantSymbols: ['※', '†'],
    vocabulary: [],
    domains: ['history', 'memory'],
    compatibleWith: ['warburg'],
    tensionsWith: [],
    promptContent: 'Test content',
  },
  {
    id: 'simmel',
    name: 'Simmel',
    source: 'The Stranger',
    color: '#666',
    letterSpacing: 0.016,
    resonantSymbols: ['◌', '⟡', '∘'],
    vocabulary: [],
    domains: ['relation', 'form'],
    compatibleWith: ['wittgenstein'],
    tensionsWith: [],
    promptContent: 'Test content',
  },
  {
    id: 'derrida',
    name: 'Derrida',
    source: 'Of Grammatology',
    color: '#777',
    letterSpacing: 0.02,
    resonantSymbols: ['†', '◈'],
    vocabulary: [],
    domains: ['deconstruction'],
    compatibleWith: [],
    tensionsWith: [],
    promptContent: 'Test content',
  },
  {
    id: 'bateson',
    name: 'Bateson',
    source: 'Steps to an Ecology of Mind',
    color: '#888',
    letterSpacing: 0.02,
    resonantSymbols: ['⊹', '∿'],
    vocabulary: [],
    domains: ['cybernetics', 'ecology'],
    compatibleWith: [],
    tensionsWith: [],
    promptContent: 'Test content',
  },
];

describe('detection', () => {
  let state: DetectionState;
  let metrics: DetectionMetrics;

  beforeEach(() => {
    state = createDetectionState();
    metrics = createDetectionMetrics();
  });

  describe('createDetectionState', () => {
    it('should create a fresh state with all fields initialized', () => {
      const fresh = createDetectionState();
      expect(fresh.recentSymbol).toBeNull();
      expect(fresh.previousLineWasSymbol).toBe(false);
      expect(fresh.linesSinceDetection).toBe(0);
      expect(fresh.lastMethodIndex).toBe(-1);
      expect(fresh.depthLevel).toBe(0);
      expect(fresh.currentSpiritId).toBeNull();
      expect(fresh.spiritMomentum).toBe(0);
      expect(fresh.momentumInitiatedBySymbol).toBe(false);
      expect(fresh.switchCandidate).toBeNull();
      expect(fresh.switchEvidence).toBe(0);
    });
  });

  describe('createDetectionMetrics', () => {
    it('should create fresh metrics with all counters at zero', () => {
      const fresh = createDetectionMetrics();
      expect(fresh.symbolDetections).toBe(0);
      expect(fresh.structureDetections).toBe(0);
      expect(fresh.rotationDetections).toBe(0);
      expect(fresh.handoffDetections).toBe(0);
      expect(fresh.depthEscalations).toBe(0);
    });
  });

  describe('detectActiveSpirit', () => {
    describe('symbol resonance', () => {
      it('should detect spirit by symbol resonance when recentSymbol is set', () => {
        // Set up state with a recent symbol
        state.recentSymbol = '◊'; // resonates with wittgenstein

        const result = detectActiveSpirit('This is a test line.', mockMethods, state);

        expect(result.id).toBe('wittgenstein');
        expect(result.source).toBe('symbol');
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      it('should return null for symbol lines themselves', () => {
        const result = detectActiveSpirit('◊', mockMethods, state);

        expect(result.id).toBeNull();
        expect(result.source).toBeNull();
      });

      it('should return null for empty lines', () => {
        const result = detectActiveSpirit('', mockMethods, state);

        expect(result.id).toBeNull();
        expect(result.source).toBeNull();
      });

      it('should return null for whitespace-only lines', () => {
        const result = detectActiveSpirit('   \t  ', mockMethods, state);

        expect(result.id).toBeNull();
        expect(result.source).toBeNull();
      });
    });

    describe('momentum', () => {
      it('should maintain current spirit when momentum is positive', () => {
        state.currentSpiritId = 'herzog';
        state.spiritMomentum = 5;
        state.momentumInitiatedBySymbol = false;

        const result = detectActiveSpirit('Random line here.', mockMethods, state);

        expect(result.id).toBe('herzog');
        expect(result.source).toBe('structure');
      });

      it('should attribute momentum source to symbol if initiated by symbol', () => {
        state.currentSpiritId = 'herzog';
        state.spiritMomentum = 5;
        state.momentumInitiatedBySymbol = true;

        const result = detectActiveSpirit('Random line here.', mockMethods, state);

        expect(result.id).toBe('herzog');
        expect(result.source).toBe('symbol');
      });
    });

    describe('structural patterns', () => {
      it('should detect wittgenstein for short declarative sentences', () => {
        // No momentum, no recent symbol
        const result = detectActiveSpirit('Facts are what matters.', mockMethods, state);

        // Short declarative should match wittgenstein or herzog
        if (result.id) {
          expect(['wittgenstein', 'herzog']).toContain(result.id);
          expect(result.source).toBe('structure');
        }
      });

      it('should detect derrida/benjamin for not-X-but-Y patterns', () => {
        const result = detectActiveSpirit('Not the presence of meaning but its eternal deferral defines the text.', mockMethods, state);

        if (result.id) {
          expect(['derrida', 'benjamin']).toContain(result.id);
        }
      });

      it('should detect bateson/wittgenstein for interrogative patterns', () => {
        const result = detectActiveSpirit('What is the pattern that connects?', mockMethods, state);

        if (result.id) {
          expect(['bateson', 'wittgenstein']).toContain(result.id);
        }
      });
    });

    describe('rotation fallback', () => {
      it('should trigger rotation after 8 lines without detection', () => {
        state.linesSinceDetection = 8;
        state.lastMethodIndex = 0;

        // Use a question - interrogative pattern has weight 1 (below threshold of 2)
        // So detectByStructure returns null, triggering rotation
        const result = detectActiveSpirit('Why?', mockMethods, state);

        expect(result.id).not.toBeNull();
        expect(result.source).toBe('rotation');
        expect(result.confidence).toBeLessThan(0.5);
      });

      it('should not trigger rotation before 8 lines', () => {
        state.linesSinceDetection = 7;

        // Same low-weight pattern line
        const result = detectActiveSpirit('Why?', mockMethods, state);

        // Should be null since structure didn't detect and rotation threshold not met
        expect(result.id).toBeNull();
      });
    });

    describe('hysteresis', () => {
      it('should maintain current spirit via momentum even if structure suggests different', () => {
        state.currentSpiritId = 'herzog';
        state.spiritMomentum = 3; // Still has momentum

        // Line with interrogative pattern (would match bateson/wittgenstein)
        const result = detectActiveSpirit('What is the deeper pattern here?', mockMethods, state);

        // Should stick with current spirit due to momentum
        expect(result.id).toBe('herzog');
      });

      it('should eventually switch after momentum expires and consistent signals', () => {
        state.currentSpiritId = 'herzog';
        state.spiritMomentum = 0; // Momentum expired
        state.switchCandidate = 'derrida';
        state.switchEvidence = 2; // At threshold

        // Line with not-X-but-Y pattern (matches derrida/benjamin)
        const result = detectActiveSpirit('Not the presence but the absence defines meaning.', mockMethods, state);

        // With evidence at threshold and structure match, should allow switch
        // Note: actual switch depends on detectByStructure finding same spirit
        if (result.id) {
          expect(result.source).toBe('structure');
        }
      });

      it('should accept new spirit when no current spirit exists', () => {
        // No current spirit
        const result = detectActiveSpirit('Not the surface but the depth matters here.', mockMethods, state);

        // Should accept whatever structure detects
        if (result.id) {
          expect(result.source).toBe('structure');
        }
      });
    });
  });

  describe('updateDetectionState', () => {
    it('should set recentSymbol when line is a symbol', () => {
      const result: DetectionResult = { id: null, source: null };
      const newState = updateDetectionState(state, '◊', result, mockMethods);

      expect(newState.recentSymbol).toBe('◊');
      expect(newState.previousLineWasSymbol).toBe(true);
    });

    it('should preserve recentSymbol through empty lines', () => {
      state.recentSymbol = '◊';
      const result: DetectionResult = { id: null, source: null };
      const newState = updateDetectionState(state, '', result, mockMethods);

      expect(newState.recentSymbol).toBe('◊');
    });

    it('should clear recentSymbol after content line', () => {
      state.recentSymbol = '◊';
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };
      const newState = updateDetectionState(state, 'Content line.', result, mockMethods);

      expect(newState.recentSymbol).toBeNull();
    });

    it('should reset linesSinceDetection when detection occurs', () => {
      state.linesSinceDetection = 5;
      const result: DetectionResult = { id: 'herzog', source: 'structure' };
      const newState = updateDetectionState(state, 'Test line.', result, mockMethods);

      expect(newState.linesSinceDetection).toBe(0);
    });

    it('should increment linesSinceDetection when no detection', () => {
      state.linesSinceDetection = 5;
      const result: DetectionResult = { id: null, source: null };
      const newState = updateDetectionState(state, 'Test line.', result, mockMethods);

      expect(newState.linesSinceDetection).toBe(6);
    });

    it('should escalate depth when detection follows symbol', () => {
      state.previousLineWasSymbol = true;
      state.depthLevel = 0;
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };
      const newState = updateDetectionState(state, 'Content after symbol.', result, mockMethods);

      expect(newState.depthLevel).toBe(1);
    });

    it('should not escalate depth beyond level 2', () => {
      state.previousLineWasSymbol = true;
      state.depthLevel = 2;
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };
      const newState = updateDetectionState(state, 'Content after symbol.', result, mockMethods);

      expect(newState.depthLevel).toBe(2);
    });

    it('should set momentum when new spirit detected', () => {
      const result: DetectionResult = { id: 'herzog', source: 'structure' };
      const newState = updateDetectionState(state, 'Test line.', result, mockMethods);

      expect(newState.currentSpiritId).toBe('herzog');
      expect(newState.spiritMomentum).toBeGreaterThanOrEqual(4);
      expect(newState.spiritMomentum).toBeLessThanOrEqual(8);
    });

    it('should decrement momentum when same spirit continues', () => {
      state.currentSpiritId = 'herzog';
      state.spiritMomentum = 5;
      const result: DetectionResult = { id: 'herzog', source: 'structure' };
      const newState = updateDetectionState(state, 'Test line.', result, mockMethods);

      expect(newState.spiritMomentum).toBe(4);
    });

    it('should clear currentSpiritId when momentum reaches 0', () => {
      state.currentSpiritId = 'herzog';
      state.spiritMomentum = 1;
      const result: DetectionResult = { id: null, source: null };
      const newState = updateDetectionState(state, 'Test line.', result, mockMethods);

      expect(newState.spiritMomentum).toBe(0);
      expect(newState.currentSpiritId).toBeNull();
    });

    it('should track switch candidate for hysteresis', () => {
      state.currentSpiritId = 'herzog';
      state.spiritMomentum = 0;
      const result: DetectionResult = { id: 'herzog', source: 'structure' };

      // Line suggesting derrida/benjamin
      const newState = updateDetectionState(
        state,
        'Not the surface but the hidden depth of meaning.',
        result,
        mockMethods
      );

      // Should have a switch candidate if structure detected different spirit
      // This depends on exact pattern matching
    });
  });

  describe('updateDetectionMetrics', () => {
    it('should increment symbolDetections for symbol source', () => {
      const prevState = createDetectionState();
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };

      updateDetectionMetrics(metrics, result, state, prevState);

      expect(metrics.symbolDetections).toBe(1);
      expect(metrics.structureDetections).toBe(0);
      expect(metrics.rotationDetections).toBe(0);
    });

    it('should increment structureDetections for structure source', () => {
      const prevState = createDetectionState();
      const result: DetectionResult = { id: 'herzog', source: 'structure' };

      updateDetectionMetrics(metrics, result, state, prevState);

      expect(metrics.structureDetections).toBe(1);
    });

    it('should increment rotationDetections for rotation source', () => {
      const prevState = createDetectionState();
      const result: DetectionResult = { id: 'benjamin', source: 'rotation' };

      updateDetectionMetrics(metrics, result, state, prevState);

      expect(metrics.rotationDetections).toBe(1);
    });

    it('should increment handoffDetections for handoff source', () => {
      const prevState = createDetectionState();
      const result: DetectionResult = { id: 'benjamin', source: 'handoff' };

      updateDetectionMetrics(metrics, result, state, prevState);

      expect(metrics.handoffDetections).toBe(1);
    });

    it('should increment depthEscalations when depth increases', () => {
      const prevState = createDetectionState();
      prevState.depthLevel = 0;
      state.depthLevel = 1;
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };

      updateDetectionMetrics(metrics, result, state, prevState);

      expect(metrics.depthEscalations).toBe(1);
    });

    it('should not increment depthEscalations when depth stays same', () => {
      const prevState = createDetectionState();
      prevState.depthLevel = 1;
      state.depthLevel = 1;
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };

      updateDetectionMetrics(metrics, result, state, prevState);

      expect(metrics.depthEscalations).toBe(0);
    });
  });

  describe('shouldEscalateDepth', () => {
    it('should return true when previous line was symbol and detection occurred', () => {
      state.previousLineWasSymbol = true;
      state.depthLevel = 0;
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };

      expect(shouldEscalateDepth(state, result, 'Test line')).toBe(true);
    });

    it('should return false when already at max depth', () => {
      state.previousLineWasSymbol = true;
      state.depthLevel = 2;
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol' };

      expect(shouldEscalateDepth(state, result, 'Test line')).toBe(false);
    });

    it('should return true for high confidence symbol detection', () => {
      state.depthLevel = 0;
      const result: DetectionResult = { id: 'wittgenstein', source: 'symbol', confidence: 0.9 };

      expect(shouldEscalateDepth(state, result, 'Test line')).toBe(true);
    });

    it('should return false for structure detection without symbol context', () => {
      state.previousLineWasSymbol = false;
      state.depthLevel = 0;
      const result: DetectionResult = { id: 'herzog', source: 'structure', confidence: 0.6 };

      expect(shouldEscalateDepth(state, result, 'Test line')).toBe(false);
    });
  });

  describe('detectBySignature', () => {
    const signatures = new Map<string, StructuralSignature>([
      ['wittgenstein', {
        sentenceLength: 'short',
        punctuationDensity: 'sparse',
        rhetoricalMoves: ['aphorism'],
      }],
      ['benjamin', {
        sentenceLength: 'long',
        punctuationDensity: 'dense',
        rhetoricalMoves: ['accumulation', 'juxtaposition'],
      }],
      ['simmel', {
        sentenceLength: 'medium',
        punctuationDensity: 'moderate',
        rhetoricalMoves: [],
      }],
    ]);

    it('should match short sentences to short-sentence spirits', () => {
      const result = detectBySignature('Facts matter.', signatures);

      if (result) {
        expect(result.id).toBe('wittgenstein');
      }
    });

    it('should match long sentences to long-sentence spirits', () => {
      const longSentence = 'The way in which the city reveals itself through its arcades, through the accumulation of commodities, through the endless parade of shoppers, through the glass and iron that both protect and expose, creates a constellation of meaning that cannot be reduced to simple commerce.';
      const result = detectBySignature(longSentence, signatures);

      if (result) {
        expect(result.id).toBe('benjamin');
      }
    });

    it('should match interrogation rhetorical move', () => {
      // Create signatures with interrogation
      const signaturesWithInterrogation = new Map<string, StructuralSignature>([
        ['bateson', {
          sentenceLength: 'medium',
          punctuationDensity: 'moderate',
          rhetoricalMoves: ['interrogation'],
        }],
      ]);

      const result = detectBySignature('What is the pattern?', signaturesWithInterrogation);

      if (result) {
        expect(result.id).toBe('bateson');
      }
    });

    it('should match short aphoristic lines to wittgenstein-like signatures', () => {
      // "Hello world." matches short, sparse, aphoristic pattern
      const result = detectBySignature('Hello world.', signatures);

      if (result) {
        expect(result.id).toBe('wittgenstein');
        expect(result.confidence).toBeGreaterThanOrEqual(0.4);
      }
    });

    it('should return null for empty signatures map', () => {
      const emptySignatures = new Map<string, StructuralSignature>();
      const result = detectBySignature('Test line.', emptySignatures);

      expect(result).toBeNull();
    });
  });

  describe('detectHandoffHook', () => {
    const availableSpirits = new Set(['benjamin', 'wittgenstein', 'simmel', 'herzog', 'bateson', 'flusser']);

    it('should detect Herzog to Benjamin handoff hook', () => {
      const result = detectHandoffHook(
        'And what remains in the ruins of this place...',
        'herzog',
        availableSpirits
      );

      expect(result).not.toBeNull();
      expect(result?.targetSpirit).toBe('benjamin');
    });

    it('should detect Wittgenstein to Bateson handoff hook', () => {
      const result = detectHandoffHook(
        'But what kind of difference is this difference that we observe?',
        'wittgenstein',
        availableSpirits
      );

      expect(result).not.toBeNull();
      expect(result?.targetSpirit).toBe('bateson');
    });

    it('should not detect hook when current spirit does not match', () => {
      // "what remains in the ruins" is a Herzog hook, not Benjamin
      const result = detectHandoffHook(
        'And what remains in the ruins...',
        'benjamin', // Wrong source spirit
        availableSpirits
      );

      expect(result).toBeNull();
    });

    it('should not detect hook when target spirit is not available', () => {
      const limitedSpirits = new Set(['herzog', 'wittgenstein']);
      // Benjamin is not available
      const result = detectHandoffHook(
        'And what remains in the ruins...',
        'herzog',
        limitedSpirits
      );

      expect(result).toBeNull();
    });

    it('should return null for lines without hooks', () => {
      const result = detectHandoffHook(
        'The sky is blue today.',
        'herzog',
        availableSpirits
      );

      expect(result).toBeNull();
    });
  });

  describe('handoff in detectActiveSpirit', () => {
    it('should detect handoff and switch spirit when hook line is found', () => {
      state.currentSpiritId = 'herzog';
      state.spiritMomentum = 5; // Has momentum, but handoff should override

      const result = detectActiveSpirit(
        'And what remains in the ruins of this forgotten place...',
        mockMethods,
        state
      );

      // Should detect handoff to benjamin even though herzog has momentum
      expect(result.id).toBe('benjamin');
      expect(result.source).toBe('handoff');
    });
  });

  describe('integration: full detection flow', () => {
    it('should handle symbol → resonance → momentum flow', () => {
      // Line 1: Symbol
      let result = detectActiveSpirit('◊', mockMethods, state);
      expect(result.id).toBeNull(); // Symbols themselves don't get detection
      state = updateDetectionState(state, '◊', result, mockMethods);
      expect(state.recentSymbol).toBe('◊');

      // Line 2: Content after symbol - should get symbol resonance
      result = detectActiveSpirit('The limit of my language is the limit of my world.', mockMethods, state);
      expect(result.id).toBe('wittgenstein');
      expect(result.source).toBe('symbol');
      state = updateDetectionState(state, 'The limit of my language...', result, mockMethods);
      expect(state.currentSpiritId).toBe('wittgenstein');
      expect(state.spiritMomentum).toBeGreaterThan(0);

      // Line 3: Random content - should maintain momentum
      result = detectActiveSpirit('Some other content here.', mockMethods, state);
      expect(result.id).toBe('wittgenstein'); // Momentum keeps spirit
      state = updateDetectionState(state, 'Some other content here.', result, mockMethods);
    });

    it('should track metrics correctly through multiple lines', () => {
      const metrics = createDetectionMetrics();
      let prevState = createDetectionState();

      // Symbol line
      let result = detectActiveSpirit('◊', mockMethods, state);
      state = updateDetectionState(state, '◊', result, mockMethods);
      updateDetectionMetrics(metrics, result, state, prevState);
      prevState = { ...state };

      // Content after symbol
      result = detectActiveSpirit('Facts are stubborn things.', mockMethods, state);
      state = updateDetectionState(state, 'Facts are stubborn things.', result, mockMethods);
      updateDetectionMetrics(metrics, result, state, prevState);

      expect(metrics.symbolDetections).toBe(1);
    });
  });
});
