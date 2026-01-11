// Auth state store
import { writable, derived } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';

// Session store
export const session = writable<Session | null>(null);

// Derived user store
export const user = derived(session, ($session) => $session?.user ?? null);

// Derived auth state
export const isAuthenticated = derived(session, ($session) => !!$session);

// Helper to update session
export function setSession(newSession: Session | null) {
  session.set(newSession);
}

// Helper to clear session (logout)
export function clearSession() {
  session.set(null);
}
