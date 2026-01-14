// Spirits API endpoint
// GET - List spirits (user's own + public)
// POST - Create a new custom spirit

import type { RequestHandler } from './$types';
import type { SpiritInsert } from '$lib/types/database';

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.getSession();
  const userId = session?.user?.id;

  // Pagination
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Filters
  const filter = url.searchParams.get('filter') || 'all'; // all, mine, public
  const domain = url.searchParams.get('domain') || '';

  // Build query
  let query = locals.supabase
    .from('spirits')
    .select('*', { count: 'exact' });

  // Apply visibility filter
  if (filter === 'mine') {
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    query = query.eq('user_id', userId);
  } else if (filter === 'public') {
    query = query.eq('is_public', true);
  } else {
    // 'all' - show user's own + public
    if (userId) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true,user_id.is.null`);
    } else {
      query = query.or('is_public.eq.true,user_id.is.null');
    }
  }

  // Filter by domain
  if (domain) {
    query = query.contains('domains', [domain]);
  }

  // Execute with ordering and pagination
  const { data: spirits, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to fetch spirits:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch spirits' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    spirits: spirits || [],
    total: count || 0,
    limit,
    offset,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.slug || !body.name || !body.prompt_content) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: slug, name, prompt_content',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate slug format (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return new Response(JSON.stringify({
        error: 'Slug must be lowercase alphanumeric with hyphens only',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build insert object
    const spirit: SpiritInsert = {
      user_id: userId,
      slug: body.slug,
      name: body.name,
      source: body.source || null,
      color: body.color || '#666666',
      letter_spacing: body.letter_spacing || 0.012,
      resonant_symbols: body.resonant_symbols || [],
      vocabulary: body.vocabulary || [],
      expanded_vocabulary: body.expanded_vocabulary || [],
      domains: body.domains || [],
      compatible_with: body.compatible_with || [],
      tensions_with: body.tensions_with || [],
      interjection_mode: body.interjection_mode || 'harmonize',
      prompt_content: body.prompt_content,
      is_public: false, // Default to private
      is_premium: false,
    };

    const { data, error } = await locals.supabase
      .from('spirits')
      .insert(spirit)
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

      console.error('Failed to create spirit:', error);
      return new Response(JSON.stringify({ error: 'Failed to create spirit' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ spirit: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
