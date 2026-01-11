// Single trace endpoint
// Returns full trace with all lines

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  // Fetch trace metadata
  const { data: trace, error: traceError } = await locals.supabase
    .from('traces')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();

  if (traceError || !trace) {
    return new Response(JSON.stringify({ error: 'Trace not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch all trace lines ordered by sequence
  const { data: lines, error: linesError } = await locals.supabase
    .from('trace_lines')
    .select('*')
    .eq('trace_id', id)
    .order('sequence', { ascending: true });

  if (linesError) {
    console.error('Failed to fetch trace lines:', linesError);
    return new Response(JSON.stringify({ error: 'Failed to fetch trace lines' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch any injections
  const { data: injections } = await locals.supabase
    .from('trace_injections')
    .select('*')
    .eq('trace_id', id)
    .order('after_line_sequence', { ascending: true });

  return new Response(JSON.stringify({
    trace,
    lines: lines || [],
    injections: injections || [],
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// Delete a trace
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  // Delete trace (cascade will handle lines and injections)
  const { error } = await locals.supabase
    .from('traces')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Failed to delete trace:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete trace' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
