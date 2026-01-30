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

const MAX_SLUG_RETRIES = 3;

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

  // Use existing slug or generate new one with collision retry
  let shareSlug = trace.share_slug;
  let updateError = null;

  if (!shareSlug) {
    // Try generating a unique slug with retries
    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
      shareSlug = generateShareSlug();

      const { error } = await locals.supabase
        .from('traces')
        .update({
          is_public: true,
          share_slug: shareSlug,
        })
        .eq('id', id)
        .eq('user_id', session.user.id);

      if (!error) {
        updateError = null;
        break;
      }

      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        // Unique violation - retry with new slug
        console.log(`[share] Slug collision on attempt ${attempt + 1}, retrying...`);
        updateError = error;
        continue;
      }

      // Other error - don't retry
      updateError = error;
      break;
    }
  } else {
    // Update with existing slug
    const { error } = await locals.supabase
      .from('traces')
      .update({
        is_public: true,
        share_slug: shareSlug,
      })
      .eq('id', id)
      .eq('user_id', session.user.id);

    updateError = error;
  }

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
