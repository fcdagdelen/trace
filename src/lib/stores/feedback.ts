// Spirit feedback store
// Tracks user feedback per trace with optimistic UI updates

import { writable, derived, get } from 'svelte/store';
import type { AdherenceSignal, TraceFeedback, FeedbackState } from '$lib/types/feedback';

const initialState: FeedbackState = {
  byTrace: {},
  submitting: new Set(),
  errors: {},
};

function createFeedbackStore() {
  const { subscribe, set, update } = writable<FeedbackState>(initialState);

  // Debounced submission map to handle rapid voting changes
  const pendingSubmissions = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    subscribe,

    // Submit feedback for a spirit (triggered from a specific line)
    submit: async (traceId: string, lineId: string, spiritId: string, signal: AdherenceSignal) => {
      const key = `${traceId}:${spiritId}`;

      // Optimistic update - store per spirit with clicked line reference
      update(state => ({
        ...state,
        byTrace: {
          ...state.byTrace,
          [traceId]: {
            ...state.byTrace[traceId],
            [spiritId]: { signal, clickedLineId: lineId },
          },
        },
        submitting: new Set([...state.submitting, key]),
        errors: {
          ...state.errors,
          [key]: undefined as unknown as string,
        },
      }));

      // Clear any pending submission for this key
      const pending = pendingSubmissions.get(key);
      if (pending) {
        clearTimeout(pending);
      }

      // Debounce the actual API call
      const timeout = setTimeout(async () => {
        pendingSubmissions.delete(key);

        try {
          const response = await fetch('/api/feedback/spirit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              traceId,
              lineId,
              spiritId,
              signal,
            }),
          });

          const result = await response.json();

          update(state => {
            const newSubmitting = new Set(state.submitting);
            newSubmitting.delete(key);

            if (!result.success) {
              return {
                ...state,
                submitting: newSubmitting,
                errors: {
                  ...state.errors,
                  [key]: result.error || 'Failed to submit feedback',
                },
              };
            }

            return {
              ...state,
              submitting: newSubmitting,
            };
          });
        } catch (error) {
          update(state => {
            const newSubmitting = new Set(state.submitting);
            newSubmitting.delete(key);
            return {
              ...state,
              submitting: newSubmitting,
              errors: {
                ...state.errors,
                [key]: error instanceof Error ? error.message : 'Network error',
              },
            };
          });
        }
      }, 300); // 300ms debounce

      pendingSubmissions.set(key, timeout);
    },

    // Remove feedback (toggle off)
    remove: async (traceId: string, spiritId: string) => {
      const key = `${traceId}:${spiritId}`;

      // Clear any pending submission
      const pending = pendingSubmissions.get(key);
      if (pending) {
        clearTimeout(pending);
        pendingSubmissions.delete(key);
      }

      // Optimistic removal
      update(state => {
        const traceFeedback = { ...state.byTrace[traceId] };
        delete traceFeedback[spiritId];

        return {
          ...state,
          byTrace: {
            ...state.byTrace,
            [traceId]: traceFeedback,
          },
        };
      });
    },

    // Load existing feedback for a trace
    loadForTrace: async (traceId: string) => {
      try {
        const response = await fetch(`/api/feedback/trace/${traceId}`);
        if (!response.ok) return;

        const data = await response.json();

        update(state => ({
          ...state,
          byTrace: {
            ...state.byTrace,
            [traceId]: data.feedback || {},
          },
        }));
      } catch {
        // Silent fail for loading - not critical
      }
    },

    // Get feedback for a spirit
    getFeedback: (traceId: string, spiritId: string): AdherenceSignal | null => {
      const state = get({ subscribe });
      return state.byTrace[traceId]?.[spiritId]?.signal ?? null;
    },

    // Get the line where feedback was clicked for a spirit
    getClickedLineId: (traceId: string, spiritId: string): string | null => {
      const state = get({ subscribe });
      return state.byTrace[traceId]?.[spiritId]?.clickedLineId ?? null;
    },

    // Check if currently submitting
    isSubmitting: (traceId: string, spiritId: string): boolean => {
      const state = get({ subscribe });
      return state.submitting.has(`${traceId}:${spiritId}`);
    },

    // Reset store
    reset: () => {
      // Clear all pending submissions
      pendingSubmissions.forEach(timeout => clearTimeout(timeout));
      pendingSubmissions.clear();
      set(initialState);
    },
  };
}

export const feedbackStore = createFeedbackStore();

// Derived store for getting feedback for a specific trace
export function createTraceFeedbackStore(traceId: string) {
  return derived(feedbackStore, $state => $state.byTrace[traceId] || {});
}
