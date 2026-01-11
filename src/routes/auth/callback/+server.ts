// Auth callback handler for magic link
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      throw redirect(303, '/auth?error=auth_failed');
    }
  }

  // Redirect to home after successful auth
  throw redirect(303, '/');
};
