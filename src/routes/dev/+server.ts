import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const GET = ({ cookies }) => {
  // Only works in local dev server
  if (!dev) throw redirect(303, '/');

  cookies.set('dev_bypass_auth', '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  });

  throw redirect(303, '/');
};
