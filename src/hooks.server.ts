// Server hooks for auth middleware
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { dev } from '$app/environment';
import type { Database } from '$lib/types/database';
import {
  checkRateLimit,
  rateLimitResponse,
  rateLimitHeaders,
  type RateLimitType,
} from '$lib/utils/rate-limit';

// Map API paths to rate limit types
function getRateLimitType(pathname: string): RateLimitType | null {
  if (pathname === '/api/trace') return 'trace';
  if (pathname === '/api/analyze') return 'analyze';
  if (pathname.startsWith('/api/')) return 'api';
  return null;
}

export const handle: Handle = async ({ event, resolve }) => {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set');
  }

  // Create Supabase client with cookie handling
  event.locals.supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
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

  // Dev mode auth bypass via cookie (set by /dev route)
  const devBypassAuth = dev && event.cookies.get('dev_bypass_auth') === '1';

  // Protected page routes - require authentication (redirect to /auth)
  const protectedRoutes = ['/', '/history', '/trace', '/spirits'];
  const isProtectedRoute = protectedRoutes.some(
    (route) => event.url.pathname === route ||
               event.url.pathname.startsWith('/trace/') ||
               event.url.pathname.startsWith('/history/') ||
               event.url.pathname.startsWith('/spirits/')
  );

  if (isProtectedRoute && !devBypassAuth) {
    const session = await event.locals.getSession();
    if (!session) {
      throw redirect(303, '/auth');
    }
  }

  // Protected API routes - require authentication (return 401 JSON)
  const protectedApiRoutes = ['/api/trace', '/api/traces', '/api/analyze', '/api/spirits'];
  const isProtectedApiRoute = protectedApiRoutes.some(
    (route) => event.url.pathname === route ||
               event.url.pathname.startsWith(route + '/')
  );

  if (isProtectedApiRoute && !devBypassAuth) {
    const session = await event.locals.getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Apply rate limiting to API routes
  const rateLimitType = getRateLimitType(event.url.pathname);
  if (rateLimitType) {
    // Use user ID if authenticated, otherwise use IP
    const session = await event.locals.getSession();
    const identifier = session?.user?.id ??
      event.getClientAddress() ??
      'anonymous';

    const result = checkRateLimit(rateLimitType, identifier);

    if (!result.allowed) {
      return rateLimitResponse(rateLimitType, result);
    }

    // Add rate limit headers to response
    const response = await resolve(event, {
      filterSerializedResponseHeaders(name) {
        return name === 'content-range';
      },
    });

    // Add rate limit headers
    const headers = rateLimitHeaders(rateLimitType, result);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  }

  // Allow /auth and /auth/callback without authentication
  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    },
  });
};
