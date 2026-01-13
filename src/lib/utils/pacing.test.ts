import { describe, it, expect } from 'vitest';
import { calculateDelay, detectClosing, type PacingContext } from './pacing';

describe('pacing', () => {
  const defaultContext: PacingContext = {
    consecutiveLines: 0,
    isClosing: false,
    methodShifting: false,
  };

  describe('calculateDelay', () => {
    it('should return minimal delay for empty lines', () => {
      const delay = calculateDelay('', defaultContext);
      expect(delay).toBe(25); // BASE_DELAY (50) * 0.5
    });

    it('should return minimal delay for whitespace-only lines', () => {
      const delay = calculateDelay('   ', defaultContext);
      expect(delay).toBe(25);
    });

    it('should return symbol delay for transitional symbols', () => {
      const delay = calculateDelay('◊', defaultContext);
      expect(delay).toBe(300); // BASE_DELAY (50) * 6.0
    });

    it('should return symbol delay for all symbols', () => {
      const symbols = ['◊', '∎', '⁂', '†', '⋮', '∘', '⟡'];
      for (const symbol of symbols) {
        const delay = calculateDelay(symbol, defaultContext);
        expect(delay).toBe(300);
      }
    });

    it('should return method shift delay when shifting', () => {
      const context: PacingContext = { ...defaultContext, methodShifting: true };
      const delay = calculateDelay('some text', context);
      expect(delay).toBe(400); // BASE_DELAY (50) * 8.0
    });

    it('should return closing delay when closing', () => {
      const context: PacingContext = { ...defaultContext, isClosing: true };
      const delay = calculateDelay('some text', context);
      expect(delay).toBe(500); // BASE_DELAY (50) * 10.0
    });

    it('should return flow delay for consecutive lines > 3', () => {
      const context: PacingContext = { ...defaultContext, consecutiveLines: 5 };
      const delay = calculateDelay('flowing text', context);
      expect(delay).toBe(40); // BASE_DELAY (50) * 0.8
    });

    it('should return base delay for normal sentences', () => {
      const delay = calculateDelay('A normal sentence.', defaultContext);
      expect(delay).toBe(50); // BASE_DELAY (50) * 1.0
    });

    it('should prioritize symbol detection over method shifting', () => {
      const context: PacingContext = {
        consecutiveLines: 10,
        isClosing: false,
        methodShifting: true,
      };
      const delay = calculateDelay('◊', context);
      expect(delay).toBe(300); // Symbol delay takes precedence
    });

    it('should prioritize symbol detection over closing', () => {
      const context: PacingContext = {
        consecutiveLines: 10,
        isClosing: true,
        methodShifting: false,
      };
      const delay = calculateDelay('◊', context);
      expect(delay).toBe(300); // Symbol delay takes precedence
    });

    it('should prioritize method shifting over closing', () => {
      const context: PacingContext = {
        consecutiveLines: 0,
        isClosing: true,
        methodShifting: true,
      };
      const delay = calculateDelay('some text', context);
      expect(delay).toBe(400); // Method shift delay
    });

    it('should prioritize closing over flow', () => {
      const context: PacingContext = {
        consecutiveLines: 10,
        isClosing: true,
        methodShifting: false,
      };
      const delay = calculateDelay('some text', context);
      expect(delay).toBe(500); // Closing delay
    });
  });

  describe('detectClosing', () => {
    it('should detect "what remains" as closing', () => {
      expect(detectClosing('What remains is silence.')).toBe(true);
    });

    it('should detect "and so" as closing', () => {
      expect(detectClosing('And so we arrive here.')).toBe(true);
    });

    it('should detect "finally" as closing', () => {
      expect(detectClosing('Finally, the pattern emerges.')).toBe(true);
    });

    it('should detect "thus" as closing', () => {
      expect(detectClosing('Thus we see the truth.')).toBe(true);
    });

    it('should detect "here is" as closing', () => {
      expect(detectClosing('Here is what we learned.')).toBe(true);
    });

    it('should detect "in the end" as closing', () => {
      expect(detectClosing('In the end, all things pass.')).toBe(true);
    });

    it('should detect "this, then" as closing', () => {
      expect(detectClosing('This, then, is our conclusion.')).toBe(true);
    });

    it('should detect "we arrive" as closing', () => {
      expect(detectClosing('We arrive at understanding.')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(detectClosing('WHAT REMAINS')).toBe(true);
      expect(detectClosing('Thus We See')).toBe(true);
      expect(detectClosing('FINALLY')).toBe(true);
    });

    it('should return false for non-closing text', () => {
      expect(detectClosing('The beginning of thought.')).toBe(false);
      expect(detectClosing('Consider this possibility.')).toBe(false);
      expect(detectClosing('An ordinary sentence.')).toBe(false);
    });

    it('should detect markers within longer text', () => {
      expect(detectClosing('After all this exploration, what remains is mystery.')).toBe(true);
      expect(detectClosing('Through many turns, and so it goes.')).toBe(true);
    });
  });
});
