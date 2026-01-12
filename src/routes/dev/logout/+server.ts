import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const GET = ({ cookies }) => {
  if (!dev) throw redirect(303, '/');

  cookies.delete('dev_bypass_auth', { path: '/' });
  throw redirect(303, '/');
};
