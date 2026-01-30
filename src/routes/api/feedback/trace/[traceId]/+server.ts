// Get feedback for a trace
// GET: Returns all spirit feedback for a given trace

import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import type { TraceFeedback } from '$lib/types/feedback';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
  const { traceId } = params;

  // Dev bypass mode
  const devBypass = dev && cookies.get('dev_bypass_auth') === '1';

  const session = devBypass ? { user: { id: 'dev-user' } } : await locals.getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Dev mode: return empty feedback
  if (devBypass) {
    return new Response(JSON.stringify({
      feedback: {} as TraceFeedback,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch all feedback for this trace by this user
  const { data: feedbackRows, error } = await locals.supabase
    .from('spirit_feedback')
    .select('spirit_id, adherence_signal, trace_context')
    .eq('trace_id', traceId)
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Failed to fetch trace feedback:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch feedback',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert to map format with SpiritFeedbackEntry structure
  const feedback: TraceFeedback = {};
  for (const row of feedbackRows || []) {
    const context = row.trace_context as { lineId?: string } | null;
    feedback[row.spirit_id] = {
      signal: row.adherence_signal as -1 | 1,
      clickedLineId: context?.lineId || '',
    };
  }

  return new Response(JSON.stringify({
    feedback,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
