// Supabase admin client for server-side operations
// This file should ONLY be imported from server-side code (+server.ts, +page.server.ts, hooks.server.ts)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

// Service role client for server-side operations that bypass RLS
// Use this when you've already authenticated the user via locals.getSession()
let _supabaseAdmin: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!_supabaseAdmin) {
    const url = env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      console.error('[supabase-admin] Missing env vars:', {
        hasUrl: !!url,
        hasKey: !!serviceRoleKey,
        urlPrefix: url?.slice(0, 30),
        keyPrefix: serviceRoleKey?.slice(0, 10),
      });
      throw new Error('PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    console.log('[supabase-admin] Creating client for:', url);
    _supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
    });
  }
  return _supabaseAdmin;
}
