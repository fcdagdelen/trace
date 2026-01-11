// List traces endpoint
// Returns paginated list of user's traces

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pagination params
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { data: traces, error, count } = await locals.supabase
    .from('traces')
    .select('id, query, method_ids, line_count, symbol_count, dominant_method, total_duration_ms, created_at', { count: 'exact' })
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to fetch traces:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch traces' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    traces: traces || [],
    total: count || 0,
    limit,
    offset,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
