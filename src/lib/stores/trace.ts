// Trace state management
import { writable, derived } from 'svelte/store';
import type { Method } from '$lib/methods';

export interface TraceLine {
  id: string;
  content: string;
  isSymbol: boolean;
  methodHint: string | null;
  timestamp: number;
  depth: number;
}

export interface TraceState {
  lines: TraceLine[];
  isStreaming: boolean;
  isPaused: boolean;
  activeMethods: Method[];
  currentMethodHint: string | null;
  sessionId: string | null;
  error: string | null;
}

const initialState: TraceState = {
  lines: [],
  isStreaming: false,
  isPaused: false,
  activeMethods: [],
  currentMethodHint: null,
  sessionId: null,
  error: null,
};

function createTraceStore() {
  const { subscribe, set, update } = writable<TraceState>(initialState);

  return {
    subscribe,

    // Start a new trace
    start: (sessionId: string, methods: Method[]) => {
      update(state => ({
        ...initialState,
        sessionId,
        activeMethods: methods,
        isStreaming: true,
      }));
    },

    // Add a line to the trace
    addLine: (line: TraceLine) => {
      update(state => ({
        ...state,
        lines: [...state.lines, line],
        currentMethodHint: line.methodHint,
      }));
    },

    // Update method hint
    setMethodHint: (hint: string | null) => {
      update(state => ({
        ...state,
        currentMethodHint: hint,
      }));
    },

    // Pause the stream
    pause: () => {
      update(state => ({ ...state, isPaused: true }));
    },

    // Resume the stream
    resume: () => {
      update(state => ({ ...state, isPaused: false }));
    },

    // Complete the trace
    complete: () => {
      update(state => ({
        ...state,
        isStreaming: false,
        isPaused: false,
      }));
    },

    // Set error
    setError: (error: string) => {
      update(state => ({
        ...state,
        error,
        isStreaming: false,
      }));
    },

    // Reset the store
    reset: () => {
      set(initialState);
    },
  };
}

export const traceStore = createTraceStore();

// Derived stores for convenience
export const isStreaming = derived(traceStore, $trace => $trace.isStreaming);
export const isPaused = derived(traceStore, $trace => $trace.isPaused);
export const traceLines = derived(traceStore, $trace => $trace.lines);
export const currentMethod = derived(traceStore, $trace => $trace.currentMethodHint);
