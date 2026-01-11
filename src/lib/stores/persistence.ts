// Persistence state store
// Tracks save status of the current trace to database

import { writable, derived } from 'svelte/store';

export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'partial';

export interface PersistenceState {
  traceId: string | null;
  status: PersistenceStatus;
  error: string | null;
  lineCount: number;
}

const initialState: PersistenceState = {
  traceId: null,
  status: 'idle',
  error: null,
  lineCount: 0,
};

function createPersistenceStore() {
  const { subscribe, set, update } = writable<PersistenceState>(initialState);

  return {
    subscribe,

    // Called when stream starts with initial status
    start: (traceId: string | null, error: string | null) => {
      set({
        traceId,
        status: traceId ? 'saving' : 'failed',
        error,
        lineCount: 0,
      });
    },

    // Called when stream completes
    complete: (persisted: boolean, lineCount: number, errors?: string[]) => {
      update((state) => ({
        ...state,
        status: persisted ? 'saved' : state.traceId ? 'partial' : 'failed',
        error: errors?.join('; ') || null,
        lineCount,
      }));
    },

    // Called on stream error
    fail: (error: string) => {
      update((state) => ({
        ...state,
        status: 'failed',
        error,
      }));
    },

    // Reset to initial state
    reset: () => set(initialState),
  };
}

export const persistenceStore = createPersistenceStore();

// Derived store for just the status
export const persistenceStatus = derived(persistenceStore, ($p) => $p.status);
