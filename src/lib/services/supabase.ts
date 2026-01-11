// Supabase client service
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { Database } from '$lib/types/database';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Browser client for client-side operations
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}

// Server client for server-side operations (use in +server.ts, +page.server.ts)
export function createSupabaseServerClient(
  cookies: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string, options: Record<string, unknown>) => void;
    remove: (key: string, options: Record<string, unknown>) => void;
  }
) {
  return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
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

// Simple client for use in load functions where we don't need cookie management
export const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
