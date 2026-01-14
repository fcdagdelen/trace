// Individual spirit API endpoint
// GET - Get a single spirit
// PUT - Update a spirit
// DELETE - Delete a spirit

import type { RequestHandler } from './$types';
import type { SpiritUpdate } from '$lib/types/database';

export const GET: RequestHandler = async ({ params, locals }) => {
  const session = await locals.getSession();
  const userId = session?.user?.id;

  const { data: spirit, error } = await locals.supabase
    .from('spirits')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !spirit) {
    return new Response(JSON.stringify({ error: 'Spirit not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check visibility: user can see their own, public, or system spirits
  const canView =
    spirit.user_id === userId ||
    spirit.is_public ||
    spirit.user_id === null;

  if (!canView) {
    return new Response(JSON.stringify({ error: 'Spirit not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ spirit }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const session = await locals.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // First, verify the spirit exists and belongs to the user
  const { data: existing, error: fetchError } = await locals.supabase
    .from('spirits')
    .select('id, user_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !existing) {
    return new Response(JSON.stringify({ error: 'Spirit not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (existing.user_id !== userId) {
    return new Response(JSON.stringify({ error: 'Cannot edit this spirit' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();

    // Validate slug format if provided
    if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
      return new Response(JSON.stringify({
        error: 'Slug must be lowercase alphanumeric with hyphens only',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build update object (only include provided fields)
    const update: SpiritUpdate = {};

    if (body.slug !== undefined) update.slug = body.slug;
    if (body.name !== undefined) update.name = body.name;
    if (body.source !== undefined) update.source = body.source;
    if (body.color !== undefined) update.color = body.color;
    if (body.letter_spacing !== undefined) update.letter_spacing = body.letter_spacing;
    if (body.resonant_symbols !== undefined) update.resonant_symbols = body.resonant_symbols;
    if (body.vocabulary !== undefined) update.vocabulary = body.vocabulary;
    if (body.expanded_vocabulary !== undefined) update.expanded_vocabulary = body.expanded_vocabulary;
    if (body.domains !== undefined) update.domains = body.domains;
    if (body.compatible_with !== undefined) update.compatible_with = body.compatible_with;
    if (body.tensions_with !== undefined) update.tensions_with = body.tensions_with;
    if (body.interjection_mode !== undefined) update.interjection_mode = body.interjection_mode;
    if (body.prompt_content !== undefined) update.prompt_content = body.prompt_content;
    if (body.is_public !== undefined) update.is_public = body.is_public;

    const { data, error } = await locals.supabase
      .from('spirits')
      .update(update)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return new Response(JSON.stringify({
          error: 'A spirit with this slug already exists',
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.error('Failed to update spirit:', error);
      return new Response(JSON.stringify({ error: 'Failed to update spirit' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ spirit: data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const session = await locals.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // First, verify the spirit exists and belongs to the user
  const { data: existing, error: fetchError } = await locals.supabase
    .from('spirits')
    .select('id, user_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !existing) {
    return new Response(JSON.stringify({ error: 'Spirit not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (existing.user_id !== userId) {
    return new Response(JSON.stringify({ error: 'Cannot delete this spirit' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error } = await locals.supabase
    .from('spirits')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('Failed to delete spirit:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete spirit' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
