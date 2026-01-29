// Share trace endpoint
// POST: Make trace public, generate share_slug
// DELETE: Make trace private

import type { RequestHandler } from './$types';
import { randomUUID } from 'crypto';

// Generate a short, URL-safe share slug
function generateShareSlug(): string {
  // Use first 10 chars of UUID (no dashes)
  return randomUUID().replace(/-/g, '').slice(0, 10);
}

// Make trace public
export const POST: RequestHandler = async ({ params, locals, url }) => {
  const session = await locals.getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  // Verify ownership
  const { data: trace, error: fetchError } = await locals.supabase
    .from('traces')
    .select('id, user_id, share_slug')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();

  if (fetchError || !trace) {
    return new Response(JSON.stringify({ error: 'Trace not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Use existing slug or generate new one
  const shareSlug = trace.share_slug || generateShareSlug();

  // Update trace to be public
  const { error: updateError } = await locals.supabase
    .from('traces')
    .update({
      is_public: true,
      share_slug: shareSlug,
    })
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (updateError) {
    console.error('Failed to make trace public:', updateError);
    return new Response(JSON.stringify({ error: 'Failed to share trace' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Construct share URL
  const origin = url.origin;
  const shareUrl = `${origin}/s/${shareSlug}`;

  return new Response(JSON.stringify({
    success: true,
    shareSlug,
    shareUrl,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// Make trace private
export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.getSession();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;

  // Update trace to be private (keep the slug for potential re-sharing)
  const { error } = await locals.supabase
    .from('traces')
    .update({ is_public: false })
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Failed to make trace private:', error);
    return new Response(JSON.stringify({ error: 'Failed to unshare trace' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
