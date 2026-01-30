// Spirit feedback submission endpoint
// POST: Submit feedback for a spirit on a trace

import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import type { FeedbackResponse } from '$lib/types/feedback';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  // Dev bypass mode
  const devBypass = dev && cookies.get('dev_bypass_auth') === '1';

  const session = devBypass ? { user: { id: 'dev-user' } } : await locals.getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized',
    } satisfies FeedbackResponse), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { traceId?: string; lineId?: string; spiritId?: string; signal?: number };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid JSON body',
    } satisfies FeedbackResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { traceId, lineId, spiritId, signal } = body;

  // Validate required fields
  if (!traceId || !spiritId || (signal !== 1 && signal !== -1)) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing required fields: traceId, spiritId, signal (1 or -1)',
    } satisfies FeedbackResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Dev mode: return mock success
  if (devBypass) {
    return new Response(JSON.stringify({
      success: true,
      feedbackId: `mock-feedback-${Date.now()}`,
    } satisfies FeedbackResponse), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify user has access to this trace
  const { data: trace, error: traceError } = await locals.supabase
    .from('traces')
    .select('id, user_id')
    .eq('id', traceId)
    .single();

  if (traceError || !trace) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Trace not found',
    } satisfies FeedbackResponse), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only allow feedback on own traces
  if (trace.user_id !== session.user.id) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Cannot submit feedback for traces you do not own',
    } satisfies FeedbackResponse), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Upsert feedback (allows changing vote)
  // Store lineId in trace_context for reference
  const { data: feedback, error: feedbackError } = await locals.supabase
    .from('spirit_feedback')
    .upsert({
      user_id: session.user.id,
      trace_id: traceId,
      spirit_id: spiritId,
      adherence_signal: signal,
      trace_context: lineId ? { lineId } : {},
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,trace_id,spirit_id',
    })
    .select('id')
    .single();

  if (feedbackError) {
    console.error('Failed to submit feedback:', feedbackError);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to submit feedback',
    } satisfies FeedbackResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    feedbackId: feedback?.id,
  } satisfies FeedbackResponse), {
    headers: { 'Content-Type': 'application/json' },
  });
};
