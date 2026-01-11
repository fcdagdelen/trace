// Server hooks for auth middleware
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/types/database';

export const handle: Handle = async ({ event, resolve }) => {
  // Create Supabase client with cookie handling
  event.locals.supabase = createServerClient<Database>(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => {
          event.cookies.set(key, value, { ...options, path: '/' });
        },
        remove: (key, options) => {
          event.cookies.delete(key, { ...options, path: '/' });
        },
      },
    }
  );

  // Helper to get session
  event.locals.getSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    return session;
  };

  // Protected routes - require authentication
  const protectedRoutes = ['/', '/history', '/trace'];
  const isProtectedRoute = protectedRoutes.some(
    (route) => event.url.pathname === route ||
               event.url.pathname.startsWith('/trace/') ||
               event.url.pathname.startsWith('/history/')
  );

  if (isProtectedRoute) {
    const session = await event.locals.getSession();
    if (!session) {
      throw redirect(303, '/auth');
    }
  }

  // Allow /auth and /auth/callback without authentication
  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });
};
