// Layout server load - provides session and user profile to all pages
import type { LayoutServerLoad } from './$types';
import type { UserProfile } from '$lib/types/database';

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  let userProfile: UserProfile | null = null;

  // Fetch user profile if authenticated
  if (session?.user?.id) {
    const { data, error } = await locals.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (!error && data) {
      userProfile = data;
    }
  }

  return {
    session,
    userProfile,
  };
};
