import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  savePartialTrace,
  loadPartialTrace,
  clearPartialTrace,
  markTraceComplete,
  hasRecoverableTrace,
  getRecoveryAge,
  type RecoveryData,
} from './recovery';

describe('recovery', () => {
  const mockTraceData = {
    query: 'test query',
    lines: [
      { id: '1', content: 'Line 1', isSymbol: false, methodHint: null, timestamp: 1000, depth: 0 },
      { id: '2', content: '◊', isSymbol: true, methodHint: null, timestamp: 2000, depth: 1 },
    ],
    methodIds: ['method-1', 'method-2'],
    sessionId: 'session-123',
    isComplete: false,
  };

  beforeEach(() => {
    // localStorage is mocked in setup.ts
    localStorage.clear();
  });

  afterEach(() => {
    // Restore all mocks to prevent spy leaks between tests
    vi.restoreAllMocks();
  });

  describe('savePartialTrace', () => {
    it('should save trace data to localStorage', () => {
      savePartialTrace(mockTraceData);

      const stored = localStorage.getItem('trace_recovery');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.query).toBe('test query');
      expect(parsed.lines).toHaveLength(2);
      expect(parsed.savedAt).toBeGreaterThan(0);
    });

    it('should include all trace properties', () => {
      savePartialTrace(mockTraceData);

      const stored = localStorage.getItem('trace_recovery');
      const parsed = JSON.parse(stored!);

      expect(parsed.methodIds).toEqual(['method-1', 'method-2']);
      expect(parsed.sessionId).toBe('session-123');
      expect(parsed.isComplete).toBe(false);
    });

    it('should handle localStorage errors gracefully', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      // Should not throw
      expect(() => savePartialTrace(mockTraceData)).not.toThrow();

      // Restore the spy immediately
      setItemSpy.mockRestore();
    });
  });

  describe('loadPartialTrace', () => {
    it('should return null when no data stored', () => {
      expect(loadPartialTrace()).toBeNull();
    });

    it('should return stored trace data', () => {
      savePartialTrace(mockTraceData);
      const loaded = loadPartialTrace();

      expect(loaded).not.toBeNull();
      expect(loaded!.query).toBe('test query');
      expect(loaded!.lines).toHaveLength(2);
    });

    it('should return null for expired data (> 24h)', () => {
      const oldData: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      localStorage.setItem('trace_recovery', JSON.stringify(oldData));

      expect(loadPartialTrace()).toBeNull();
    });

    it('should return data that is not yet expired', () => {
      const recentData: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 23 * 60 * 60 * 1000, // 23 hours ago
      };
      localStorage.setItem('trace_recovery', JSON.stringify(recentData));

      expect(loadPartialTrace()).not.toBeNull();
    });

    it('should return null for completed traces', () => {
      const completedData: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now(),
        isComplete: true,
      };
      localStorage.setItem('trace_recovery', JSON.stringify(completedData));

      expect(loadPartialTrace()).toBeNull();
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('trace_recovery', 'not valid json');
      expect(loadPartialTrace()).toBeNull();
    });

    it('should clear expired data from localStorage', () => {
      const oldData: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 25 * 60 * 60 * 1000,
      };
      localStorage.setItem('trace_recovery', JSON.stringify(oldData));

      loadPartialTrace();

      expect(localStorage.getItem('trace_recovery')).toBeNull();
    });
  });

  describe('clearPartialTrace', () => {
    it('should remove stored trace', () => {
      savePartialTrace(mockTraceData);
      expect(localStorage.getItem('trace_recovery')).not.toBeNull();

      clearPartialTrace();

      expect(localStorage.getItem('trace_recovery')).toBeNull();
    });

    it('should not throw when no data exists', () => {
      expect(() => clearPartialTrace()).not.toThrow();
    });
  });

  describe('markTraceComplete', () => {
    it('should mark stored trace as complete', () => {
      savePartialTrace(mockTraceData);
      markTraceComplete();

      const stored = localStorage.getItem('trace_recovery');
      const parsed = JSON.parse(stored!);
      expect(parsed.isComplete).toBe(true);
    });

    it('should handle missing data gracefully', () => {
      expect(() => markTraceComplete()).not.toThrow();
    });

    it('should preserve other data when marking complete', () => {
      savePartialTrace(mockTraceData);
      markTraceComplete();

      const stored = localStorage.getItem('trace_recovery');
      const parsed = JSON.parse(stored!);
      expect(parsed.query).toBe('test query');
      expect(parsed.lines).toHaveLength(2);
    });
  });

  describe('hasRecoverableTrace', () => {
    it('should return false when no data', () => {
      expect(hasRecoverableTrace()).toBe(false);
    });

    it('should return true when recoverable trace exists', () => {
      savePartialTrace(mockTraceData);
      expect(hasRecoverableTrace()).toBe(true);
    });

    it('should return false for empty lines', () => {
      savePartialTrace({ ...mockTraceData, lines: [] });
      expect(hasRecoverableTrace()).toBe(false);
    });

    it('should return false for completed traces', () => {
      const completedData: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now(),
        isComplete: true,
      };
      localStorage.setItem('trace_recovery', JSON.stringify(completedData));

      expect(hasRecoverableTrace()).toBe(false);
    });

    it('should return false for expired traces', () => {
      const oldData: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 25 * 60 * 60 * 1000,
      };
      localStorage.setItem('trace_recovery', JSON.stringify(oldData));

      expect(hasRecoverableTrace()).toBe(false);
    });
  });

  describe('getRecoveryAge', () => {
    it('should return null when no data', () => {
      expect(getRecoveryAge()).toBeNull();
    });

    it('should return "just now" for very recent saves', () => {
      savePartialTrace(mockTraceData);
      expect(getRecoveryAge()).toBe('just now');
    });

    it('should return minutes for saves under an hour', () => {
      const data: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      };
      localStorage.setItem('trace_recovery', JSON.stringify(data));

      expect(getRecoveryAge()).toBe('5m ago');
    });

    it('should return hours for older saves', () => {
      const data: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
      };
      localStorage.setItem('trace_recovery', JSON.stringify(data));

      expect(getRecoveryAge()).toBe('3h ago');
    });

    it('should return correct minutes at boundary', () => {
      const data: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 59 * 60 * 1000, // 59 minutes ago
      };
      localStorage.setItem('trace_recovery', JSON.stringify(data));

      expect(getRecoveryAge()).toBe('59m ago');
    });

    it('should return null for expired data', () => {
      const data: RecoveryData = {
        ...mockTraceData,
        savedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      localStorage.setItem('trace_recovery', JSON.stringify(data));

      expect(getRecoveryAge()).toBeNull();
    });
  });
});
