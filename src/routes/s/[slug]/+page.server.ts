// Public share page server load
// Loads trace by share_slug without auth requirement

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { slug } = params;

  // Fetch public trace by share_slug
  const { data: trace, error: traceError } = await locals.supabase
    .from('traces')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .single();

  if (traceError || !trace) {
    error(404, 'Trace not found or not public');
  }

  // Fetch all trace lines ordered by sequence
  const { data: lines, error: linesError } = await locals.supabase
    .from('trace_lines')
    .select('*')
    .eq('trace_id', trace.id)
    .order('sequence', { ascending: true });

  if (linesError) {
    console.error('Failed to fetch trace lines:', linesError);
    error(500, 'Failed to load trace');
  }

  return {
    trace,
    lines: lines || [],
  };
};
