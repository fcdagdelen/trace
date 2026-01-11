// Session state management
import { writable } from 'svelte/store';

export interface SessionState {
  id: string;
  query: string;
  injections: string[];
  startedAt: number;
}

function createSessionStore() {
  const { subscribe, set, update } = writable<SessionState | null>(null);

  return {
    subscribe,

    // Create a new session
    create: (query: string) => {
      const session: SessionState = {
        id: crypto.randomUUID(),
        query,
        injections: [],
        startedAt: Date.now(),
      };
      set(session);
      return session;
    },

    // Add an injection to the session
    addInjection: (content: string) => {
      update(state => {
        if (!state) return state;
        return {
          ...state,
          injections: [...state.injections, content],
        };
      });
    },

    // Clear the session
    clear: () => {
      set(null);
    },
  };
}

export const sessionStore = createSessionStore();
