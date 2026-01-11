// List traces endpoint
// Returns paginated list of user's traces with optional filtering

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

  // Filter params
  const search = url.searchParams.get('search') || '';
  const method = url.searchParams.get('method') || '';
  const dateFrom = url.searchParams.get('from') || '';
  const dateTo = url.searchParams.get('to') || '';

  // Build query
  let query = locals.supabase
    .from('traces')
    .select('id, query, method_ids, line_count, symbol_count, dominant_method, total_duration_ms, created_at', { count: 'exact' })
    .eq('user_id', session.user.id);

  // Apply search filter (case-insensitive partial match on query text)
  if (search) {
    query = query.ilike('query', `%${search}%`);
  }

  // Apply method filter (check if method is in method_ids array)
  if (method) {
    query = query.contains('method_ids', [method]);
  }

  // Apply date range filters
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    // Add time to include the full day
    query = query.lte('created_at', `${dateTo}T23:59:59.999Z`);
  }

  // Execute with ordering and pagination
  const { data: traces, error, count } = await query
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
