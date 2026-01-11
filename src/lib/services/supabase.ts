// Supabase client service
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { Database } from '$lib/types/database';
import { env } from '$env/dynamic/public';

function getEnvVars() {
  const url = env.PUBLIC_SUPABASE_URL;
  const anonKey = env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set');
  }
  return { url, anonKey };
}

// Browser client for client-side operations
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getEnvVars();
  return createBrowserClient<Database>(url, anonKey);
}

// Server client for server-side operations (use in +server.ts, +page.server.ts)
export function createSupabaseServerClient(
  cookies: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string, options: Record<string, unknown>) => void;
    remove: (key: string, options: Record<string, unknown>) => void;
  }
) {
  const { url, anonKey } = getEnvVars();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      get: (key) => cookies.get(key),
      set: (key, value, options) => {
        cookies.set(key, value, { ...options, path: '/' });
      },
      remove: (key, options) => {
        cookies.remove(key, { ...options, path: '/' });
      },
    },
  });
}

// Simple client factory for use in load functions where we don't need cookie management
let _supabase: SupabaseClient<Database> | null = null;
export function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    const { url, anonKey } = getEnvVars();
    _supabase = createClient<Database>(url, anonKey);
  }
  return _supabase;
}
