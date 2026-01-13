import { describe, it, expect } from 'vitest';
import {
  SYMBOLS,
  SYMBOL_LIST,
  isTransitionalSymbol,
  getDepthDirection,
  SYMBOL_SEMANTICS,
  SYMBOL_DEPTH_DIRECTION,
} from './symbols';

describe('symbols', () => {
  describe('SYMBOLS constant', () => {
    it('should contain all 13 defined symbols', () => {
      expect(Object.keys(SYMBOLS)).toHaveLength(13);
    });

    it('should have lozenge symbol as pause', () => {
      expect(SYMBOLS.lozenge).toBe('◊');
    });

    it('should have all expected symbol keys', () => {
      const expectedKeys = [
        'lozenge', 'reference', 'stellar', 'ring', 'dotted',
        'dagger', 'asterism', 'therefore', 'tombstone', 'concave',
        'diamond', 'sine', 'ellipsis'
      ];
      expect(Object.keys(SYMBOLS)).toEqual(expectedKeys);
    });
  });

  describe('SYMBOL_LIST', () => {
    it('should contain all 13 symbol values', () => {
      expect(SYMBOL_LIST).toHaveLength(13);
    });

    it('should contain expected symbols', () => {
      expect(SYMBOL_LIST).toContain('◊');
      expect(SYMBOL_LIST).toContain('∎');
      expect(SYMBOL_LIST).toContain('⁂');
      expect(SYMBOL_LIST).toContain('†');
    });
  });

  describe('isTransitionalSymbol', () => {
    it('should return true for valid symbols', () => {
      expect(isTransitionalSymbol('◊')).toBe(true);
      expect(isTransitionalSymbol('∎')).toBe(true);
      expect(isTransitionalSymbol('⁂')).toBe(true);
      expect(isTransitionalSymbol('†')).toBe(true);
      expect(isTransitionalSymbol('⋮')).toBe(true);
    });

    it('should return true for symbols with whitespace', () => {
      expect(isTransitionalSymbol('  ◊  ')).toBe(true);
      expect(isTransitionalSymbol('\t∎\n')).toBe(true);
      expect(isTransitionalSymbol('   ⁂   ')).toBe(true);
    });

    it('should return false for regular text', () => {
      expect(isTransitionalSymbol('hello')).toBe(false);
      expect(isTransitionalSymbol('*')).toBe(false);
      expect(isTransitionalSymbol('')).toBe(false);
      expect(isTransitionalSymbol('   ')).toBe(false);
    });

    it('should return false for symbol-like but invalid characters', () => {
      expect(isTransitionalSymbol('•')).toBe(false);  // bullet point
      expect(isTransitionalSymbol('★')).toBe(false);  // star
      expect(isTransitionalSymbol('○')).toBe(false);  // different circle
    });

    it('should return false for multiple symbols', () => {
      expect(isTransitionalSymbol('◊◊')).toBe(false);
      expect(isTransitionalSymbol('◊ ∎')).toBe(false);
    });
  });

  describe('getDepthDirection', () => {
    it('should return 1 for descending symbols', () => {
      expect(getDepthDirection('◈')).toBe(1);  // depth
      expect(getDepthDirection('⋮')).toBe(1);  // descent
      expect(getDepthDirection('◊')).toBe(1);  // pause
      expect(getDepthDirection('⁂')).toBe(1);  // constellation
      expect(getDepthDirection('†')).toBe(1);  // cut
    });

    it('should return -1 for ascending symbols', () => {
      expect(getDepthDirection('∘')).toBe(-1);  // return
      expect(getDepthDirection('⟡')).toBe(-1);  // opening
      expect(getDepthDirection('∎')).toBe(-1);  // settling
      expect(getDepthDirection('∴')).toBe(-1);  // therefore
    });

    it('should return 0 for neutral symbols', () => {
      expect(getDepthDirection('※')).toBe(0);  // reference
      expect(getDepthDirection('⊹')).toBe(0);  // stellar
      expect(getDepthDirection('◌')).toBe(0);  // placeholder
      expect(getDepthDirection('∿')).toBe(0);  // continuation
    });

    it('should return 0 for unknown symbols', () => {
      expect(getDepthDirection('X')).toBe(0);
      expect(getDepthDirection('')).toBe(0);
      expect(getDepthDirection('hello')).toBe(0);
    });
  });

  describe('SYMBOL_SEMANTICS', () => {
    it('should provide semantics for all 13 symbols', () => {
      expect(Object.keys(SYMBOL_SEMANTICS)).toHaveLength(13);
    });

    it('should have correct semantics for key symbols', () => {
      expect(SYMBOL_SEMANTICS['◊']).toBe('pause');
      expect(SYMBOL_SEMANTICS['∎']).toBe('settling');
      expect(SYMBOL_SEMANTICS['†']).toBe('cut');
      expect(SYMBOL_SEMANTICS['⁂']).toBe('constellation');
    });
  });

  describe('SYMBOL_DEPTH_DIRECTION', () => {
    it('should provide depth direction for all 13 symbols', () => {
      expect(Object.keys(SYMBOL_DEPTH_DIRECTION)).toHaveLength(13);
    });

    it('should have valid direction values (-1, 0, or 1)', () => {
      for (const direction of Object.values(SYMBOL_DEPTH_DIRECTION)) {
        expect([-1, 0, 1]).toContain(direction);
      }
    });
  });
});
