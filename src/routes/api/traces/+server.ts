// List traces endpoint
// Returns paginated list of user's traces with optional filtering

import type { RequestHandler } from './$types';
import { dev } from '$app/environment';

// Mock data for dev mode
const MOCK_TRACES = [
  {
    id: 'mock-1',
    query: 'What does it mean to truly see something?',
    method_ids: ['herzog', 'benjamin', 'barthes'],
    line_count: 47,
    symbol_count: 8,
    dominant_method: 'herzog',
    total_duration_ms: 12500,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'mock-2',
    query: 'How does memory shape identity?',
    method_ids: ['benjamin', 'borges', 'flusser'],
    line_count: 62,
    symbol_count: 11,
    dominant_method: 'benjamin',
    total_duration_ms: 18200,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'mock-3',
    query: 'What is the relationship between chaos and order?',
    method_ids: ['bateson', 'deleuze', 'grothendieck'],
    line_count: 55,
    symbol_count: 9,
    dominant_method: 'bateson',
    total_duration_ms: 15800,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'mock-4',
    query: 'What makes a place feel like home?',
    method_ids: ['simmel', 'ibn-khaldun', 'calasso'],
    line_count: 41,
    symbol_count: 7,
    dominant_method: 'simmel',
    total_duration_ms: 11200,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mock-5',
    query: 'How do we know what we know?',
    method_ids: ['wittgenstein', 'derrida', 'warburg'],
    line_count: 73,
    symbol_count: 14,
    dominant_method: 'wittgenstein',
    total_duration_ms: 22100,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
  // Dev bypass mode - return mock data
  const devBypass = dev && cookies.get('dev_bypass_auth') === '1';

  if (devBypass) {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';
    const method = url.searchParams.get('method') || '';

    let filtered = [...MOCK_TRACES];

    if (search) {
      filtered = filtered.filter(t =>
        t.query.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (method) {
      filtered = filtered.filter(t => t.method_ids.includes(method));
    }

    return new Response(JSON.stringify({
      traces: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
