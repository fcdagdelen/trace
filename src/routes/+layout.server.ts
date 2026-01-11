// Layout server load - provides session to all pages
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = await locals.getSession();

  return {
    session,
  };
};
