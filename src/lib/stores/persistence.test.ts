import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { persistenceStore, persistenceStatus } from './persistence';

describe('persistenceStore', () => {
  beforeEach(() => {
    persistenceStore.reset();
  });

  describe('initial state', () => {
    it('should start with idle status', () => {
      const state = get(persistenceStore);
      expect(state.status).toBe('idle');
    });

    it('should start with null traceId', () => {
      const state = get(persistenceStore);
      expect(state.traceId).toBeNull();
    });

    it('should start with null error', () => {
      const state = get(persistenceStore);
      expect(state.error).toBeNull();
    });

    it('should start with zero lineCount', () => {
      const state = get(persistenceStore);
      expect(state.lineCount).toBe(0);
    });
  });

  describe('start', () => {
    it('should set saving status with traceId', () => {
      persistenceStore.start('trace-123', null);
      const state = get(persistenceStore);

      expect(state.status).toBe('saving');
      expect(state.traceId).toBe('trace-123');
      expect(state.error).toBeNull();
      expect(state.lineCount).toBe(0);
    });

    it('should set failed status without traceId', () => {
      persistenceStore.start(null, 'Database connection failed');
      const state = get(persistenceStore);

      expect(state.status).toBe('failed');
      expect(state.traceId).toBeNull();
      expect(state.error).toBe('Database connection failed');
    });

    it('should reset lineCount on start', () => {
      // First complete a trace
      persistenceStore.start('trace-1', null);
      persistenceStore.complete(true, 50);

      // Then start a new one
      persistenceStore.start('trace-2', null);
      const state = get(persistenceStore);

      expect(state.lineCount).toBe(0);
    });
  });

  describe('complete', () => {
    it('should set saved status when persisted', () => {
      persistenceStore.start('trace-123', null);
      persistenceStore.complete(true, 42);
      const state = get(persistenceStore);

      expect(state.status).toBe('saved');
      expect(state.lineCount).toBe(42);
      expect(state.error).toBeNull();
    });

    it('should set partial status when not persisted but has traceId', () => {
      persistenceStore.start('trace-123', null);
      persistenceStore.complete(false, 10, ['Some lines failed']);
      const state = get(persistenceStore);

      expect(state.status).toBe('partial');
      expect(state.lineCount).toBe(10);
      expect(state.error).toBe('Some lines failed');
    });

    it('should set failed status when no traceId', () => {
      persistenceStore.start(null, 'Initial failure');
      persistenceStore.complete(false, 0);
      const state = get(persistenceStore);

      expect(state.status).toBe('failed');
    });

    it('should join multiple errors with semicolon', () => {
      persistenceStore.start('trace-123', null);
      persistenceStore.complete(false, 5, ['Error 1', 'Error 2', 'Error 3']);
      const state = get(persistenceStore);

      expect(state.error).toBe('Error 1; Error 2; Error 3');
    });

    it('should preserve traceId on complete', () => {
      persistenceStore.start('trace-999', null);
      persistenceStore.complete(true, 100);
      const state = get(persistenceStore);

      expect(state.traceId).toBe('trace-999');
    });
  });

  describe('fail', () => {
    it('should set failed status with error', () => {
      persistenceStore.start('trace-123', null);
      persistenceStore.fail('Connection lost');
      const state = get(persistenceStore);

      expect(state.status).toBe('failed');
      expect(state.error).toBe('Connection lost');
    });

    it('should preserve traceId on fail', () => {
      persistenceStore.start('trace-456', null);
      persistenceStore.fail('Network error');
      const state = get(persistenceStore);

      expect(state.traceId).toBe('trace-456');
    });

    it('should preserve lineCount on fail', () => {
      persistenceStore.start('trace-789', null);
      // Simulate some progress
      persistenceStore.complete(false, 25, ['Partial failure']);
      persistenceStore.fail('Final failure');
      const state = get(persistenceStore);

      expect(state.lineCount).toBe(25);
    });
  });

  describe('reset', () => {
    it('should return to initial state', () => {
      persistenceStore.start('trace-123', null);
      persistenceStore.complete(true, 100);
      persistenceStore.reset();
      const state = get(persistenceStore);

      expect(state.status).toBe('idle');
      expect(state.traceId).toBeNull();
      expect(state.error).toBeNull();
      expect(state.lineCount).toBe(0);
    });

    it('should reset from failed state', () => {
      persistenceStore.start(null, 'Error');
      persistenceStore.fail('More errors');
      persistenceStore.reset();
      const state = get(persistenceStore);

      expect(state.status).toBe('idle');
      expect(state.error).toBeNull();
    });
  });

  describe('persistenceStatus derived store', () => {
    it('should reflect idle status', () => {
      expect(get(persistenceStatus)).toBe('idle');
    });

    it('should reflect saving status', () => {
      persistenceStore.start('trace-1', null);
      expect(get(persistenceStatus)).toBe('saving');
    });

    it('should reflect saved status', () => {
      persistenceStore.start('trace-1', null);
      persistenceStore.complete(true, 10);
      expect(get(persistenceStatus)).toBe('saved');
    });

    it('should reflect failed status', () => {
      persistenceStore.start(null, 'Error');
      expect(get(persistenceStatus)).toBe('failed');
    });

    it('should reflect partial status', () => {
      persistenceStore.start('trace-1', null);
      persistenceStore.complete(false, 5, ['Partial']);
      expect(get(persistenceStatus)).toBe('partial');
    });
  });
});
